const {
    loadTasks,
    saveTasks,
    addTask,
    completeTask,
    removeTask,
    backupTasks,
    validateTask,
    validateTasksArray
} = require('../../src/services/taskService');

// Mock dependencies
jest.mock('chalk', () => ({
    default: {
        red: jest.fn((text) => text),
        yellow: jest.fn((text) => text),
        blue: jest.fn((text) => text),
        green: jest.fn((text) => text),
        gray: jest.fn((text) => text)
    }
}));

jest.mock('../../src/config/paths', () => ({
    TASKS_FILE: '/test/tasks.json',
    ensureConfigDir: jest.fn(() => true),
    isFileCorrupted: jest.fn(() => false)
}));

jest.mock('../../src/utils/errorHandler', () => ({
    safeFileRead: jest.fn(),
    safeFileWrite: jest.fn(),
    handleError: jest.fn((error, context, type) => ({
        success: false,
        error: error.message,
        userMessage: `Error in ${context}: ${error.message}`
    })),
    ErrorTypes: {
        FILE_IO: 'FILE_IO',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        UNKNOWN_ERROR: 'UNKNOWN_ERROR'
    },
    validateTaskIndex: jest.fn()
}));

const { safeFileRead, safeFileWrite, handleError, validateTaskIndex } = require('../../src/utils/errorHandler');
const { ensureConfigDir, isFileCorrupted } = require('../../src/config/paths');

describe('TaskService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn();
        console.error = jest.fn();
    });

    describe('validateTask', () => {
        test('should validate correct task structure', () => {
            const validTask = {
                id: 1,
                description: 'Test task',
                status: 'pending',
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            };

            const result = validateTask(validTask);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should reject task with missing description', () => {
            const invalidTask = {
                id: 1,
                status: 'pending',
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            };

            const result = validateTask(invalidTask);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Task description is required and must be a non-empty string');
        });

        test('should reject task with invalid status', () => {
            const invalidTask = {
                id: 1,
                description: 'Test task',
                status: 'invalid_status',
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            };

            const result = validateTask(invalidTask);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Task status must be one of: pending, in progress, completed');
        });
    });

    describe('validateTasksArray', () => {
        test('should validate array of valid tasks', () => {
            const validTasks = [
                {
                    id: 1,
                    description: 'Task 1',
                    status: 'pending',
                    created_at: '2023-01-01T00:00:00.000Z',
                    updated_at: '2023-01-01T00:00:00.000Z'
                }
            ];

            const result = validateTasksArray(validTasks);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should reject non-array input', () => {
            const result = validateTasksArray('not an array');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Tasks must be an array');
        });
    });

    describe('loadTasks', () => {
        test('should load tasks successfully', () => {
            const mockTasks = [
                {
                    id: 1,
                    description: 'Test task',
                    status: 'pending',
                    created_at: '2023-01-01T00:00:00.000Z',
                    updated_at: '2023-01-01T00:00:00.000Z'
                }
            ];

            ensureConfigDir.mockReturnValue(true);
            isFileCorrupted.mockReturnValue(false);
            safeFileRead.mockReturnValue(mockTasks);

            const result = loadTasks();

            expect(result).toEqual(mockTasks);
            expect(ensureConfigDir).toHaveBeenCalled();
            expect(safeFileRead).toHaveBeenCalledWith('/test/tasks.json', []);
        });

        test('should return empty array when config dir creation fails', () => {
            ensureConfigDir.mockReturnValue(false);

            const result = loadTasks();

            expect(result).toEqual([]);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Failed to create config directory'));
        });
    });

    describe('saveTasks', () => {
        test('should save tasks successfully', () => {
            const tasks = [
                {
                    id: 1,
                    description: 'Test task',
                    status: 'pending',
                    created_at: '2023-01-01T00:00:00.000Z',
                    updated_at: '2023-01-01T00:00:00.000Z'
                }
            ];

            safeFileWrite.mockReturnValue({ success: true });

            const result = saveTasks(tasks);

            expect(result).toBe(true);
            expect(safeFileWrite).toHaveBeenCalledWith('/test/tasks.json', tasks);
        });

        test('should return false when file write fails', () => {
            const tasks = [
                {
                    id: 1,
                    description: 'Test task',
                    status: 'pending',
                    created_at: '2023-01-01T00:00:00.000Z',
                    updated_at: '2023-01-01T00:00:00.000Z'
                }
            ];

            safeFileWrite.mockReturnValue({
                success: false,
                userMessage: 'Write failed'
            });

            const result = saveTasks(tasks);

            expect(result).toBe(false);
        });
    });

    describe('addTask', () => {
        test('should add valid task successfully', () => {
            const tasks = [];
            const description = 'New test task';

            safeFileWrite.mockReturnValue({ success: true });

            const result = addTask(tasks, description);

            expect(result).toBeTruthy();
            expect(result.description).toBe('New test task');
            expect(result.status).toBe('pending');
            expect(result.id).toBe(1);
            expect(tasks).toHaveLength(1);
        });

        test('should return null for invalid description', () => {
            const tasks = [];
            const result = addTask(tasks, '');
            expect(result).toBeNull();
        });
    });

    describe('completeTask', () => {
        test('should complete task successfully', () => {
            const tasks = [
                {
                    id: 1,
                    description: 'Test task',
                    status: 'pending',
                    created_at: '2023-01-01T00:00:00.000Z',
                    updated_at: '2023-01-01T00:00:00.000Z'
                }
            ];

            validateTaskIndex.mockReturnValue({ valid: true, index: 0 });
            safeFileWrite.mockReturnValue({ success: true });

            const result = completeTask(tasks, 1);

            expect(result).toBeTruthy();
            expect(result.status).toBe('completed');
            expect(tasks[0].status).toBe('completed');
        });

        test('should return null for invalid task index', () => {
            const tasks = [
                {
                    id: 1,
                    description: 'Test task',
                    status: 'pending',
                    created_at: '2023-01-01T00:00:00.000Z',
                    updated_at: '2023-01-01T00:00:00.000Z'
                }
            ];

            validateTaskIndex.mockReturnValue({
                valid: false,
                error: 'Invalid index'
            });

            const result = completeTask(tasks, 999);

            expect(result).toBeNull();
        });
    });

    describe('removeTask', () => {
        test('should remove task successfully', () => {
            const tasks = [
                {
                    id: 1,
                    description: 'Task 1',
                    status: 'pending',
                    created_at: '2023-01-01T00:00:00.000Z',
                    updated_at: '2023-01-01T00:00:00.000Z'
                },
                {
                    id: 2,
                    description: 'Task 2',
                    status: 'pending',
                    created_at: '2023-01-01T00:00:00.000Z',
                    updated_at: '2023-01-01T00:00:00.000Z'
                }
            ];

            validateTaskIndex.mockReturnValue({ valid: true, index: 0 });
            safeFileWrite.mockReturnValue({ success: true });

            const result = removeTask(tasks, 1);

            expect(result).toBeTruthy();
            expect(result.description).toBe('Task 1');
            expect(tasks).toHaveLength(1);
            expect(tasks[0].description).toBe('Task 2');
        });
    });

    describe('backupTasks', () => {
        test('should create backup successfully', () => {
            safeFileWrite.mockReturnValue({ success: true });

            const result = backupTasks();

            expect(result).toBe(true);
        });

        test('should handle backup creation failure', () => {
            safeFileWrite.mockReturnValue({
                success: false,
                userMessage: 'Backup failed'
            });

            const result = backupTasks();

            expect(result).toBe(false);
        });
    });
}); 