const schedule = require("node-schedule");
const notifier = require("node-notifier");
const chalk = require("chalk").default;
const { handleError, ErrorTypes, validateTimeFormat } = require("../utils/errorHandler");

// Import services for AI-powered check-ins
const { loadTasks } = require("./taskService");
const { getAiResponse } = require("./aiService");
const { addExecutedCheckin } = require("./dailyCheckinService");

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
        // Validate checkin object structure
        if (!checkin || typeof checkin !== 'object') {
            errors.push(`Checkin ${index + 1}: must be an object`);
            return;
        }

        if (!checkin.time || typeof checkin.time !== 'string') {
            errors.push(`Checkin ${index + 1}: must have a 'time' property (string)`);
            return;
        }

        if (!checkin.id || typeof checkin.id !== 'string') {
            errors.push(`Checkin ${index + 1}: must have an 'id' property (string)`);
            return;
        }

        // Validate the time format
        const timeValidation = validateTimeFormat(checkin.time);
        if (!timeValidation.valid) {
            errors.push(`Checkin ${index + 1}: ${timeValidation.error}`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};

// Create intelligent prompt based on task context
const createSmartPrompt = (tasks, missedCheckins) => {
    const taskSummary = {
        inProgress: tasks.filter(t => t.status === 'in-progress').map(t => t.description),
        onHold: tasks.filter(t => t.status === 'on-hold').map(t => t.description),
        pending: tasks.filter(t => t.status === 'pending').length,
        completedToday: tasks.filter(t => {
            const completedDate = new Date(t.updated_at);
            const today = new Date();
            return t.status === 'completed' && completedDate.toDateString() === today.toDateString();
        }).length
    };

    let prompt = `You are a friendly and encouraging developer productivity coach. It's time for a scheduled check-in. Here is a summary of the user's tasks: ${JSON.stringify(taskSummary, null, 2)}.
    
    Generate a concise, motivating message based on this summary. Keep it under 150 words and be encouraging.`;

    // Add missed check-ins context if any exist
    if (missedCheckins && missedCheckins.length > 0) {
        const missedCount = missedCheckins.length;
        const missedDays = [...new Set(missedCheckins.map(m => m.date))].length;
        prompt += `\n\nNote: The user has missed ${missedCount} check-in(s) across ${missedDays} day(s). Be encouraging and understanding - life happens! Gently acknowledge this without being accusatory, and focus on moving forward positively.`;
    }

    // Add specific instructions based on the state
    if (taskSummary.inProgress.length > 0) {
        prompt += ` The user is currently working on: "${taskSummary.inProgress[0]}". Ask how it's going.`;
    }
    if (taskSummary.onHold.length > 0) {
        prompt += ` Acknowledge the tasks on hold and suggest coming back to them later.`;
    }
    if (taskSummary.completedToday > 0) {
        prompt += ` Congratulate them for completing ${taskSummary.completedToday} task(s) today!`;
    }
    if (taskSummary.inProgress.length === 0 && taskSummary.onHold.length === 0 && taskSummary.pending > 0) {
        prompt += ` Gently nudge them to start one of their pending tasks.`;
    }

    return prompt;
};

// Schedule checkins with error handling
const scheduleCheckins = (config, aiApiKey, saveConfig) => {
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

        config.checkins.forEach((checkin, index) => {
            try {
                const checkinTime = checkin.time;
                const [hours, minutes] = checkinTime.split(":").map(Number);

                // Validate time components
                if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                    console.log(chalk.red(`Invalid time format for checkin ${index + 1}: ${checkinTime}`));
                    return;
                }

                const job = schedule.scheduleJob({ hour: hours, minute: minutes, second: 0 }, async () => {
                    try {
                        // Record the executed check-in immediately
                        await addExecutedCheckin(checkin.id);

                        // Update last successful check-in timestamp
                        config.last_successful_checkin = new Date().toISOString();
                        await saveConfig(config);

                        // --- 1. GATHER CONTEXT ---
                        const tasks = await loadTasks();
                        const apiKey = aiApiKey || config.ai_api_key;

                        // If no tasks or no API key, do nothing.
                        if (!tasks || tasks.length === 0 || !apiKey) {
                            console.log(chalk.gray("Check-in skipped: No tasks or API key."));
                            return;
                        }

                        // Get missed check-ins for this specific check-in
                        const { getMissedCheckins } = require("./dailyCheckinService");
                        const missed = await getMissedCheckins(config.checkins, config.last_successful_checkin);

                        // --- 2. CRAFT THE SMART PROMPT ---
                        const smartPrompt = createSmartPrompt(tasks, missed);

                        // --- 3. GET AI RESPONSE ---
                        // We strip the color codes for the notification
                        const aiResponse = await getAiResponse(smartPrompt, apiKey);
                        const uncoloredResponse = aiResponse.replace(/[\u001b\u009b][[()#;?]*.{0,2}m/g, ''); // Removes chalk colors

                        // --- 4. DELIVER THE NUDGE ---
                        notifier.notify({
                            title: "Miles Dev Coach Check-in! 🤖",
                            message: uncoloredResponse, // Use the AI's message
                            sound: true,
                            wait: true,
                        });

                        // Also log it to the console if the app is active
                        console.log(chalk.green(`\n--- 🤖 AI Check-in (${checkinTime}) ---`));
                        console.log(aiResponse);

                        console.log(chalk.green(`Check-in for ${checkinTime} executed successfully.`));

                    } catch (error) {
                        const errorResult = handleError(error, "Executing AI check-in", ErrorTypes.UNKNOWN_ERROR);
                        console.log(chalk.red(errorResult.userMessage));
                    }
                });

                if (job) {
                    scheduledCount++;
                    console.log(chalk.green(`Scheduled daily AI check-in for ${checkinTime}`));
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
    validateCheckinConfig,
    createSmartPrompt
}; 