/**
 * JSON Schema for LLM Menu Decision (Breakfast/Lunch/Dinner)
 */

export type MenuType = "breakfast" | "lunch" | "dinner";

const MENU_ITEMS_SCHEMA = {
  type: "array",
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
} as const;

const resolveItemBounds = (mealType: MenuType) => {
  if (mealType === "dinner") {
    return { minItems: 2, maxItems: 4 };
  }
  return { minItems: 1, maxItems: 4 };
};

const buildMenuJsonSchema = (mealType: MenuType) => {
  const { minItems, maxItems } = resolveItemBounds(mealType);

  return {
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
        ...MENU_ITEMS_SCHEMA,
        minItems,
        maxItems,
      },
    },
    required: ["menuType", "cuisine", "totalTimeMinutes", "reasoning", "items"],
  } as const;
};

// Default export remains dinner-focused for backwards compatibility.
export const MENU_JSON_SCHEMA = buildMenuJsonSchema("dinner");

export function getOpenAIMenuSchema(mealType: MenuType = "dinner") {
  const schema = buildMenuJsonSchema(mealType);
  return {
    type: "json_schema",
    json_schema: {
      name: "menu_schema",
      description: "Menu decision with reasoning",
      schema,
      strict: true,
    },
  } as const;
}

export function getGeminiMenuSchema(mealType: MenuType = "dinner") {
  const schema = buildMenuJsonSchema(mealType);
  return {
    responseMimeType: "application/json",
    responseSchema: schema,
  } as const;
}
