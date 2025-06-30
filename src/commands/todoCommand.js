const chalk = require("chalk").default;
const { addTask, completeTask, removeTask, backupTasks } = require("../services/taskService");
const { handleError, ErrorTypes } = require("../utils/errorHandler");
const { validateCommand, getUsage, validateString, validateIndex } = require("../utils/commandValidator");

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
                const completeIndex = args[1];
                const completeValidation = validateIndex(completeIndex, tasks, "Task index");
                if (!completeValidation.valid) {
                    console.log(chalk.red(completeValidation.error));
                    console.log(chalk.blue(getUsage('todo', 'complete')));
                    return { tasks: tasks, success: false };
                }

                const completedTask = completeTask(tasks, completeValidation.value);
                if (completedTask) {
                    console.log(chalk.green(`Task "${completedTask.description}" marked as completed.`));
                    return { tasks: tasks, success: true };
                } else {
                    console.log(chalk.red("Failed to complete task. Please try again."));
                    return { tasks: tasks, success: false };
                }

            case "remove":
                const removeIndex = args[1];
                const removeValidation = validateIndex(removeIndex, tasks, "Task index");
                if (!removeValidation.valid) {
                    console.log(chalk.red(removeValidation.error));
                    console.log(chalk.blue(getUsage('todo', 'remove')));
                    return { tasks: tasks, success: false };
                }

                const removedTask = removeTask(tasks, removeValidation.value);
                if (removedTask) {
                    console.log(chalk.green(`Removed task: "${removedTask.description}"`));
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
        console.log(chalk.red(errorResult.userMessage));
        return { tasks: tasks, success: false };
    }
};

module.exports = {
    handleTodoCommand
}; 