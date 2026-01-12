/**
 * Daily Menu Types
 * MVP: Single dinner meal per day
 * Future: Full daily menu (breakfast, lunch, dinner, snacks)
 */

import { Recipe } from "./recipe";

export type ExtraDishType = "soup" | "salad" | "meze" | "dessert" | "pastry";

export interface MenuDecision {
  menuType: "dinner";
  cuisine: string;
  totalTimeMinutes: number;
  items: {
    main: string;
    side: string;
    extra: {
      type: ExtraDishType;
      name: string;
    };
  };
}

export interface DailyMenu {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  
  // Day context (from user routine)
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  routineType: "office" | "remote" | "gym" | "school" | "off";
  
  // MVP: Single dinner meal
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
    remoteMeals?: ("breakfast" | "lunch" | "dinner")[];
    excludeFromPlan?: boolean;
  };
  
  // Additional context
  existingPantry?: string[];
  avoidIngredients?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  
  // Future: User feedback to incorporate
  previousPreferences?: {
    likedRecipes?: string[]; // Recipe IDs
    dislikedRecipes?: string[]; // Recipe IDs
    avoidIngredients?: string[]; // Additional avoid list from feedback
    preferredCuisines?: string[]; // Learned preferences
  };
  
  // MVP: Generate dinner only
  mealType: "dinner"; // Future: "breakfast" | "lunch" | "dinner" | "full"
  
  // Image generation
  generateImage?: boolean;
}
