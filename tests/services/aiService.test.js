const {
    getAiResponse,
    testAiConnection,
    getAiServiceStatus,
    getFallbackResponse
} = require('../../src/services/aiService');

// Mock dependencies
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

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn()
}));

jest.mock('../../src/utils/errorHandler', () => ({
    handleError: jest.fn((error, context, type) => ({
        success: false,
        error: error.message,
        userMessage: `Error in ${context}: ${error.message}`
    })),
    ErrorTypes: {
        API_ERROR: 'API_ERROR',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        NETWORK_ERROR: 'NETWORK_ERROR',
        UNKNOWN_ERROR: 'UNKNOWN_ERROR'
    },
    validateApiKey: jest.fn()
}));

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { handleError, validateApiKey } = require('../../src/utils/errorHandler');

describe('AIService', () => {
    let mockModel;
    let mockGenAI;

    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn();
        console.error = jest.fn();

        // Setup mock AI model
        mockModel = {
            generateContent: jest.fn()
        };

        mockGenAI = {
            getGenerativeModel: jest.fn(() => mockModel)
        };

        GoogleGenerativeAI.mockImplementation(() => mockGenAI);
    });

    describe('getFallbackResponse', () => {
        test('should return a fallback response', () => {
            const response = getFallbackResponse();
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });

        test('should return different responses on multiple calls', () => {
            const responses = new Set();
            for (let i = 0; i < 10; i++) {
                responses.add(getFallbackResponse());
            }
            // Should have some variety (not all the same)
            expect(responses.size).toBeGreaterThan(1);
        });
    });

    describe('getAiResponse', () => {
        test('should return error for empty message', async () => {
            const result = await getAiResponse('', 'valid-api-key');
            expect(result).toContain('Message must be a non-empty string');
        });

        test('should return error for invalid API key', async () => {
            validateApiKey.mockReturnValue({
                valid: false,
                error: 'Invalid API key'
            });

            const result = await getAiResponse('Hello', 'invalid-key');
            expect(result).toContain('Invalid API key');
        });

        test('should return AI response successfully', async () => {
            const mockResponse = {
                response: {
                    text: jest.fn(() => 'Hello! How can I help you today?')
                }
            };

            validateApiKey.mockReturnValue({ valid: true });
            mockModel.generateContent.mockResolvedValue(mockResponse);

            const result = await getAiResponse('Hello', 'valid-api-key');

            expect(result).toContain('AI Coach: Hello! How can I help you today?');
            expect(GoogleGenerativeAI).toHaveBeenCalledWith('valid-api-key');
            expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash' });
        });

        test('should handle API timeout', async () => {
            validateApiKey.mockReturnValue({ valid: true });
            mockModel.generateContent.mockImplementation(() =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), 100)
                )
            );

            const result = await getAiResponse('Hello', 'valid-api-key');

            expect(result).toContain('AI Coach:');
            expect(handleError).toHaveBeenCalled();
        });

        test('should handle API errors gracefully', async () => {
            validateApiKey.mockReturnValue({ valid: true });
            mockModel.generateContent.mockRejectedValue(new Error('API Error'));

            const result = await getAiResponse('Hello', 'valid-api-key');

            expect(result).toContain('AI Coach:');
            expect(handleError).toHaveBeenCalled();
        });

        test('should enhance message with context', async () => {
            const mockResponse = {
                response: {
                    text: jest.fn(() => 'Response')
                }
            };

            validateApiKey.mockReturnValue({ valid: true });
            mockModel.generateContent.mockResolvedValue(mockResponse);

            await getAiResponse('Test message', 'valid-api-key');

            expect(mockModel.generateContent).toHaveBeenCalledWith(
                expect.stringContaining('You are a helpful AI developer coach')
            );
            expect(mockModel.generateContent).toHaveBeenCalledWith(
                expect.stringContaining('Test message')
            );
        });
    });

    describe('testAiConnection', () => {
        test('should test connection successfully', async () => {
            const mockResponse = {
                response: {
                    text: jest.fn(() => 'Hello')
                }
            };

            validateApiKey.mockReturnValue({ valid: true });
            mockModel.generateContent.mockResolvedValue(mockResponse);

            const result = await testAiConnection('valid-api-key');

            expect(result.success).toBe(true);
            expect(result.message).toBe('AI connection test successful');
        });

        test('should handle invalid API key', async () => {
            validateApiKey.mockReturnValue({
                valid: false,
                error: 'Invalid API key'
            });

            const result = await testAiConnection('invalid-key');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid API key');
        });

        test('should handle connection timeout', async () => {
            validateApiKey.mockReturnValue({ valid: true });
            mockModel.generateContent.mockImplementation(() =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), 100)
                )
            );

            const result = await testAiConnection('valid-api-key');

            expect(result.success).toBe(false);
            expect(handleError).toHaveBeenCalled();
        });

        test('should handle API errors', async () => {
            validateApiKey.mockReturnValue({ valid: true });
            mockModel.generateContent.mockRejectedValue(new Error('API Error'));

            const result = await testAiConnection('valid-api-key');

            expect(result.success).toBe(false);
            expect(handleError).toHaveBeenCalled();
        });
    });

    describe('getAiServiceStatus', () => {
        test('should return configured status for valid API key', () => {
            validateApiKey.mockReturnValue({ valid: true });

            const result = getAiServiceStatus('valid-api-key');

            expect(result.status).toBe('configured');
            expect(result.message).toBe('API key configured');
        });

        test('should return not configured status for invalid API key', () => {
            validateApiKey.mockReturnValue({
                valid: false,
                error: 'Invalid API key'
            });

            const result = getAiServiceStatus('invalid-key');

            expect(result.status).toBe('not_configured');
            expect(result.message).toBe('API key not configured');
        });
    });
}); 