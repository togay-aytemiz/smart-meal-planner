/**
 * OpenAI LLM Provider - Menu Recipe Generation
 */

import OpenAI from "openai";
import { getLLMConfig } from "../config/secrets";
import { MenuGenerationRequest } from "../types/menu";
import { MenuRecipeGenerationParams } from "../types/generation-params";
import { buildMenuPrompt, buildMenuSystemPrompt } from "./prompts/menu-prompt";
import { buildRecipePrompt, buildSystemPrompt as buildRecipeSystemPrompt } from "./prompts/recipe-prompt";
import { buildCompletePantryPrompt } from "./prompts/pantry-prompt";
import { buildCompleteGroceryCategorizationPrompt, GroceryInputItem } from "./prompts/grocery-prompt";
import { getOpenAIMenuSchema } from "./schemas/menu-schema";
import { getOpenAIRecipeSchema } from "./schemas/recipe-schema";
import { getOpenAIPantrySchema } from "./schemas/pantry-schema";
import { getOpenAIGrocerySchema } from "./schemas/grocery-schema";
import { getErrorMessage, isRetryableError, withRetry } from "./retry";

const OPENAI_TIMEOUT_MS = 60_000;
const OPENAI_RETRY_OPTIONS = {
    maxAttempts: 2,
    baseDelayMs: 500,
    maxDelayMs: 2_000,
    jitterRatio: 0.2,
};

const buildProviderError = (prefix: string, error: unknown): Error => {
    if (error instanceof Error) {
        const message = error.message || "Unknown error";
        if (!message.startsWith(prefix)) {
            error.message = `${prefix}: ${message}`;
        }
        return error;
    }
    return new Error(`${prefix}: ${getErrorMessage(error)}`);
};

type OpenAIResponseFormat =
    | ReturnType<typeof getOpenAIMenuSchema>
    | ReturnType<typeof getOpenAIRecipeSchema>
    | ReturnType<typeof getOpenAIPantrySchema>
    | ReturnType<typeof getOpenAIGrocerySchema>;

export class OpenAIProvider {
    private client: OpenAI;
    private model: string;

    constructor() {
        const config = getLLMConfig();
        this.client = new OpenAI({ apiKey: config.openai.apiKey });
        this.model = config.openai.model;
    }

    private async createChatCompletion(body: OpenAI.ChatCompletionCreateParamsNonStreaming, context: string) {
        return withRetry(
            () =>
                this.client.chat.completions.create(body, {
                    timeout: OPENAI_TIMEOUT_MS,
                    maxRetries: 0,
                }),
            {
                ...OPENAI_RETRY_OPTIONS,
                shouldRetry: isRetryableError,
                onRetry: (error, attempt, delayMs, maxAttempts) => {
                    console.warn(
                        `[OpenAI] ${context} retry ${attempt}/${maxAttempts} in ${delayMs}ms: ${getErrorMessage(error)}`
                    );
                },
            }
        );
    }

    private async generateStructuredResponse(
        systemPrompt: string,
        userPrompt: string,
        responseFormat: OpenAIResponseFormat
    ): Promise<Record<string, unknown>> {
        const result = await this.createChatCompletion(
            {
                model: this.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                response_format: responseFormat,
            },
            "structured-response"
        );

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
            const result = await this.createChatCompletion(
                {
                    model: this.model,
                    messages: [{ role: "user", content: prompt }],
                },
                "test"
            );

            const text = result.choices?.[0]?.message?.content?.trim();
            if (!text) {
                throw new Error("OpenAI returned empty response");
            }

            return text;
        } catch (error) {
            console.error("OpenAI API error:", error);
            throw buildProviderError("OpenAI API failed", error);
        }
    }

    async generateMenu(request: MenuGenerationRequest): Promise<Record<string, unknown>> {
        try {
            const systemPrompt = buildMenuSystemPrompt();
            const userPrompt = buildMenuPrompt(request);
            const resolvedMealType = request.mealType ?? "dinner";

            return await this.generateStructuredResponse(
                systemPrompt,
                userPrompt,
                getOpenAIMenuSchema(resolvedMealType)
            );
        } catch (error) {
            console.error("OpenAI menu generation error:", error);
            throw buildProviderError("OpenAI menu generation failed", error);
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
            throw buildProviderError("OpenAI recipe generation failed", error);
        }
    }

    async normalizePantryItems(inputs: string[]): Promise<Record<string, unknown>> {
        try {
            const { systemPrompt, userPrompt } = buildCompletePantryPrompt(inputs);

            return await this.generateStructuredResponse(
                systemPrompt,
                userPrompt,
                getOpenAIPantrySchema()
            );
        } catch (error) {
            console.error("OpenAI pantry normalization error:", error);
            throw buildProviderError("OpenAI pantry normalization failed", error);
        }
    }

    async categorizeGroceryItems(items: GroceryInputItem[]): Promise<Record<string, unknown>> {
        try {
            const { systemPrompt, userPrompt } = buildCompleteGroceryCategorizationPrompt(items);

            return await this.generateStructuredResponse(
                systemPrompt,
                userPrompt,
                getOpenAIGrocerySchema()
            );
        } catch (error) {
            console.error("OpenAI grocery categorization error:", error);
            throw buildProviderError("OpenAI grocery categorization failed", error);
        }
    }

    getName(): string {
        return "openai";
    }
}
