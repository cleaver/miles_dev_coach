# Vision

The core idea is to shift from generic AI prompts to **context-aware prompts** that include the user's task list data.

***

### 1. Intelligent & Context-Aware Check-ins 🧠

This is the most direct and powerful integration. Right now, a check-in is just a simple, static notification. We can make it a dynamic, AI-driven event.

**How it would work:**

1.  **Trigger:** When a scheduled check-in time arrives, `schedulerService` triggers as normal.
2.  **Gather Context:** Instead of just sending a notification, the service first loads the current `tasks` from `taskService`.
3.  **Craft a "Smart Prompt":** It then calls the `aiService` with a detailed prompt that includes the task data. For example:
    * "You are a friendly and encouraging developer productivity coach. It's time for a scheduled check-in. Here is the user's current task list (in JSON format): `[...tasks...]`. Please analyze their progress since the last check-in.
        * If they completed tasks, acknowledge their accomplishment.
        * If they have old tasks that are still pending, gently ask if they are blocked.
        * If the list is empty, suggest planning some goals.
        * Generate a concise, motivating message to display to the user."
4.  **Deliver AI Nudge:** The AI's response is then presented to the user, either as a system notification or directly in the console if the app is active.

**Example Transformation:**

* **Before:** "Miles Dev Coach Check-in! It's time for your scheduled check-in."
* **After:** "Hey there! Great job knocking out 'Fix the login bug' today! I noticed 'Refactor the API module' is still pending. Is everything going smoothly with that one?"

***

### 2. Proactive Progress Analysis & Nudging 📈

The AI can provide value beyond scheduled check-ins by analyzing the task list at key moments.

* **End-of-Day Summary:** A new command like `/todo summary` (or an automatic trigger at the last check-in of the day) could have the AI review all tasks completed, modified, or added that day. It could provide a "Well done!" message and help set the stage for tomorrow.
* **Morning Planning Session:** When the user first starts the app for the day, the AI could greet them with a summary of their pending tasks and help them identify a top priority.
    * **Example:** "Good morning! You've got 3 tasks on your plate today. What's your #1 priority to get started?"
* **Detecting Stalled Tasks:** The AI could periodically check for tasks that have been in 'pending' status for several days. If it finds one, it can proactively ask about it the next time the user interacts with the app.
    * **Example:** "Just a friendly nudge—I see 'Deploy the staging server' has been on the list for a few days. Are there any blockers I can help you think through?"

***

### 3. AI-Powered Task Assistance 💡

We can introduce new AI-powered commands to help users manage their work more effectively.

* **Task Breakdown (`/todo breakdown <index>`):** A user could point to a large task (e.g., "Build the new reporting feature"). The app would send this to the AI with a prompt like, "Break this high-level developer task into a list of smaller, actionable sub-tasks." The AI could return a list like `1. Design the database schema`, `2. Create the API endpoints`, `3. Build the frontend table`, which the app could then automatically add to the todo list.
* **Identify Dependencies (`/todo deps <index>`):** The AI could help think through prerequisites for a task. The prompt could be, "What are the likely dependencies or prerequisites I should consider before starting this task: '...'?"

These features would transform the app from a passive tool into an active partner, making it a true "Dev Coach." We could start by implementing the intelligent check-in feature, as it leverages the existing scheduler and task list infrastructure.


## Use SQLite?

No, migrating to SQLite is a great long-term goal but **not a necessary prerequisite** for implementing these AI features. You can build the most exciting parts of your vision right now with your existing JSON file setup.

A database migration is a significant refactor of all your data-handling code. My advice is to get the core AI coaching experience working first to prove the concept and keep your momentum going.

***
### Recommended Phased Approach 🗺️

Here’s a path that gets you to the fun features faster:

#### Phase 1: Implement Core AI Logic with JSON Files

1.  **Add the 'In Progress' Status:** You're right, knowing what's on deck is key. This is a small but important change.
    * Add a new command, like `/todo start <index>`, that changes a task's status to `in progress`.
    * Update your `/todo list` command to display this new status, maybe with a different color using `chalk`.

2.  **Implement an AI Feature:** Start with the **Intelligent Check-in** or the **Task Breakdown** command.
    * For the check-in, you'd modify `schedulerService` to read the `tasks.json` file into an array, pass that array to the `aiService`, and have the AI generate its personalized message. This is very achievable with your current code.

***
#### Phase 2: Migrate to SQLite When Needed

Once you have one or two AI features working, you'll have a much better idea of your real data needs. You'll likely run into a specific limitation that makes the migration feel necessary, not just theoretical.

For example, you might decide you want the AI to analyze long-term trends ("How has my task completion rate changed over the last 3 months?"). That's the perfect trigger to say, "Okay, now it's time for SQLite," because that kind of query is exactly what a database is for.

By waiting, you let the features drive the architecture, not the other way around.