const chalk = require("chalk").default;
const crypto = require("crypto");
const { parseTimeInput } = require("../utils/timeUtils");
const { cancelAllJobs, getScheduledJobsInfo, testNotification } = require("../services/schedulerService");
const { handleError, ErrorTypes } = require("../utils/errorHandler");
const { validateCommand, getUsage, validateString, validateIndex } = require("../utils/commandValidator");

const handleCheckinCommand = async (args, config, saveConfig, scheduleCheckins) => {
    try {
        // Basic argument validation
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

        // Validate command structure
        const commandValidation = validateCommand('checkin', subCommand, args.slice(1));
        if (!commandValidation.valid) {
            console.log(chalk.red(commandValidation.error));
            console.log(chalk.blue(commandValidation.usage));
            return { config: config, success: false };
        }

        switch (subCommand) {
            case "add":
                const inputTime = args.slice(1).join(" ");
                const timeValidation = validateString(inputTime, "Time input");
                if (!timeValidation.valid) {
                    console.log(chalk.red(timeValidation.error));
                    console.log(chalk.blue(getUsage('checkin', 'add')));
                    return { config: config, success: false };
                }

                const parseResult = parseTimeInput(timeValidation.value);
                if (!parseResult.success) {
                    console.log(chalk.red(parseResult.error));
                    console.log(chalk.blue(getUsage('checkin', 'add')));
                    return { config: config, success: false };
                }

                const checkinTimeToAdd = parseResult.time;

                // Initialize checkins array if it doesn't exist
                if (!config.checkins) {
                    config.checkins = [];
                }

                // Check for duplicate times
                const existingCheckin = config.checkins.find(checkin => checkin.time === checkinTimeToAdd);
                if (existingCheckin) {
                    console.log(chalk.yellow(`Check-in for ${checkinTimeToAdd} already exists.`));
                    return { config: config, success: false };
                }

                // Generate unique ID for the new check-in
                const checkinId = crypto.randomUUID();

                // Add the check-in time with ID
                config.checkins.push({ time: checkinTimeToAdd, id: checkinId });
                const saveResult = await saveConfig(config);

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
                            await saveConfig(config);
                            return { config: config, success: false };
                        }
                    } else {
                        console.log(chalk.red(`Failed to cancel existing jobs: ${cancelResult.error}`));
                        // Remove the check-in if cancellation failed
                        config.checkins.pop();
                        await saveConfig(config);
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
                config.checkins.forEach((checkin, index) => {
                    console.log(`${index + 1}. ${checkin.time}`);
                });
                return { config: config, success: true };

            case "remove":
                const removeIndex = args[1];
                const removeValidation = validateIndex(removeIndex, config.checkins || [], "Check-in index");
                if (!removeValidation.valid) {
                    console.log(chalk.red(removeValidation.error));
                    console.log(chalk.blue(getUsage('checkin', 'remove')));
                    return { config: config, success: false };
                }

                if (config.checkins && config.checkins[removeValidation.value]) {
                    const removedCheckin = config.checkins.splice(removeValidation.value, 1)[0];
                    const removedTime = removedCheckin.time;
                    const saveResult = await saveConfig(config);

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
                console.log(chalk.red(`Unknown /checkin subcommand: ${subCommand}`));
                console.log(chalk.blue(getUsage('checkin')));
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