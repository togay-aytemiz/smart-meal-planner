import { GROCERY_CATEGORIES } from '../prompts/shared-categories';

const categoryEnumValues = GROCERY_CATEGORIES.map((c) => c.id);

export const getOpenAIGrocerySchema = () => ({
    type: "json_schema" as const,
    json_schema: {
        name: "grocery_categorization",
        schema: {
            type: "object",
            properties: {
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            amount: { type: "string" },
                            unit: { type: "string" },
                            meals: {
                                type: "array",
                                items: { type: "string" },
                            },
                            categoryId: {
                                type: "string",
                                enum: categoryEnumValues,
                            },
                        },
                        required: ["name", "categoryId", "meals"],
                        additionalProperties: false,
                    },
                },
            },
            required: ["items"],
            additionalProperties: false,
        },
    },
});
