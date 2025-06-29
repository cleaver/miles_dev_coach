const fs = require("fs");
const chalk = require("chalk").default;
const { TASKS_FILE, ensureConfigDir } = require("../config/paths");

// Load or initialize tasks
const loadTasks = () => {
    ensureConfigDir();
    let tasks = [];
    if (fs.existsSync(TASKS_FILE)) {
        try {
            tasks = JSON.parse(fs.readFileSync(TASKS_FILE, "utf8"));
        } catch (e) {
            console.error(chalk.red("Error reading tasks file:", e.message));
        }
    }
    return tasks;
};

// Save tasks
const saveTasks = (tasks) => {
    try {
        fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf8");
    } catch (e) {
        console.error(chalk.red("Error saving tasks file:", e.message));
    }
};

// Add a new task
const addTask = (tasks, description) => {
    const newTask = {
        id: tasks.length + 1,
        description: description,
        status: "pending",
    };
    tasks.push(newTask);
    saveTasks(tasks);
    return newTask;
};

// Complete a task
const completeTask = (tasks, index) => {
    if (tasks[index]) {
        tasks[index].status = "completed";
        saveTasks(tasks);
        return tasks[index];
    }
    return null;
};

// Remove a task
const removeTask = (tasks, index) => {
    if (tasks[index]) {
        const removedTask = tasks.splice(index, 1)[0];
        saveTasks(tasks);
        return removedTask;
    }
    return null;
};

module.exports = {
    loadTasks,
    saveTasks,
    addTask,
    completeTask,
    removeTask
}; 