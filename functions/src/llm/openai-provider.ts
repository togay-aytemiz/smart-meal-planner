/**
 * OpenAI LLM Provider - Menu Recipe Generation
 */

import OpenAI from "openai";
import { getLLMConfig } from "../config/secrets";
import { MenuGenerationRequest } from "../types/menu";
import { MenuRecipeGenerationParams } from "../types/generation-params";
import { buildMenuPrompt, buildMenuSystemPrompt } from "./prompts/menu-prompt";
import { buildRecipePrompt, buildSystemPrompt as buildRecipeSystemPrompt } from "./prompts/recipe-prompt";
import { getOpenAIMenuSchema } from "./schemas/menu-schema";
import { getOpenAIRecipeSchema } from "./schemas/recipe-schema";

type OpenAIResponseFormat =
    | ReturnType<typeof getOpenAIMenuSchema>
    | ReturnType<typeof getOpenAIRecipeSchema>;

export class OpenAIProvider {
    private client: OpenAI;
    private model: string;

    constructor() {
        const config = getLLMConfig();
        this.client = new OpenAI({ apiKey: config.openai.apiKey });
        this.model = config.openai.model;
    }

    private async generateStructuredResponse(
        systemPrompt: string,
        userPrompt: string,
        responseFormat: OpenAIResponseFormat
    ): Promise<Record<string, unknown>> {
        const result = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            response_format: responseFormat,
        });

        const text = result.choices?.[0]?.message?.content?.trim();
        if (!text) {
            throw new Error("OpenAI returned empty response");
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            throw new Error("OpenAI response is not valid JSON");
        }

        if (typeof parsed !== "object" || parsed === null) {
            throw new Error("OpenAI response is not a JSON object");
        }

        return parsed as Record<string, unknown>;
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

    async generateMenu(request: MenuGenerationRequest): Promise<Record<string, unknown>> {
        try {
            const systemPrompt = buildMenuSystemPrompt();
            const userPrompt = buildMenuPrompt(request);

            return await this.generateStructuredResponse(
                systemPrompt,
                userPrompt,
                getOpenAIMenuSchema()
            );
        } catch (error) {
            console.error("OpenAI menu generation error:", error);
            throw new Error(`OpenAI menu generation failed: ${error}`);
        }
    }

    async generateRecipe(params: MenuRecipeGenerationParams): Promise<Record<string, unknown>> {
        try {
            const systemPrompt = buildRecipeSystemPrompt();
            const userPrompt = buildRecipePrompt(params);

            return await this.generateStructuredResponse(
                systemPrompt,
                userPrompt,
                getOpenAIRecipeSchema()
            );
        } catch (error) {
            console.error("OpenAI recipe generation error:", error);
            throw new Error(`OpenAI recipe generation failed: ${error}`);
        }
    }

    getName(): string {
        return "openai";
    }
}
