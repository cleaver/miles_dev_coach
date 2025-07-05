const {
    scheduleCheckins,
    cancelAllJobs,
    getScheduledJobsInfo,
    testNotification,
    validateCheckinConfig,
    createSmartPrompt
} = require('../../src/services/schedulerService');

// Mock the required modules
jest.mock('node-schedule', () => ({
    scheduleJob: jest.fn(),
    cancelJob: jest.fn(),
    scheduledJobs: {}
}));

jest.mock('node-notifier', () => ({
    notify: jest.fn()
}));

jest.mock('../../src/services/taskService', () => ({
    loadTasks: jest.fn()
}));

jest.mock('../../src/services/aiService', () => ({
    getAiResponse: jest.fn()
}));

jest.mock('../../src/utils/errorHandler', () => ({
    handleError: jest.fn((error, context, type) => ({
        success: false,
        error: error.message,
        userMessage: `Error in ${context}: ${error.message}`
    })),
    ErrorTypes: {
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        UNKNOWN_ERROR: 'UNKNOWN_ERROR'
    },
    validateTimeFormat: jest.fn()
}));

jest.mock('chalk', () => ({
    default: {
        gray: jest.fn((text) => text),
        green: jest.fn((text) => text),
        red: jest.fn((text) => text),
        yellow: jest.fn((text) => text),
        blue: jest.fn((text) => text)
    }
}));

