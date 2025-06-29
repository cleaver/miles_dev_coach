#!/usr/bin/env node

const { Command } = require("commander");
const chalk = require("chalk").default;
const readline = require("readline");

// Import services
const { loadConfig, saveConfig } = require("./config/configManager");
const { getAiResponse } = require("./services/aiService");
const { loadTasks } = require("./services/taskService");
const { loadHistory, saveHistory, addToHistory } = require("./services/historyService");
const { scheduleCheckins } = require("./services/schedulerService");

// Import commands
const { handleTodoCommand } = require("./commands/todoCommand");
const { handleConfigCommand } = require("./commands/configCommand");
const { handleCheckinCommand } = require("./commands/checkinCommand");

const program = new Command();

// Initialize application state
let config = loadConfig();
let tasks = loadTasks();
let commandHistory = loadHistory();
let historyIndex = -1;

// Get previous command from history
const getPreviousCommand = () => {
    if (commandHistory.length === 0) return "";
    if (historyIndex === -1) {
        historyIndex = commandHistory.length - 1;
    } else if (historyIndex > 0) {
        historyIndex--;
    }
    return commandHistory[historyIndex] || "";
};

// Get next command from history
const getNextCommand = () => {
    if (commandHistory.length === 0) return "";
    if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        return commandHistory[historyIndex] || "";
    } else {
        historyIndex = -1;
        return "";
    }
};

// CLI Commands
program
    .name("devcoach")
    .description("A personal AI-powered developer productivity coach CLI.")
    .version("0.1.0");

program
    .command("start")
    .description("Start the interactive AI coaching session.")
    .action(async () => {
        console.log(
            chalk.green("Welcome to Gemini Dev Coach! Type /help for commands.")
        );
        console.log(chalk.blue("Let's discuss your plan for today."));
        console.log(chalk.gray("Use ↑/↓ arrows to navigate command history."));

        // Setup readline interface
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk.yellow("You: "),
            historySize: 100,
            completer: (line) => {
                // Optionally add tab completion for slash commands
                const completions = ['/help', '/todo', '/config', '/checkin', '/exit'];
                const hits = completions.filter((c) => c.startsWith(line));
                return [hits.length ? hits : completions, line];
            }
        });

        // Load history into readline
        rl.history = [...commandHistory].reverse();

        const ask = () => {
            rl.prompt();
        };

        rl.on('line', async (input) => {
            input = input.trim();
            if (input) {
                commandHistory = addToHistory(commandHistory, input);
                rl.history = [...commandHistory].reverse();
            }
            if (input.startsWith("/")) {
                const [command, ...args] = input.substring(1).split(" ");
                switch (command) {
                    case "help":
                        console.log(
                            chalk.cyan(`
Available commands:
  /todo [add <task>|list|complete <index>|remove <index>] - Manage your daily tasks.
  /config [set <key> <value>|get <key>] - Manage application settings.
  /checkin [add <time>|list|remove <index>] - Schedule and manage check-in times.
  /exit - Exit the application.
                        `)
                        );
                        break;
                    case "exit":
                        console.log(chalk.green("Exiting Dev Coach. See you next time!"));
                        saveHistory(commandHistory);
                        rl.close();
                        process.exit(0);
                    case "todo":
                        const todoResult = handleTodoCommand(args, tasks);
                        tasks = todoResult.tasks;
                        break;
                    case "config":
                        const configResult = handleConfigCommand(args, config, saveConfig);
                        config = configResult.config;
                        break;
                    case "checkin":
                        const checkinResult = handleCheckinCommand(args, config, saveConfig, scheduleCheckins);
                        config = checkinResult.config;
                        break;
                    default:
                        console.log(chalk.red(`Unknown command: /${command}`));
                }
            } else if (input) {
                const aiResponse = await getAiResponse(input, config.ai_api_key);
                console.log(chalk.magenta(aiResponse));
            }
            ask();
        });

        rl.on('close', () => {
            saveHistory(commandHistory);
            console.log(chalk.green("Session ended. History saved."));
            process.exit(0);
        });

        ask();
    });

program.parse(process.argv);

// Schedule checkins on startup
scheduleCheckins(config, saveConfig); 