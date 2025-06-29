const chalk = require("chalk").default;
const { handleError, ErrorTypes, validateApiKey } = require("../utils/errorHandler");
const { testAiConnection, getAiServiceStatus } = require("../services/aiService");

const handleConfigCommand = (args, config, saveConfig) => {
    try {
        // Validate input arguments
        if (!args || !Array.isArray(args) || args.length === 0) {
            const errorResult = handleError(
                new Error("Config command requires arguments"),
                "Config Command",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            console.log(chalk.blue("Usage: /config [set <key> <value>|get <key>|list|reset|test]"));
            return { config: config, success: false };
        }

        const subCommand = args[0];

        switch (subCommand) {
            case "set":
                if (args.length < 3) {
                    const errorResult = handleError(
                        new Error("Config set requires key and value"),
                        "Config Set Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    console.log(chalk.blue("Usage: /config set <key> <value>"));
                    return { config: config, success: false };
                }

                const key = args[1];
                const value = args.slice(2).join(" ");

                // Validate key
                if (!key || typeof key !== 'string' || key.trim().length === 0) {
                    const errorResult = handleError(
                        new Error("Config key must be a non-empty string"),
                        "Config Set Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    return { config: config, success: false };
                }

                // Validate value
                if (value === undefined || value === null) {
                    const errorResult = handleError(
                        new Error("Config value cannot be empty"),
                        "Config Set Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    return { config: config, success: false };
                }

                // Special validation for API key
                if (key === 'ai_api_key') {
                    const apiKeyValidation = validateApiKey(value);
                    if (!apiKeyValidation.valid) {
                        const errorResult = handleError(
                            new Error(apiKeyValidation.error),
                            "Config Set Command",
                            ErrorTypes.VALIDATION_ERROR
                        );
                        console.log(chalk.red(errorResult.userMessage));
                        return { config: config, success: false };
                    }
                }

                // Set the config value
                config[key] = value;
                const saveResult = saveConfig(config);

                if (saveResult) {
                    console.log(chalk.green(`Config set: ${key} = ${key === 'ai_api_key' ? '[HIDDEN]' : value}`));
                    return { config: config, success: true };
                } else {
                    console.log(chalk.red("Failed to save configuration. Please try again."));
                    return { config: config, success: false };
                }

            case "get":
                if (args.length < 2) {
                    const errorResult = handleError(
                        new Error("Config get requires a key"),
                        "Config Get Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    console.log(chalk.blue("Usage: /config get <key>"));
                    return { config: config, success: false };
                }

                const getKey = args[1];

                if (!getKey || typeof getKey !== 'string' || getKey.trim().length === 0) {
                    const errorResult = handleError(
                        new Error("Config key must be a non-empty string"),
                        "Config Get Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    return { config: config, success: false };
                }

                if (config[getKey] !== undefined) {
                    const displayValue = getKey === 'ai_api_key' ? '[HIDDEN]' : config[getKey];
                    console.log(chalk.blue(`Config ${getKey}: ${displayValue}`));
                } else {
                    console.log(chalk.yellow(`Config key "${getKey}" not found.`));
                }
                return { config: config, success: true };

            case "list":
                if (Object.keys(config).length === 0) {
                    console.log(chalk.blue("No configuration settings yet."));
                    return { config: config, success: true };
                }

                console.log(chalk.blue("Current configuration:"));
                for (const key in config) {
                    const displayValue = key === 'ai_api_key' ? '[HIDDEN]' : config[key];
                    console.log(`  ${key}: ${displayValue}`);
                }
                return { config: config, success: true };

            case "reset":
                const resetResult = saveConfig({});
                if (resetResult) {
                    console.log(chalk.green("Configuration reset to defaults."));
                    config = {};
                    return { config: config, success: true };
                } else {
                    console.log(chalk.red("Failed to reset configuration. Please try again."));
                    return { config: config, success: false };
                }

            case "test":
                if (!config.ai_api_key) {
                    console.log(chalk.yellow("No API key configured. Use /config set ai_api_key YOUR_KEY to test."));
                    return { config: config, success: false };
                }

                console.log(chalk.blue("Testing AI connection..."));
                testAiConnection(config.ai_api_key).then(result => {
                    if (result.success) {
                        console.log(chalk.green(result.message));
                    } else {
                        console.log(chalk.red(`Connection test failed: ${result.error}`));
                    }
                }).catch(error => {
                    const errorResult = handleError(error, "AI Connection Test", ErrorTypes.API_ERROR);
                    console.log(chalk.red(errorResult.userMessage));
                });

                return { config: config, success: true };

            case "status":
                const status = getAiServiceStatus(config.ai_api_key);
                console.log(chalk.blue(`AI Service Status: ${status.status}`));
                console.log(chalk.gray(status.message));
                return { config: config, success: true };

            default:
                const errorResult = handleError(
                    new Error(`Unknown /config subcommand: ${subCommand}`),
                    "Config Command",
                    ErrorTypes.VALIDATION_ERROR
                );
                console.log(chalk.red(errorResult.userMessage));
                console.log(chalk.blue("Available commands: set, get, list, reset, test, status"));
                return { config: config, success: false };
        }

    } catch (error) {
        const errorResult = handleError(error, "Config Command", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return { config: config, success: false };
    }
};

module.exports = {
    handleConfigCommand
}; 