describe('SchedulerService - AI Check-ins', () => {
    let consoleSpy;

    beforeEach(() => {
        jest.clearAllMocks();

        // Spy on console.log to avoid output during tests
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // Setup default mock behaviors
        const { validateTimeFormat } = require('../../src/utils/errorHandler');
        validateTimeFormat.mockReturnValue({ valid: true });

        const schedule = require('node-schedule');
        schedule.scheduleJob.mockReturnValue({ name: 'test-job' });
        schedule.cancelJob.mockReturnValue(true);

        const notifier = require('node-notifier');
        notifier.notify.mockImplementation((options, callback) => {
            if (callback) callback(null, 'success');
        });
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('createSmartPrompt', () => {
        test('should create a prompt with in-progress tasks', () => {
            const tasks = [
                {
                    id: 1,
                    description: 'Fix login bug',
                    status: 'in-progress',
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z'
                },
                {
                    id: 2,
                    description: 'Write tests',
                    status: 'pending',
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z'
                }
            ];

            const prompt = createSmartPrompt(tasks);

            expect(prompt).toContain('Fix login bug');
            expect(prompt).toContain('Ask how it\'s going');
            expect(prompt).toContain('"inProgress": [');
            expect(prompt).toContain('"Fix login bug"');
            expect(prompt).toContain('"pending": 1');
        });

        test('should create a prompt with completed tasks today', () => {
            const today = new Date().toISOString();
            const tasks = [
                {
                    id: 1,
                    description: 'Setup project',
                    status: 'completed',
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: today
                }
            ];

            const prompt = createSmartPrompt(tasks);

            expect(prompt).toContain('Congratulate them for completing 1 task(s) today');
            expect(prompt).toContain('"completedToday": 1');
        });

        test('should create a prompt with on-hold tasks', () => {
            const tasks = [
                {
                    id: 1,
                    description: 'Database migration',
                    status: 'on-hold',
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z'
                }
            ];

            const prompt = createSmartPrompt(tasks);

            expect(prompt).toContain('Acknowledge the tasks on hold');
            expect(prompt).toContain('"onHold": [');
            expect(prompt).toContain('"Database migration"');
        });

        test('should create a prompt for pending tasks when no active work', () => {
            const tasks = [
                {
                    id: 1,
                    description: 'Code review',
                    status: 'pending',
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z'
                }
            ];

            const prompt = createSmartPrompt(tasks);

            expect(prompt).toContain('Gently nudge them to start one of their pending tasks');
            expect(prompt).toContain('"pending": 1');
        });
    });

    describe('scheduleCheckins with AI integration', () => {
        test('should schedule AI check-ins when API key and tasks are available', async () => {
            const config = {
                ai_api_key: 'test-api-key',
                checkins: [
                    { time: '09:00', id: 'checkin-1' },
                    { time: '17:00', id: 'checkin-2' }
                ]
            };

            const saveConfig = jest.fn().mockReturnValue(true);

            const { loadTasks } = require('../../src/services/taskService');
            loadTasks.mockResolvedValue([
                {
                    id: 1,
                    description: 'Test task',
                    status: 'in-progress',
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z'
                }
            ]);

            const { getAiResponse } = require('../../src/services/aiService');
            getAiResponse.mockResolvedValue('AI Coach: How is your test task going?');

            const result = scheduleCheckins(config, saveConfig);

            expect(result.success).toBe(true);
            expect(result.scheduled).toBe(2);

            const schedule = require('node-schedule');
            expect(schedule.scheduleJob).toHaveBeenCalledTimes(2);
        });

        test('should skip check-ins when no API key is provided', async () => {
            const config = {
                ai_api_key: '',
                checkins: [{ time: '09:00', id: 'checkin-1' }]
            };

            const saveConfig = jest.fn().mockReturnValue(true);

            const result = scheduleCheckins(config, saveConfig);

            expect(result.success).toBe(true);
            expect(result.scheduled).toBe(1);

            // Simulate the job execution
            const schedule = require('node-schedule');
            const jobCallback = schedule.scheduleJob.mock.calls[0][1];
            await jobCallback();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Check-in skipped: No tasks or API key/));
        });

        test('should skip check-ins when no tasks are available', async () => {
            const config = {
                ai_api_key: 'test-api-key',
                checkins: [{ time: '09:00', id: 'checkin-1' }]
            };

            const saveConfig = jest.fn().mockReturnValue(true);

            const { loadTasks } = require('../../src/services/taskService');
            loadTasks.mockResolvedValue([]);

            const result = scheduleCheckins(config, saveConfig);

            expect(result.success).toBe(true);
            expect(result.scheduled).toBe(1);

            // Simulate the job execution
            const schedule = require('node-schedule');
            const jobCallback = schedule.scheduleJob.mock.calls[0][1];
            await jobCallback();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Check-in skipped: No tasks or API key/));
        });

        test('should handle AI service errors gracefully', async () => {
            const config = {
                ai_api_key: 'test-api-key',
                checkins: [{ time: '09:00', id: 'checkin-1' }]
            };

            const saveConfig = jest.fn().mockReturnValue(true);

            const { loadTasks } = require('../../src/services/taskService');
            loadTasks.mockResolvedValue([
                {
                    id: 1,
                    description: 'Test task',
                    status: 'in-progress',
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z'
                }
            ]);

            const { getAiResponse } = require('../../src/services/aiService');
            getAiResponse.mockRejectedValue(new Error('API Error'));

            const result = scheduleCheckins(config, saveConfig);

            expect(result.success).toBe(true);
            expect(result.scheduled).toBe(1);

            // Simulate the job execution
            const schedule = require('node-schedule');
            const jobCallback = schedule.scheduleJob.mock.calls[0][1];
            await jobCallback();

            const { handleError } = require('../../src/utils/errorHandler');
            expect(handleError).toHaveBeenCalled();
        });
    });

    describe('validateCheckinConfig', () => {
        test('should validate correct check-in objects', () => {
            const checkins = [
                { time: '09:00', id: 'checkin-1' },
                { time: '17:30', id: 'checkin-2' }
            ];
            const result = validateCheckinConfig(checkins);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should reject invalid check-in format', () => {
            const { validateTimeFormat } = require('../../src/utils/errorHandler');
            validateTimeFormat.mockReturnValue({ valid: false, error: 'Invalid time format' });

            const checkins = [
                { time: '25:00', id: 'checkin-1' },
                { time: '09:60', id: 'checkin-2' }
            ];
            const result = scheduleCheckins({ checkins }, () => true);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid time format');
        });

        test('should reject checkins without required properties', () => {
            const checkins = [
                { time: '09:00' }, // missing id
                { id: 'checkin-2' } // missing time
            ];
            const result = validateCheckinConfig(checkins);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Checkin 1: must have an \'id\' property (string)');
            expect(result.errors).toContain('Checkin 2: must have a \'time\' property (string)');
        });
    });

    describe('other scheduler functions', () => {
        test('should cancel all jobs', () => {
            const result = cancelAllJobs();

            expect(result.success).toBe(true);
            const schedule = require('node-schedule');
            expect(schedule.cancelJob).toHaveBeenCalled();
        });

        test('should get scheduled jobs info', () => {
            const schedule = require('node-schedule');
            schedule.scheduledJobs = { 'job1': {}, 'job2': {} };

            const result = getScheduledJobsInfo();

            expect(result.success).toBe(true);
            expect(result.jobCount).toBe(2);
            expect(result.jobs).toEqual(['job1', 'job2']);
        });

        test('should test notification system', () => {
            const result = testNotification();

            expect(result.success).toBe(true);
            const notifier = require('node-notifier');
            expect(notifier.notify).toHaveBeenCalled();
        });
    });
}); 