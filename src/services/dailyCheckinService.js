const chalk = require("chalk").default;
const { getDailyCheckinLogFile, ensureConfigDir, isFileCorrupted } = require("../config/paths");
const { safeFileRead, safeFileWrite, handleError, ErrorTypes } = require("../utils/errorHandler");

// Default daily check-in log
const DEFAULT_DAILY_CHECKIN_LOG = [];

// Validate daily check-in log structure
const validateDailyCheckinLog = (log) => {
    if (!Array.isArray(log)) {
        return {
            valid: false,
            error: "Daily check-in log must be an array"
        };
    }

    const errors = [];
    log.forEach((entry, index) => {
        if (typeof entry !== 'object' || entry === null) {
            errors.push(`Daily check-in entry ${index + 1} must be an object`);
            return;
        }

        // Validate required fields
        if (!entry.timestamp || typeof entry.timestamp !== 'string') {
            errors.push(`Daily check-in entry ${index + 1} must have a valid timestamp`);
        }

        if (!entry.content || typeof entry.content !== 'string' || entry.content.trim().length === 0) {
            errors.push(`Daily check-in entry ${index + 1} must have non-empty content`);
        }

        // Validate optional fields
        if (entry.mood && typeof entry.mood !== 'string') {
            errors.push(`Daily check-in entry ${index + 1} mood must be a string`);
        }

        if (entry.energy && (typeof entry.energy !== 'number' || entry.energy < 1 || entry.energy > 10)) {
            errors.push(`Daily check-in entry ${index + 1} energy must be a number between 1 and 10`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};

// Load daily check-in log with error handling
const loadDailyCheckinLog = async () => {
    try {
        if (!(await ensureConfigDir())) {
            console.log(chalk.red("Failed to create config directory. Starting with empty daily check-in log."));
            return DEFAULT_DAILY_CHECKIN_LOG;
        }

        // Check if file is corrupted
        if (await isFileCorrupted(getDailyCheckinLogFile())) {
            console.log(chalk.yellow("Daily check-in log file appears to be corrupted. Starting with empty log."));
            return DEFAULT_DAILY_CHECKIN_LOG;
        }

        const dailyCheckinLog = await safeFileRead(getDailyCheckinLogFile(), DEFAULT_DAILY_CHECKIN_LOG);

        // Validate loaded log
        const validation = validateDailyCheckinLog(dailyCheckinLog);
        if (!validation.valid) {
            console.error(chalk.yellow("Daily check-in log validation errors:"));
            validation.errors.forEach(error => console.error(chalk.yellow(`  - ${error}`)));
            console.log(chalk.blue("Starting with empty daily check-in log."));
            return DEFAULT_DAILY_CHECKIN_LOG;
        }

        console.log(chalk.gray(`Loaded ${dailyCheckinLog.length} daily check-ins from log`));
        return dailyCheckinLog;
    } catch (error) {
        const errorResult = handleError(error, "Loading daily check-in log", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return DEFAULT_DAILY_CHECKIN_LOG;
    }
};

// Save daily check-in log with error handling
const saveDailyCheckinLog = async (log) => {
    try {
        if (!(await ensureConfigDir())) {
            console.log(chalk.red("Failed to create config directory. Cannot save daily check-in log."));
            return false;
        }

        // Validate log before saving
        const validation = validateDailyCheckinLog(log);
        if (!validation.valid) {
            const errorResult = handleError(
                new Error(`Daily check-in log validation failed: ${validation.errors.join(', ')}`),
                "Saving daily check-in log",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return false;
        }

        const result = await safeFileWrite(getDailyCheckinLogFile(), log);
        if (result.success) {
            return true;
        } else {
            console.log(chalk.red(result.userMessage));
            return false;
        }
    } catch (error) {
        const errorResult = handleError(error, "Saving daily check-in log", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Add daily check-in entry with validation
const addDailyCheckin = async (content, mood = null, energy = null) => {
    try {
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            const errorResult = handleError(
                new Error("Daily check-in content must be a non-empty string"),
                "Adding daily check-in",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return false;
        }

        const log = await loadDailyCheckinLog();

        const newEntry = {
            timestamp: new Date().toISOString(),
            content: content.trim(),
            ...(mood && { mood }),
            ...(energy && { energy })
        };

        log.push(newEntry);

        const success = await saveDailyCheckinLog(log);
        if (success) {
            console.log(chalk.green("Daily check-in added successfully."));
            return true;
        } else {
            console.log(chalk.red("Failed to save daily check-in."));
            return false;
        }
    } catch (error) {
        const errorResult = handleError(error, "Adding daily check-in", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Clear daily check-in log
const clearDailyCheckinLog = async () => {
    try {
        if (!(await ensureConfigDir())) {
            console.log(chalk.red("Failed to create config directory. Cannot clear daily check-in log."));
            return false;
        }

        const result = await safeFileWrite(getDailyCheckinLogFile(), DEFAULT_DAILY_CHECKIN_LOG);
        if (result.success) {
            console.log(chalk.green("Daily check-in log cleared successfully."));
            return true;
        } else {
            console.log(chalk.red(result.userMessage));
            return false;
        }
    } catch (error) {
        const errorResult = handleError(error, "Clearing daily check-in log", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Get daily check-in statistics
const getDailyCheckinStats = async () => {
    try {
        const log = await loadDailyCheckinLog();
        return {
            total_entries: log.length,
            most_recent: log[log.length - 1] || null,
            oldest: log[0] || null,
            average_energy: log.length > 0
                ? log.reduce((sum, entry) => sum + (entry.energy || 0), 0) / log.filter(entry => entry.energy).length
                : 0
        };
    } catch (error) {
        const errorResult = handleError(error, "Getting daily check-in stats", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return {
            total_entries: 0,
            most_recent: null,
            oldest: null,
            average_energy: 0
        };
    }
};

module.exports = {
    loadDailyCheckinLog,
    saveDailyCheckinLog,
    addDailyCheckin,
    clearDailyCheckinLog,
    getDailyCheckinStats,
    validateDailyCheckinLog,
    DEFAULT_DAILY_CHECKIN_LOG
}; 