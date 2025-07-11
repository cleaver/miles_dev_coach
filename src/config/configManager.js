const chalk = require("chalk").default;
const { getConfigFile, ensureConfigDir } = require("./paths");
const { safeFileRead, safeFileWrite, handleError, ErrorTypes, validateApiKey } = require("../utils/errorHandler");

// Default configuration
const DEFAULT_CONFIG = {
    ai_api_key: "",
    checkins: [],
    last_successful_checkin: null,
    theme: "default",
    max_history: 100,
    auto_save: true
};

// Configuration validation
const validateConfig = (config) => {
    const errors = [];

    // Validate API key if present
    if (config.ai_api_key) {
        const apiKeyValidation = validateApiKey(config.ai_api_key);
        if (!apiKeyValidation.valid) {
            errors.push(apiKeyValidation.error);
        }
    }

    // Validate checkins array
    if (config.checkins && !Array.isArray(config.checkins)) {
        errors.push("Checkins must be an array");
    } else if (config.checkins && Array.isArray(config.checkins)) {
        // Validate each checkin object
        config.checkins.forEach((checkin, index) => {
            if (!checkin || typeof checkin !== 'object') {
                errors.push(`Checkin at index ${index} must be an object`);
            } else if (!checkin.time || typeof checkin.time !== 'string') {
                errors.push(`Checkin at index ${index} must have a 'time' property (string)`);
            } else if (!checkin.id || typeof checkin.id !== 'string') {
                errors.push(`Checkin at index ${index} must have an 'id' property (string)`);
            }
        });
    }

    // Validate max_history
    if (config.max_history && (typeof config.max_history !== 'number' || config.max_history < 1)) {
        errors.push("max_history must be a positive number");
    }

    // Validate last_successful_checkin
    if (config.last_successful_checkin !== null && typeof config.last_successful_checkin !== 'string') {
        errors.push("last_successful_checkin must be null or a valid ISO string");
    } else if (config.last_successful_checkin && typeof config.last_successful_checkin === 'string') {
        // Validate ISO string format
        const date = new Date(config.last_successful_checkin);
        if (isNaN(date.getTime())) {
            errors.push("last_successful_checkin must be a valid ISO date string");
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

// Load or initialize configuration
const loadConfig = async () => {
    try {
        await ensureConfigDir();
        const config = await safeFileRead(getConfigFile(), DEFAULT_CONFIG);

        // Validate loaded config
        const validation = validateConfig(config);
        if (!validation.valid) {
            console.error(chalk.yellow("Configuration validation errors:"));
            validation.errors.forEach(error => console.error(chalk.yellow(`  - ${error}`)));
            console.log(chalk.blue("Using default configuration."));
            return DEFAULT_CONFIG;
        }

        // Merge with defaults to ensure all required fields exist
        const mergedConfig = { ...DEFAULT_CONFIG, ...config };
        return mergedConfig;
    } catch (error) {
        const errorResult = handleError(error, "Loading configuration", ErrorTypes.CONFIG_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return DEFAULT_CONFIG;
    }
};

// Save configuration
const saveConfig = async (config) => {
    try {
        // Validate config before saving
        const validation = validateConfig(config);
        if (!validation.valid) {
            const errorResult = handleError(
                new Error(`Configuration validation failed: ${validation.errors.join(', ')}`),
                "Saving configuration",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return false;
        }

        const result = await safeFileWrite(getConfigFile(), config);
        if (result.success) {
            console.log(chalk.gray("Configuration saved successfully."));
            return true;
        } else {
            console.log(chalk.red(result.userMessage));
            return false;
        }
    } catch (error) {
        const errorResult = handleError(error, "Saving configuration", ErrorTypes.CONFIG_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Reset configuration to defaults
const resetConfig = () => {
    try {
        const result = safeFileWrite(getConfigFile(), DEFAULT_CONFIG);
        if (result.success) {
            console.log(chalk.green("Configuration reset to defaults."));
            return true;
        } else {
            console.log(chalk.red(result.userMessage));
            return false;
        }
    } catch (error) {
        const errorResult = handleError(error, "Resetting configuration", ErrorTypes.CONFIG_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

module.exports = {
    loadConfig,
    saveConfig,
    resetConfig,
    validateConfig,
    DEFAULT_CONFIG
}; 