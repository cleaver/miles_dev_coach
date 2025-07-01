const schedule = require("node-schedule");
const notifier = require("node-notifier");
const chalk = require("chalk").default;
const { handleError, ErrorTypes, validateTimeFormat } = require("../utils/errorHandler");

// Validate checkin configuration
const validateCheckinConfig = (checkins) => {
    if (!Array.isArray(checkins)) {
        return {
            valid: false,
            error: "Checkins must be an array"
        };
    }

    const errors = [];
    checkins.forEach((checkin, index) => {
        const timeValidation = validateTimeFormat(checkin);
        if (!timeValidation.valid) {
            errors.push(`Checkin ${index + 1}: ${timeValidation.error}`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};

// Schedule checkins with error handling
const scheduleCheckins = (config, saveConfig) => {
    try {
        if (!config.checkins || config.checkins.length === 0) {
            console.log(chalk.gray("No check-ins scheduled."));
            return { success: true, scheduled: 0 };
        }

        // Validate checkin configuration
        const validation = validateCheckinConfig(config.checkins);
        if (!validation.valid) {
            const errorResult = handleError(
                new Error(`Checkin validation failed: ${validation.errors.join(', ')}`),
                "Scheduling checkins",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return { success: false, error: errorResult.userMessage };
        }

        let scheduledCount = 0;

        config.checkins.forEach((checkinTime, index) => {
            try {
                const [hours, minutes] = checkinTime.split(":").map(Number);

                // Validate time components
                if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                    console.log(chalk.red(`Invalid time format for checkin ${index + 1}: ${checkinTime}`));
                    return;
                }

                const job = schedule.scheduleJob({ hour: hours, minute: minutes, second: 0 }, () => {
                    try {
                        // Send notification
                        notifier.notify(
                            {
                                title: "Miles Dev Coach Check-in!",
                                message: "It's time for your scheduled check-in. Open the CLI to discuss!",
                                sound: true, // Only on macOS
                                wait: true, // Wait for user to click notification before closing
                            },
                            function (err, response) {
                                if (err) {
                                    console.log(chalk.yellow(`Notification error: ${err.message}`));
                                }
                            }
                        );

                        console.log(chalk.green(`\n--- Scheduled Check-in (${checkinTime}) ---`));
                        console.log(chalk.blue("AI Coach: Hello! It's time for our check-in. How are things going?"));

                        // Remove the triggered check-in and re-schedule
                        const triggeredIndex = config.checkins.indexOf(checkinTime);
                        if (triggeredIndex > -1) {
                            config.checkins.splice(triggeredIndex, 1);
                            if (saveConfig(config)) {
                                schedule.cancelJob(); // Cancel all existing jobs
                                scheduleCheckins(config, saveConfig); // Schedule all jobs again
                                console.log(chalk.green(`Check-in for ${checkinTime} completed and removed.`));
                            } else {
                                console.log(chalk.red("Failed to save configuration after check-in."));
                            }
                        }

                    } catch (error) {
                        const errorResult = handleError(error, "Executing check-in", ErrorTypes.UNKNOWN_ERROR);
                        console.log(chalk.red(errorResult.userMessage));
                    }
                });

                if (job) {
                    scheduledCount++;
                    console.log(chalk.green(`Scheduled daily check-in for ${checkinTime}`));
                } else {
                    console.log(chalk.red(`Failed to schedule check-in for ${checkinTime}`));
                }

            } catch (error) {
                const errorResult = handleError(error, `Scheduling checkin ${index + 1}`, ErrorTypes.UNKNOWN_ERROR);
                console.log(chalk.red(errorResult.userMessage));
            }
        });

        return { success: true, scheduled: scheduledCount };

    } catch (error) {
        const errorResult = handleError(error, "Scheduling checkins", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return { success: false, error: errorResult.userMessage };
    }
};

// Cancel all scheduled jobs with error handling
const cancelAllJobs = () => {
    try {
        const canceledJobs = schedule.cancelJob(); // Cancel all existing jobs
        console.log(chalk.gray("All scheduled jobs canceled."));
        return { success: true, canceled: canceledJobs };
    } catch (error) {
        const errorResult = handleError(error, "Canceling jobs", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return { success: false, error: errorResult.userMessage };
    }
};

// Get scheduled jobs info
const getScheduledJobsInfo = () => {
    try {
        const jobs = schedule.scheduledJobs;
        const jobCount = Object.keys(jobs).length;

        return {
            success: true,
            jobCount,
            jobs: Object.keys(jobs)
        };
    } catch (error) {
        const errorResult = handleError(error, "Getting scheduled jobs info", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return { success: false, error: errorResult.userMessage };
    }
};

// Test notification system
const testNotification = () => {
    try {
        notifier.notify(
            {
                title: "Test Notification",
                message: "This is a test notification from Miles Dev Coach",
                sound: true,
                wait: true,
            },
            function (err, response) {
                if (err) {
                    console.log(chalk.red(`Test notification failed: ${err.message}`));
                } else {
                    console.log(chalk.green("Test notification sent successfully."));
                }
            }
        );
        return { success: true };
    } catch (error) {
        const errorResult = handleError(error, "Testing notification", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return { success: false, error: errorResult.userMessage };
    }
};

module.exports = {
    scheduleCheckins,
    cancelAllJobs,
    getScheduledJobsInfo,
    testNotification,
    validateCheckinConfig
}; 