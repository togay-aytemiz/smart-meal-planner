// User and Family Types
export interface User {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    createdAt: string;
}

export interface FamilyMember {
    id: string;
    name: string;
    role: 'self' | 'spouse' | 'child' | 'parent' | 'nanny' | 'other';
    ageRange?: 'infant' | 'toddler' | 'child' | 'teen' | 'adult' | 'senior';
    dietaryPreferences: DietaryPreferences;
    routines: Routine[];
}

// Dietary Types
export interface DietaryPreferences {
    restrictions: string[]; // vegetarian, vegan, gluten-free, etc.
    allergies: string[];
    dislikes: string[];
    cuisinePreferences: string[];
}

// Routine Types
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface Routine {
    id: string;
    memberId: string;
    type: 'work' | 'gym' | 'school' | 'remote' | 'home' | 'activity';
    label: string;
    days: DayOfWeek[];
    startTime?: string; // HH:mm format
    endTime?: string;
    isRecurring: boolean;
}

// Meal Types
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    prepTime: number; // in minutes
    cookTime: number;
    servings: number;
    difficulty: 'easy' | 'medium' | 'hard';
    cuisineType: string;
    ingredients: Ingredient[];
    instructions: string[];
    nutritionInfo?: NutritionInfo;
    tags: string[];
}

export interface Ingredient {
    name: string;
    amount: number;
    unit: string;
    notes?: string;
}

export interface NutritionInfo {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
}

// Meal Plan Types
export interface MealPlanDay {
    date: string; // YYYY-MM-DD
    breakfast?: PlannedMeal;
    lunch?: PlannedMeal;
    dinner?: PlannedMeal;
    snacks?: PlannedMeal[];
    scheduleContext: ScheduleContext[];
}

export interface PlannedMeal {
    mealId: string;
    meal: Meal;
    servingsAdjusted: number;
    isLocked: boolean;
    isAiSuggested: boolean;
}

export interface ScheduleContext {
    memberId: string;
    memberName: string;
    routineType: Routine['type'];
    routineLabel: string;
}

// Grocery Types
export interface GroceryItem {
    id: string;
    name: string;
    amount: number;
    unit: string;
    category: GroceryCategory;
    isChecked: boolean;
    mealIds: string[]; // source meals
}

export type GroceryCategory =
    | 'produce'
    | 'dairy'
    | 'meat'
    | 'seafood'
    | 'bakery'
    | 'frozen'
    | 'pantry'
    | 'beverages'
    | 'other';

// App State Types
export interface OnboardingState {
    isCompleted: boolean;
    currentStep: number;
    householdSetupDone: boolean;
    routinesSetupDone: boolean;
    preferencesSetupDone: boolean;
}
