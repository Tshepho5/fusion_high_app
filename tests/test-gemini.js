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
        const candidates = [
            'gemini-3.8-flash',
            'gemini-2.5-pro',
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-2.0-flash-exp'
        ];
        for (const modelName of candidates) {
            try {
                console.log(`Trying ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Say hello in one word');
                const response = await result.response;
                console.log(`SUCCESS [${modelName}]:`, response.text());
                return;
            } catch (err) {
                console.log(`FAILED [${modelName}]: ${err.status || err.message}`);
            }
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

run();
