/**
 * Recipe Types - Comprehensive schema for AI-generated recipes
 */

export interface Recipe {
  // Basic Info
  id: string;
  name: string;
  description?: string;
  
  // Reasoning/Explanation (from LLM)
  reasoning?: string; // "Neden bu yemek?" - LLM'in açıklaması (optional, can be at menu level)
  // Örnek: "Yüksek protein içeriği ve dengeli karbonhidrat oranı ile post-workout recovery için ideal."
  
  // Servings & Scalability
  baseServings: number; // Original LLM servings (e.g., 4)
  servings: number; // Active servings (user can adjust)
  
  // Ingredients (scalable)
  ingredients: RecipeIngredient[];
  
  // Instructions
  instructions: RecipeInstruction[];
  
  // Time & Difficulty
  prepTime: number; // minutes
  cookTime: number; // minutes
  totalTime: number; // prepTime + cookTime
  difficulty: "easy" | "medium" | "hard";
  
  // Cuisine & Dietary
  cuisine: string;
  cuisineTags: string[];
  dietaryTags: string[];
  
  // Nutrition (3 levels: per100g, perServing, total)
  nutrition: {
    per100g: NutritionInfo;
    perServing: NutritionInfo & { servingSize: number }; // servingSize in grams
    total: NutritionInfo & { totalWeight: number }; // totalWeight in grams
  };
  
  // Image
  imageUrl?: string;
  imageHash?: string;
  
  // LLM Metadata
  generatedBy: "openai" | "gemini";
  generatedAt: Date;
  generationCost: number; // USD
  model: string; // "gpt-4o-mini", "gemini-1.5-pro"
  promptHash?: string; // Generation prompt hash (cache için)
  
  // Image Generation Metadata (optional)
  imageGeneratedBy?: "openai" | "dalle" | "imagen";
  imageGeneratedAt?: Date;
  imageGenerationCost?: number;
  
  // Scaling Support
  scalingSupported: boolean;
  minServings?: number; // Minimum servings (e.g., 2)
  maxServings?: number; // Maximum servings (e.g., 12)
  
  // Recipe Metadata
  tags: string[];
  equipment: string[];
  mealType: ("breakfast" | "lunch" | "dinner" | "snack")[];
  
  // Statistics
  usageCount: number; // Kaç kullanıcıya önerildi
  lastSuggestedAt?: Date;
  averageRating?: number; // 0-5
  
  // Hash for Deduplication
  hash: string; // SHA256 hash (name + normalized ingredients)
  
  // Indexing
  searchTokens: string[]; // Full-text search için
  normalizedName: string; // lowercase, search için
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredient {
  name: string; // "Yeşil mercimek"
  normalizedName: string; // "green lentil" - search için
  amount: number; // 200
  unit: string; // "g" (grams), "ml", "adet", "yemek kaşığı"
  baseAmount: number; // baseServings için orijinal miktar
  notes?: string; // "suda bekletilmiş", "soğuk", vb.
  category?: string; // "legumes", "vegetables", "spices"
  
  // Nutrition per ingredient (100g bazında) - optional
  nutritionPer100g?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface RecipeInstruction {
  step: number;
  text: string;
  duration?: number; // minutes (optional - step'in süresi)
  temperature?: number; // Celsius (fırın, ocak için)
  equipment?: string[]; // Bu adımda kullanılan ekipman
}

export interface NutritionInfo {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams
  sodium?: number; // mg
}

export interface RecipeFingerprint {
  name: string;
  ingredients: string[]; // Normalized ingredient names
  cuisine: string;
  dietaryTags: string[];
}
