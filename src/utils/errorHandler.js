const chalk = require("chalk").default;
const { validateArrayIndex } = require('./arrayUtils');

// Error types for better error categorization
const ErrorTypes = {
    FILE_IO: 'FILE_IO',
    API_ERROR: 'API_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    CONFIG_ERROR: 'CONFIG_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// Centralized error handling function
const handleError = (error, context = '', errorType = ErrorTypes.UNKNOWN_ERROR) => {
    const timestamp = new Date().toISOString();
    const errorMessage = error.message || error.toString();

    // Log error for debugging
    console.error(chalk.red(`[${timestamp}] Error in ${context}: ${errorMessage}`));

    // Return user-friendly error message based on error type
    switch (errorType) {
        case ErrorTypes.FILE_IO:
            return {
                success: false,
                error: `File operation failed: ${errorMessage}`,
                userMessage: "Unable to save or load data. Please check file permissions."
            };
        case ErrorTypes.API_ERROR:
            return {
                success: false,
                error: `API Error: ${errorMessage}`,
                userMessage: "Unable to connect to AI service. Please check your API key and internet connection."
            };
        case ErrorTypes.VALIDATION_ERROR:
            return {
                success: false,
                error: `Validation Error: ${errorMessage}`,
                userMessage: `Invalid input: ${errorMessage}`
            };
        case ErrorTypes.CONFIG_ERROR:
            return {
                success: false,
                error: `Configuration Error: ${errorMessage}`,
                userMessage: "Configuration error. Please check your settings."
            };
        case ErrorTypes.NETWORK_ERROR:
            return {
                success: false,
                error: `Network Error: ${errorMessage}`,
                userMessage: "Network connection issue. Please check your internet connection."
            };
        default:
            return {
                success: false,
                error: `Unexpected Error: ${errorMessage}`,
                userMessage: "An unexpected error occurred. Please try again."
            };
    }
};

// Safe JSON parsing with error handling
const safeJsonParse = (jsonString, defaultValue = null) => {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error(chalk.yellow(`JSON parsing failed: ${error.message}`));
        return defaultValue;
    }
};

// Safe file reading with error handling
const safeFileRead = async (filePath, defaultValue = null) => {
    const fs = require("fs").promises;
    try {
        const content = await fs.readFile(filePath, "utf8");
        return safeJsonParse(content, defaultValue);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return defaultValue; // File doesn't exist
        }
        console.error(chalk.red(`Failed to read file ${filePath}: ${error.message}`));
        return defaultValue;
    }
};

// Safe file writing with error handling
const safeFileWrite = async (filePath, data) => {
    const fs = require("fs").promises;
    try {
        const jsonString = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, jsonString, "utf8");
        return { success: true };
    } catch (error) {
        const errorResult = handleError(error, `Writing to ${filePath}`, ErrorTypes.FILE_IO);
        return errorResult;
    }
};

// Input validation utilities
const validateTimeFormat = (timeString) => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(timeString)) {
        return {
            valid: false,
            error: "Time must be in HH:MM format (e.g., 14:30)"
        };
    }
    return { valid: true };
};

const validateTaskIndex = (index, tasks) => {
    // Use the shared function for consistency
    const result = validateArrayIndex(index, tasks, 'Task index');
    if (!result.valid) return result;
    return { valid: true, index: result.value };
};

const validateApiKey = (apiKey) => {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        return {
            valid: false,
            error: "API key is required and must be a non-empty string"
        };
    }
    return { valid: true };
};

module.exports = {
    ErrorTypes,
    handleError,
    safeJsonParse,
    safeFileRead,
    safeFileWrite,
    validateTimeFormat,
    validateTaskIndex,
    validateApiKey
}; 