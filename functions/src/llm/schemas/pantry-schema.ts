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
            },
            required: ["input", "canonical"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
});
