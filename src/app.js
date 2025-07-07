#!/usr/bin/env node

const { Command } = require("commander");
const chalk = require("chalk").default;
const readline = require("readline");
const path = require("path");

// Import services
const { loadConfig, saveConfig } = require("./config/configManager");
const { getAiResponse } = require("./services/aiService");
const { loadTasks } = require("./services/taskService");
const { loadHistory, saveHistory, addToHistory } = require("./services/historyService");
const { scheduleCheckins } = require("./services/schedulerService");
const { loadDailyCheckinLog, getMissedCheckins } = require("./services/dailyCheckinService");

// Import commands
const { handleTodoCommand, listTodos } = require("./commands/todoCommand");
const { handleConfigCommand } = require("./commands/configCommand");
const { handleCheckinCommand } = require("./commands/checkinCommand");

// Import error handling
const { handleError, ErrorTypes } = require("./utils/errorHandler");

// Import paths module
const { setCustomDataDir, getConfigDir } = require("./config/paths");

const program = new Command();

// Initialize application state with error handling
let config, tasks, commandHistory, historyIndex, dailyCheckinLog, missedCheckins;

const initializeApp = async () => {
    try {
        console.log(chalk.gray("Initializing Miles Dev Coach..."));
        console.log(chalk.gray(`Using data directory: ${getConfigDir()}`));

        // Load configuration
        config = await loadConfig();
        console.log(chalk.gray("Configuration loaded."));

        // Load tasks
        tasks = await loadTasks();
        console.log(chalk.gray(`Loaded ${tasks.length} tasks.`));

        // Load command history
        commandHistory = await loadHistory();
        historyIndex = -1;
        console.log(chalk.gray("Command history loaded."));

        // Load daily check-in log
        dailyCheckinLog = await loadDailyCheckinLog();
        console.log(chalk.gray("Daily check-in log loaded."));

        // Get missed check-ins
        missedCheckins = await getMissedCheckins(config.checkins, config.last_successful_checkin);
        if (missedCheckins.length > 0) {
            console.log(chalk.yellow(`Found ${missedCheckins.length} missed check-ins.`));
        }

        // Schedule check-ins
        const scheduleResult = scheduleCheckins(config, config.ai_api_key, saveConfig);
        if (scheduleResult.success) {
            console.log(chalk.gray(`Scheduled ${scheduleResult.scheduled} check-ins.`));
        } else {
            console.log(chalk.yellow(`Warning: Failed to schedule check-ins: ${scheduleResult.error}`));
        }

        console.log(chalk.green("Miles Dev Coach initialized successfully!"));
        return true;

    } catch (error) {
        const errorResult = handleError(error, "Application Initialization", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        console.log(chalk.red("Failed to initialize application. Please check your configuration."));
        return false;
    }
};

// Get previous command from history
const getPreviousCommand = () => {
    try {
        if (commandHistory.length === 0) return "";
        if (historyIndex === -1) {
            historyIndex = commandHistory.length - 1;
        } else if (historyIndex > 0) {
            historyIndex--;
        }
        return commandHistory[historyIndex] || "";
    } catch (error) {
        const errorResult = handleError(error, "Getting Previous Command", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return "";
    }
};

// Get next command from history
const getNextCommand = () => {
    try {
        if (commandHistory.length === 0) return "";
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            return commandHistory[historyIndex] || "";
        } else {
            historyIndex = -1;
            return "";
        }
    } catch (error) {
        const errorResult = handleError(error, "Getting Next Command", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
        return "";
    }
};

// Process user input with error handling
const processUserInput = async (input) => {
    try {
        input = input.trim();
        if (!input) return;

        // Add to history
        commandHistory = addToHistory(commandHistory, input);

        if (input.startsWith("/")) {
            const [command, ...args] = input.substring(1).split(" ");

            switch (command) {
                case "help":
                    console.log(
                        chalk.cyan(`
Available commands:
  /todo [add <task>|list|complete <index>|remove <index>|backup] - Manage your daily tasks.
  /config [set <key> <value>|get <key>|list|reset|test|status] - Manage application settings.
  /checkin [add <time>|list|remove <index>|status|test] - Schedule and manage check-in times.
  /exit - Exit the application.
                        `)
                    );
                    break;

                case "exit":
                    console.log(chalk.green("Exiting Dev Coach. See you next time!"));
                    await saveHistory(commandHistory);
                    process.exit(0);
                    break;

                case "todo":
                    const todoResult = await handleTodoCommand(args, tasks);
                    tasks = todoResult.tasks;
                    break;

                case "config":
                    const configResult = await handleConfigCommand(args, config, saveConfig);
                    config = configResult.config;
                    break;

                case "checkin":
                    const checkinResult = await handleCheckinCommand(args, config, saveConfig, scheduleCheckins);
                    config = checkinResult.config;
                    break;

                default:
                    console.log(chalk.red(`Unknown command: /${command}`));
                    console.log(chalk.blue("Type /help for available commands."));
            }
        } else {
            // Handle AI conversation
            try {
                const aiResponse = await getAiResponse(input, config.ai_api_key);
                console.log(aiResponse);
            } catch (error) {
                const errorResult = handleError(error, "AI Conversation", ErrorTypes.API_ERROR);
                console.log(chalk.red(errorResult.userMessage));
            }
        }

    } catch (error) {
        const errorResult = handleError(error, "Processing User Input", ErrorTypes.UNKNOWN_ERROR);
        console.log(chalk.red(errorResult.userMessage));
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
    .option("-d, --data-dir <directory>", "Specify custom data directory (default: ~/.miles-dev-coach)")
    .action(async (options) => {
        try {
            // Set custom data directory if provided
            if (options.dataDir) {
                const dataDir = path.resolve(options.dataDir);
                setCustomDataDir(dataDir);
                console.log(chalk.blue(`Using custom data directory: ${dataDir}`));
            }

            // Initialize the application
            if (!await initializeApp()) {
                process.exit(1);
            }

            console.log(chalk.green("Welcome to Miles Dev Coach! Type /help for commands."));
            console.log(chalk.blue("Let's discuss your plan for today."));
            console.log(chalk.gray("Use ↑/↓ arrows to navigate command history."));

            // Automatically list todos on startup
            console.log(); // Add spacing
            listTodos(tasks);

            // Setup readline interface
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                prompt: chalk.yellow("You: "),
                historySize: 100,
                completer: (line) => {
                    try {
                        // Optionally add tab completion for slash commands
                        const completions = ['/help', '/todo', '/config', '/checkin', '/exit'];
                        const hits = completions.filter((c) => c.startsWith(line));
                        return [hits.length ? hits : completions, line];
                    } catch (error) {
                        const errorResult = handleError(error, "Command Completion", ErrorTypes.UNKNOWN_ERROR);
                        console.log(chalk.red(errorResult.userMessage));
                        return [[], line];
                    }
                }
            });

            // Load history into readline
            rl.history = [...commandHistory].reverse();

            const ask = () => {
                rl.prompt();
            };

            rl.on('line', async (input) => {
                await processUserInput(input);
                ask();
            });

            rl.on('close', async () => {
                try {
                    await saveHistory(commandHistory);
                    console.log(chalk.green("Session ended. History saved."));
                } catch (error) {
                    const errorResult = handleError(error, "Saving History on Exit", ErrorTypes.FILE_IO);
                    console.log(chalk.red(errorResult.userMessage));
                }
                process.exit(0);
            });

            // Handle process termination gracefully
            process.on('SIGINT', async () => {
                console.log(chalk.yellow("\nReceived interrupt signal. Saving and exiting..."));
                try {
                    await saveHistory(commandHistory);
                    console.log(chalk.green("History saved. Goodbye!"));
                } catch (error) {
                    const errorResult = handleError(error, "Saving History on Interrupt", ErrorTypes.FILE_IO);
                    console.log(chalk.red(errorResult.userMessage));
                }
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                console.log(chalk.yellow("\nReceived termination signal. Saving and exiting..."));
                try {
                    await saveHistory(commandHistory);
                    console.log(chalk.green("History saved. Goodbye!"));
                } catch (error) {
                    const errorResult = handleError(error, "Saving History on Termination", ErrorTypes.FILE_IO);
                    console.log(chalk.red(errorResult.userMessage));
                }
                process.exit(0);
            });

            ask();

        } catch (error) {
            const errorResult = handleError(error, "Starting Interactive Session", ErrorTypes.UNKNOWN_ERROR);
            console.log(chalk.red(errorResult.userMessage));
            process.exit(1);
        }
    });

// Parse command line arguments
try {
    program.parse(process.argv);
} catch (error) {
    const errorResult = handleError(error, "Parsing Command Line Arguments", ErrorTypes.UNKNOWN_ERROR);
    console.log(chalk.red(errorResult.userMessage));
    process.exit(1);
} 