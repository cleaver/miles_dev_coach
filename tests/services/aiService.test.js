const {
    getAiResponse,
    testAiConnection,
    getAiServiceStatus,
    getFallbackResponse
} = require('../../src/services/aiService');

// Mock the Google Generative AI library
const mockResponse = {
    text: jest.fn()
};

const mockModel = {
    generateContent: jest.fn()
};

const mockGenAI = {
    getGenerativeModel: jest.fn(() => mockModel)
};

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(() => mockGenAI)
}));

// Mock error handler
jest.mock('../../src/utils/errorHandler', () => ({
    handleError: jest.fn((error, context, type) => ({
        success: false,
        error: error.message,
        userMessage: `Error in ${context}: ${error.message}`
    })),
    ErrorTypes: {
        API_ERROR: 'API_ERROR',
        NETWORK_ERROR: 'NETWORK_ERROR',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        UNKNOWN_ERROR: 'UNKNOWN_ERROR'
    },
    validateApiKey: jest.fn()
}));

// Mock chalk
jest.mock('chalk', () => ({
    default: {
        red: jest.fn((text) => text),
        yellow: jest.fn((text) => text),
        magenta: jest.fn((text) => text)
    }
}));

describe('AIService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResponse.text.mockReturnValue('Test response');
        mockModel.generateContent.mockResolvedValue({ response: mockResponse });
        mockGenAI.getGenerativeModel.mockReturnValue(mockModel);
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
        test('should return AI response successfully', async () => {
            const { validateApiKey } = require('../../src/utils/errorHandler');
            validateApiKey.mockReturnValue({ valid: true });

            const result = await getAiResponse('test message', 'test-api-key');

            expect(result).toContain('AI Coach: Test response');
            expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash' });
            expect(mockModel.generateContent).toHaveBeenCalledWith(
                expect.stringContaining('test message')
            );
        });

        test('should handle invalid API key', async () => {
            const { validateApiKey } = require('../../src/utils/errorHandler');
            validateApiKey.mockReturnValue({
                valid: false,
                error: 'Invalid API key'
            });

            const result = await getAiResponse('test message', 'invalid-key');

            expect(result).toContain('AI Coach: Invalid API key');
            expect(result).toContain('Please use /config set ai_api_key YOUR_API_KEY');
        });

        test('should handle API errors gracefully', async () => {
            const { validateApiKey } = require('../../src/utils/errorHandler');
            validateApiKey.mockReturnValue({ valid: true });
            mockModel.generateContent.mockRejectedValue(new Error('API Error'));

            const result = await getAiResponse('test message', 'test-api-key');

            expect(result).toContain('AI Coach:');
            expect(result).not.toContain('Test response');
        });

        test('should handle timeout errors', async () => {
            const { validateApiKey } = require('../../src/utils/errorHandler');
            validateApiKey.mockReturnValue({ valid: true });
            mockModel.generateContent.mockImplementation(() =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), 100)
                )
            );

            const result = await getAiResponse('test message', 'test-api-key');

            expect(result).toContain('AI Coach:');
        });
    });

    describe('testAiConnection', () => {
        test('should test connection successfully', async () => {
            const { validateApiKey } = require('../../src/utils/errorHandler');
            validateApiKey.mockReturnValue({ valid: true });

            const result = await testAiConnection('test-api-key');

            expect(result.success).toBe(true);
            expect(result.message).toBe('AI connection test successful');
        });

        test('should handle invalid API key', async () => {
            const { validateApiKey } = require('../../src/utils/errorHandler');
            validateApiKey.mockReturnValue({
                valid: false,
                error: 'Invalid API key'
            });

            const result = await testAiConnection('invalid-key');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid API key');
        });

        test('should handle connection errors', async () => {
            const { validateApiKey } = require('../../src/utils/errorHandler');
            validateApiKey.mockReturnValue({ valid: true });
            mockModel.generateContent.mockRejectedValue(new Error('Connection failed'));

            const result = await testAiConnection('test-api-key');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Error in AI Connection Test');
        });
    });

    describe('getAiServiceStatus', () => {
        test('should return configured status for valid API key', () => {
            const { validateApiKey } = require('../../src/utils/errorHandler');
            validateApiKey.mockReturnValue({ valid: true });

            const result = getAiServiceStatus('test-api-key');

            expect(result.status).toBe('configured');
            expect(result.message).toBe('API key configured');
        });

        test('should return not configured status for invalid API key', () => {
            const { validateApiKey } = require('../../src/utils/errorHandler');
            validateApiKey.mockReturnValue({ valid: false });

            const result = getAiServiceStatus('invalid-key');

            expect(result.status).toBe('not_configured');
            expect(result.message).toBe('API key not configured');
        });
    });
}); 