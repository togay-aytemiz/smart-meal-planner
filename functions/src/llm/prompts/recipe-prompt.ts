/**
 * Recipe Generation Prompt Builder
 * Converts onboarding data and recipe parameters into LLM prompts
 */

import { RecipeGenerationParams } from "../../types/generation-params";

/**
 * Build system prompt for recipe generation
 */
export function buildSystemPrompt(): string {
  return `You are an expert chef and nutritionist that creates personalized, detailed recipes based on user preferences, dietary restrictions, and cooking constraints.

Your task is to generate complete, production-ready recipes that are:
- Accurate and realistic (cooking times, temperatures, amounts)
- Culturally appropriate for the requested cuisine
- Nutritionally balanced
- Scalable (ingredients can be adjusted for different serving sizes)
- Safe (never include allergens that are listed)
- Practical (match user's skill level and available equipment)

You must provide detailed nutrition information calculated accurately based on ingredients.
All ingredient amounts should be precise and scalable.
All times should be realistic and match the difficulty level.
Instructions should be clear, numbered, and match the user's skill level.

Return ONLY valid JSON matching the provided schema. Do not include any text outside the JSON object.`;
}

/**
 * Build user prompt for recipe generation from parameters
 */
export function buildRecipePrompt(params: RecipeGenerationParams): string {
  const {
    name,
    dietaryRestrictions,
    allergies,
    cuisinePreferences,
    timePreference,
    skillLevel,
    equipment,
    householdSize,
    routines,
    mealType,
    servings,
    existingPantry,
    avoidIngredients,
    maxPrepTime,
    maxCookTime,
  } = params;

  let prompt = `Generate a detailed recipe for "${name}" with the following requirements:\n\n`;

  // === BASIC REQUIREMENTS ===
  prompt += `## BASIC REQUIREMENTS\n`;
  prompt += `- Recipe Name: ${name}\n`;
  prompt += `- Meal Type: ${mealType}\n`;
  prompt += `- Servings: ${servings} people (base servings: ${householdSize})\n`;
  prompt += `- Recipe must be scalable - ingredients and nutrition should be calculated for ${servings} servings\n`;
  prompt += `- All ingredient amounts must be precise for ${servings} servings\n\n`;

  // === DIETARY RESTRICTIONS (STRICT) ===
  prompt += `## DIETARY RESTRICTIONS (STRICT - MUST FOLLOW)\n`;
  if (dietaryRestrictions.length > 0) {
    prompt += `- Dietary Preferences: ${dietaryRestrictions.join(", ")}\n`;
    prompt += `  * Recipe MUST comply with these preferences\n`;
  }
  if (allergies.length > 0) {
    prompt += `- ⚠️ ALLERGIES (CRITICAL - NEVER INCLUDE): ${allergies.join(", ")}\n`;
    prompt += `  * These ingredients are life-threatening allergens\n`;
    prompt += `  * Do NOT use them in any form, including as ingredients in processed foods\n`;
    prompt += `  * Check all ingredient names and derivatives\n`;
  }
  if (dietaryRestrictions.length === 0 && allergies.length === 0) {
    prompt += `- No dietary restrictions\n`;
  }
  prompt += `\n`;

  // === CUISINE PREFERENCES ===
  if (cuisinePreferences.length > 0) {
    prompt += `## CUISINE PREFERENCES\n`;
    prompt += `- Preferred Cuisines: ${cuisinePreferences.join(", ")}\n`;
    prompt += `- Recipe should reflect the cooking style, flavors, and ingredients of these cuisines\n`;
    prompt += `- Use authentic ingredients and techniques where appropriate\n`;
  } else {
    prompt += `## CUISINE\n`;
    prompt += `- No specific cuisine preference - use general international cooking styles\n`;
  }
  prompt += `\n`;

  // === TIME CONSTRAINTS ===
  prompt += `## COOKING CONSTRAINTS\n`;
  prompt += `- Time Preference: ${timePreference}\n`;
  if (timePreference === "quick") {
    prompt += `  * Recipe should be fast to prepare (prep + cook < 30 minutes total)\n`;
  } else if (timePreference === "balanced") {
    prompt += `  * Recipe can take moderate time (30-60 minutes total)\n`;
  } else {
    prompt += `  * Recipe can be elaborate (60+ minutes total allowed)\n`;
  }
  
  if (maxPrepTime) {
    prompt += `- Maximum Prep Time: ${maxPrepTime} minutes\n`;
    prompt += `  * Preparation must not exceed this time\n`;
  }
  if (maxCookTime) {
    prompt += `- Maximum Cook Time: ${maxCookTime} minutes\n`;
    prompt += `  * Cooking must not exceed this time\n`;
  }
  prompt += `\n`;

  // === SKILL LEVEL ===
  prompt += `## SKILL LEVEL\n`;
  prompt += `- User Skill Level: ${skillLevel}\n`;
  if (skillLevel === "beginner") {
    prompt += `  * Instructions must be very detailed and easy to follow\n`;
    prompt += `  * Use simple techniques\n`;
    prompt += `  * Avoid complex cooking methods\n`;
    prompt += `  * Difficulty should be "easy"\n`;
  } else if (skillLevel === "intermediate") {
    prompt += `  * Instructions can be moderately detailed\n`;
    prompt += `  * Can include some advanced techniques\n`;
    prompt += `  * Difficulty should be "medium"\n`;
  } else {
    prompt += `  * Instructions can be concise\n`;
    prompt += `  * Advanced techniques allowed\n`;
    prompt += `  * Difficulty can be "hard"\n`;
  }
  prompt += `\n`;

  // === EQUIPMENT ===
  if (equipment.length > 0) {
    prompt += `## AVAILABLE EQUIPMENT\n`;
    prompt += `- Equipment Available: ${equipment.join(", ")}\n`;
    prompt += `- Recipe MUST only use these equipment\n`;
    prompt += `- If recipe requires equipment not in the list, suggest alternatives or simplify\n`;
  } else {
    prompt += `## EQUIPMENT\n`;
    prompt += `- Basic kitchen equipment only (stovetop, oven, basic utensils, pots, pans)\n`;
    prompt += `- Avoid specialized equipment unless necessary\n`;
  }
  prompt += `\n`;

  // === ROUTINE CONTEXT ===
  if (routines) {
    prompt += `## DAILY ROUTINE CONTEXT\n`;
    prompt += `- Day Type: ${routines.type}\n`;
    
    if (routines.type === "office" && routines.remoteMeals?.includes(mealType)) {
      prompt += `- ⚠️ PORTABLE MEAL REQUIRED: This meal needs to be portable/to-go friendly\n`;
      prompt += `  * Should travel well (won't spill, stays fresh)\n`;
      prompt += `  * Easy to pack in containers\n`;
      prompt += `  * Can be eaten at room temperature or easily reheated\n`;
      prompt += `  * Consider meal prep containers and portability\n`;
    } else if (routines.type === "remote") {
      if (routines.remoteMeals?.includes(mealType)) {
        prompt += `- ⚠️ PORTABLE MEAL REQUIRED: This meal needs to be portable\n`;
        prompt += `  * Should be easy to pack and travel with\n`;
      } else {
        prompt += `- Working from home - can prepare fresh meal\n`;
      }
    } else if (routines.type === "gym") {
      prompt += `- Gym Day: Consider post-workout nutrition needs\n`;
      if (mealType === "dinner" || mealType === "lunch") {
        prompt += `  * Higher protein content recommended\n`;
        prompt += `  * Good balance of carbs and protein for recovery\n`;
      }
    } else if (routines.type === "off") {
      prompt += `- Day Off: Can take more time to prepare elaborate meals\n`;
    }
    prompt += `\n`;
  }

  // === PANTRY OPTIMIZATION ===
  if (existingPantry && existingPantry.length > 0) {
    prompt += `## COST OPTIMIZATION - EXISTING PANTRY\n`;
    prompt += `- User Already Has: ${existingPantry.join(", ")}\n`;
    prompt += `- Prioritize using these ingredients to reduce grocery costs\n`;
    prompt += `- Include these ingredients in the recipe when possible\n`;
    prompt += `- Only add new ingredients that are essential for the recipe\n`;
    prompt += `\n`;
  }

  // === AVOID INGREDIENTS ===
  if (avoidIngredients && avoidIngredients.length > 0) {
    prompt += `## AVOID INGREDIENTS\n`;
    prompt += `- Do NOT include: ${avoidIngredients.join(", ")}\n`;
    prompt += `- Use alternative ingredients instead\n`;
    prompt += `\n`;
  }

  // === NUTRITION REQUIREMENTS ===
  prompt += `## NUTRITION REQUIREMENTS\n`;
  prompt += `You must provide accurate, detailed nutrition information:\n`;
  prompt += `\n`;
  prompt += `1. Per 100g (standardized):\n`;
  prompt += `   - Calculate based on total recipe weight\n`;
  prompt += `   - Standardized for comparison across recipes\n`;
  prompt += `\n`;
  prompt += `2. Per Serving (for ${servings} servings):\n`;
  prompt += `   - Total recipe nutrition divided by ${servings}\n`;
  prompt += `   - Include serving size in grams\n`;
  prompt += `   - This is what one person gets\n`;
  prompt += `\n`;
  prompt += `3. Total Recipe (all ${servings} servings combined):\n`;
  prompt += `   - Total nutrition for entire recipe\n`;
  prompt += `   - Include total weight in grams\n`;
  prompt += `   - Sum of all ingredients' nutrition\n`;
  prompt += `\n`;
  prompt += `Required nutrition fields:\n`;
  prompt += `- Calories (kcal)\n`;
  prompt += `- Protein (grams)\n`;
  prompt += `- Carbs (grams)\n`;
  prompt += `- Fat (grams)\n`;
  prompt += `- Fiber (grams) - optional but preferred\n`;
  prompt += `- Sugar (grams) - optional but preferred\n`;
  prompt += `- Sodium (mg) - optional but preferred\n`;
  prompt += `\n`;
  prompt += `All nutrition values must be realistic numbers based on the ingredients used.\n`;
  prompt += `Do not provide null or 0 values for required fields.\n`;
  prompt += `\n`;

  // === RECIPE STRUCTURE ===
  prompt += `## RECIPE STRUCTURE REQUIREMENTS\n`;
  prompt += `\n`;
  prompt += `### Ingredients:\n`;
  prompt += `- List ALL ingredients needed for ${servings} servings\n`;
  prompt += `- Use metric units (g, kg, ml, L) or Turkish units (yemek kaşığı, su bardağı)\n`;
  prompt += `- Amounts must be precise for ${servings} servings\n`;
  prompt += `- Include baseAmount (same as amount for baseServings)\n`;
  prompt += `- Add normalizedName for search (English version)\n`;
  prompt += `- Add category (vegetables, legumes, spices, etc.)\n`;
  prompt += `- Include notes if needed (e.g., "suda bekletilmiş", "soğuk", "taze")\n`;
  prompt += `\n`;
  prompt += `### Instructions:\n`;
  prompt += `- Step-by-step, numbered (start from 1)\n`;
  prompt += `- Clear, concise, and match ${skillLevel} skill level\n`;
  prompt += `- Include duration in minutes for time-consuming steps\n`;
  prompt += `- Include temperature in Celsius for oven/stovetop (if applicable)\n`;
  prompt += `- Mention equipment used in each step (if relevant)\n`;
  prompt += `- Total steps should be appropriate for difficulty level\n`;
  prompt += `\n`;
  prompt += `### Metadata:\n`;
  prompt += `- Cuisine: Main cuisine type\n`;
  prompt += `- CuisineTags: Additional cuisine-related tags\n`;
  prompt += `- DietaryTags: Automatically derived from ingredients (vegetarian, vegan, gluten-free, etc.)\n`;
  prompt += `- Tags: Recipe characteristics (quick, budget-friendly, one-pot, etc.)\n`;
  prompt += `- Equipment: List all equipment needed\n`;
  prompt += `- MealType: Suitable meal types (can be multiple)\n`;
  prompt += `- Difficulty: Should match skill level and recipe complexity\n`;
  prompt += `\n`;

  // === SCALING REQUIREMENTS ===
  const finalServings = servings || householdSize || 4;
  prompt += `## SCALING REQUIREMENTS\n`;
  prompt += `- Recipe must support scaling from ${Math.max(1, Math.floor(finalServings / 2))} to ${finalServings * 2} servings\n`;
  prompt += `- Ingredient amounts should scale proportionally\n`;
  prompt += `- Cooking times may need slight adjustments for larger batches\n`;
  prompt += `- Nutrition should be calculated accurately for all serving sizes\n`;
  prompt += `- Set minServings (typically 2) and maxServings (typically 12)\n`;
  prompt += `- scalingSupported: true\n`;
  prompt += `\n`;

  // === OUTPUT FORMAT ===
  prompt += `## OUTPUT FORMAT\n`;
  prompt += `- Return ONLY a valid JSON object matching the provided schema\n`;
  prompt += `- Do not include any explanatory text before or after the JSON\n`;
  prompt += `- All required fields must be present\n`;
  prompt += `- All numbers must be actual numbers (not null, not strings)\n`;
  prompt += `- All arrays must have at least the minimum required items\n`;
  prompt += `- Recipe should be production-ready and usable immediately\n`;
  prompt += `\n`;

  // === VALIDATION REMINDER ===
  prompt += `## VALIDATION CHECKLIST\n`;
  prompt += `Before returning, ensure:\n`;
  prompt += `✓ Recipe name matches requested name: "${name}"\n`;
  prompt += `✓ Servings match requested: ${servings}\n`;
  prompt += `✓ All allergens are EXCLUDED: ${allergies.length > 0 ? allergies.join(", ") : "None"}\n`;
  prompt += `✓ Dietary restrictions are FOLLOWED: ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(", ") : "None"}\n`;
  prompt += `✓ Prep + Cook time matches ${timePreference} preference\n`;
  prompt += `✓ Difficulty matches ${skillLevel} skill level\n`;
  prompt += `✓ Equipment requirements match available equipment\n`;
  prompt += `✓ Nutrition values are realistic and calculated\n`;
  prompt += `✓ Instructions are clear and appropriate for skill level\n`;
  prompt += `✓ All required JSON schema fields are present\n`;

  return prompt;
}

/**
 * Build complete prompt (system + user) for recipe generation
 */
export function buildCompletePrompt(params: RecipeGenerationParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: buildSystemPrompt(),
    userPrompt: buildRecipePrompt(params),
  };
}
