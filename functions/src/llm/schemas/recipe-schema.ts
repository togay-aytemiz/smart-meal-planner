/**
 * JSON Schema for LLM Recipe Generation
 * Used by OpenAI (JSON mode) and Gemini (JSON mode)
 */

export const RECIPE_JSON_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Recipe name in Turkish or English (e.g., 'Yeşil Mercimek Salatası')",
    },
    description: {
      type: "string",
      description: "Short description of the recipe (max 150 characters)",
      maxLength: 150,
    },
    baseServings: {
      type: "integer",
      minimum: 1,
      maximum: 12,
      description: "Number of servings this recipe makes (typically 4)",
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Ingredient name (e.g., 'Yeşil mercimek', 'Olive oil')",
          },
          normalizedName: {
            type: "string",
            description: "Normalized ingredient name for search (e.g., 'green lentil')",
          },
          amount: {
            type: "number",
            minimum: 0,
            description: "Ingredient amount",
          },
          unit: {
            type: "string",
            enum: [
              "g",
              "kg",
              "ml",
              "L",
              "adet",
              "tane",
              "yemek kaşığı",
              "tatlı kaşığı",
              "çay kaşığı",
              "su bardağı",
              "fincan",
              "bağ",
              "demet",
            ],
            description: "Unit of measurement",
          },
          baseAmount: {
            type: "number",
            minimum: 0,
            description: "Original amount for baseServings (same as amount if baseServings is default)",
          },
          notes: {
            type: "string",
            description: "Additional notes (e.g., 'suda bekletilmiş', 'soğuk', 'taze')",
          },
          category: {
            type: "string",
            enum: [
              "vegetables",
              "fruits",
              "legumes",
              "meat",
              "seafood",
              "dairy",
              "grains",
              "spices",
              "oils",
              "nuts",
              "other",
            ],
            description: "Ingredient category",
          },
          nutritionPer100g: {
            type: "object",
            properties: {
              calories: { type: "number", minimum: 0 },
              protein: { type: "number", minimum: 0 },
              carbs: { type: "number", minimum: 0 },
              fat: { type: "number", minimum: 0 },
            },
            required: ["calories", "protein", "carbs", "fat"],
            description: "Nutrition per 100g (optional, for nutrition calculation)",
          },
        },
        required: ["name", "amount", "unit"],
      },
      minItems: 2,
      description: "List of ingredients with exact amounts for baseServings",
    },
    instructions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          step: {
            type: "integer",
            minimum: 1,
            description: "Step number",
          },
          text: {
            type: "string",
            description: "Step instruction text",
          },
          duration: {
            type: "number",
            minimum: 0,
            description: "Duration in minutes (optional)",
          },
          temperature: {
            type: "number",
            minimum: 0,
            description: "Temperature in Celsius (optional, for oven/stovetop)",
          },
          equipment: {
            type: "array",
            items: { type: "string" },
            description: "Equipment used in this step (optional)",
          },
        },
        required: ["step", "text"],
      },
      minItems: 3,
      description: "Step-by-step cooking instructions",
    },
    prepTime: {
      type: "integer",
      minimum: 0,
      description: "Preparation time in minutes",
    },
    cookTime: {
      type: "integer",
      minimum: 0,
      description: "Cooking time in minutes",
    },
    difficulty: {
      type: "string",
      enum: ["easy", "medium", "hard"],
      description: "Difficulty level",
    },
    cuisine: {
      type: "string",
      description: "Main cuisine type (e.g., 'Turkish', 'Mediterranean', 'Italian')",
    },
    cuisineTags: {
      type: "array",
      items: { type: "string" },
      description: "Additional cuisine tags",
    },
    dietaryTags: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "vegetarian",
          "vegan",
          "gluten-free",
          "dairy-free",
          "nut-free",
          "egg-free",
          "halal",
          "kosher",
          "low-carb",
          "keto",
          "paleo",
          "pescatarian",
        ],
      },
      description: "Dietary tags (automatically derived from ingredients and restrictions)",
    },
    nutrition: {
      type: "object",
      properties: {
        per100g: {
          type: "object",
          properties: {
            calories: { type: "number", minimum: 0 },
            protein: { type: "number", minimum: 0 },
            carbs: { type: "number", minimum: 0 },
            fat: { type: "number", minimum: 0 },
            fiber: { type: "number", minimum: 0 },
            sugar: { type: "number", minimum: 0 },
            sodium: { type: "number", minimum: 0 },
          },
          required: ["calories", "protein", "carbs", "fat"],
          description: "Nutrition per 100g (standardized)",
        },
        perServing: {
          type: "object",
          properties: {
            calories: { type: "number", minimum: 0 },
            protein: { type: "number", minimum: 0 },
            carbs: { type: "number", minimum: 0 },
            fat: { type: "number", minimum: 0 },
            fiber: { type: "number", minimum: 0 },
            sugar: { type: "number", minimum: 0 },
            servingSize: {
              type: "number",
              minimum: 0,
              description: "Serving size in grams",
            },
          },
          required: ["calories", "protein", "carbs", "fat", "servingSize"],
          description: "Nutrition per serving (for baseServings)",
        },
        total: {
          type: "object",
          properties: {
            calories: { type: "number", minimum: 0 },
            protein: { type: "number", minimum: 0 },
            carbs: { type: "number", minimum: 0 },
            fat: { type: "number", minimum: 0 },
            totalWeight: {
              type: "number",
              minimum: 0,
              description: "Total recipe weight in grams",
            },
          },
          required: ["calories", "protein", "carbs", "fat", "totalWeight"],
          description: "Total nutrition for entire recipe (all baseServings)",
        },
      },
      required: ["per100g", "perServing", "total"],
      description: "Complete nutrition information (per100g, perServing, total)",
    },
    tags: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "quick",
          "budget-friendly",
          "one-pot",
          "make-ahead",
          "freezer-friendly",
          "kid-friendly",
          "date-night",
          "comfort-food",
          "light",
          "protein-rich",
          "high-fiber",
          "low-calorie",
          "high-protein",
        ],
      },
      description: "Recipe tags",
    },
    equipment: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "oven",
          "stovetop",
          "blender",
          "food-processor",
          "slow-cooker",
          "instant-pot",
          "air-fryer",
          "grill",
          "microwave",
          "none",
        ],
      },
      description: "Required equipment",
    },
    mealType: {
      type: "array",
      items: {
        type: "string",
        enum: ["breakfast", "lunch", "dinner", "snack"],
      },
      minItems: 1,
      description: "Suitable meal types",
    },
    scalingSupported: {
      type: "boolean",
      description: "Whether recipe can be scaled up/down (typically true)",
      default: true,
    },
    minServings: {
      type: "integer",
      minimum: 1,
      description: "Minimum servings if scaling supported (typically 2)",
    },
    maxServings: {
      type: "integer",
      minimum: 1,
      description: "Maximum servings if scaling supported (typically 12)",
    },
  },
  required: [
    "name",
    "baseServings",
    "ingredients",
    "instructions",
    "prepTime",
    "cookTime",
    "difficulty",
    "cuisine",
    "dietaryTags",
    "nutrition",
    "tags",
    "equipment",
    "mealType",
  ],
  additionalProperties: false,
} as const;

/**
 * OpenAI-specific JSON schema format
 */
export function getOpenAIRecipeSchema() {
  return {
    type: "json_schema",
    json_schema: {
      name: "recipe_schema",
      description: "Complete recipe with ingredients, instructions, and nutrition",
      schema: RECIPE_JSON_SCHEMA,
      strict: true, // Reject extra properties
    },
  };
}

/**
 * Gemini-specific JSON schema format
 */
export function getGeminiRecipeSchema() {
  // Gemini uses response_mime_type and response_schema
  return {
    responseMimeType: "application/json",
    responseSchema: RECIPE_JSON_SCHEMA,
  } as const;
}
