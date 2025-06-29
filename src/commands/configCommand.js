const chalk = require("chalk").default;

const handleConfigCommand = (args, config, saveConfig) => {
    const subCommand = args[0];
    switch (subCommand) {
        case "set":
            const key = args[1];
            const value = args.slice(2).join(" ");
            if (key && value) {
                config[key] = value;
                saveConfig(config);
                console.log(chalk.green(`Config set: ${key} = ${value}`));
                return { config: config, success: true };
            } else {
                console.log(chalk.red("Usage: /config set <key> <value>"));
                return { config: config, success: false };
            }
        case "get":
            const getKey = args[1];
            if (getKey) {
                if (config[getKey] !== undefined) {
                    console.log(chalk.blue(`Config ${getKey}: ${config[getKey]}`));
                } else {
                    console.log(chalk.yellow(`Config key "${getKey}" not found.`));
                }
                return { config: config, success: true };
            } else {
                console.log(chalk.red("Usage: /config get <key>"));
                return { config: config, success: false };
            }
        case "list":
            if (Object.keys(config).length === 0) {
                console.log(chalk.blue("No configuration settings yet."));
                return { config: config, success: true };
            }
            console.log(chalk.blue("Current configuration:"));
            for (const key in config) {
                console.log(`  ${key}: ${config[key]}`);
            }
            return { config: config, success: true };
        default:
            console.log(
                chalk.red("Unknown /config subcommand. Use: set, get, list.")
            );
            return { config: config, success: false };
    }
};

module.exports = {
    handleConfigCommand
}; 