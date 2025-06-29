const chalk = require("chalk").default;

// Parse time input (HH:MM or interval like 1h 30m)
const parseTimeInput = (inputTime) => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const intervalRegex = /(?:(\d+)h)?(?:\s*)?(?:(\d+)m)?/;

    if (timeRegex.test(inputTime)) {
        // If it's already HH:MM format
        return { success: true, time: inputTime };
    } else {
        // Try to parse as interval
        const match = inputTime.match(intervalRegex);
        if (match && (match[1] || match[2])) {
            const hours = parseInt(match[1] || "0", 10);
            const minutes = parseInt(match[2] || "0", 10);

            if (hours === 0 && minutes === 0) {
                return {
                    success: false,
                    error: "Invalid interval. Use formats like 30m, 2h, or 1h 30m."
                };
            }

            const now = new Date();
            now.setHours(now.getHours() + hours);
            now.setMinutes(now.getMinutes() + minutes);

            const futureHours = String(now.getHours()).padStart(2, '0');
            const futureMinutes = String(now.getMinutes()).padStart(2, '0');
            const calculatedTime = `${futureHours}:${futureMinutes}`;

            return { success: true, time: calculatedTime };
        } else {
            return {
                success: false,
                error: "Usage: <HH:MM> or <interval> (e.g., 14:30, 30m, 2h, 1h 30m)"
            };
        }
    }
};

module.exports = {
    parseTimeInput
}; 