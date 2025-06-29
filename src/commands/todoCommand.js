const chalk = require("chalk").default;
const { addTask, completeTask, removeTask } = require("../services/taskService");

const handleTodoCommand = (args, tasks) => {
    const subCommand = args[0];
    switch (subCommand) {
        case "add":
            const newTask = args.slice(1).join(" ");
            if (newTask) {
                const addedTask = addTask(tasks, newTask);
                console.log(chalk.green(`Added task: "${newTask}"`));
                return { tasks: tasks, success: true };
            } else {
                console.log(chalk.red("Usage: /todo add <task description>"));
                return { tasks: tasks, success: false };
            }
        case "list":
            if (tasks.length === 0) {
                console.log(
                    chalk.blue("No tasks yet. Add some with /todo add <task description>")
                );
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
                console.log(
                    `${index + 1}. [${statusColor(task.status.toUpperCase())}] ${task.description}`
                );
            });
            return { tasks: tasks, success: true };
        case "complete":
            const completeIndex = parseInt(args[1]) - 1;
            if (!isNaN(completeIndex) && tasks[completeIndex]) {
                const completedTask = completeTask(tasks, completeIndex);
                console.log(
                    chalk.green(
                        `Task "${completedTask.description}" marked as completed.`
                    )
                );
                return { tasks: tasks, success: true };
            } else {
                console.log(chalk.red("Usage: /todo complete <task number>"));
                return { tasks: tasks, success: false };
            }
        case "remove":
            const removeIndex = parseInt(args[1]) - 1;
            if (!isNaN(removeIndex) && tasks[removeIndex]) {
                const removedTask = removeTask(tasks, removeIndex);
                console.log(
                    chalk.green(`Removed task: "${removedTask.description}"`)
                );
                return { tasks: tasks, success: true };
            } else {
                console.log(chalk.red("Usage: /todo remove <task number>"));
                return { tasks: tasks, success: false };
            }
        default:
            console.log(
                chalk.red("Unknown /todo subcommand. Use: add, list, complete, remove.")
            );
            return { tasks: tasks, success: false };
    }
};

module.exports = {
    handleTodoCommand
}; 