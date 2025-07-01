const chalk = require("chalk").default;
const { addTask, completeTask, startTask, removeTask, backupTasks, TASK_STATES } = require("../services/taskService");
const { handleError, ErrorTypes } = require("../utils/errorHandler");
const { validateCommand, getUsage, validateString } = require("../utils/commandValidator");
const { validateTaskIndex } = require("../utils/errorHandler");

// Helper function to list todos
const listTodos = (tasks) => {
    if (tasks.length === 0) {
        console.log(chalk.blue("No tasks yet. Add some with /todo add <task description>"));
        return;
    }

    console.log(chalk.blue("Your current tasks:"));
    tasks.forEach((task, index) => {
        let statusColor = chalk.yellow; // pending
        if (task.status === TASK_STATES.COMPLETED) {
            statusColor = chalk.green;
        } else if (task.status === TASK_STATES.IN_PROGRESS) {
            statusColor = chalk.blue;
        } else if (task.status === TASK_STATES.ON_HOLD) {
            statusColor = chalk.magenta;
        }

        const createdDate = task.created_at ? new Date(task.created_at).toLocaleDateString() : "Unknown";
        console.log(
            `${index + 1}. [${statusColor(task.status.toUpperCase())}] ${task.description} (Created: ${createdDate})`
        );
    });
};

const handleTodoCommand = async (args, tasks) => {
    try {
        // Basic argument validation
        if (!args || !Array.isArray(args) || args.length === 0) {
            const errorResult = handleError(
                new Error("Todo command requires arguments"),
                "Todo Command",
                ErrorTypes.VALIDATION_ERROR
            );
            console.log(chalk.red(errorResult.userMessage));
            console.log(chalk.blue("Usage: /todo [add <task>|list|complete <index>|remove <index>|backup]"));
            return { tasks: tasks, success: false };
        }

        const subCommand = args[0];

        // Validate command structure
        const commandValidation = validateCommand('todo', subCommand, args.slice(1));
        if (!commandValidation.valid) {
            console.log(chalk.red(commandValidation.error));
            console.log(chalk.blue(commandValidation.usage));
            return { tasks: tasks, success: false };
        }

        switch (subCommand) {
            case "add":
                const taskDescription = args.slice(1).join(" ");
                const descriptionValidation = validateString(taskDescription, "Task description");
                if (!descriptionValidation.valid) {
                    console.log(chalk.red(descriptionValidation.error));
                    console.log(chalk.blue(getUsage('todo', 'add')));
                    return { tasks: tasks, success: false };
                }

                const addedTask = addTask(tasks, descriptionValidation.value);
                if (addedTask) {
                    console.log(chalk.green(`Added task: "${descriptionValidation.value}"`));
                    console.log(); // Add spacing
                    listTodos(tasks); // Automatically list todos after adding
                    return { tasks: tasks, success: true };
                } else {
                    console.log(chalk.red("Failed to add task. Please try again."));
                    return { tasks: tasks, success: false };
                }

            case "list":
                listTodos(tasks);
                return { tasks: tasks, success: true };

            case "start":
                const startIndex = args[1];
                const startValidation = validateTaskIndex(startIndex, tasks);
                if (!startValidation.valid) {
                    console.log(chalk.red(startValidation.error));
                    console.log(chalk.blue(getUsage('todo', 'start')));
                    return { tasks: tasks, success: false };
                }

                const startedTask = startTask(tasks, startIndex);
                if (startedTask) {
                    console.log(chalk.green(`Started task: "${startedTask.description}"`));
                    console.log(); // Add spacing
                    listTodos(tasks); // Automatically list todos after starting
                    return { tasks: tasks, success: true };
                } else {
                    console.log(chalk.red("Failed to start task. Please try again."));
                    return { tasks: tasks, success: false };
                }

            case "complete":
                const completeIndex = args[1];
                const completeValidation = validateTaskIndex(completeIndex, tasks);
                if (!completeValidation.valid) {
                    console.log(chalk.red(completeValidation.error));
                    console.log(chalk.blue(getUsage('todo', 'complete')));
                    return { tasks: tasks, success: false };
                }

                const completedTask = completeTask(tasks, completeIndex);
                if (completedTask) {
                    console.log(chalk.green(`Task "${completedTask.description}" marked as completed.`));
                    console.log(); // Add spacing
                    listTodos(tasks); // Automatically list todos after completing
                    return { tasks: tasks, success: true };
                } else {
                    console.log(chalk.red("Failed to complete task. Please try again."));
                    return { tasks: tasks, success: false };
                }

            case "remove":
                const removeIndex = args[1];
                const removeValidation = validateTaskIndex(removeIndex, tasks);
                if (!removeValidation.valid) {
                    console.log(chalk.red(removeValidation.error));
                    console.log(chalk.blue(getUsage('todo', 'remove')));
                    return { tasks: tasks, success: false };
                }

                const removedTask = removeTask(tasks, removeIndex);
                if (removedTask) {
                    console.log(chalk.green(`Removed task: "${removedTask.description}"`));
                    console.log(); // Add spacing
                    listTodos(tasks); // Automatically list todos after removing
                    return { tasks: tasks, success: true };
                } else {
                    console.log(chalk.red("Failed to remove task. Please try again."));
                    return { tasks: tasks, success: false };
                }

            case "backup":
                const backupResult = await backupTasks();
                if (backupResult) {
                    console.log(chalk.green("Tasks backed up successfully."));
                    return { tasks: tasks, success: true };
                } else {
                    console.log(chalk.red("Failed to backup tasks. Please try again."));
                    return { tasks: tasks, success: false };
                }

            default:
                console.log(chalk.red(`Unknown /todo subcommand: ${subCommand}`));
                console.log(chalk.blue(getUsage('todo')));
                return { tasks: tasks, success: false };
        }

    } catch (error) {
        const errorResult = handleError(error, "Todo Command", ErrorTypes.UNKNOWN_ERROR);
        console.error('DEBUG error:', error);
        console.log(chalk.red(errorResult.userMessage));
        return { tasks: tasks, success: false };
    }
};

module.exports = {
    handleTodoCommand,
    listTodos
}; 