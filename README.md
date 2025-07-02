# Miles Dev Coach CLI

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
    git clone https://github.com/cleaver/miles_dev_coach
    cd miles_dev_coach
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## AI Integration

This application integrates with Google Gemini. To enable AI capabilities, you will need to:

1.  **Obtain an API key from Google AI Studio:**
    - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
    - Sign in with your Google account
    - Click "Create API Key" to generate a new key
    - Copy the generated API key (it starts with "AIza...")
2.  **Set the API key using the `/config` command:**
    ```
    /config set ai_api_key YOUR_GEMINI_API_KEY
    ```

Once the API key is set, the AI coach will provide intelligent responses and discussions. You can test the connection using `/config test` to verify everything is working correctly.

## Usage

To start the interactive AI coaching session, run:

```bash
npm run start
```

**Alternative startup method:**
```bash
./index.js start
```

### In-App Commands (type these in the `You:` prompt)

*   `/help`: Display available commands.
*   `/exit`: Exit the application.

#### Task Management (`/todo`)
*   `/todo add <task description>`: Add a new task.
    *   Example: `/todo add Implement AI integration`
*   `/todo list`: List all your current tasks.
*   `/todo start <task number>`: Mark a task as in progress.
    *   Example: `/todo start 1`
*   `/todo complete <task number>`: Mark a task as completed.
    *   Example: `/todo complete 1`
*   `/todo remove <task number>`: Remove a task.
    *   Example: `/todo remove 2`
*   `/todo backup`: Create a backup of your tasks.

#### Configuration (`/config`)
*   `/config set <key> <value>`: Set a configuration value.
    *   Example: `/config set ai_api_key YOUR_GEMINI_API_KEY`
*   `/config get <key>`: Get a configuration value.
    *   Example: `/config get ai_api_key`
*   `/config list`: List all current configuration settings.
*   `/config reset`: Reset all configuration to defaults.
*   `/config test`: Test the AI connection with your current API key.
*   `/config status`: Check the current AI service status.

#### Check-in Management (`/checkin`)
*   `/checkin add <time>`: Schedule a daily check-in time.
    *   **Time format:** `HH:MM` (e.g., `09:30` for 9:30 AM)
    *   **Interval format:** `Xh Ym` (e.g., `2h 30m` for 2 hours 30 minutes from now)
    *   Examples: `/checkin add 09:30`, `/checkin add 2h 30m`, `/checkin add 30m`
*   `/checkin list`: List all scheduled check-in times.
*   `/checkin remove <check-in number>`: Remove a scheduled check-in.
    *   Example: `/checkin remove 1`
*   `/checkin status`: Show the status of scheduled check-ins.
*   `/checkin test`: Test the notification system.

## Development

To contribute or modify the application:

1.  Fork the repository.
2.  Make your changes.
3.  Submit a pull request.

### Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```
