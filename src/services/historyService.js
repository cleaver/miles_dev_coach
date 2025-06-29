const fs = require("fs");
const chalk = require("chalk").default;
const { HISTORY_FILE, ensureConfigDir } = require("../config/paths");

// Load command history
const loadHistory = () => {
    ensureConfigDir();
    let commandHistory = [];
    if (fs.existsSync(HISTORY_FILE)) {
        try {
            commandHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
            console.log(chalk.gray(`Loaded ${commandHistory.length} commands from history`));
        } catch (e) {
            console.error(chalk.red("Error reading history file:", e.message));
            commandHistory = [];
        }
    } else {
        console.log(chalk.gray("No history file found, starting fresh"));
    }
    return commandHistory;
};

// Save command history
const saveHistory = (commandHistory) => {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(commandHistory, null, 2), "utf8");
        console.log(chalk.gray(`Saved ${commandHistory.length} commands to history`));
    } catch (e) {
        console.error(chalk.red("Error saving history file:", e.message));
    }
};

// Add command to history
const addToHistory = (commandHistory, command) => {
    if (command && command.trim()) {
        // Remove duplicate consecutive commands
        if (commandHistory[commandHistory.length - 1] !== command) {
            commandHistory.push(command);
            console.log(chalk.gray(`Added to history: "${command}"`));
            // Keep only last 100 commands
            if (commandHistory.length > 100) {
                commandHistory = commandHistory.slice(-100);
            }
            saveHistory(commandHistory);
        } else {
            console.log(chalk.gray(`Skipped duplicate command: "${command}"`));
        }
    }
    return commandHistory;
};

module.exports = {
    loadHistory,
    saveHistory,
    addToHistory
}; 