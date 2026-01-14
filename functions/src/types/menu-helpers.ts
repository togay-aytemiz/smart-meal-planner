/**
 * Menu Generation Helpers
 * Convert onboarding data to menu generation requests
 */

import { OnboardingData } from "./onboarding";
import { MenuGenerationRequest, MealType } from "./menu";

/**
 * Convert onboarding data to menu generation request
 * Default: Generate dinner meal unless mealType is provided
 * 
 * Note: For MVP testing, if no date is provided or date is not specified,
 * the function will use Monday routine from onboarding (default for testing)
 */
export function onboardingToMenuRequest(
  onboarding: OnboardingData,
  date?: string, // YYYY-MM-DD format - if not provided, uses Monday for MVP testing
  options?: {
    existingPantry?: string[];
    avoidIngredients?: string[];
    avoidItemNames?: string[];
    maxPrepTime?: number;
    maxCookTime?: number;
    generateImage?: boolean;
    mealType?: MealType;
    onboardingHash?: string;
    previousPreferences?: {
      likedRecipes?: string[];
      dislikedRecipes?: string[];
      avoidIngredients?: string[];
      preferredCuisines?: string[];
    };
    // MVP: Use specific day for testing (default: Monday)
    dayForTesting?: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  }
): MenuGenerationRequest {
  // MVP: For testing, use Monday routine if no date provided
  let dayOfWeek: string;
  let routineDate: string;

  if (date) {
    // Use provided date
    routineDate = date;
    dayOfWeek = new Date(date)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
  } else {
    // MVP: Use Monday for testing (or specified test day)
    const testDay = options?.dayForTesting || "monday";
    dayOfWeek = testDay.toLowerCase();
    // Calculate a Monday date for the routine
    const today = new Date();
    const dayOfWeekNum = today.getDay();
    const daysUntilMonday = dayOfWeekNum === 0 ? 1 : (1 + 7 - dayOfWeekNum) % 7 || 7;
    const mondayDate = new Date(today);
    mondayDate.setDate(today.getDate() + daysUntilMonday);
    routineDate = mondayDate.toISOString().split("T")[0]; // YYYY-MM-DD format
  }

  // Get routine for this day
  const routine = onboarding.routines?.[dayOfWeek as keyof typeof onboarding.routines];

  // MVP: Log if using default Monday routine
  if (!date) {
    console.log(`[MVP Testing] Using ${dayOfWeek} routine from onboarding for menu generation`);
  }

  return {
    userId: "", // Will be set by the service
    date: routineDate,
    dayOfWeek,
    onboardingHash: options?.onboardingHash,

    // User preferences from onboarding
    dietaryRestrictions: onboarding.dietary.restrictions || [],
    allergies: onboarding.dietary.allergies || [],
    cuisinePreferences: onboarding.cuisine.selected || [],
    timePreference: onboarding.cooking.timePreference || "balanced",
    skillLevel: onboarding.cooking.skillLevel || "intermediate",
    equipment: onboarding.cooking.equipment || [],
    householdSize: onboarding.householdSize || 1,

    // Day-specific context
    routine: routine
      ? {
        type: routine.type,
        gymTime: routine.gymTime,
        officeMealToGo: routine.officeMealToGo,
        officeBreakfastAtHome: routine.officeBreakfastAtHome,
        schoolBreakfast: routine.schoolBreakfast,
        remoteMeals: routine.remoteMeals,
        excludeFromPlan: routine.excludeFromPlan,
      }
      : undefined,

    // Additional context
    existingPantry: options?.existingPantry,
    avoidIngredients: options?.avoidIngredients,
    avoidItemNames: options?.avoidItemNames,
    maxPrepTime: options?.maxPrepTime,
    maxCookTime: options?.maxCookTime,

    // User feedback (Future - Post-MVP)
    previousPreferences: options?.previousPreferences,

    // Default: dinner unless overridden
    mealType: options?.mealType ?? "dinner",

    // Image generation
    generateImage: options?.generateImage ?? true,
  };
}
