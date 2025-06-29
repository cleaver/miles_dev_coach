const chalk = require("chalk").default;
const { addTask, completeTask, removeTask, backupTasks } = require("../services/taskService");
const { handleError, ErrorTypes, validateTaskIndex } = require("../utils/errorHandler");

const handleTodoCommand = (args, tasks) => {
    try {
        // Validate input arguments
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

        switch (subCommand) {
            case "add":
                const newTask = args.slice(1).join(" ");
                if (!newTask || newTask.trim().length === 0) {
                    const errorResult = handleError(
                        new Error("Task description is required"),
                        "Todo Add Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    console.log(chalk.blue("Usage: /todo add <task description>"));
                    return { tasks: tasks, success: false };
                }

                const addedTask = addTask(tasks, newTask);
                if (addedTask) {
                    console.log(chalk.green(`Added task: "${newTask}"`));
                    return { tasks: tasks, success: true };
                } else {
                    console.log(chalk.red("Failed to add task. Please try again."));
                    return { tasks: tasks, success: false };
                }

            case "list":
                if (tasks.length === 0) {
                    console.log(chalk.blue("No tasks yet. Add some with /todo add <task description>"));
                    return { tasks: tasks, success: true };
                }

                console.log(chalk.blue("Your current tasks:"));
                tasks.forEach((task, index) => {
                    let statusColor = chalk.yellow;
                    if (task.status === "completed") {
                        statusColor = chalk.green;
                    } else if (task.status === "in progress") {
                        statusColor = chalk.blue;
                    }

                    const createdDate = task.created_at ? new Date(task.created_at).toLocaleDateString() : "Unknown";
                    console.log(
                        `${index + 1}. [${statusColor(task.status.toUpperCase())}] ${task.description} (Created: ${createdDate})`
                    );
                });
                return { tasks: tasks, success: true };

            case "complete":
                if (args.length < 2) {
                    const errorResult = handleError(
                        new Error("Task index is required"),
                        "Todo Complete Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    console.log(chalk.blue("Usage: /todo complete <task number>"));
                    return { tasks: tasks, success: false };
                }

                const completeIndex = args[1];
                const completeValidation = validateTaskIndex(completeIndex, tasks);
                if (!completeValidation.valid) {
                    const errorResult = handleError(
                        new Error(completeValidation.error),
                        "Todo Complete Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    return { tasks: tasks, success: false };
                }

                const completedTask = completeTask(tasks, completeValidation.index);
                if (completedTask) {
                    console.log(chalk.green(`Task "${completedTask.description}" marked as completed.`));
                    return { tasks: tasks, success: true };
                } else {
                    console.log(chalk.red("Failed to complete task. Please try again."));
                    return { tasks: tasks, success: false };
                }

            case "remove":
                if (args.length < 2) {
                    const errorResult = handleError(
                        new Error("Task index is required"),
                        "Todo Remove Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    console.log(chalk.blue("Usage: /todo remove <task number>"));
                    return { tasks: tasks, success: false };
                }

                const removeIndex = args[1];
                const removeValidation = validateTaskIndex(removeIndex, tasks);
                if (!removeValidation.valid) {
                    const errorResult = handleError(
                        new Error(removeValidation.error),
                        "Todo Remove Command",
                        ErrorTypes.VALIDATION_ERROR
                    );
                    console.log(chalk.red(errorResult.userMessage));
                    return { tasks: tasks, success: false };
                }

                const removedTask = removeTask(tasks, removeValidation.index);
                if (removedTask) {
                    console.log(chalk.green(`Removed task: "${removedTask.description}"`));
                    return { tasks: tasks, success: true };
                } else {
                    console.log(chalk.red("Failed to remove task. Please try again."));
                    return { tasks: tasks, success: false };
                }

            case "backup":
                const backupResult = backupTasks();
                if (backupResult) {
                    console.log(chalk.green("Tasks backed up successfully."));
                    return { tasks: tasks, success: true };
                } else {
                    console.log(chalk.red("Failed to backup tasks. Please try again."));
                    return { tasks: tasks, success: false };
                }

            default:
                const errorResult = handleError(
                    new Error(`Unknown /todo subcommand: ${subCommand}`),
                    "Todo Command",
                    ErrorTypes.VALIDATION_ERROR
                );
                console.log(chalk.red(errorResult.userMessage));
                console.log(chalk.blue("Available commands: add, list, complete, remove, backup"));
                return { tasks: tasks, success: false };
        }

    } catch (error) {
        const errorResult = handleError(error, "Todo Command", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return { tasks: tasks, success: false };
    }
};

module.exports = {
    handleTodoCommand
}; 