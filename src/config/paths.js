const path = require("path");
const fs = require("fs").promises;
const chalk = require("chalk").default;
const { handleError, ErrorTypes } = require("../utils/errorHandler");

// Configuration and Data Paths
const CONFIG_DIR = path.join(
    process.env.HOME || process.env.USERPROFILE,
    ".gemini-dev-coach"
);
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const TASKS_FILE = path.join(CONFIG_DIR, "tasks.json");
const HISTORY_FILE = path.join(CONFIG_DIR, "history.json");

// Ensure config directory exists with error handling
const ensureConfigDir = async () => {
    try {
        await fs.access(CONFIG_DIR);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(CONFIG_DIR, { recursive: true });
            console.log(chalk.gray(`Created config directory: ${CONFIG_DIR}`));
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
        await fs.access(CONFIG_DIR);

        // Test write permissions by creating a temporary file
        const testFile = path.join(CONFIG_DIR, '.test-write');
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
    CONFIG_DIR,
    CONFIG_FILE,
    TASKS_FILE,
    HISTORY_FILE,
    ensureConfigDir,
    isConfigDirWritable,
    getFileSize,
    isFileCorrupted
}; 