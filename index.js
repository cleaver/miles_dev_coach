#!/usr/bin/env node

const { Command } = require("commander");
const chalk = require("chalk").default;
const path = require("path");
const fs = require("fs");
const schedule = require("node-schedule");
const notifier = require("node-notifier");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const readline = require("readline");

const program = new Command();

// --- Configuration and Data Paths ---
const CONFIG_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".gemini-dev-coach"
);
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const TASKS_FILE = path.join(CONFIG_DIR, "tasks.json");
const HISTORY_FILE = path.join(CONFIG_DIR, "history.json");

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Load or initialize configuration
let config = {};
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (e) {
    console.error(chalk.red("Error reading config file:", e.message));
  }
}

// Save configuration
const saveConfig = () => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
};

// Placeholder for AI interaction (replace with actual API call)
const getAiResponse = async (message) => {
  const API_KEY = config.ai_api_key;
  if (!API_KEY) {
    return chalk.red(
      "AI Coach: Gemini API key not set. Please use /config set ai_api_key YOUR_API_KEY."
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();
    return `AI Coach: ${text}`;
  } catch (error) {
    console.error(
      chalk.red("Error communicating with Gemini API:", error.message)
    );
    return chalk.red(
      "AI Coach: Sorry, I'm having trouble connecting right now. Please try again later."
    );
  }
};

// Load or initialize tasks
let tasks = [];
if (fs.existsSync(TASKS_FILE)) {
  try {
    tasks = JSON.parse(fs.readFileSync(TASKS_FILE, "utf8"));
  } catch (e) {
    console.error(chalk.red("Error reading tasks file:", e.message));
  }
}

// Save tasks
const saveTasks = () => {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf8");
};

// --- History Management ---

// Load command history
let commandHistory = [];
let historyIndex = -1;

const loadHistory = () => {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      commandHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
      console.log(chalk.gray(`Loaded ${commandHistory.length} commands from history`));
    } catch (e) {
      console.error(chalk.red("Error reading history file:", e.message));
      commandHistory = [];
    }
  } else {
    console.log(chalk.gray("No history file found, starting fresh"));
  }
};

// Save command history
const saveHistory = () => {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(commandHistory, null, 2), "utf8");
    console.log(chalk.gray(`Saved ${commandHistory.length} commands to history`));
  } catch (e) {
    console.error(chalk.red("Error saving history file:", e.message));
  }
};

// Add command to history
const addToHistory = (command) => {
  if (command && command.trim()) {
    // Remove duplicate consecutive commands
    if (commandHistory[commandHistory.length - 1] !== command) {
      commandHistory.push(command);
      console.log(chalk.gray(`Added to history: "${command}"`));
      // Keep only last 100 commands
      if (commandHistory.length > 100) {
        commandHistory = commandHistory.slice(-100);
      }
      saveHistory();
    } else {
      console.log(chalk.gray(`Skipped duplicate command: "${command}"`));
    }
  }
  historyIndex = -1;
};

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

// Custom input control with history support
const getInputWithHistory = async (message) => {
  const response = await prompt({
    type: 'input',
    name: 'input',
    message: message,
    initial: ''
  });

  addToHistory(response.input);
  return response.input;
};

// --- CLI Commands ---

program
  .name("devcoach")
  .description("A personal AI-powered developer productivity coach CLI.")
  .version("0.1.0");

program
  .command("start")
  .description("Start the interactive AI coaching session.")
  .action(async () => {
    // Load command history on startup
    loadHistory();

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
        addToHistory(input);
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
            rl.close();
            process.exit(0);
          case "todo":
            handleTodoCommand(args);
            break;
          case "config":
            handleConfigCommand(args);
            break;
          case "checkin":
            handleCheckinCommand(args);
            break;
          default:
            console.log(chalk.red(`Unknown command: /${command}`));
        }
      } else if (input) {
        const aiResponse = await getAiResponse(input);
        console.log(chalk.magenta(aiResponse));
      }
      ask();
    });

    rl.on('close', () => {
      saveHistory();
      console.log(chalk.green("Session ended. History saved."));
      process.exit(0);
    });

    ask();
  });

