/**
 * Recipe Generation Parameters
 * Onboarding data integration types
 */

import { OnboardingData } from "./onboarding";

export interface RecipeGenerationParams {
  // From Onboarding
  name: string; // Recipe name (e.g., "Yeşil Mercimek Salatası")
  dietaryRestrictions: string[]; // from onboarding.dietary.restrictions
  allergies: string[]; // from onboarding.dietary.allergies (STRICT - never suggest)
  cuisinePreferences: string[]; // from onboarding.cuisine.selected
  timePreference: "quick" | "balanced" | "elaborate"; // from onboarding.cooking.timePreference
  skillLevel: "beginner" | "intermediate" | "expert"; // from onboarding.cooking.skillLevel
  equipment: string[]; // from onboarding.cooking.equipment
  
  // From User Context
  householdSize: number; // from onboarding.householdSize (default servings)
  routines?: {
    dayOfWeek: string; // "monday", "tuesday", etc.
    type: string; // "office", "remote", "gym", etc.
    remoteMeals?: string[]; // ["lunch"] - meals needed to-go
  };
  
  // Additional Context
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  servings?: number; // Override householdSize if needed
  existingPantry?: string[]; // Ingredients user already has (cost optimization)
  avoidIngredients?: string[]; // Ingredients to avoid
  maxPrepTime?: number; // minutes - optional constraint
  maxCookTime?: number; // minutes - optional constraint
}

/**
 * Convert onboarding data to recipe generation params
 */
export function onboardingToRecipeParams(
  onboarding: OnboardingData,
  recipeName: string,
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  options?: {
    dayOfWeek?: string;
    servings?: number;
    existingPantry?: string[];
    avoidIngredients?: string[];
    maxPrepTime?: number;
    maxCookTime?: number;
  }
): RecipeGenerationParams {
  const routine = options?.dayOfWeek 
    ? onboarding.routines[options.dayOfWeek.toLowerCase() as keyof typeof onboarding.routines]
    : undefined;

  return {
    name: recipeName,
    dietaryRestrictions: onboarding.dietary.restrictions || [],
    allergies: onboarding.dietary.allergies || [],
    cuisinePreferences: onboarding.cuisine.selected || [],
    timePreference: onboarding.cooking.timePreference || "balanced",
    skillLevel: onboarding.cooking.skillLevel || "intermediate",
    equipment: onboarding.cooking.equipment || [],
    householdSize: onboarding.householdSize || 1,
    routines: routine ? {
      dayOfWeek: options!.dayOfWeek!,
      type: routine.type,
      remoteMeals: routine.remoteMeals,
    } : undefined,
    mealType,
    servings: options?.servings || onboarding.householdSize || 4,
    existingPantry: options?.existingPantry,
    avoidIngredients: options?.avoidIngredients,
    maxPrepTime: options?.maxPrepTime,
    maxCookTime: options?.maxCookTime,
  };
}
