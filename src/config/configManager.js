const fs = require("fs");
const chalk = require("chalk").default;
const { CONFIG_FILE, ensureConfigDir } = require("./paths");

// Load or initialize configuration
const loadConfig = () => {
    ensureConfigDir();
    let config = {};
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
        } catch (e) {
            console.error(chalk.red("Error reading config file:", e.message));
        }
    }
    return config;
};

// Save configuration
const saveConfig = (config) => {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
    } catch (e) {
        console.error(chalk.red("Error saving config file:", e.message));
    }
};

module.exports = {
    loadConfig,
    saveConfig
}; 