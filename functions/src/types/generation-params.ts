/**
 * Menu Recipe Generation Parameters
 * Uses onboarding data and selected menu decision
 */

import { OnboardingData } from "./onboarding";
import { MenuDecision, MenuGenerationRequest } from "./menu";
import { onboardingToMenuRequest } from "./menu-helpers";

export interface MenuRecipeGenerationParams extends MenuGenerationRequest {
  menu: MenuDecision;
}

export function onboardingToMenuRecipeParams(
  onboarding: OnboardingData,
  menu: MenuDecision,
  date?: string,
  options?: {
    existingPantry?: string[];
    avoidIngredients?: string[];
    maxPrepTime?: number;
    maxCookTime?: number;
    generateImage?: boolean;
    onboardingHash?: string;
    previousPreferences?: {
      likedRecipes?: string[];
      dislikedRecipes?: string[];
      avoidIngredients?: string[];
      preferredCuisines?: string[];
    };
    dayForTesting?:
      | "monday"
      | "tuesday"
      | "wednesday"
      | "thursday"
      | "friday"
      | "saturday"
      | "sunday";
  }
): MenuRecipeGenerationParams {
  const baseRequest = onboardingToMenuRequest(onboarding, date, options);

  return {
    ...baseRequest,
    menu,
  };
}
