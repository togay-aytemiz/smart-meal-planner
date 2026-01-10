/**
 * Base LLM Provider Interface
 * All LLM providers (OpenAI, Gemini, etc.) must implement this interface
 */

import { Recipe } from "../types/recipe";
import { RecipeGenerationParams } from "../types/generation-params";

export interface LLMProvider {
  /**
   * Generate a recipe based on the provided parameters
   * Returns a complete Recipe object
   */
  generateRecipe(params: RecipeGenerationParams): Promise<Recipe>;

  /**
   * Generate an image from a text prompt
   * Returns base64 encoded image string
   */
  generateImage(prompt: string): Promise<string>;

  /**
   * Get cost estimate for generating a recipe
   * Returns estimated cost in USD
   */
  getCostEstimate(params: RecipeGenerationParams): number;

  /**
   * Get provider name
   */
  getName(): string;
}

export type LLMProviderType = "openai" | "gemini";
