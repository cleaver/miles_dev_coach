const { handleTodoCommand } = require('./src/commands/todoCommand');

// Test tasks
const testTasks = [
    {
        id: 1,
        description: "First task",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 2,
        description: "Second task",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 3,
        description: "Third task",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

async function testTodoIndexing() {
    console.log("Testing todo indexing fix...\n");

    console.log("Initial tasks:");
    testTasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.description} (${task.status})`);
    });
    console.log();

    // Test /todo start 2 - should start the second task (index 1)
    console.log("Testing: /todo start 2");
    const result1 = await handleTodoCommand(['start', '2'], [...testTasks]);
    console.log(`Result: ${result1.success ? 'SUCCESS' : 'FAILED'}`);
    if (result1.success) {
        console.log("Task 2 should now be in-progress");
    }
    console.log();

    // Test /todo start 1 - should start the first task (index 0)
    console.log("Testing: /todo start 1");
    const result2 = await handleTodoCommand(['start', '1'], [...testTasks]);
    console.log(`Result: ${result2.success ? 'SUCCESS' : 'FAILED'}`);
    if (result2.success) {
        console.log("Task 1 should now be in-progress");
    }
    console.log();

    // Test /todo start 3 - should start the third task (index 2)
    console.log("Testing: /todo start 3");
    const result3 = await handleTodoCommand(['start', '3'], [...testTasks]);
    console.log(`Result: ${result3.success ? 'SUCCESS' : 'FAILED'}`);
    if (result3.success) {
        console.log("Task 3 should now be in-progress");
    }
    console.log();

    console.log("Indexing test completed!");
}

testTodoIndexing().catch(console.error); 