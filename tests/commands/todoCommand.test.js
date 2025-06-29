const { handleTodoCommand } = require('../../src/commands/todoCommand');

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

jest.mock('../../src/services/taskService', () => ({
    addTask: jest.fn(),
    completeTask: jest.fn(),
    removeTask: jest.fn(),
    backupTasks: jest.fn()
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
    getUsage: jest.fn((command, subcommand) => `Usage: /${command} ${subcommand || '[add|list|complete|remove|backup]'}`),
    validateString: jest.fn(),
    validateIndex: jest.fn()
}));

const { addTask, completeTask, removeTask, backupTasks } = require('../../src/services/taskService');
const { handleError } = require('../../src/utils/errorHandler');
const { validateCommand, getUsage, validateString, validateIndex } = require('../../src/utils/commandValidator');

describe('TodoCommand', () => {
    let mockTasks;

    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn();

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
                status: 'completed',
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            }
        ];
    });

    describe('Argument validation', () => {
        test('should handle missing arguments', () => {
            const result = handleTodoCommand([], mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
            expect(handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'Todo Command',
                expect.any(String)
            );
        });

        test('should handle null arguments', () => {
            const result = handleTodoCommand(null, mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
        });

        test('should handle invalid command structure', () => {
            validateCommand.mockReturnValue({
                valid: false,
                error: 'Invalid command structure',
                usage: 'Usage: /todo [add|list|complete|remove|backup]'
            });

            const result = handleTodoCommand(['invalid'], mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
            expect(console.log).toHaveBeenCalledWith('Invalid command structure');
        });
    });

    describe('add command', () => {
        test('should add task successfully', () => {
            const taskDescription = 'New test task';
            const addedTask = {
                id: 3,
                description: taskDescription,
                status: 'pending',
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            };

            validateCommand.mockReturnValue({ valid: true });
            validateString.mockReturnValue({
                valid: true,
                value: taskDescription
            });
            addTask.mockReturnValue(addedTask);

            const result = handleTodoCommand(['add', 'New', 'test', 'task'], mockTasks);

            expect(result.success).toBe(true);
            expect(result.tasks).toBe(mockTasks);
            expect(addTask).toHaveBeenCalledWith(mockTasks, taskDescription);
            expect(console.log).toHaveBeenCalledWith(`Added task: "${taskDescription}"`);
        });

        test('should handle invalid task description', () => {
            validateCommand.mockReturnValue({ valid: true });
            validateString.mockReturnValue({
                valid: false,
                error: 'Task description cannot be empty'
            });

            const result = handleTodoCommand(['add', ''], mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
            expect(console.log).toHaveBeenCalledWith('Task description cannot be empty');
        });

        test('should handle add task failure', () => {
            validateCommand.mockReturnValue({ valid: true });
            validateString.mockReturnValue({
                valid: true,
                value: 'Test task'
            });
            addTask.mockReturnValue(null);

            const result = handleTodoCommand(['add', 'Test', 'task'], mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
            expect(console.log).toHaveBeenCalledWith('Failed to add task. Please try again.');
        });
    });

    describe('list command', () => {
        test('should list tasks successfully', () => {
            validateCommand.mockReturnValue({ valid: true });

            const result = handleTodoCommand(['list'], mockTasks);

            expect(result.success).toBe(true);
            expect(result.tasks).toBe(mockTasks);
            expect(console.log).toHaveBeenCalledWith('Your current tasks:');
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('1. [PENDING] Test task 1')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('2. [COMPLETED] Test task 2')
            );
        });

        test('should handle empty task list', () => {
            validateCommand.mockReturnValue({ valid: true });

            const result = handleTodoCommand(['list'], []);

            expect(result.success).toBe(true);
            expect(result.tasks).toEqual([]);
            expect(console.log).toHaveBeenCalledWith(
                'No tasks yet. Add some with /todo add <task description>'
            );
        });
    });

    describe('complete command', () => {
        test('should complete task successfully', () => {
            const completedTask = {
                id: 1,
                description: 'Test task 1',
                status: 'completed',
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            };

            validateCommand.mockReturnValue({ valid: true });
            validateIndex.mockReturnValue({
                valid: true,
                value: 1
            });
            completeTask.mockReturnValue(completedTask);

            const result = handleTodoCommand(['complete', '1'], mockTasks);

            expect(result.success).toBe(true);
            expect(result.tasks).toBe(mockTasks);
            expect(completeTask).toHaveBeenCalledWith(mockTasks, 1);
            expect(console.log).toHaveBeenCalledWith(
                `Task "${completedTask.description}" marked as completed.`
            );
        });

        test('should handle invalid task index', () => {
            validateCommand.mockReturnValue({ valid: true });
            validateIndex.mockReturnValue({
                valid: false,
                error: 'Task index must be between 1 and 2'
            });

            const result = handleTodoCommand(['complete', '999'], mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
            expect(console.log).toHaveBeenCalledWith('Task index must be between 1 and 2');
        });

        test('should handle complete task failure', () => {
            validateCommand.mockReturnValue({ valid: true });
            validateIndex.mockReturnValue({
                valid: true,
                value: 1
            });
            completeTask.mockReturnValue(null);

            const result = handleTodoCommand(['complete', '1'], mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
            expect(console.log).toHaveBeenCalledWith('Failed to complete task. Please try again.');
        });
    });

    describe('remove command', () => {
        test('should remove task successfully', () => {
            const removedTask = {
                id: 1,
                description: 'Test task 1',
                status: 'pending',
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            };

            validateCommand.mockReturnValue({ valid: true });
            validateIndex.mockReturnValue({
                valid: true,
                value: 1
            });
            removeTask.mockReturnValue(removedTask);

            const result = handleTodoCommand(['remove', '1'], mockTasks);

            expect(result.success).toBe(true);
            expect(result.tasks).toBe(mockTasks);
            expect(removeTask).toHaveBeenCalledWith(mockTasks, 1);
            expect(console.log).toHaveBeenCalledWith(
                `Removed task: "${removedTask.description}"`
            );
        });

        test('should handle invalid task index for remove', () => {
            validateCommand.mockReturnValue({ valid: true });
            validateIndex.mockReturnValue({
                valid: false,
                error: 'Task index must be between 1 and 2'
            });

            const result = handleTodoCommand(['remove', '999'], mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
            expect(console.log).toHaveBeenCalledWith('Task index must be between 1 and 2');
        });

        test('should handle remove task failure', () => {
            validateCommand.mockReturnValue({ valid: true });
            validateIndex.mockReturnValue({
                valid: true,
                value: 1
            });
            removeTask.mockReturnValue(null);

            const result = handleTodoCommand(['remove', '1'], mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
            expect(console.log).toHaveBeenCalledWith('Failed to remove task. Please try again.');
        });
    });

    describe('backup command', () => {
        test('should backup tasks successfully', () => {
            validateCommand.mockReturnValue({ valid: true });
            backupTasks.mockReturnValue(true);

            const result = handleTodoCommand(['backup'], mockTasks);

            expect(result.success).toBe(true);
            expect(result.tasks).toBe(mockTasks);
            expect(backupTasks).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('Tasks backed up successfully.');
        });

        test('should handle backup failure', () => {
            validateCommand.mockReturnValue({ valid: true });
            backupTasks.mockReturnValue(false);

            const result = handleTodoCommand(['backup'], mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
            expect(console.log).toHaveBeenCalledWith('Failed to backup tasks. Please try again.');
        });
    });

    describe('Unknown subcommand', () => {
        test('should handle unknown subcommand', () => {
            validateCommand.mockReturnValue({ valid: true });

            const result = handleTodoCommand(['unknown'], mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
            expect(console.log).toHaveBeenCalledWith('Unknown /todo subcommand: unknown');
        });
    });

    describe('Error handling', () => {
        test('should handle unexpected errors', () => {
            validateCommand.mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            const result = handleTodoCommand(['list'], mockTasks);

            expect(result.success).toBe(false);
            expect(result.tasks).toBe(mockTasks);
            expect(handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'Todo Command',
                expect.any(String)
            );
        });
    });
}); 