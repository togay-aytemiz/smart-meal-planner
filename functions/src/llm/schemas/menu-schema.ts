/**
 * JSON Schema for LLM Menu Decision (Breakfast/Lunch/Dinner)
 */

export const MENU_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    menuType: {
      type: "string",
      enum: ["breakfast", "lunch", "dinner"],
    },
    cuisine: {
      type: "string",
      minLength: 2,
      description: "Seçilen mutfak türü (Türkçe).",
    },
    totalTimeMinutes: {
      type: "number",
      minimum: 0,
      maximum: 45,
      description: "Tüm menünün tahmini toplam süresi (dakika).",
    },
    reasoning: {
      type: "string",
      minLength: 10,
      description: "Menünün neden seçildiğine dair kısa Türkçe açıklama.",
    },
    items: {
      type: "array",
      minItems: 1,
      maxItems: 4,
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
            description: "Yemek adı (Türkçe).",
          },
        },
        required: ["course", "name"],
      },
    },
  },
  required: ["menuType", "cuisine", "totalTimeMinutes", "reasoning", "items"],
} as const;

export function getOpenAIMenuSchema() {
  return {
    type: "json_schema",
    json_schema: {
      name: "menu_schema",
      description: "Dinner menu decision with reasoning",
      schema: MENU_JSON_SCHEMA,
      strict: true,
    },
  } as const;
}

export function getGeminiMenuSchema() {
  return {
    responseMimeType: "application/json",
    responseSchema: MENU_JSON_SCHEMA,
  } as const;
}
