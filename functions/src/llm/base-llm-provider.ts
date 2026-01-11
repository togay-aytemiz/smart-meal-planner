/**
 * Base LLM Provider Interface
 * All LLM providers (OpenAI, Gemini, etc.) must implement this interface
 */

import { MenuRecipeGenerationParams } from "../types/generation-params";

export interface LLMProvider {
  /**
   * Generate recipes for a selected dinner menu
   * Returns structured JSON matching the menu recipes schema
   */
  generateRecipe(params: MenuRecipeGenerationParams): Promise<Record<string, unknown>>;

  /**
   * Generate an image from a text prompt
   * Returns base64 encoded image string
   */
  generateImage(prompt: string): Promise<string>;

  /**
   * Get cost estimate for generating a recipe
   * Returns estimated cost in USD
   */
  getCostEstimate(params: MenuRecipeGenerationParams): number;

  /**
   * Get provider name
   */
  getName(): string;
}

export type LLMProviderType = "openai" | "gemini";
