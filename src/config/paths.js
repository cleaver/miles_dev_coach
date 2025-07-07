const path = require("path");
const fs = require("fs").promises;
const chalk = require("chalk").default;
const { handleError, ErrorTypes } = require("../utils/errorHandler");

// Default configuration and data paths
const getDefaultConfigDir = () => path.join(
    process.env.HOME || process.env.USERPROFILE,
    ".miles-dev-coach"
);

// Global variable to store custom data directory
let customDataDir = null;

// Set custom data directory
const setCustomDataDir = (dir) => {
    customDataDir = dir;
};

// Get the current config directory (custom or default)
const getConfigDir = () => {
    return customDataDir || getDefaultConfigDir();
};

// Configuration and Data Paths
const getConfigFile = () => path.join(getConfigDir(), "config.json");
const getTasksFile = () => path.join(getConfigDir(), "tasks.json");
const getHistoryFile = () => path.join(getConfigDir(), "history.json");
const getDailyCheckinLogFile = () => path.join(getConfigDir(), "daily_checkin_log.json");

// Ensure config directory exists with error handling
const ensureConfigDir = async () => {
    try {
        const configDir = getConfigDir();
        await fs.access(configDir);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(configDir, { recursive: true });
            console.log(chalk.gray(`Created config directory: ${configDir}`));
            return true;
        }
        const errorResult = handleError(error, "Creating config directory", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Check if config directory is writable
const isConfigDirWritable = async () => {
    try {
        const configDir = getConfigDir();
        await fs.access(configDir);

        // Test write permissions by creating a temporary file
        const testFile = path.join(configDir, '.test-write');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return await ensureConfigDir();
        }
        const errorResult = handleError(error, "Checking config directory permissions", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Get file size safely
const getFileSize = async (filePath) => {
    try {
        const stats = await fs.stat(filePath);
        return stats.size;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return 0;
        }
        console.error(chalk.yellow(`Failed to get file size for ${filePath}: ${error.message}`));
        return 0;
    }
};

// Check if file is corrupted (empty or invalid JSON)
const isFileCorrupted = async (filePath) => {
    try {
        const content = await fs.readFile(filePath, "utf8");
        if (!content.trim()) {
            return true; // Empty file is considered corrupted
        }
        JSON.parse(content); // Try to parse JSON
        return false; // Valid JSON
    } catch (error) {
        if (error.code === 'ENOENT') {
            return false; // File doesn't exist, not corrupted
        }
        return true; // Invalid JSON or other error is corrupted
    }
};

module.exports = {
    // New function exports
    getConfigDir,
    getConfigFile,
    getTasksFile,
    getHistoryFile,
    getDailyCheckinLogFile,
    setCustomDataDir,
    ensureConfigDir,
    isConfigDirWritable,
    getFileSize,
    isFileCorrupted
}; 