/**
 * OpenAI LLM Provider - Recipe Generation
 */

import OpenAI from "openai";
import { getLLMConfig } from "../config/secrets";

export class OpenAIProvider {
    private client: OpenAI;
    private model: string;

    constructor() {
        const config = getLLMConfig();
        this.client = new OpenAI({ apiKey: config.openai.apiKey });
        this.model = config.openai.model;
    }

    async generateTest(prompt: string): Promise<string> {
        try {
            const result = await this.client.chat.completions.create({
                model: this.model,
                messages: [{ role: "user", content: prompt }],
            });

            const text = result.choices?.[0]?.message?.content?.trim();
            if (!text) {
                throw new Error("OpenAI returned empty response");
            }

            return text;
        } catch (error) {
            console.error("OpenAI API error:", error);
            throw new Error(`OpenAI API failed: ${error}`);
        }
    }

    getName(): string {
        return "openai";
    }
}
