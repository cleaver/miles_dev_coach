const {
    ErrorTypes,
    handleError,
    safeJsonParse,
    safeFileRead,
    safeFileWrite,
    validateTimeFormat,
    validateTaskIndex,
    validateApiKey
} = require('../../src/utils/errorHandler');

// Mock chalk to avoid color codes in test output
jest.mock('chalk', () => ({
    default: {
        red: jest.fn((text) => text),
        yellow: jest.fn((text) => text),
        blue: jest.fn((text) => text),
        green: jest.fn((text) => text),
        gray: jest.fn((text) => text),
        magenta: jest.fn((text) => text)
    }
}));

// Mock fs module
const fs = require('fs');
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn()
    }
}));

describe('ErrorHandler Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn();
    });

    describe('ErrorTypes', () => {
        test('should have all expected error types', () => {
            expect(ErrorTypes).toEqual({
                FILE_IO: 'FILE_IO',
                API_ERROR: 'API_ERROR',
                VALIDATION_ERROR: 'VALIDATION_ERROR',
                CONFIG_ERROR: 'CONFIG_ERROR',
                NETWORK_ERROR: 'NETWORK_ERROR',
                UNKNOWN_ERROR: 'UNKNOWN_ERROR'
            });
        });
    });

    describe('handleError', () => {
        test('should handle FILE_IO errors', () => {
            const error = new Error('File not found');
            const result = handleError(error, 'Test Context', ErrorTypes.FILE_IO);

            expect(result.success).toBe(false);
            expect(result.error).toContain('File operation failed');
            expect(result.userMessage).toBe('Unable to save or load data. Please check file permissions.');
        });

        test('should handle API_ERROR errors', () => {
            const error = new Error('Invalid API key');
            const result = handleError(error, 'Test Context', ErrorTypes.API_ERROR);

            expect(result.success).toBe(false);
            expect(result.error).toContain('API Error');
            expect(result.userMessage).toBe('Unable to connect to AI service. Please check your API key and internet connection.');
        });

        test('should handle VALIDATION_ERROR errors', () => {
            const error = new Error('Invalid input');
            const result = handleError(error, 'Test Context', ErrorTypes.VALIDATION_ERROR);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Validation Error');
            expect(result.userMessage).toBe('Invalid input: Invalid input');
        });

        test('should handle CONFIG_ERROR errors', () => {
            const error = new Error('Config file missing');
            const result = handleError(error, 'Test Context', ErrorTypes.CONFIG_ERROR);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Configuration Error');
            expect(result.userMessage).toBe('Configuration error. Please check your settings.');
        });

        test('should handle NETWORK_ERROR errors', () => {
            const error = new Error('Connection timeout');
            const result = handleError(error, 'Test Context', ErrorTypes.NETWORK_ERROR);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network Error');
            expect(result.userMessage).toBe('Network connection issue. Please check your internet connection.');
        });

        test('should handle UNKNOWN_ERROR errors', () => {
            const error = new Error('Unexpected error');
            const result = handleError(error, 'Test Context', ErrorTypes.UNKNOWN_ERROR);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unexpected Error');
            expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
        });

        test('should handle errors without error type', () => {
            const error = new Error('Test error');
            const result = handleError(error, 'Test Context');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unexpected Error');
        });

        test('should handle non-Error objects', () => {
            const error = 'String error';
            const result = handleError(error, 'Test Context', ErrorTypes.VALIDATION_ERROR);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Validation Error');
        });
    });

    describe('safeJsonParse', () => {
        test('should parse valid JSON', () => {
            const validJson = '{"key": "value", "number": 42}';
            const result = safeJsonParse(validJson);

            expect(result).toEqual({ key: 'value', number: 42 });
        });

        test('should return default value for invalid JSON', () => {
            const invalidJson = '{"key": "value", "number": 42';
            const result = safeJsonParse(invalidJson, 'default');

            expect(result).toBe('default');
        });

        test('should return null for invalid JSON with no default', () => {
            const invalidJson = 'invalid json';
            const result = safeJsonParse(invalidJson);

            expect(result).toBeNull();
        });

        test('should handle empty string', () => {
            const result = safeJsonParse('', 'default');
            expect(result).toBe('default');
        });
    });

    describe('safeFileRead', () => {
        test('should read existing file successfully', async () => {
            const mockContent = '{"data": "test"}';
            fs.promises.readFile.mockResolvedValue(mockContent);

            const result = await safeFileRead('/test/file.json', []);

            expect(result).toEqual({ data: 'test' });
            expect(fs.promises.readFile).toHaveBeenCalledWith('/test/file.json', 'utf8');
        });

        test('should return default value for non-existent file', async () => {
            fs.promises.readFile.mockRejectedValue({ code: 'ENOENT' });

            const result = await safeFileRead('/test/file.json', ['default']);

            expect(result).toEqual(['default']);
        });

        test('should return default value on read error', async () => {
            fs.promises.readFile.mockRejectedValue(new Error('Read error'));

            const result = await safeFileRead('/test/file.json', 'default');

            expect(result).toBe('default');
        });

        test('should return null as default when no default provided', async () => {
            fs.promises.readFile.mockRejectedValue({ code: 'ENOENT' });

            const result = await safeFileRead('/test/file.json');

            expect(result).toBeNull();
        });
    });

    describe('safeFileWrite', () => {
        test('should write file successfully', async () => {
            fs.promises.writeFile.mockResolvedValue();

            const result = await safeFileWrite('/test/file.json', { data: 'test' });

            expect(result.success).toBe(true);
            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                '/test/file.json',
                JSON.stringify({ data: 'test' }, null, 2),
                'utf8'
            );
        });

        test('should handle write errors', async () => {
            fs.promises.writeFile.mockRejectedValue(new Error('Write error'));

            const result = await safeFileWrite('/test/file.json', { data: 'test' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('File operation failed');
            expect(result.userMessage).toBe('Unable to save or load data. Please check file permissions.');
        });
    });

    describe('validateTimeFormat', () => {
        test('should validate correct time formats', () => {
            const validTimes = ['00:00', '09:30', '12:00', '23:59', '14:30'];

            validTimes.forEach(time => {
                const result = validateTimeFormat(time);
                expect(result.valid).toBe(true);
            });
        });

        test('should reject invalid time formats', () => {
            const invalidTimes = [
                '24:00',    // Invalid hour
                '12:60',    // Invalid minute
                '9:30',     // Missing leading zero
                '12:5',     // Missing leading zero
                '12:30:00', // Too many parts
                '12',       // Missing minutes
                'abc',      // Non-numeric
                '',         // Empty string
                '25:00',    // Hour > 23
                '12:61'     // Minute > 59
            ];

            invalidTimes.forEach(time => {
                const result = validateTimeFormat(time);
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Time must be in HH:MM format (e.g., 14:30)');
            });
        });
    });

    describe('validateTaskIndex', () => {
        const mockTasks = [
            { id: 1, description: 'Task 1' },
            { id: 2, description: 'Task 2' },
            { id: 3, description: 'Task 3' }
        ];

        test('should validate correct task indices', () => {
            const validIndices = [1, 2, 3];

            validIndices.forEach(index => {
                const result = validateTaskIndex(index, mockTasks);
                expect(result.valid).toBe(true);
                expect(result.index).toBe(index - 1);
            });
        });

        test('should reject invalid task indices', () => {
            const invalidCases = [
                { index: 0, error: 'Task index must be between 1 and 3' },
                { index: 4, error: 'Task index must be between 1 and 3' },
                { index: -1, error: 'Task index must be between 1 and 3' },
                { index: 'abc', error: 'Task index must be between 1 and 3' },
                { index: '1.5', error: 'Task index must be between 1 and 3' }
            ];

            invalidCases.forEach(({ index, error }) => {
                const result = validateTaskIndex(index, mockTasks);
                expect(result.valid).toBe(false);
                expect(result.error).toBe(error);
            });
        });

        test('should handle empty tasks array', () => {
            const result = validateTaskIndex(1, []);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Task index must be between 1 and 0');
        });
    });

    describe('validateApiKey', () => {
        test('should validate correct API keys', () => {
            const validKeys = [
                'valid-api-key-123',
                'AIzaSyB1234567890abcdefghijklmnopqrstuvwxyz',
                'sk-1234567890abcdefghijklmnopqrstuvwxyz'
            ];

            validKeys.forEach(key => {
                const result = validateApiKey(key);
                expect(result.valid).toBe(true);
            });
        });

        test('should reject invalid API keys', () => {
            const invalidKeys = [
                '',           // Empty string
                '   ',        // Whitespace only
                null,         // Null
                undefined,    // Undefined
                123,          // Number
                {}            // Object
            ];

            invalidKeys.forEach(key => {
                const result = validateApiKey(key);
                expect(result.valid).toBe(false);
                expect(result.error).toBe('API key is required and must be a non-empty string');
            });
        });
    });
}); 