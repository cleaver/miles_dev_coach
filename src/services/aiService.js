const chalk = require("chalk").default;
const { GoogleGenerativeAI } = require("@google/generative-ai");

const getAiResponse = async (message, apiKey) => {
    if (!apiKey) {
        return chalk.red(
            "AI Coach: Gemini API key not set. Please use /config set ai_api_key YOUR_API_KEY."
        );
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
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

module.exports = {
    getAiResponse
}; 