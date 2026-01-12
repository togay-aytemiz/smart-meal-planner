export type MenuRecipeCourse = 'main' | 'side' | 'soup' | 'salad' | 'meze' | 'dessert' | 'pastry';

export type MenuIngredient = {
    name: string;
    amount: number;
    unit: string;
    notes: string;
};

export type MenuInstruction = {
    step: number;
    text: string;
    durationMinutes: number;
};

export type MenuRecipe = {
    course: MenuRecipeCourse;
    name: string;
    brief: string;
    servings: number;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    totalTimeMinutes: number;
    ingredients: MenuIngredient[];
    instructions: MenuInstruction[];
    macrosPerServing: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
};

export type MenuDecision = {
    menuType: 'dinner';
    cuisine: string;
    totalTimeMinutes: number;
    reasoning: string;
    items: {
        main: string;
        side: string;
        extra: {
            type: 'soup' | 'salad' | 'meze' | 'dessert' | 'pastry';
            name: string;
        };
    };
};

export type MenuRecipesResponse = {
    menuType: 'dinner';
    cuisine: string;
    totalTimeMinutes: number;
    recipes: MenuRecipe[];
};
