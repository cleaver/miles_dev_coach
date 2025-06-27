# Gemini Dev Coach CLI

A personal AI-powered developer productivity coach CLI to help you manage tasks, discuss plans, and stay on track with scheduled check-ins.

## Features

*   **Interactive AI Coaching:** Discuss your daily plans, progress, and blockers with an AI.
*   **Daily Task Management:** Add, list, complete, and remove tasks.
*   **Persistent Storage:** Tasks and configurations are saved locally.
*   **Scheduled Check-ins:** Get notified at set times for a quick discussion with your coach.
*   **Cross-platform Notifications:** Uses `node-notifier` for desktop alerts on macOS and Linux.

## Installation

1.  **Clone the repository (if applicable):**
    ```bash
    git clone <repository-url>
    cd gemini-dev-coach-cli
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Make the CLI executable:**
    ```bash
    chmod +x index.js
    ```

## Usage

To start the interactive AI coaching session, run:

```bash
./index.js start
```

### In-App Commands (type these in the `You:` prompt)

*   `/help`: Display available commands.
*   `/exit`: Exit the application.
*   `/todo add <task description>`: Add a new task.
    *   Example: `/todo add Implement AI integration`
*   `/todo list`: List all your current tasks.
*   `/todo complete <task number>`: Mark a task as completed.
    *   Example: `/todo complete 1`
*   `/todo remove <task number>`: Remove a task.
    *   Example: `/todo remove 2`
*   `/config set <key> <value>`: Set a configuration value.
    *   Example: `/config set ai_api_key YOUR_GEMINI_API_KEY`
*   `/config get <key>`: Get a configuration value.
    *   Example: `/config get ai_api_key`
*   `/config list`: List all current configuration settings.
*   `/checkin add <HH:MM>`: Schedule a daily check-in time.
    *   Example: `/checkin add 09:30` (for 9:30 AM)
*   `/checkin list`: List all scheduled check-in times.
*   `/checkin remove <check-in number>`: Remove a scheduled check-in.
    *   Example: `/checkin remove 1`

## AI Integration

This application integrates with Google Gemini. To enable AI capabilities, you will need to:

1.  Obtain an API key from Google AI Studio.
2.  Set the API key using the `/config` command:
    ```
    /config set ai_api_key YOUR_GEMINI_API_KEY
    ```

Once the API key is set, the AI coach will provide intelligent responses and discussions.

## Development

To contribute or modify the application:

1.  Fork the repository.
2.  Make your changes.
3.  Submit a pull request.
