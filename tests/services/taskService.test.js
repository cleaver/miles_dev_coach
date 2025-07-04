// Mock external dependencies - This is correct.
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
    getTasksFile: () => '/test/tasks.json',
    ensureConfigDir: jest.fn(),
    isFileCorrupted: jest.fn()
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

// We REMOVED the jest.mock for './taskService'

// Import the REAL functions from the service
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

// Import functions from our mocked dependencies
const { safeFileRead, safeFileWrite, validateTaskIndex } = require('../../src/utils/errorHandler');
const { ensureConfigDir, isFileCorrupted } = require('../../src/config/paths');

describe('TaskService', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        console.log = jest.fn();
        console.error = jest.fn();
    });

    describe('validateTask', () => {
        // No changes needed here
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
            expect(result.errors).toContain('Task status must be one of: pending, in-progress, on-hold, completed');
        });
    });

    describe('validateTasksArray', () => {
        // No changes needed here
        test('should validate array of valid tasks', () => {
            const validTasks = [{
                id: 1,
                description: 'Task 1',
                status: 'pending',
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            }];
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

    // These tests will now test the REAL loadTasks function
    describe('loadTasks', () => {
        test('should load tasks successfully', async () => {
            const mockTasks = [{ id: 1, description: 'Test task', status: 'pending' }];
            ensureConfigDir.mockResolvedValue(true);
            isFileCorrupted.mockResolvedValue(false);
            safeFileRead.mockResolvedValue(mockTasks);

            const result = await loadTasks(); // This is now the real function

            expect(result).toEqual(mockTasks); // Should pass
            expect(ensureConfigDir).toHaveBeenCalled();
            expect(isFileCorrupted).toHaveBeenCalledWith('/test/tasks.json');
            expect(safeFileRead).toHaveBeenCalledWith('/test/tasks.json', []);
        });

        test('should return empty array when config directory creation fails', async () => {
            ensureConfigDir.mockResolvedValue(false);
            const result = await loadTasks();
            expect(result).toEqual([]); // Should pass
            expect(ensureConfigDir).toHaveBeenCalled();
        });

        test('should return empty array when file is corrupted', async () => {
            ensureConfigDir.mockResolvedValue(true);
            isFileCorrupted.mockResolvedValue(true);
            const result = await loadTasks();
            expect(result).toEqual([]); // Should pass
            expect(isFileCorrupted).toHaveBeenCalledWith('/test/tasks.json');
        });
    });

    describe('saveTasks', () => {
        // No changes needed here
        test('should save tasks successfully', async () => {
            const mockTasks = [{ id: 1, description: 'Test task', status: 'pending' }];
            safeFileWrite.mockResolvedValue({ success: true });
            const result = await saveTasks(mockTasks);
            expect(result).toBe(true);
            expect(safeFileWrite).toHaveBeenCalledWith('/test/tasks.json', mockTasks);
        });

        test('should return false when save fails', async () => {
            const mockTasks = [{ id: 1, description: 'Test task', status: 'pending' }];
            safeFileWrite.mockResolvedValue({ success: false, userMessage: 'Save failed' });
            const result = await saveTasks(mockTasks);
            expect(result).toBe(false);
        });
    });

    // The rest of the tests require no changes...
    describe('addTask', () => { /* ... no changes ... */ });
    describe('completeTask', () => { /* ... no changes ... */ });
    describe('removeTask', () => { /* ... no changes ... */ });

    // These tests will now test the REAL backupTasks function
    describe('backupTasks', () => {
        test('should backup tasks successfully', async () => {
            const mockTasks = [{ id: 1, description: 'Test task', status: 'pending' }];

            // Set up dependencies for the real loadTasks to run successfully
            ensureConfigDir.mockResolvedValue(true);
            isFileCorrupted.mockResolvedValue(false);
            safeFileRead.mockResolvedValue(mockTasks);
            safeFileWrite.mockResolvedValue({ success: true });

            const result = await backupTasks();

            expect(result).toBe(true);
            // Verify that the underlying dependencies were called
            expect(safeFileRead).toHaveBeenCalled();
            expect(safeFileWrite).toHaveBeenCalledWith(
                expect.stringContaining('/test/tasks.backup.'),
                mockTasks
            );
        });

        test('should return false when backup fails', async () => {
            const mockTasks = [];
            // Set up dependencies for a successful read but a failed write
            ensureConfigDir.mockResolvedValue(true);
            isFileCorrupted.mockResolvedValue(false);
            safeFileRead.mockResolvedValue(mockTasks);
            safeFileWrite.mockResolvedValue({ success: false, userMessage: 'Backup failed' });

            const result = await backupTasks();

            expect(result).toBe(false);
            // We can still check that it attempted to read and write
            expect(safeFileRead).toHaveBeenCalled();
            expect(safeFileWrite).toHaveBeenCalled();
        });
    });
});