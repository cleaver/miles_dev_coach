const path = require("path");
const fs = require("fs");

// Configuration and Data Paths
const CONFIG_DIR = path.join(
    process.env.HOME || process.env.USERPROFILE,
    ".gemini-dev-coach"
);
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const TASKS_FILE = path.join(CONFIG_DIR, "tasks.json");
const HISTORY_FILE = path.join(CONFIG_DIR, "history.json");

// Ensure config directory exists
const ensureConfigDir = () => {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
};

module.exports = {
    CONFIG_DIR,
    CONFIG_FILE,
    TASKS_FILE,
    HISTORY_FILE,
    ensureConfigDir
}; 