export const monetizationConfig = {
    limits: {
        freeWeeklyRecipeViews: 3,
    },
    gates: {
        dailyMenuChange: 'rewarded',
        weeklyRegeneration: 'rewarded',
        recipeDetailAfterLimit: 'rewarded',
    },
} as const;
