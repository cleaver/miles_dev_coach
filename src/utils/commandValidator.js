const chalk = require("chalk").default;
const { handleError, ErrorTypes } = require("./errorHandler");
const { validateArrayIndex } = require("./arrayUtils");

// Command validation schemas
const COMMAND_SCHEMAS = {
    todo: {
        add: { minArgs: 1, description: "add <task description>" },
        list: { minArgs: 0, description: "list" },
        start: { minArgs: 1, description: "start <task number>" },
        complete: { minArgs: 1, description: "complete <task number>" },
        remove: { minArgs: 1, description: "remove <task number>" },
        backup: { minArgs: 0, description: "backup" }
    },
    config: {
        set: { minArgs: 2, description: "set <key> <value>" },
        get: { minArgs: 1, description: "get <key>" },
        list: { minArgs: 0, description: "list" },
        reset: { minArgs: 0, description: "reset" },
        test: { minArgs: 0, description: "test" },
        status: { minArgs: 0, description: "status" }
    },
    checkin: {
        add: { minArgs: 1, description: "add <time>" },
        list: { minArgs: 0, description: "list" },
        remove: { minArgs: 1, description: "remove <index>" },
        status: { minArgs: 0, description: "status" },
        test: { minArgs: 0, description: "test" }
    }
};

// Validate command arguments
const validateCommand = (commandName, subCommand, args, requiredArgs = 0) => {
    try {
        // Basic argument validation
        if (!args || !Array.isArray(args)) {
            return {
                valid: false,
                error: "Invalid arguments provided",
                usage: getUsage(commandName, subCommand)
            };
        }

        // Check if subcommand exists
        if (!COMMAND_SCHEMAS[commandName] || !COMMAND_SCHEMAS[commandName][subCommand]) {
            return {
                valid: false,
                error: `Unknown subcommand: ${subCommand}`,
                usage: getUsage(commandName)
            };
        }

        const schema = COMMAND_SCHEMAS[commandName][subCommand];

        // Check minimum arguments
        if (args.length < schema.minArgs) {
            return {
                valid: false,
                error: `Insufficient arguments. Expected at least ${schema.minArgs}, got ${args.length}`,
                usage: getUsage(commandName, subCommand)
            };
        }

        // Check required arguments (for specific validation)
        if (args.length < requiredArgs) {
            return {
                valid: false,
                error: `Missing required arguments`,
                usage: getUsage(commandName, subCommand)
            };
        }

        return { valid: true };
    } catch (error) {
        const errorResult = handleError(error, "Command Validation", ErrorTypes.VALIDATION_ERROR);
        return {
            valid: false,
            error: errorResult.userMessage,
            usage: getUsage(commandName)
        };
    }
};

// Get usage information
const getUsage = (commandName, subCommand = null) => {
    if (!COMMAND_SCHEMAS[commandName]) {
        return `Unknown command: ${commandName}`;
    }

    if (subCommand && COMMAND_SCHEMAS[commandName][subCommand]) {
        return `Usage: /${commandName} ${COMMAND_SCHEMAS[commandName][subCommand].description}`;
    }

    const subCommands = Object.keys(COMMAND_SCHEMAS[commandName]);
    const descriptions = subCommands.map(cmd => COMMAND_SCHEMAS[commandName][cmd].description);
    return `Usage: /${commandName} [${subCommands.join('|')}]`;
};

// Validate specific argument types
const validateString = (value, fieldName) => {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
        return {
            valid: false,
            error: `${fieldName} must be a non-empty string`
        };
    }
    return { valid: true, value: value.trim() };
};

const validateNumber = (value, fieldName, min = null, max = null) => {
    const num = parseInt(value);
    if (isNaN(num)) {
        return {
            valid: false,
            error: `${fieldName} must be a valid number`
        };
    }

    if (min !== null && num < min) {
        return {
            valid: false,
            error: `${fieldName} must be at least ${min}`
        };
    }

    if (max !== null && num > max) {
        return {
            valid: false,
            error: `${fieldName} must be at most ${max}`
        };
    }

    return { valid: true, value: num };
};

const validateIndex = (value, array, fieldName) => {
    // Use the shared function for consistency
    return validateArrayIndex(value, array, fieldName);
};

// Extract arguments with validation
const extractArgs = (args, schema) => {
    const result = {};

    for (const [key, config] of Object.entries(schema)) {
        const index = config.index || 0;
        const value = args[index];

        if (config.required && !value) {
            return {
                valid: false,
                error: `Missing required argument: ${key}`,
                field: key
            };
        }

        if (config.validator) {
            const validation = config.validator(value, key);
            if (!validation.valid) {
                return validation;
            }
            result[key] = validation.value;
        } else {
            result[key] = value;
        }
    }

    return { valid: true, args: result };
};

// Common validation patterns
const VALIDATION_PATTERNS = {
    taskDescription: (value) => validateString(value, "Task description"),
    taskIndex: (value, tasks) => validateIndex(value, tasks, "Task index"),
    configKey: (value) => validateString(value, "Config key"),
    configValue: (value) => validateString(value, "Config value"),
    timeInput: (value) => validateString(value, "Time input"),
    checkinIndex: (value, checkins) => validateIndex(value, checkins, "Check-in index")
};

module.exports = {
    validateCommand,
    getUsage,
    validateString,
    validateNumber,
    validateIndex,
    extractArgs,
    VALIDATION_PATTERNS,
    COMMAND_SCHEMAS
}; 