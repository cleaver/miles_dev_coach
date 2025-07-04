const chalk = require("chalk").default;
const { getTasksFile, ensureConfigDir, isFileCorrupted } = require("../config/paths");
const { safeFileRead, safeFileWrite, handleError, ErrorTypes, validateTaskIndex } = require("../utils/errorHandler");

// Default task structure
const DEFAULT_TASK = {
    id: 1,
    description: "",
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

// Task state machine constants
const TASK_STATES = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    ON_HOLD: 'on-hold',
    COMPLETED: 'completed'
};

// Validate task structure
const validateTask = (task) => {
    const errors = [];

    if (!task.description || typeof task.description !== 'string' || task.description.trim().length === 0) {
        errors.push("Task description is required and must be a non-empty string");
    }

    if (!task.status || !['pending', 'in-progress', 'on-hold', 'completed'].includes(task.status)) {
        errors.push("Task status must be one of: pending, in-progress, on-hold, completed");
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

// Validate tasks array
const validateTasksArray = (tasks) => {
    if (!Array.isArray(tasks)) {
        return {
            valid: false,
            error: "Tasks must be an array"
        };
    }

    const errors = [];
    tasks.forEach((task, index) => {
        const validation = validateTask(task);
        if (!validation.valid) {
            errors.push(`Task ${index + 1}: ${validation.errors.join(', ')}`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};

// Load or initialize tasks with error handling
const loadTasks = async () => {
    try {
        if (!(await ensureConfigDir())) {
            console.log(chalk.red("Failed to create config directory. Using empty task list."));
            return [];
        }

        // Check if file is corrupted
        if (await isFileCorrupted(getTasksFile())) {
            console.log(chalk.yellow("Tasks file appears to be corrupted. Starting with empty task list."));
            return [];
        }

        const tasks = await safeFileRead(getTasksFile(), []);

        // Validate loaded tasks
        const validation = validateTasksArray(tasks);
        if (!validation.valid) {
            console.error(chalk.yellow("Task validation errors:"));
            validation.errors.forEach(error => console.error(chalk.yellow(`  - ${error}`)));
            console.log(chalk.blue("Starting with empty task list."));
            return [];
        }

        return tasks;
    } catch (error) {
        const errorResult = handleError(error, "Loading tasks", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return [];
    }
};

// Save tasks with error handling
const saveTasks = async (tasks) => {
    try {
        if (!(await ensureConfigDir())) {
            console.log(chalk.red("Failed to create config directory. Cannot save tasks."));
            return false;
        }

        // Validate tasks before saving
        const validation = validateTasksArray(tasks);
        if (!validation.valid) {
            const errorResult = handleError(
                new Error(`Task validation failed: ${validation.errors.join(', ')}`),
                "Saving tasks",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return false;
        }

        const result = await safeFileWrite(getTasksFile(), tasks);
        if (result.success) {
            return true;
        } else {
            console.log(chalk.red(result.userMessage));
            return false;
        }
    } catch (error) {
        const errorResult = handleError(error, "Saving tasks", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

// Add a new task with validation
const addTask = (tasks, description) => {
    try {
        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            const errorResult = handleError(
                new Error("Task description is required and must be a non-empty string"),
                "Adding task",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return null;
        }

        const newTask = {
            ...DEFAULT_TASK,
            id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
            description: description.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Validate the new task
        const validation = validateTask(newTask);
        if (!validation.valid) {
            const errorResult = handleError(
                new Error(`Task validation failed: ${validation.errors.join(', ')}`),
                "Adding task",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return null;
        }

        tasks.push(newTask);
        if (saveTasks(tasks)) {
            return newTask;
        } else {
            // Remove the task if save failed
            tasks.pop();
            return null;
        }
    } catch (error) {
        const errorResult = handleError(error, "Adding task", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return null;
    }
};

// Complete a task with validation
const completeTask = (tasks, index) => {
    try {
        const validation = validateTaskIndex(index, tasks);
        if (!validation.valid) {
            const errorResult = handleError(
                new Error(validation.error),
                "Completing task",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return null;
        }

        const taskIndex = validation.index;
        if (tasks[taskIndex]) {
            tasks[taskIndex].status = "completed";
            tasks[taskIndex].updated_at = new Date().toISOString();

            if (saveTasks(tasks)) {
                return tasks[taskIndex];
            } else {
                // Revert the change if save failed
                tasks[taskIndex].status = "pending";
                tasks[taskIndex].updated_at = new Date().toISOString();
                return null;
            }
        }
        return null;
    } catch (error) {
        const errorResult = handleError(error, "Completing task", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return null;
    }
};

// Start a task with state machine logic
const startTask = (tasks, index) => {
    try {
        const validation = validateTaskIndex(index, tasks);
        if (!validation.valid) {
            const errorResult = handleError(
                new Error(validation.error),
                "Starting task",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return null;
        }

        const taskIndex = validation.index;
        const targetTask = tasks[taskIndex];

        if (!targetTask) {
            return null;
        }

        // Check if the task can be started
        if (targetTask.status === TASK_STATES.COMPLETED) {
            console.log(chalk.yellow("Cannot start a completed task."));
            return null;
        }

        // Find any currently in-progress task
        const currentInProgressIndex = tasks.findIndex(task => task.status === TASK_STATES.IN_PROGRESS);

        // If there's a task in progress, put it on hold
        if (currentInProgressIndex !== -1 && currentInProgressIndex !== taskIndex) {
            tasks[currentInProgressIndex].status = TASK_STATES.ON_HOLD;
            tasks[currentInProgressIndex].updated_at = new Date().toISOString();
            console.log(chalk.yellow(`Task "${tasks[currentInProgressIndex].description}" moved to on-hold.`));
        }

        // Start the target task
        targetTask.status = TASK_STATES.IN_PROGRESS;
        targetTask.updated_at = new Date().toISOString();

        if (saveTasks(tasks)) {
            return targetTask;
        } else {
            // Revert changes if save failed
            if (currentInProgressIndex !== -1 && currentInProgressIndex !== taskIndex) {
                tasks[currentInProgressIndex].status = TASK_STATES.IN_PROGRESS;
                tasks[currentInProgressIndex].updated_at = new Date().toISOString();
            }
            targetTask.status = targetTask.status === TASK_STATES.PENDING ? TASK_STATES.PENDING : TASK_STATES.ON_HOLD;
            targetTask.updated_at = new Date().toISOString();
            return null;
        }
    } catch (error) {
        const errorResult = handleError(error, "Starting task", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return null;
    }
};

// Remove a task with validation
const removeTask = (tasks, index) => {
    try {
        const validation = validateTaskIndex(index, tasks);
        if (!validation.valid) {
            const errorResult = handleError(
                new Error(validation.error),
                "Removing task",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            return null;
        }

        const taskIndex = validation.index;
        if (tasks[taskIndex]) {
            const removedTask = tasks.splice(taskIndex, 1)[0];

            if (saveTasks(tasks)) {
                return removedTask;
            } else {
                // Restore the task if save failed
                tasks.splice(taskIndex, 0, removedTask);
                return null;
            }
        }
        return null;
    } catch (error) {
        const errorResult = handleError(error, "Removing task", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return null;
    }
};

// Backup tasks
const backupTasks = async () => {
    try {
        const tasks = await loadTasks();
        const backupFile = getTasksFile().replace('.json', `.backup.${Date.now()}.json`);
        const result = await safeFileWrite(backupFile, tasks);
        if (result.success) {
            console.log(chalk.green(`Tasks backed up to: ${backupFile}`));
            return true;
        } else {
            console.log(chalk.red(result.userMessage));
            return false;
        }
    } catch (error) {
        const errorResult = handleError(error, "Backing up tasks", ErrorTypes.FILE_IO);
        console.log(chalk.red(errorResult.userMessage));
        return false;
    }
};

module.exports = {
    loadTasks,
    saveTasks,
    addTask,
    completeTask,
    startTask,
    removeTask,
    backupTasks,
    validateTask,
    validateTasksArray,
    TASK_STATES
}; 