const chalk = require("chalk").default;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { handleError, ErrorTypes, validateApiKey } = require("../utils/errorHandler");

// Fallback responses when AI is unavailable
const FALLBACK_RESPONSES = [
    "I'm having trouble connecting right now, but here's a general tip: Take breaks regularly and stay hydrated!",
    "Connection issues at the moment. Remember to prioritize your most important tasks first.",
    "Unable to reach AI service. Consider reviewing your current tasks and planning your next steps.",
    "Temporary connection problem. Try focusing on one task at a time for better productivity.",
    "AI service unavailable. This might be a good time to reflect on your progress and adjust your goals."
];

// Get a random fallback response
const getFallbackResponse = () => {
    const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
    return FALLBACK_RESPONSES[randomIndex];
};

// Validate API response
const validateApiResponse = (response) => {
    if (!response || typeof response !== 'string' || response.trim().length === 0) {
        return {
            valid: false,
            error: "Empty or invalid response from AI service"
        };
    }

    // Check for common error patterns in AI responses
    const errorPatterns = [
        /error/i,
        /failed/i,
        /unable to/i,
        /cannot/i,
        /invalid/i
    ];

    const hasErrorPattern = errorPatterns.some(pattern => pattern.test(response));
    if (hasErrorPattern && response.length < 50) {
        return {
            valid: false,
            error: "AI service returned an error response"
        };
    }

    return { valid: true };
};

// Enhanced AI response with better error handling
const getAiResponse = async (message, apiKey) => {
    try {
        // Validate input
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            const errorResult = handleError(
                new Error("Message must be a non-empty string"),
                "AI Service",
                ErrorTypes.VALIDATION_ERROR
            );
            return chalk.red(`AI Coach: ${errorResult.userMessage}`);
        }

        // Validate API key
        const apiKeyValidation = validateApiKey(apiKey);
        if (!apiKeyValidation.valid) {
            return chalk.red(
                `AI Coach: ${apiKeyValidation.error}. Please use /config set ai_api_key YOUR_API_KEY.`
            );
        }

        // Create AI instance
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Add context to the message for better responses
        const enhancedMessage = `You are a helpful AI developer coach. The user is asking: "${message.trim()}". 
        Provide a concise, practical response focused on developer productivity and well-being. 
        Keep responses under 200 words and be encouraging.`;

        // Generate content with timeout
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Request timeout")), 30000);
        });

        try {
            const result = await Promise.race([
                model.generateContent(enhancedMessage),
                timeoutPromise
            ]);
            clearTimeout(timeoutId);

            const response = await result.response;
            const text = response.text();

            // Validate the response
            const responseValidation = validateApiResponse(text);
            if (!responseValidation.valid) {
                console.log(chalk.yellow(`AI response validation failed: ${responseValidation.error}`));
                return chalk.magenta(`AI Coach: ${getFallbackResponse()}`);
            }

            return chalk.magenta(`AI Coach: ${text}`);
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }

    } catch (error) {
        // Categorize the error
        let errorType = ErrorTypes.UNKNOWN_ERROR;

        if (error.message.includes('timeout')) {
            errorType = ErrorTypes.NETWORK_ERROR;
        } else if (error.message.includes('API') || error.message.includes('key')) {
            errorType = ErrorTypes.API_ERROR;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorType = ErrorTypes.NETWORK_ERROR;
        }

        const errorResult = handleError(error, "AI Service", errorType);

        // Provide graceful degradation
        console.log(chalk.yellow(`AI Service Error: ${errorResult.error}`));
        return chalk.magenta(`AI Coach: ${getFallbackResponse()}`);
    }
};

// Test AI connection
const testAiConnection = async (apiKey) => {
    try {
        const apiKeyValidation = validateApiKey(apiKey);
        if (!apiKeyValidation.valid) {
            return {
                success: false,
                error: apiKeyValidation.error
            };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Connection timeout")), 10000);
        });

        try {
            const result = await Promise.race([
                model.generateContent("Hello"),
                timeoutPromise
            ]);
            clearTimeout(timeoutId);

            return {
                success: true,
                message: "AI connection test successful"
            };
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }

    } catch (error) {
        const errorResult = handleError(error, "AI Connection Test", ErrorTypes.API_ERROR);
        return {
            success: false,
            error: errorResult.userMessage
        };
    }
};

// Get AI service status
const getAiServiceStatus = (apiKey) => {
    const apiKeyValidation = validateApiKey(apiKey);
    if (!apiKeyValidation.valid) {
        return {
            status: "not_configured",
            message: "API key not configured"
        };
    }

    return {
        status: "configured",
        message: "API key configured"
    };
};

module.exports = {
    getAiResponse,
    testAiConnection,
    getAiServiceStatus,
    getFallbackResponse
}; 