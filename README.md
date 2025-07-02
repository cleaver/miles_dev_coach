# Miles Dev Coach CLI

A personal AI-powered developer productivity coach CLI to help you manage tasks, discuss plans, and stay on track with scheduled check-ins.

## Features

*   **Interactive AI Coaching:** Discuss your daily plans, progress, and blockers with an AI-powered coach that adapts to your communication style.
*   **Smart Task Management:** Add, track, and complete tasks with status tracking (pending, in progress, completed).
*   **Desktop Notifications:** Get desktop alerts for scheduled check-ins and important reminders.
*   **Flexible Scheduling:** Set check-ins using absolute times (09:30) or intervals (2h 30m from now).
*   **Persistent Storage:** All tasks, configurations, and command history are saved locally.
*   **Cross-platform Support:** Works on macOS, Linux, and Windows with native notifications.

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

## How to Use Miles Dev Coach

Miles Dev Coach is designed to be your AI-powered development companion throughout your workday. Here's how to integrate it into your daily routine:

### Morning Planning
- Start your day by running `npm run start`
- Discuss your goals and priorities for the day with your AI coach
- Use `/todo add` to create your task list
- Set up check-ins for important milestones using `/checkin add`

### During Development
- Keep the session running in a terminal window
- Use `/todo start` when you begin working on a task
- Mark tasks as complete with `/todo complete` as you finish them
- Chat with your coach about blockers, progress, or technical decisions
- Get reminded of scheduled check-ins for progress reviews

### End of Day
- Review your completed tasks with `/todo list`
- Discuss what you accomplished and any challenges faced
- Plan for tomorrow's priorities
- Use `/todo backup` to save your progress

### Scheduled Check-ins
- Set up regular check-in times (e.g., `/checkin add 10:00` for a 10 AM review)
- Get desktop notifications when it's time to check in
- Use these moments to pause, reflect, and adjust your approach

The AI coach adapts to your communication style and helps you stay focused, organized, and productive throughout your development workflow.

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

## License

This project is licensed under the [MIT License](LICENSE).
