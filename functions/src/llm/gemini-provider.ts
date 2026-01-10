/**
 * Gemini LLM Provider - Recipe Generation
 * Using Google Generative AI (Gemini) for menu planning
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLLMConfig } from "../config/secrets";
import { buildMenuSystemPrompt, buildMenuPrompt } from "./prompts/menu-prompt";
import { MenuGenerationRequest } from "../types/menu";

export class GeminiProvider {
    private client: GoogleGenerativeAI;
    private model: string;

    constructor() {
        const config = getLLMConfig();
        this.client = new GoogleGenerativeAI(config.gemini.apiKey);
        this.model = config.gemini.model;
    }

    /**
     * Generate a simple test response from Gemini
     */
    async generateTest(prompt: string): Promise<string> {
        try {
            const model = this.client.getGenerativeModel({ model: this.model });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return text;
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

            const model = this.client.getGenerativeModel({
                model: this.model,
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxOutputTokens: 8192,
                },
            });

            // Combine prompts
            const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();

            // Try to parse as JSON
            try {
                const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/);
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