// --- Command Handlers ---

const handleTodoCommand = (args) => {
  const subCommand = args[0];
  switch (subCommand) {
    case "add":
      const newTask = args.slice(1).join(" ");
      if (newTask) {
        tasks.push({
          id: tasks.length + 1,
          description: newTask,
          status: "pending",
        });
        saveTasks();
        console.log(chalk.green(`Added task: "${newTask}"`));
      } else {
        console.log(chalk.red("Usage: /todo add <task description>"));
      }
      break;
    case "list":
      if (tasks.length === 0) {
        console.log(
          chalk.blue("No tasks yet. Add some with /todo add <task description>")
        );
        return;
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
          `${index + 1}. [${statusColor(task.status.toUpperCase())}] ${task.description
          }`
        );
      });
      break;
    case "complete":
      const completeIndex = parseInt(args[1]) - 1;
      if (!isNaN(completeIndex) && tasks[completeIndex]) {
        tasks[completeIndex].status = "completed";
        saveTasks();
        console.log(
          chalk.green(
            `Task "${tasks[completeIndex].description}" marked as completed.`
          )
        );
      } else {
        console.log(chalk.red("Usage: /todo complete <task number>"));
      }
      break;
    case "remove":
      const removeIndex = parseInt(args[1]) - 1;
      if (!isNaN(removeIndex) && tasks[removeIndex]) {
        const removedTask = tasks.splice(removeIndex, 1);
        saveTasks();
        console.log(
          chalk.green(`Removed task: "${removedTask[0].description}"`)
        );
      } else {
        console.log(chalk.red("Usage: /todo remove <task number>"));
      }
      break;
    default:
      console.log(
        chalk.red("Unknown /todo subcommand. Use: add, list, complete, remove.")
      );
  }
};

const handleConfigCommand = (args) => {
  const subCommand = args[0];
  switch (subCommand) {
    case "set":
      const key = args[1];
      const value = args.slice(2).join(" ");
      if (key && value) {
        config[key] = value;
        saveConfig();
        console.log(chalk.green(`Config set: ${key} = ${value}`));
      } else {
        console.log(chalk.red("Usage: /config set <key> <value>"));
      }
      break;
    case "get":
      const getKey = args[1];
      if (getKey) {
        if (config[getKey] !== undefined) {
          console.log(chalk.blue(`Config ${getKey}: ${config[getKey]}`));
        } else {
          console.log(chalk.yellow(`Config key "${getKey}" not found.`));
        }
      } else {
        console.log(chalk.red("Usage: /config get <key>"));
      }
      break;
    case "list":
      if (Object.keys(config).length === 0) {
        console.log(chalk.blue("No configuration settings yet."));
        return;
      }
      console.log(chalk.blue("Current configuration:"));
      for (const key in config) {
        console.log(`  ${key}: ${config[key]}`);
      }
      break;
    default:
      console.log(
        chalk.red("Unknown /config subcommand. Use: set, get, list.")
      );
  }
};

