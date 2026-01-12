/**
 * JSON Schema for LLM Menu Recipe Generation
 * Generates recipes for all dinner menu items
 */

export const RECIPE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    menuType: {
      type: "string",
      enum: ["dinner"],
    },
    cuisine: {
      type: "string",
      description: "Seçilen mutfak türü (Türkçe).",
    },
    totalTimeMinutes: {
      type: "number",
      minimum: 0,
      maximum: 45,
      description: "Tüm menünün tahmini toplam süresi (dakika).",
    },
    recipes: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          course: {
            type: "string",
            enum: ["main", "side", "soup", "salad", "meze", "dessert", "pastry"],
          },
          name: {
            type: "string",
            description: "Tarif adı Türkçe olmalı.",
          },
          brief: {
            type: "string",
            maxLength: 240,
            description: "2-3 cümlelik tarif özeti (Türkçe).",
          },
          servings: {
            type: "integer",
            minimum: 1,
          },
          prepTimeMinutes: {
            type: "number",
            minimum: 0,
          },
          cookTimeMinutes: {
            type: "number",
            minimum: 0,
          },
          totalTimeMinutes: {
            type: "number",
            minimum: 0,
          },
          ingredients: {
            type: "array",
            minItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: {
                  type: "string",
                  description: "Malzeme adı Türkçe olmalı.",
                },
                amount: {
                  type: "number",
                  minimum: 0,
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
                    "yaprak",
                    "diş",
                  ],
                },
                notes: {
                  type: "string",
                },
              },
              required: ["name", "amount", "unit", "notes"],
            },
          },
          instructions: {
            type: "array",
            minItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                step: {
                  type: "integer",
                  minimum: 1,
                },
                text: {
                  type: "string",
                  description: "Talimatlar Türkçe olmalı.",
                },
                durationMinutes: {
                  type: "number",
                  minimum: 0,
                },
              },
              required: ["step", "text", "durationMinutes"],
            },
          },
          macrosPerServing: {
            type: "object",
            additionalProperties: false,
            properties: {
              calories: { type: "number", minimum: 0 },
              protein: { type: "number", minimum: 0 },
              carbs: { type: "number", minimum: 0 },
              fat: { type: "number", minimum: 0 },
            },
            required: ["calories", "protein", "carbs", "fat"],
          },
        },
        required: [
          "course",
          "name",
          "brief",
          "servings",
          "prepTimeMinutes",
          "cookTimeMinutes",
          "totalTimeMinutes",
          "ingredients",
          "instructions",
          "macrosPerServing",
        ],
      },
    },
  },
  required: ["menuType", "cuisine", "totalTimeMinutes", "recipes"],
} as const;

export function getOpenAIRecipeSchema() {
  return {
    type: "json_schema",
    json_schema: {
      name: "menu_recipes_schema",
      description: "Dinner menu recipes with ingredients, steps, time, macros",
      schema: RECIPE_JSON_SCHEMA,
      strict: true,
    },
  } as const;
}

export function getGeminiRecipeSchema() {
  return {
    responseMimeType: "application/json",
    responseSchema: RECIPE_JSON_SCHEMA,
  } as const;
}
