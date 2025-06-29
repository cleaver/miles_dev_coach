const chalk = require("chalk").default;
const { handleError, ErrorTypes, validateTimeFormat } = require("./errorHandler");

// Enhanced time input parsing with better validation
const parseTimeInput = (inputTime) => {
    try {
        // Validate input
        if (!inputTime || typeof inputTime !== 'string' || inputTime.trim().length === 0) {
            const errorResult = handleError(
                new Error("Time input is required and must be a non-empty string"),
                "Time parsing",
                ErrorTypes.VALIDATION_ERROR
            );
            return {
                success: false,
                error: errorResult.userMessage
            };
        }

        const trimmedInput = inputTime.trim();
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        const intervalRegex = /(?:(\d+)h)?(?:\s*)?(?:(\d+)m)?/;

        // Check if it's already in HH:MM format
        if (timeRegex.test(trimmedInput)) {
            const timeValidation = validateTimeFormat(trimmedInput);
            if (!timeValidation.valid) {
                return {
                    success: false,
                    error: timeValidation.error
                };
            }
            return { success: true, time: trimmedInput };
        }

        // Try to parse as interval
        const match = trimmedInput.match(intervalRegex);
        if (match && (match[1] || match[2])) {
            const hours = parseInt(match[1] || "0", 10);
            const minutes = parseInt(match[2] || "0", 10);

            // Validate interval values
            if (hours < 0 || minutes < 0) {
                return {
                    success: false,
                    error: "Interval values cannot be negative"
                };
            }

            if (hours > 24) {
                return {
                    success: false,
                    error: "Interval hours cannot exceed 24"
                };
            }

            if (minutes > 59) {
                return {
                    success: false,
                    error: "Interval minutes cannot exceed 59"
                };
            }

            if (hours === 0 && minutes === 0) {
                return {
                    success: false,
                    error: "Invalid interval. Use formats like 30m, 2h, or 1h 30m."
                };
            }

            // Calculate future time
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

    } catch (error) {
        const errorResult = handleError(error, "Parsing time input", ErrorTypes.VALIDATION_ERROR);
        return {
            success: false,
            error: errorResult.userMessage
        };
    }
};

// Validate time range (e.g., for business hours)
const validateTimeRange = (time, startTime = "09:00", endTime = "17:00") => {
    try {
        const timeValidation = validateTimeFormat(time);
        if (!timeValidation.valid) {
            return {
                valid: false,
                error: timeValidation.error
            };
        }

        const startValidation = validateTimeFormat(startTime);
        if (!startValidation.valid) {
            return {
                valid: false,
                error: `Invalid start time: ${startValidation.error}`
            };
        }

        const endValidation = validateTimeFormat(endTime);
        if (!endValidation.valid) {
            return {
                valid: false,
                error: `Invalid end time: ${endValidation.error}`
            };
        }

        // Convert times to minutes for comparison
        const timeMinutes = timeToMinutes(time);
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);

        if (timeMinutes >= startMinutes && timeMinutes <= endMinutes) {
            return { valid: true };
        } else {
            return {
                valid: false,
                error: `Time must be between ${startTime} and ${endTime}`
            };
        }

    } catch (error) {
        const errorResult = handleError(error, "Validating time range", ErrorTypes.VALIDATION_ERROR);
        return {
            valid: false,
            error: errorResult.userMessage
        };
    }
};

// Convert time string to minutes for comparison
const timeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
};

// Convert minutes to time string
const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// Get current time in HH:MM format
const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Calculate time difference
const getTimeDifference = (time1, time2) => {
    try {
        const time1Validation = validateTimeFormat(time1);
        if (!time1Validation.valid) {
            return {
                success: false,
                error: `Invalid time1: ${time1Validation.error}`
            };
        }

        const time2Validation = validateTimeFormat(time2);
        if (!time2Validation.valid) {
            return {
                success: false,
                error: `Invalid time2: ${time2Validation.error}`
            };
        }

        const minutes1 = timeToMinutes(time1);
        const minutes2 = timeToMinutes(time2);
        const difference = Math.abs(minutes2 - minutes1);

        return {
            success: true,
            minutes: difference,
            formatted: minutesToTime(difference)
        };

    } catch (error) {
        const errorResult = handleError(error, "Calculating time difference", ErrorTypes.VALIDATION_ERROR);
        return {
            success: false,
            error: errorResult.userMessage
        };
    }
};

module.exports = {
    parseTimeInput,
    validateTimeRange,
    timeToMinutes,
    minutesToTime,
    getCurrentTime,
    getTimeDifference
}; 