const scheduleCheckins = () => {
  if (!config.checkins || config.checkins.length === 0) {
    return;
  }

  config.checkins.forEach((checkinTime, index) => {
    const [hours, minutes] = checkinTime.split(":").map(Number);
    schedule.scheduleJob({ hour: hours, minute: minutes, second: 0 }, () => {
      notifier.notify(
        {
          title: "Gemini Dev Coach Check-in!",
          message:
            "It's time for your scheduled check-in. Open the CLI to discuss!",
          sound: true, // Only on macOS
          wait: true, // Wait for user to click notification before closing
        },
        function (err, response) {
          // Response is response from OS
        }
      );
      console.log(
        chalk.green(`
--- Scheduled Check-in (${checkinTime}) ---`)
      );
      console.log(
        chalk.blue(
          "AI Coach: Hello! It's time for our check-in. How are things going?"
        )
      );
      // In a real scenario, this would trigger a specific AI conversation flow

      // Remove the triggered check-in and re-schedule
      const triggeredIndex = config.checkins.indexOf(checkinTime);
      if (triggeredIndex > -1) {
        config.checkins.splice(triggeredIndex, 1);
        saveConfig();
        schedule.cancelJob(); // Cancel all existing jobs
        scheduleCheckins(); // Schedule all jobs again
        console.log(chalk.green(`Check-in for ${checkinTime} completed and removed.`));
      }
    });
    console.log(chalk.green(`Scheduled daily check-in for ${checkinTime}`));
  });
};

const handleCheckinCommand = (args) => {
  const subCommand = args[0];
  switch (subCommand) {
    case "add":
      const inputTime = args.slice(1).join(" "); // Can be HH:MM or interval like 1h 30m
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      const intervalRegex = /(?:(\d+)h)?(?:\s*)?(?:(\d+)m)?/;

      let checkinTimeToAdd;

      if (timeRegex.test(inputTime)) {
        // If it's already HH:MM format
        checkinTimeToAdd = inputTime;
      } else {
        // Try to parse as interval
        const match = inputTime.match(intervalRegex);
        if (match && (match[1] || match[2])) {
          const hours = parseInt(match[1] || "0", 10);
          const minutes = parseInt(match[2] || "0", 10);

          if (hours === 0 && minutes === 0) {
            console.log(chalk.red("Invalid interval. Use formats like 30m, 2h, or 1h 30m."));
            break;
          }

          const now = new Date();
          now.setHours(now.getHours() + hours);
          now.setMinutes(now.getMinutes() + minutes);

          const futureHours = String(now.getHours()).padStart(2, '0');
          const futureMinutes = String(now.getMinutes()).padStart(2, '0');
          checkinTimeToAdd = `${futureHours}:${futureMinutes}`;
        } else {
          console.log(chalk.red("Usage: /checkin add <HH:MM> or <interval> (e.g., 14:30, 30m, 2h, 1h 30m)"));
          break;
        }
      }

      if (checkinTimeToAdd) {
        if (!config.checkins) {
          config.checkins = [];
        }
        config.checkins.push(checkinTimeToAdd);
        saveConfig();
        // Re-schedule all jobs to include the new one
        schedule.cancelJob(); // Cancel all existing jobs
        scheduleCheckins(); // Schedule all jobs again
        console.log(chalk.green(`Added check-in for ${checkinTimeToAdd}.`));
      }
      break;
    case "list":
      if (!config.checkins || config.checkins.length === 0) {
        console.log(
          chalk.blue(
            "No check-in times scheduled yet. Add one with /checkin add <HH:MM>"
          )
        );
        return;
      }
      console.log(chalk.blue("Your scheduled check-in times:"));
      config.checkins.forEach((time, index) => {
        console.log(`${index + 1}. ${time}`);
      });
      break;
    case "remove":
      const removeIndex = parseInt(args[1]) - 1;
      if (
        !isNaN(removeIndex) &&
        config.checkins &&
        config.checkins[removeIndex]
      ) {
        const removedTime = config.checkins.splice(removeIndex, 1);
        saveConfig();
        schedule.cancelJob(); // Cancel all existing jobs
        scheduleCheckins(); // Schedule all jobs again
        console.log(chalk.green(`Removed check-in for ${removedTime[0]}.`));
      } else {
        console.log(chalk.red("Usage: /checkin remove <check-in number>"));
      }
      break;
    default:
      console.log(
        chalk.red("Unknown /checkin subcommand. Use: add, list, remove.")
      );
  }
};

program.parse(process.argv);

// Schedule checkins on startup
scheduleCheckins();
