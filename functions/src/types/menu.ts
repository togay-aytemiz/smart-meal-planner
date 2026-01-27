/**
 * Daily Menu Types
 * Default: Single meal per day (dinner)
 * Future: Full daily menu (breakfast, lunch, dinner, snacks)
 */

import { Recipe } from "./recipe";
import { OnboardingData } from "./onboarding";

export type MealType = "breakfast" | "lunch" | "dinner";

export type ExtraDishType = "soup" | "salad" | "meze" | "dessert" | "pastry";

export type WeeklyContext = {
  weekStart?: string; // YYYY-MM-DD
  dayIndex?: number; // 0-6 (weekStart based)
  repeatMode?: "consecutive" | "spaced";
  repeatGroupId?: string;
  ingredientSynergyFrom?: {
    mealType: MealType;
    date: string;
    mainDishName?: string;
  };
  reasoningHint?: string;
  seasonalityHint?: string;
  leftoverMainDish?: string; // Force usage of a specific main dish (for COET)
};

export interface MenuDecision {
  menuType: MealType;
  cuisine: string;
  totalTimeMinutes: number;
  reasoning: string;
  items: Array<{
    course: "main" | "side" | ExtraDishType;
    name: string;
    recipeId?: string;
  }>;
}

export interface DailyMenu {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format

  // Day context (from user routine)
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  routineType: "office" | "remote" | "gym" | "school" | "off";

  // Default: Single meal (dinner)
  dinner?: MenuMeal;

  // Future: Full daily menu
  breakfast?: MenuMeal;
  lunch?: MenuMeal;
  snacks?: MenuMeal[];

  // Reasoning/Explanation (from LLM)
  reasoning: string; // "Neden bu menü?" - LLM'in açıklaması
  // Örnek: "Salı günü spor demişsin ve ben de buna göre yüksek proteinli, post-workout recovery için ideal bir akşam yemeği öneriyorum. Bu yemek kas onarımı için gerekli protein ve karbonhidrat dengesini sağlıyor."

  // User context used for generation
  context: {
    dietaryRestrictions: string[];
    allergies: string[];
    cuisinePreferences: string[];
    timePreference: "quick" | "balanced" | "elaborate";
    skillLevel: "beginner" | "intermediate" | "expert";
    equipment: string[];
    householdSize: number;
    gymDay?: boolean;
    portableRequired?: boolean; // for office/remote days
  };

  // Feedback & Learning (Future - Post-MVP)
  feedback?: {
    liked?: string[]; // recipe IDs user liked
    disliked?: string[]; // recipe IDs user disliked
    swapped?: string[]; // recipe IDs user swapped
    notes?: string; // user notes/feedback
  };

  // LLM Metadata
  generatedBy: "openai" | "gemini";
  generatedAt: Date;
  generationCost: number;
  promptHash?: string; // For caching similar prompts

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuMeal {
  recipeId: string;
  recipe: Recipe; // Full recipe details
  servings: number; // Adjusted servings for this meal
  isLocked: boolean; // User locked this meal
  isAiSuggested: boolean; // true if AI generated, false if user added

  // Future: User modifications
  modifications?: {
    swappedIngredients?: Array<{ from: string; to: string }>;
    adjustedServings?: number; // Original vs adjusted
    notes?: string;
  };

  // Statistics
  suggestedAt?: Date;
  viewedAt?: Date;
  cookedAt?: Date;
  rating?: number; // 1-5 stars (Future)
}

/**
 * Menu Generation Request
 */
export interface MenuGenerationRequest {
  userId: string;
  date: string; // YYYY-MM-DD
  dayOfWeek?: string; // Auto-calculated from date if not provided
  onboardingHash?: string;

  // User preferences (from onboarding)
  dietaryRestrictions: string[];
  allergies: string[];
  cuisinePreferences: string[];
  timePreference: "quick" | "balanced" | "elaborate";
  skillLevel: "beginner" | "intermediate" | "expert";
  equipment: string[];
  householdSize: number;

  // Day-specific context
  routine?: {
    type: "office" | "remote" | "gym" | "school" | "off";
    gymTime?: "morning" | "afternoon" | "evening" | "none";
    officeMealToGo?: "yes" | "no";
    officeBreakfastAtHome?: "yes" | "no";
    schoolBreakfast?: "yes" | "no";
    remoteMeals?: ("breakfast" | "lunch" | "dinner")[];
    excludeFromPlan?: boolean;
  };

  // Additional context
  existingPantry?: string[];
  avoidIngredients?: string[];
  avoidItemNames?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;

  // Future: User feedback to incorporate
  previousPreferences?: {
    likedRecipes?: string[]; // Recipe IDs
    dislikedRecipes?: string[]; // Recipe IDs
    avoidIngredients?: string[]; // Additional avoid list from feedback
    preferredCuisines?: string[]; // Learned preferences
  };

  // Default: Generate single meal (breakfast/lunch/dinner)
  mealType: MealType; // Future: "full"

  // Weekly planning context (optional)
  weeklyContext?: WeeklyContext;

  // Image generation
  generateImage?: boolean;
}

export type WeeklyMenuGenerationRequest = {
  userId?: string;
  weekStart?: string; // YYYY-MM-DD
  singleDay?: string; // YYYY-MM-DD - if provided, only generate this day
  startDate?: string; // YYYY-MM-DD - if provided, generate from this day onwards
  excludeDates?: string[]; // YYYY-MM-DD - dates to skip
  onboarding?: Partial<OnboardingData>;
  onboardingHash?: string;
  repeatMode?: "consecutive" | "spaced";
  existingPantry?: string[];
  avoidIngredients?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  generateImage?: boolean;
};
