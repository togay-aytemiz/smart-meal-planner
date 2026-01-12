/**
 * JSON Schema for LLM Menu Decision (Dinner only)
 */

export const MENU_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    menuType: {
      type: "string",
      enum: ["dinner"],
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
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        main: {
          type: "string",
          description: "Ana yemek adı (Türkçe).",
        },
        side: {
          type: "string",
          description: "Yan yemek adı (Türkçe).",
        },
        extra: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: {
              type: "string",
              enum: ["soup", "salad", "meze", "dessert", "pastry"],
            },
            name: {
              type: "string",
              description: "Çorba/salata/meze/tatlı/hamur işi adı (Türkçe).",
            },
          },
          required: ["type", "name"],
        },
      },
      required: ["main", "side", "extra"],
    },
  },
  required: ["menuType", "cuisine", "totalTimeMinutes", "items"],
} as const;

export function getOpenAIMenuSchema() {
  return {
    type: "json_schema",
    json_schema: {
      name: "menu_schema",
      description: "Dinner menu decision (main, side, soup/salad/meze/dessert/pastry)",
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
