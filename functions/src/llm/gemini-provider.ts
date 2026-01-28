/**
 * Gemini LLM Provider - Recipe Generation
 * Uses REST v1beta to support preview models.
 */

import { getLLMConfig } from "../config/secrets";
import { buildMenuSystemPrompt, buildMenuPrompt } from "./prompts/menu-prompt";
import { MenuGenerationRequest } from "../types/menu";
import { getErrorMessage, isRetryableError, withRetry } from "./retry";

type GeminiContentPart = {
    text: string;
};

type GeminiContent = {
    role: "user" | "model";
    parts: GeminiContentPart[];
};

type GeminiGenerationConfig = {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
};

type GeminiGenerateContentRequest = {
    contents: GeminiContent[];
    generationConfig?: GeminiGenerationConfig;
};

type GeminiGenerateContentResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
    error?: {
        message?: string;
        status?: string;
    };
};

export class GeminiProvider {
    private apiKey: string;
    private model: string;
    private baseUrl: string;

    constructor() {
        const config = getLLMConfig();
        this.apiKey = config.gemini.apiKey;
        this.model = config.gemini.model;
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
    }

    private async generateContent(
        prompt: string,
        generationConfig?: GeminiGenerationConfig
    ): Promise<string> {
        if (!this.apiKey) {
            throw new Error("Gemini API key is missing");
        }

        const modelPath = this.model.startsWith("models/") ? this.model : `models/${this.model}`;
        const url = `${this.baseUrl}/${modelPath}:generateContent?key=${encodeURIComponent(
            this.apiKey
        )}`;
        const payload: GeminiGenerateContentRequest = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }],
                },
            ],
            generationConfig,
        };

        const timeoutMs = 25_000;
        const retryOptions = {
            maxAttempts: 2,
            baseDelayMs: 500,
            maxDelayMs: 2_000,
            jitterRatio: 0.2,
        };

        const requestGemini = async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });

                const responseText = await response.text();
                let responseJson: GeminiGenerateContentResponse | null = null;

                try {
                    responseJson = JSON.parse(responseText) as GeminiGenerateContentResponse;
                } catch {
                    responseJson = null;
                }

                if (!response.ok) {
                    const statusSuffix = responseJson?.error?.status ? ` (${responseJson.error.status})` : "";
                    const message =
                        responseJson?.error?.message ||
                        responseText ||
                        response.statusText ||
                        "Gemini API request failed";
                    const error = new Error(`Gemini API failed${statusSuffix}: ${message}`);
                    (error as { status?: number }).status = response.status;
                    throw error;
                }

                return responseJson ?? { candidates: [] };
            } finally {
                clearTimeout(timeoutId);
            }
        };

        const responseJson = await withRetry(requestGemini, {
            ...retryOptions,
            shouldRetry: isRetryableError,
            onRetry: (error, attempt, delayMs, maxAttempts) => {
                console.warn(
                    `[Gemini] retry ${attempt}/${maxAttempts} in ${delayMs}ms: ${getErrorMessage(error)}`
                );
            },
        });

        const parts = responseJson?.candidates?.[0]?.content?.parts ?? [];
        const text = parts.map((part) => part.text ?? "").join("").trim();

        if (!text) {
            throw new Error("Gemini API returned empty response");
        }

        return text;
    }

    /**
     * Generate a simple test response from Gemini
     */
    async generateTest(prompt: string): Promise<string> {
        try {
            return await this.generateContent(prompt);
        } catch (error) {
            console.error("Gemini API error:", error);
            throw new Error(`Gemini API failed: ${error}`);
        }
    }

    /**
     * Generate a recipe menu using Gemini
     */
    async generateMenu(request: MenuGenerationRequest): Promise<any> {
        try {
            const systemPrompt = buildMenuSystemPrompt();
            const userPrompt = buildMenuPrompt(request);

            // Combine prompts
            const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

            const text = await this.generateContent(fullPrompt, {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 8192,
            });

            // Try to parse as JSON
            try {
                const jsonMatch =
                    text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/);
                if (jsonMatch) {
                    const jsonText = jsonMatch[1] || jsonMatch[0];
                    return JSON.parse(jsonText);
                }
                // If no code block, try to parse the whole response
                return JSON.parse(text);
            } catch (parseError) {
                console.error("Failed to parse Gemini response as JSON:", text);
                throw new Error("Gemini response is not valid JSON");
            }
        } catch (error) {
            console.error("Gemini menu generation error:", error);
            throw new Error(`Gemini menu generation failed: ${error}`);
        }
    }

    /**
     * Get provider name
     */
    getName(): string {
        return "gemini";
    }
}
