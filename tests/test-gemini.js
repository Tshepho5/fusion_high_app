// Import and configure dotenv to load environment variables
require('dotenv').config();

// Import the Google AI SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Get the API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in the environment variables.');
}

// Initialize the GoogleGenerativeAI with your API key
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    try {
        // Use gemini-2.5-flash or gemini-2.0-flash for high performance
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = 'Write a short, futuristic story about a programmer and their AI assistant.';

        console.log(`Sending prompt: "${prompt}"`);
        console.log('---------------------------------');

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log(text);
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

run();
