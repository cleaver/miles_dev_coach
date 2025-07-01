const { handleTodoCommand } = require('../../src/commands/todoCommand');

// Mock dependencies
jest.mock('../../src/services/taskService', () => ({
    addTask: jest.fn(),
    completeTask: jest.fn(),
    startTask: jest.fn(),
    removeTask: jest.fn(),
    backupTasks: jest.fn(),
    TASK_STATES: {
        PENDING: 'pending',
        IN_PROGRESS: 'in-progress',
        ON_HOLD: 'on-hold',
        COMPLETED: 'completed'
    }
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
    }
}));

jest.mock('../../src/utils/commandValidator', () => ({
    validateCommand: jest.fn(),
    getUsage: jest.fn(() => 'Usage: /todo [add <task>|list|start <index>|complete <index>|remove <index>|backup]'),
    validateString: jest.fn(),
    validateIndex: jest.fn()
}));

jest.mock('chalk', () => ({
    default: new Proxy({}, {
        get: (target, prop) => (text) => text
    })
}));

const { addTask, completeTask, startTask, removeTask, backupTasks } = require('../../src/services/taskService');
const { validateCommand, getUsage, validateString, validateIndex } = require('../../src/utils/commandValidator');
const { handleError } = require('../../src/utils/errorHandler');

describe('TodoCommand', () => {
    let mockTasks;
    let consoleSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        mockTasks = [
            {
                id: 1,
                description: 'Test task 1',
                status: 'pending',
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            },
            {
                id: 2,
                description: 'Test task 2',
                status: 'in-progress',
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            }
        ];

        // Default mock implementations
        validateCommand.mockReturnValue({ valid: true });
        validateString.mockReturnValue({ valid: true, value: 'test task' });
        validateIndex.mockReturnValue({ valid: true, value: 0 });
        addTask.mockReturnValue({ id: 3, description: 'test task', status: 'pending' });
        completeTask.mockReturnValue({ id: 1, description: 'Test task 1', status: 'completed' });
        startTask.mockReturnValue({ id: 1, description: 'Test task 1', status: 'in-progress' });
        removeTask.mockReturnValue({ id: 1, description: 'Test task 1', status: 'pending' });
        backupTasks.mockResolvedValue(true);
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('handleTodoCommand', () => {
        test('should handle add command successfully', async () => {
            const args = ['add', 'test task'];
            const tasks = [];

            const result = await handleTodoCommand(args, tasks);

            expect(result.success).toBe(true);
            expect(validateCommand).toHaveBeenCalledWith('todo', 'add', ['test task']);
            expect(validateString).toHaveBeenCalledWith('test task', 'Task description');
            expect(addTask).toHaveBeenCalledWith(tasks, 'test task');
        });

        test('should handle list command with tasks', async () => {
            const args = ['list'];
            const tasks = [
                { id: 1, description: 'Task 1', status: 'pending', created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-01-01T00:00:00.000Z' },
                { id: 2, description: 'Task 2', status: 'completed', created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-01-01T00:00:00.000Z' }
            ];

            const result = await handleTodoCommand(args, tasks);
            console.log('DEBUG result:', result);
            expect(result.success).toBe(true);
            expect(result.tasks).toEqual(tasks);
        });

        test('should handle list command with no tasks', async () => {
            const args = ['list'];
            const tasks = [];

            const result = await handleTodoCommand(args, tasks);

            expect(result.success).toBe(true);
            expect(result.tasks).toEqual(tasks);
        });

        test('should handle complete command successfully', async () => {
            const args = ['complete', '1'];
            const tasks = [
                { id: 1, description: 'Task 1', status: 'pending' }
            ];

            const result = await handleTodoCommand(args, tasks);

            expect(result.success).toBe(true);
            expect(validateIndex).toHaveBeenCalledWith('1', tasks, 'Task index');
            expect(completeTask).toHaveBeenCalledWith(tasks, 0);
        });

        test('should handle start command successfully', async () => {
            const args = ['start', '1'];
            const tasks = [
                { id: 1, description: 'Task 1', status: 'pending' }
            ];

            const result = await handleTodoCommand(args, tasks);

            expect(result.success).toBe(true);
            expect(validateIndex).toHaveBeenCalledWith('1', tasks, 'Task index');
            expect(startTask).toHaveBeenCalledWith(tasks, 0);
        });

        test('should handle remove command successfully', async () => {
            const args = ['remove', '1'];
            const tasks = [
                { id: 1, description: 'Task 1', status: 'pending' }
            ];

            const result = await handleTodoCommand(args, tasks);

            expect(result.success).toBe(true);
            expect(validateIndex).toHaveBeenCalledWith('1', tasks, 'Task index');
            expect(removeTask).toHaveBeenCalledWith(tasks, 0);
        });

        test('should handle backup command successfully', async () => {
            const args = ['backup'];
            const tasks = [
                { id: 1, description: 'Task 1', status: 'pending' }
            ];

            const result = await handleTodoCommand(args, tasks);

            expect(result.success).toBe(true);
            expect(backupTasks).toHaveBeenCalled();
        });

        test('should handle invalid command', async () => {
            const args = ['invalid'];
            const tasks = [];

            validateCommand.mockReturnValue({ valid: false, error: 'Invalid command' });

            const result = await handleTodoCommand(args, tasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toEqual(tasks);
        });

        test('should handle empty arguments', async () => {
            const args = [];
            const tasks = [];

            const result = await handleTodoCommand(args, tasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toEqual(tasks);
        });

        test('should handle validation errors', async () => {
            const args = ['add', ''];
            const tasks = [];

            validateString.mockReturnValue({ valid: false, error: 'Task description cannot be empty' });

            const result = await handleTodoCommand(args, tasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toEqual(tasks);
        });

        test('should handle add task failure', async () => {
            const args = ['add', 'test task'];
            const tasks = [];

            addTask.mockReturnValue(null);

            const result = await handleTodoCommand(args, tasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toEqual(tasks);
        });

        test('should handle backup failure', async () => {
            const args = ['backup'];
            const tasks = [];

            backupTasks.mockResolvedValue(false);

            const result = await handleTodoCommand(args, tasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toEqual(tasks);
        });
    });
}); 