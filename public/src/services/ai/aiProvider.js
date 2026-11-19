const { GoogleGenerativeAI } = require('@google/generative-ai');
const { refuseExternalService } = require('../../../../lib/testSafety');
require('dotenv').config();

class AIProvider {
    constructor() {
        this._client = null;
        // Google's model list (November 2026) documents gemini-3.6-flash as the
        // successor that gemini-3.5-flash routes to, and gemini-3.5-flash-lite
        // as the lighter fallback. AI_MODEL overrides the primary id.
        this.defaultModel = process.env.AI_MODEL || 'gemini-3.6-flash';
        this.fallbackModel = process.env.AI_MODEL_FALLBACK || 'gemini-3.5-flash-lite';
        this.usage = { requests: 0, successes: 0, failures: 0, fallbacks: 0, lastFailureAt: null, lastFailureCode: null };
    }

    modelCandidates() {
        const primary = this.defaultModel;
        const fallback = this.fallbackModel;
        return fallback && fallback !== primary ? [primary, fallback] : [primary];
    }

    usageSnapshot() {
        return { ...this.usage, model: this.defaultModel, fallback: this.fallbackModel };
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
        refuseExternalService('ai');
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

        const candidates = this.modelCandidates();
        let lastError = null;
        const startTime = Date.now();
        this.usage.requests += 1;

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
                    this.usage.successes += 1;
                    if (modelName !== candidates[0]) this.usage.fallbacks += 1;

                    return {
                        text,
                        functionCalls: functionCalls || null,
                        modelUsed: modelName,
                        latencyMs,
                        rawResponse: response
                    };
                } catch (err) {
                    lastError = err;
                    const code = err.status || err.code || 'provider_error';
                    this.usage.lastFailureAt = new Date().toISOString();
                    this.usage.lastFailureCode = String(code).slice(0, 40);
                    console.warn(`[AI DIAGNOSTIC: ATTEMPT FAILED] model=${modelName} attempt=${attempt + 1} code=${this.usage.lastFailureCode}`);
                    const isTransient = code === 429 || code === 503 || code === '429' || code === '503';
                    if (isTransient && attempt === 0) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                    break; // try next candidate model
                }
            }
        }

        this.usage.failures += 1;
        console.error(`[AI DIAGNOSTIC: ALL FAILED] totalDuration=${Date.now() - startTime}ms`);
        throw lastError || new Error('All AI model candidate attempts failed.');
    }

    async generateResponse(prompt, options = {}) {
        const result = await this.generateContent({
            prompt,
            systemInstruction: options.systemInstruction,
            temperature: options.temperature
        });
        return result && result.text ? result.text : '';
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
