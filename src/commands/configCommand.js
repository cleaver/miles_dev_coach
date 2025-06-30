const chalk = require("chalk").default;
const { handleError, ErrorTypes, validateApiKey } = require("../utils/errorHandler");
const { testAiConnection, getAiServiceStatus } = require("../services/aiService");
const { validateCommand, getUsage, validateString } = require("../utils/commandValidator");

const handleConfigCommand = async (args, config, saveConfig) => {
    try {
        // Basic argument validation
        if (!args || !Array.isArray(args) || args.length === 0) {
            const errorResult = handleError(
                new Error("Config command requires arguments"),
                "Config Command",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            console.log(chalk.blue("Usage: /config [set <key> <value>|get <key>|list|reset|test|status]"));
            return { config: config, success: false };
        }

        const subCommand = args[0];

        // Validate command structure
        const commandValidation = validateCommand('config', subCommand, args.slice(1));
        if (!commandValidation.valid) {
            console.log(chalk.red(commandValidation.error));
            console.log(chalk.blue(commandValidation.usage));
            return { config: config, success: false };
        }

        switch (subCommand) {
            case "set":
                const key = args[1];
                const value = args.slice(2).join(" ");

                // Validate key
                const keyValidation = validateString(key, "Config key");
                if (!keyValidation.valid) {
                    console.log(chalk.red(keyValidation.error));
                    console.log(chalk.blue(getUsage('config', 'set')));
                    return { config: config, success: false };
                }

                // Validate value
                const valueValidation = validateString(value, "Config value");
                if (!valueValidation.valid) {
                    console.log(chalk.red(valueValidation.error));
                    console.log(chalk.blue(getUsage('config', 'set')));
                    return { config: config, success: false };
                }

                // Special validation for API key
                if (keyValidation.value === 'ai_api_key') {
                    const apiKeyValidation = validateApiKey(valueValidation.value);
                    if (!apiKeyValidation.valid) {
                        console.log(chalk.red(apiKeyValidation.error));
                        console.log(chalk.blue(getUsage('config', 'set')));
                        return { config: config, success: false };
                    }
                }

                // Set the config value
                config[keyValidation.value] = valueValidation.value;
                const saveResult = await saveConfig(config);

                if (saveResult) {
                    console.log(chalk.green(`Config set: ${keyValidation.value} = ${keyValidation.value === 'ai_api_key' ? '[HIDDEN]' : valueValidation.value}`));
                    return { config: config, success: true };
                } else {
                    console.log(chalk.red("Failed to save configuration. Please try again."));
                    return { config: config, success: false };
                }

            case "get":
                const getKey = args[1];
                const getKeyValidation = validateString(getKey, "Config key");
                if (!getKeyValidation.valid) {
                    console.log(chalk.red(getKeyValidation.error));
                    console.log(chalk.blue(getUsage('config', 'get')));
                    return { config: config, success: false };
                }

                if (config[getKeyValidation.value] !== undefined) {
                    const displayValue = getKeyValidation.value === 'ai_api_key' ? '[HIDDEN]' : config[getKeyValidation.value];
                    console.log(chalk.blue(`Config ${getKeyValidation.value}: ${displayValue}`));
                } else {
                    console.log(chalk.yellow(`Config key "${getKeyValidation.value}" not found.`));
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
                const resetResult = await saveConfig({});
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
                console.log(chalk.red(`Unknown /config subcommand: ${subCommand}`));
                console.log(chalk.blue(getUsage('config')));
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