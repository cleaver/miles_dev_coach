const path = require("path");
const fs = require("fs");
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
const ensureConfigDir = () => {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
            console.log(chalk.gray(`Created config directory: ${CONFIG_DIR}`));
        }
        return true;
    } catch (error) {
        const errorResult = handleError(error, "Creating config directory", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Check if config directory is writable
const isConfigDirWritable = () => {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            return ensureConfigDir();
        }

        // Test write permissions by creating a temporary file
        const testFile = path.join(CONFIG_DIR, '.test-write');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return true;
    } catch (error) {
        const errorResult = handleError(error, "Checking config directory permissions", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Get file size safely
const getFileSize = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            return stats.size;
        }
        return 0;
    } catch (error) {
        console.error(chalk.yellow(`Failed to get file size for ${filePath}: ${error.message}`));
        return 0;
    }
};

// Check if file is corrupted (empty or invalid JSON)
const isFileCorrupted = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return false; // File doesn't exist, not corrupted
        }

        const content = fs.readFileSync(filePath, "utf8");
        if (!content.trim()) {
            return true; // Empty file is considered corrupted
        }

        JSON.parse(content); // Try to parse JSON
        return false; // Valid JSON
    } catch (error) {
        return true; // Invalid JSON is corrupted
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