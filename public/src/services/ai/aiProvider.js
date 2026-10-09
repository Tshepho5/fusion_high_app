const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class AIProvider {
    constructor() {
        this._client = null;
        this.defaultModel = process.env.AI_MODEL || 'gemini-3.5-flash';
        this.fallbackModels = ['gemini-3.5-flash', 'gemini-3.8-flash'];
    }

    _getKey() {
        const rawKey = (
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY ||
            ''
        ).replace(/^["']|["']$/g, '').trim();
        return rawKey;
    }

    getClient() {
        const key = this._getKey();
        if (!key) {
            return null;
        }
        if (!this._client) {
            this._client = new GoogleGenerativeAI(key);
        }
        return this._client;
    }

    isAvailable() {
        return Boolean(this._getKey());
    }

    /**
     * Non-streaming generation with automatic model fallback, retry, and diagnostic logging
     */
    async generateContent({ systemInstruction, prompt, history = [], tools = null, temperature = 0.4 }) {
        const client = this.getClient();
        if (!client) {
            const err = new Error('AI service is not configured. GEMINI_API_KEY is missing on the server.');
            err.code = 'CONFIG_MISSING';
            throw err;
        }

        const candidates = [this.defaultModel, ...this.fallbackModels.filter(m => m !== this.defaultModel)];
        let lastError = null;
        const startTime = Date.now();

        for (const modelName of candidates) {
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    console.info(`[AI DIAGNOSTIC: START] Requesting model=${modelName} attempt=${attempt + 1} promptLength=${prompt ? prompt.length : 0}`);
                    const modelConfig = {
                        model: modelName,
                        generationConfig: { temperature }
                    };
                    if (systemInstruction) {
                        modelConfig.systemInstruction = systemInstruction;
                    }
                    if (tools && Array.isArray(tools) && tools.length > 0) {
                        modelConfig.tools = [{ functionDeclarations: tools }];
                    }

                    const model = client.getGenerativeModel(modelConfig);

                    let result;
                    if (history && history.length > 0) {
                        const chat = model.startChat({
                            history: history.map(h => ({
                                role: h.role === 'assistant' ? 'model' : 'user',
                                parts: [{ text: h.content || h.text || '' }]
                            }))
                        });
                        result = await chat.sendMessage(prompt);
                    } else {
                        result = await model.generateContent(prompt);
                    }

                    const response = await result.response;
                    const functionCalls = response.functionCalls ? response.functionCalls() : null;
                    const text = response.text ? response.text() : '';
                    const latencyMs = Date.now() - startTime;

                    console.info(`[AI DIAGNOSTIC: SUCCESS] model=${modelName} latency=${latencyMs}ms responseLength=${text.length}`);

                    return {
                        text,
                        functionCalls: functionCalls || null,
                        modelUsed: modelName,
                        latencyMs,
                        rawResponse: response
                    };
                } catch (err) {
                    lastError = err;
                    const msg = err.message || '';
                    console.warn(`[AI DIAGNOSTIC: ATTEMPT FAILED] model=${modelName} attempt=${attempt + 1} error=${msg}`);
                    const isTransient = msg.includes('429') || msg.includes('503') || msg.includes('Quota') || msg.includes('busy');
                    if (isTransient && attempt === 0) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                    break; // try next candidate model
                }
            }
        }

        console.error(`[AI DIAGNOSTIC: ALL FAILED] totalDuration=${Date.now() - startTime}ms lastError=${lastError?.message}`);
        throw lastError || new Error('All AI model candidate attempts failed.');
    }

    /**
     * Streaming generation for real-time SSE streaming
     */
    async generateContentStream({ systemInstruction, prompt, history = [], temperature = 0.4 }) {
        const client = this.getClient();
        if (!client) {
            throw new Error('AI service is not configured. GEMINI_API_KEY is missing on the server.');
        }

        const modelConfig = {
            model: this.defaultModel,
            generationConfig: { temperature }
        };
        if (systemInstruction) {
            modelConfig.systemInstruction = systemInstruction;
        }

        const model = client.getGenerativeModel(modelConfig);

        if (history && history.length > 0) {
            const chat = model.startChat({
                history: history.map(h => ({
                    role: h.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: h.content || h.text || '' }]
                }))
            });
            return await chat.sendMessageStream(prompt);
        } else {
            return await model.generateContentStream(prompt);
        }
    }
}

module.exports = new AIProvider();
