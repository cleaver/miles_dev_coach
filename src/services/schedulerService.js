const schedule = require("node-schedule");
const notifier = require("node-notifier");
const chalk = require("chalk").default;

const scheduleCheckins = (config, saveConfig) => {
    if (!config.checkins || config.checkins.length === 0) {
        return;
    }

    config.checkins.forEach((checkinTime, index) => {
        const [hours, minutes] = checkinTime.split(":").map(Number);
        schedule.scheduleJob({ hour: hours, minute: minutes, second: 0 }, () => {
            notifier.notify(
                {
                    title: "Gemini Dev Coach Check-in!",
                    message:
                        "It's time for your scheduled check-in. Open the CLI to discuss!",
                    sound: true, // Only on macOS
                    wait: true, // Wait for user to click notification before closing
                },
                function (err, response) {
                    // Response is response from OS
                }
            );
            console.log(
                chalk.green(`
--- Scheduled Check-in (${checkinTime}) ---`)
            );
            console.log(
                chalk.blue(
                    "AI Coach: Hello! It's time for our check-in. How are things going?"
                )
            );
            // In a real scenario, this would trigger a specific AI conversation flow

            // Remove the triggered check-in and re-schedule
            const triggeredIndex = config.checkins.indexOf(checkinTime);
            if (triggeredIndex > -1) {
                config.checkins.splice(triggeredIndex, 1);
                saveConfig(config);
                schedule.cancelJob(); // Cancel all existing jobs
                scheduleCheckins(config, saveConfig); // Schedule all jobs again
                console.log(chalk.green(`Check-in for ${checkinTime} completed and removed.`));
            }
        });
        console.log(chalk.green(`Scheduled daily check-in for ${checkinTime}`));
    });
};

const cancelAllJobs = () => {
    schedule.cancelJob(); // Cancel all existing jobs
};

module.exports = {
    scheduleCheckins,
    cancelAllJobs
}; 