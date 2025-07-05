#!/usr/bin/env node

/**
 * Test script to verify AI integration with the new @google/genai package
 * Run with: node test-ai-integration.js [API_KEY]
 */

const { GoogleGenAI } = require("@google/genai");

async function testAiIntegration() {
    const apiKey = process.argv[2];

    if (!apiKey) {
        console.log("Usage: node test-ai-integration.js <API_KEY>");
        console.log("Please provide your Google AI API key as an argument");
        process.exit(1);
    }

    try {
        console.log("Testing AI integration with @google/genai...");

        const ai = new GoogleGenAI({ apiKey: apiKey });

        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: "Hello! Please respond with a brief developer productivity tip."
        });

        console.log("✅ AI Integration Test Successful!");
        console.log("Response:", result.text);

    } catch (error) {
        console.error("❌ AI Integration Test Failed:");
        console.error("Error:", error.message);

        if (error.message.includes('API key')) {
            console.error("Please check your API key is valid and has the correct permissions.");
        } else if (error.message.includes('network')) {
            console.error("Please check your internet connection.");
        }

        process.exit(1);
    }
}

testAiIntegration(); 