const chalk = require("chalk").default;
const { getHistoryFile, ensureConfigDir, isFileCorrupted } = require("../config/paths");
const { safeFileRead, safeFileWrite, handleError, ErrorTypes } = require("../utils/errorHandler");

// Default history settings
const DEFAULT_HISTORY_SETTINGS = {
    max_entries: 100,
    auto_save: true
};

// Validate history array
const validateHistoryArray = (history) => {
    if (!Array.isArray(history)) {
        return {
            valid: false,
            error: "History must be an array"
        };
    }

    const errors = [];
    history.forEach((entry, index) => {
        if (typeof entry !== 'string' || entry.trim().length === 0) {
            errors.push(`History entry ${index + 1} must be a non-empty string`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};

// Load command history with error handling
const loadHistory = async () => {
    try {
        if (!(await ensureConfigDir())) {
            console.log(chalk.red("Failed to create config directory. Starting with empty history."));
            return [];
        }

        // Check if file is corrupted
        if (await isFileCorrupted(getHistoryFile())) {
            console.log(chalk.yellow("History file appears to be corrupted. Starting with empty history."));
            return [];
        }

        const commandHistory = await safeFileRead(getHistoryFile(), []);

        // Validate loaded history
        const validation = validateHistoryArray(commandHistory);
        if (!validation.valid) {
            console.error(chalk.yellow("History validation errors:"));
            validation.errors.forEach(error => console.error(chalk.yellow(`  - ${error}`)));
            console.log(chalk.blue("Starting with empty history."));
            return [];
        }

        console.log(chalk.gray(`Loaded ${commandHistory.length} commands from history`));
        return commandHistory;
    } catch (error) {
        const errorResult = handleError(error, "Loading history", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return [];
    }
};

// Save command history with error handling
const saveHistory = async (commandHistory) => {
    try {
        if (!(await ensureConfigDir())) {
            console.log(chalk.red("Failed to create config directory. Cannot save history."));
            return false;
        }

        // Validate history before saving
        const validation = validateHistoryArray(commandHistory);
        if (!validation.valid) {
            const errorResult = handleError(
                new Error(`History validation failed: ${validation.errors.join(', ')}`),
                "Saving history",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return false;
        }

        const result = await safeFileWrite(getHistoryFile(), commandHistory);
        if (result.success) {
            return true;
        } else {
            console.log(chalk.red(result.userMessage));
            return false;
        }
    } catch (error) {
        const errorResult = handleError(error, "Saving history", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Add command to history with validation
const addToHistory = (commandHistory, command) => {
    try {
        if (!command || typeof command !== 'string' || command.trim().length === 0) {
            const errorResult = handleError(
                new Error("Command must be a non-empty string"),
                "Adding to history",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return commandHistory;
        }

        const trimmedCommand = command.trim();

        // Remove duplicate consecutive commands
        if (commandHistory[commandHistory.length - 1] !== trimmedCommand) {
            commandHistory.push(trimmedCommand);
            console.log(chalk.gray(`Added to history: "${trimmedCommand}"`));

            // Keep only last 100 commands
            if (commandHistory.length > DEFAULT_HISTORY_SETTINGS.max_entries) {
                commandHistory = commandHistory.slice(-DEFAULT_HISTORY_SETTINGS.max_entries);
            }

            if (DEFAULT_HISTORY_SETTINGS.auto_save) {
                saveHistory(commandHistory);
            }
        } else {
            console.log(chalk.gray(`Skipped duplicate command: "${trimmedCommand}"`));
        }

        return commandHistory;
    } catch (error) {
        const errorResult = handleError(error, "Adding to history", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return commandHistory;
    }
};

// Clear history
const clearHistory = async () => {
    try {
        if (!(await ensureConfigDir())) {
            console.log(chalk.red("Failed to create config directory. Cannot clear history."));
            return false;
        }

        const result = await safeFileWrite(getHistoryFile(), []);
        if (result.success) {
            console.log(chalk.green("History cleared successfully."));
            return true;
        } else {
            console.log(chalk.red(result.userMessage));
            return false;
        }
    } catch (error) {
        const errorResult = handleError(error, "Clearing history", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Backup history
const backupHistory = async () => {
    try {
        const history = await loadHistory();
        const backupFile = getHistoryFile().replace('.json', `.backup.${Date.now()}.json`);
        const result = await safeFileWrite(backupFile, history);
        if (result.success) {
            console.log(chalk.green(`History backed up to: ${backupFile}`));
            return true;
        } else {
            console.log(chalk.red(result.userMessage));
            return false;
        }
    } catch (error) {
        const errorResult = handleError(error, "Backing up history", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Get history statistics
const getHistoryStats = () => {
    try {
        const history = loadHistory();
        return {
            total_commands: history.length,
            unique_commands: new Set(history).size,
            most_recent: history[history.length - 1] || null,
            oldest: history[0] || null
        };
    } catch (error) {
        const errorResult = handleError(error, "Getting history stats", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return {
            total_commands: 0,
            unique_commands: 0,
            most_recent: null,
            oldest: null
        };
    }
};

module.exports = {
    loadHistory,
    saveHistory,
    addToHistory,
    clearHistory,
    backupHistory,
    getHistoryStats,
    validateHistoryArray
}; 