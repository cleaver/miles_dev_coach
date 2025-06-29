const chalk = require("chalk").default;
const { parseTimeInput } = require("../utils/timeUtils");
const { cancelAllJobs } = require("../services/schedulerService");

const handleCheckinCommand = (args, config, saveConfig, scheduleCheckins) => {
    const subCommand = args[0];
    switch (subCommand) {
        case "add":
            const inputTime = args.slice(1).join(" "); // Can be HH:MM or interval like 1h 30m
            const parseResult = parseTimeInput(inputTime);

            if (!parseResult.success) {
                console.log(chalk.red(parseResult.error));
                return { config: config, success: false };
            }

            const checkinTimeToAdd = parseResult.time;
            if (checkinTimeToAdd) {
                if (!config.checkins) {
                    config.checkins = [];
                }
                config.checkins.push(checkinTimeToAdd);
                saveConfig(config);
                // Re-schedule all jobs to include the new one
                cancelAllJobs(); // Cancel all existing jobs
                scheduleCheckins(config, saveConfig); // Schedule all jobs again
                console.log(chalk.green(`Added check-in for ${checkinTimeToAdd}.`));
                return { config: config, success: true };
            }
            return { config: config, success: false };
        case "list":
            if (!config.checkins || config.checkins.length === 0) {
                console.log(
                    chalk.blue(
                        "No check-in times scheduled yet. Add one with /checkin add <HH:MM>"
                    )
                );
                return { config: config, success: true };
            }
            console.log(chalk.blue("Your scheduled check-in times:"));
            config.checkins.forEach((time, index) => {
                console.log(`${index + 1}. ${time}`);
            });
            return { config: config, success: true };
        case "remove":
            const removeIndex = parseInt(args[1]) - 1;
            if (
                !isNaN(removeIndex) &&
                config.checkins &&
                config.checkins[removeIndex]
            ) {
                const removedTime = config.checkins.splice(removeIndex, 1);
                saveConfig(config);
                cancelAllJobs(); // Cancel all existing jobs
                scheduleCheckins(config, saveConfig); // Schedule all jobs again
                console.log(chalk.green(`Removed check-in for ${removedTime[0]}.`));
                return { config: config, success: true };
            } else {
                console.log(chalk.red("Usage: /checkin remove <check-in number>"));
                return { config: config, success: false };
            }
        default:
            console.log(
                chalk.red("Unknown /checkin subcommand. Use: add, list, remove.")
            );
            return { config: config, success: false };
    }
};

module.exports = {
    handleCheckinCommand
}; 