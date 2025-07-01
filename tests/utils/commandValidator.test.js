const {
    validateCommand,
    getUsage,
    validateString,
    validateNumber,
    validateIndex,
    extractArgs,
    VALIDATION_PATTERNS,
    COMMAND_SCHEMAS
} = require('../../src/utils/commandValidator');

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

jest.mock('../../src/utils/errorHandler', () => ({
    handleError: jest.fn((error, context, type) => ({
        success: false,
        error: error.message,
        userMessage: `Error in ${context}: ${error.message}`
    })),
    ErrorTypes: {
        VALIDATION_ERROR: 'VALIDATION_ERROR'
    }
}));

describe('CommandValidator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('COMMAND_SCHEMAS', () => {
        test('should have correct todo command schema', () => {
            expect(COMMAND_SCHEMAS.todo).toEqual({
                add: { minArgs: 1, description: "add <task description>" },
                list: { minArgs: 0, description: "list" },
                start: { minArgs: 1, description: "start <task number>" },
                complete: { minArgs: 1, description: "complete <task number>" },
                remove: { minArgs: 1, description: "remove <task number>" },
                backup: { minArgs: 0, description: "backup" }
            });
        });

        test('should have correct config command schema', () => {
            expect(COMMAND_SCHEMAS.config).toEqual({
                set: { minArgs: 2, description: "set <key> <value>" },
                get: { minArgs: 1, description: "get <key>" },
                list: { minArgs: 0, description: "list" },
                reset: { minArgs: 0, description: "reset" },
                test: { minArgs: 0, description: "test" },
                status: { minArgs: 0, description: "status" }
            });
        });

        test('should have correct checkin command schema', () => {
            expect(COMMAND_SCHEMAS.checkin).toEqual({
                add: { minArgs: 1, description: "add <time>" },
                list: { minArgs: 0, description: "list" },
                remove: { minArgs: 1, description: "remove <index>" },
                status: { minArgs: 0, description: "status" },
                test: { minArgs: 0, description: "test" }
            });
        });
    });

    describe('validateCommand', () => {
        test('should validate correct todo add command', () => {
            const result = validateCommand('todo', 'add', ['task description']);
            expect(result.valid).toBe(true);
        });

        test('should validate correct todo list command', () => {
            const result = validateCommand('todo', 'list', []);
            expect(result.valid).toBe(true);
        });

        test('should reject invalid arguments', () => {
            const result = validateCommand('todo', 'add', null);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid arguments provided');
        });

        test('should reject unknown subcommand', () => {
            const result = validateCommand('todo', 'unknown', []);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Unknown subcommand: unknown');
        });

        test('should reject insufficient arguments', () => {
            const result = validateCommand('todo', 'add', []);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Insufficient arguments. Expected at least 1, got 0');
        });

        test('should reject missing required arguments', () => {
            const result = validateCommand('todo', 'add', ['task'], 2);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Missing required arguments');
        });

        test('should handle validation errors gracefully', () => {
            const result = validateCommand('todo', 'add', undefined);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid arguments provided');
        });
    });

    describe('getUsage', () => {
        test('should return usage for specific subcommand', () => {
            const result = getUsage('todo', 'add');
            expect(result).toBe('Usage: /todo add <task description>');
        });

        test('should return usage for command without subcommand', () => {
            const result = getUsage('todo');
            expect(result).toBe('Usage: /todo [add|list|start|complete|remove|backup]');
        });

        test('should handle unknown command', () => {
            const result = getUsage('unknown');
            expect(result).toBe('Unknown command: unknown');
        });

        test('should handle unknown subcommand', () => {
            const result = getUsage('todo', 'unknown');
            expect(result).toBe('Usage: /todo [add|list|start|complete|remove|backup]');
        });
    });

    describe('validateString', () => {
        test('should validate correct string', () => {
            const result = validateString('valid string', 'Test field');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('valid string');
        });

        test('should reject empty string', () => {
            const result = validateString('', 'Test field');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be a non-empty string');
        });

        test('should reject whitespace-only string', () => {
            const result = validateString('   ', 'Test field');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be a non-empty string');
        });

        test('should reject null value', () => {
            const result = validateString(null, 'Test field');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be a non-empty string');
        });

        test('should reject undefined value', () => {
            const result = validateString(undefined, 'Test field');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be a non-empty string');
        });

        test('should reject non-string value', () => {
            const result = validateString(123, 'Test field');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be a non-empty string');
        });

        test('should trim whitespace', () => {
            const result = validateString('  test string  ', 'Test field');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('test string');
        });
    });

    describe('validateNumber', () => {
        test('should validate correct number', () => {
            const result = validateNumber('42', 'Test field');
            expect(result.valid).toBe(true);
            expect(result.value).toBe(42);
        });

        test('should validate number within range', () => {
            const result = validateNumber('5', 'Test field', 1, 10);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(5);
        });

        test('should reject non-numeric string', () => {
            const result = validateNumber('abc', 'Test field');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be a valid number');
        });

        test('should reject number below minimum', () => {
            const result = validateNumber('0', 'Test field', 1);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be at least 1');
        });

        test('should reject number above maximum', () => {
            const result = validateNumber('15', 'Test field', 1, 10);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be at most 10');
        });

        test('should accept decimal strings', () => {
            const result = validateNumber('3.14', 'Test field');
            expect(result.valid).toBe(true);
            expect(result.value).toBe(3);
        });
    });

    describe('validateIndex', () => {
        const mockArray = ['item1', 'item2', 'item3'];

        test('should validate correct index', () => {
            const result = validateIndex('2', mockArray, 'Test field');
            expect(result.valid).toBe(true);
            expect(result.value).toBe(1); // 0-based index
        });

        test('should reject index below 1', () => {
            const result = validateIndex('0', mockArray, 'Test field');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be between 1 and 3');
        });

        test('should reject index above array length', () => {
            const result = validateIndex('5', mockArray, 'Test field');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be between 1 and 3');
        });

        test('should reject invalid number', () => {
            const result = validateIndex('abc', mockArray, 'Test field');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be between 1 and 3');
        });

        test('should handle empty array', () => {
            const result = validateIndex('1', [], 'Test field');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Test field must be between 1 and 0');
        });
    });

    describe('extractArgs', () => {
        test('should extract arguments successfully', () => {
            const schema = {
                name: { index: 0, required: true, validator: (value) => ({ valid: true, value }) },
                age: { index: 1, required: false, validator: (value) => ({ valid: true, value: parseInt(value) }) }
            };

            const result = extractArgs(['John', '25'], schema);

            expect(result.valid).toBe(true);
            expect(result.args).toEqual({
                name: 'John',
                age: 25
            });
        });

        test('should handle missing required argument', () => {
            const schema = {
                name: { index: 0, required: true, validator: (value) => ({ valid: true, value }) }
            };

            const result = extractArgs([], schema);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Missing required argument: name');
            expect(result.field).toBe('name');
        });

        test('should handle validation failure', () => {
            const schema = {
                name: {
                    index: 0,
                    required: true,
                    validator: (value) => ({ valid: false, error: 'Invalid name' })
                }
            };

            const result = extractArgs(['invalid'], schema);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid name');
        });
    });

    describe('VALIDATION_PATTERNS', () => {
        test('should have taskDescription pattern', () => {
            expect(typeof VALIDATION_PATTERNS.taskDescription).toBe('function');

            const result = VALIDATION_PATTERNS.taskDescription('test task');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('test task');
        });

        test('should have taskIndex pattern', () => {
            expect(typeof VALIDATION_PATTERNS.taskIndex).toBe('function');

            const mockTasks = ['task1', 'task2'];
            const result = VALIDATION_PATTERNS.taskIndex('1', mockTasks);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(0);
        });

        test('should have configKey pattern', () => {
            expect(typeof VALIDATION_PATTERNS.configKey).toBe('function');

            const result = VALIDATION_PATTERNS.configKey('api_key');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('api_key');
        });

        test('should have configValue pattern', () => {
            expect(typeof VALIDATION_PATTERNS.configValue).toBe('function');

            const result = VALIDATION_PATTERNS.configValue('some_value');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('some_value');
        });

        test('should have timeInput pattern', () => {
            expect(typeof VALIDATION_PATTERNS.timeInput).toBe('function');

            const result = VALIDATION_PATTERNS.timeInput('14:30');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('14:30');
        });

        test('should have checkinIndex pattern', () => {
            expect(typeof VALIDATION_PATTERNS.checkinIndex).toBe('function');

            const mockCheckins = ['checkin1', 'checkin2'];
            const result = VALIDATION_PATTERNS.checkinIndex('1', mockCheckins);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(0);
        });
    });
}); 