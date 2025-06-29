const chalk = require("chalk").default;
const { parseTimeInput } = require("../utils/timeUtils");
const { cancelAllJobs, getScheduledJobsInfo, testNotification } = require("../services/schedulerService");
const { handleError, ErrorTypes } = require("../utils/errorHandler");

const handleCheckinCommand = (args, config, saveConfig, scheduleCheckins) => {
    try {
        // Validate input arguments
        if (!args || !Array.isArray(args) || args.length === 0) {
            const errorResult = handleError(
                new Error("Checkin command requires arguments"),
                "Checkin Command",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            console.log(chalk.blue("Usage: /checkin [add <time>|list|remove <index>|status|test]"));
            return { config: config, success: false };
        }

        const subCommand = args[0];

        switch (subCommand) {
            case "add":
                if (args.length < 2) {
                    const errorResult = handleError(
                        new Error("Checkin add requires a time"),
                        "Checkin Add Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    console.log(chalk.blue("Usage: /checkin add <HH:MM> or <interval> (e.g., 14:30, 30m, 2h)"));
                    return { config: config, success: false };
                }

                const inputTime = args.slice(1).join(" ");
                const parseResult = parseTimeInput(inputTime);

                if (!parseResult.success) {
                    const errorResult = handleError(
                        new Error(parseResult.error),
                        "Checkin Add Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    return { config: config, success: false };
                }

                const checkinTimeToAdd = parseResult.time;

                // Initialize checkins array if it doesn't exist
                if (!config.checkins) {
                    config.checkins = [];
                }

                // Check for duplicate times
                if (config.checkins.includes(checkinTimeToAdd)) {
                    console.log(chalk.yellow(`Check-in for ${checkinTimeToAdd} already exists.`));
                    return { config: config, success: false };
                }

                // Add the check-in time
                config.checkins.push(checkinTimeToAdd);
                const saveResult = saveConfig(config);

                if (saveResult) {
                    // Re-schedule all jobs to include the new one
                    const cancelResult = cancelAllJobs();
                    if (cancelResult.success) {
                        const scheduleResult = scheduleCheckins(config, saveConfig);
                        if (scheduleResult.success) {
                            console.log(chalk.green(`Added check-in for ${checkinTimeToAdd}.`));
                            return { config: config, success: true };
                        } else {
                            console.log(chalk.red(`Failed to schedule check-in: ${scheduleResult.error}`));
                            // Remove the check-in if scheduling failed
                            config.checkins.pop();
                            saveConfig(config);
                            return { config: config, success: false };
                        }
                    } else {
                        console.log(chalk.red(`Failed to cancel existing jobs: ${cancelResult.error}`));
                        // Remove the check-in if cancellation failed
                        config.checkins.pop();
                        saveConfig(config);
                        return { config: config, success: false };
                    }
                } else {
                    console.log(chalk.red("Failed to save configuration. Please try again."));
                    return { config: config, success: false };
                }

            case "list":
                if (!config.checkins || config.checkins.length === 0) {
                    console.log(chalk.blue("No check-in times scheduled yet. Add one with /checkin add <HH:MM>"));
                    return { config: config, success: true };
                }

                console.log(chalk.blue("Your scheduled check-in times:"));
                config.checkins.forEach((time, index) => {
                    console.log(`${index + 1}. ${time}`);
                });
                return { config: config, success: true };

            case "remove":
                if (args.length < 2) {
                    const errorResult = handleError(
                        new Error("Checkin remove requires an index"),
                        "Checkin Remove Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    console.log(chalk.blue("Usage: /checkin remove <check-in number>"));
                    return { config: config, success: false };
                }

                const removeIndex = parseInt(args[1]) - 1;

                if (isNaN(removeIndex) || removeIndex < 0 || removeIndex >= (config.checkins?.length || 0)) {
                    const errorResult = handleError(
                        new Error(`Check-in index must be between 1 and ${config.checkins?.length || 0}`),
                        "Checkin Remove Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    return { config: config, success: false };
                }

                if (config.checkins && config.checkins[removeIndex]) {
                    const removedTime = config.checkins.splice(removeIndex, 1)[0];
                    const saveResult = saveConfig(config);

                    if (saveResult) {
                        const cancelResult = cancelAllJobs();
                        if (cancelResult.success) {
                            const scheduleResult = scheduleCheckins(config, saveConfig);
                            if (scheduleResult.success) {
                                console.log(chalk.green(`Removed check-in for ${removedTime}.`));
                                return { config: config, success: true };
                            } else {
                                console.log(chalk.red(`Failed to reschedule check-ins: ${scheduleResult.error}`));
                                return { config: config, success: false };
                            }
                        } else {
                            console.log(chalk.red(`Failed to cancel jobs: ${cancelResult.error}`));
                            return { config: config, success: false };
                        }
                    } else {
                        console.log(chalk.red("Failed to save configuration. Please try again."));
                        return { config: config, success: false };
                    }
                } else {
                    console.log(chalk.red("Check-in not found."));
                    return { config: config, success: false };
                }

            case "status":
                const statusResult = getScheduledJobsInfo();
                if (statusResult.success) {
                    console.log(chalk.blue(`Scheduled jobs: ${statusResult.jobCount}`));
                    if (statusResult.jobCount > 0) {
                        console.log(chalk.gray("Active check-ins:"));
                        statusResult.jobs.forEach((job, index) => {
                            console.log(`  ${index + 1}. ${job}`);
                        });
                    }
                } else {
                    console.log(chalk.red(`Failed to get status: ${statusResult.error}`));
                }
                return { config: config, success: statusResult.success };

            case "test":
                console.log(chalk.blue("Testing notification system..."));
                const testResult = testNotification();
                if (testResult.success) {
                    console.log(chalk.green("Notification test completed."));
                } else {
                    console.log(chalk.red(`Notification test failed: ${testResult.error}`));
                }
                return { config: config, success: testResult.success };

            default:
                const errorResult = handleError(
                    new Error(`Unknown /checkin subcommand: ${subCommand}`),
                    "Checkin Command",
                    ErrorTypes.VALIDATION_ERROR
                );
                console.log(chalk.red(errorResult.userMessage));
                console.log(chalk.blue("Available commands: add, list, remove, status, test"));
                return { config: config, success: false };
        }

    } catch (error) {
        const errorResult = handleError(error, "Checkin Command", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return { config: config, success: false };
    }
};

module.exports = {
    handleCheckinCommand
}; 