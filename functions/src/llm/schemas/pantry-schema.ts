import { GROCERY_CATEGORIES } from '../prompts/shared-categories';

const categoryEnumValues = GROCERY_CATEGORIES.map((c) => c.id);

export const getOpenAIPantrySchema = () => ({
  type: "json_schema" as const,
  json_schema: {
    name: "pantry_normalization",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              input: { type: "string" },
              canonical: { type: "string" },
              categoryId: {
                type: "string",
                enum: categoryEnumValues,
              },
            },
            required: ["input", "canonical", "categoryId"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
});
