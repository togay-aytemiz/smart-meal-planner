/**
 * Firebase Cloud Functions - Main Entry Point
 * Smart Meal Planner - LLM Integration
 */

import * as functions from "firebase-functions/v2/https";
import { createHash } from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import { DocumentData, FieldValue } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { secrets } from "./config/secrets";
import { getDb } from "./firestore";
import { MenuDecision, MenuGenerationRequest } from "./types/menu";
import { MenuRecipeGenerationParams } from "./types/generation-params";
import { MenuRecipe, MenuRecipeCourse, MenuRecipesResponse } from "./types/menu-recipes";

// Set global options for all functions
setGlobalOptions({
  region: "us-central1", // Change to your preferred region
  secrets: [secrets.OPENAI_API_KEY, secrets.GEMINI_API_KEY],
  timeoutSeconds: 540, // 9 minutes max for LLM operations
  memory: "512MiB", // Adjust based on needs
});

// Health check endpoint
export const health = onRequest(async (request, response) => {
  response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "smart-meal-planner-functions",
  });
});

// Import Gemini provider
import { GeminiProvider } from "./llm/gemini-provider";
import { onCall } from "firebase-functions/v2/https";
import { OpenAIProvider } from "./llm/openai-provider";

const IMAGE_FORMAT = "webp";
const THUMBNAIL_SIZE = 320;
const DETAIL_SIZE = 640;

type RecipeLink = {
  id: string;
  course: MenuRecipeCourse;
  name: string;
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const buildRecipeHash = (recipe: MenuRecipe, cuisine: string) => {
  const ingredientKey = recipe.ingredients
    .map((ingredient) => normalizeText(ingredient.name))
    .sort()
    .join("|");

  return createHash("sha256")
    .update(`${normalizeText(recipe.name)}|${normalizeText(cuisine)}|${ingredientKey}`)
    .digest("hex");
};

const buildRecipeTags = (recipe: MenuRecipe, menuType: string, cuisine: string) => {
  const tags = new Set<string>();

  if (cuisine) {
    tags.add(cuisine);
  }
  tags.add(recipe.course);
  tags.add(menuType);

  return Array.from(tags);
};

const buildImagePlaceholder = () => ({
  status: "pending",
  format: IMAGE_FORMAT,
  thumbnail: {
    url: null,
    storagePath: null,
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  detail: {
    url: null,
    storagePath: null,
    width: DETAIL_SIZE,
    height: DETAIL_SIZE,
  },
  base64: null,
});

const buildRecipeDocument = ({
  recipe,
  menu,
  menuId,
  userId,
  provider,
}: {
  recipe: MenuRecipe;
  menu: MenuDecision;
  menuId: string;
  userId: string;
  provider: string;
}): DocumentData => ({
  name: recipe.name,
  brief: recipe.brief,
  ingredients: recipe.ingredients,
  instructions: recipe.instructions,
  macrosPerServing: recipe.macrosPerServing,
  metadata: {
    course: recipe.course,
    cuisine: menu.cuisine,
    menuType: menu.menuType,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    totalTimeMinutes: recipe.totalTimeMinutes,
    tags: buildRecipeTags(recipe, menu.menuType, menu.cuisine),
  },
  image: buildImagePlaceholder(),
  source: {
    provider,
    menuId,
    userId,
  },
  hash: buildRecipeHash(recipe, menu.cuisine),
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});

const findRecipeLink = (links: RecipeLink[], course: MenuRecipeCourse, name?: string) => {
  const normalizedName = name ? normalizeText(name) : null;
  if (normalizedName) {
    const exact = links.find(
      (link) => link.course === course && normalizeText(link.name) === normalizedName
    );
    if (exact) {
      return exact;
    }
  }

  const byCourse = links.find((link) => link.course === course);
  if (byCourse) {
    return byCourse;
  }

  if (!normalizedName) {
    return null;
  }

  return links.find((link) => normalizeText(link.name) === normalizedName) ?? null;
};

const buildMenuDocument = ({
  menu,
  params,
  recipeLinks,
  provider,
  userId,
}: {
  menu: MenuDecision;
  params: MenuRecipeGenerationParams;
  recipeLinks: RecipeLink[];
  provider: string;
  userId: string;
}): DocumentData => {
  const menuItems = menu.items.map((item) => {
    const link = findRecipeLink(recipeLinks, item.course as MenuRecipeCourse, item.name);
    if (!link) {
      throw new Error("Menu recipe mapping is incomplete");
    }
    return {
      course: item.course,
      name: item.name,
      recipeId: link.id,
    };
  });

  return {
    userId,
    date: params.date,
    dayOfWeek: params.dayOfWeek ?? null,
    menuType: menu.menuType,
    cuisine: menu.cuisine,
    totalTimeMinutes: menu.totalTimeMinutes,
    reasoning: menu.reasoning,
    items: menuItems,
    recipeIds: menuItems.map((item) => item.recipeId),
    source: {
      provider,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
};

const buildMenuDocId = (userId: string, date: string, menuType: string) =>
  `${userId}_${date}_${menuType}`;

// Test Gemini LLM endpoint
export const testGemini = onCall(async (request) => {
  try {
    const { prompt } = request.data;

    if (!prompt) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Prompt is required"
      );
    }

    const gemini = new GeminiProvider();
    const response = await gemini.generateTest(prompt);

    return {
      success: true,
      response: response,
      model: gemini.getName(),
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error("testGemini error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate response";
    throw new functions.HttpsError(
      "internal",
      message,
      { message }
    );
  }
});

// Test OpenAI LLM endpoint
export const testOpenAI = onCall(async (request) => {
  try {
    const { prompt } = request.data;

    if (!prompt) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Prompt is required"
      );
    }

    const openai = new OpenAIProvider();
    const response = await openai.generateTest(prompt);

    return {
      success: true,
      response: response,
      model: openai.getName(),
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error("testOpenAI error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate response";
    throw new functions.HttpsError(
      "internal",
      message,
      { message }
    );
  }
});

// OpenAI Menu generation endpoint
export const generateOpenAIMenu = onCall(async (request) => {
  try {
    const payload = request.data?.request as MenuGenerationRequest | undefined;

    if (!payload) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Menu generation request payload is required"
      );
    }

    const openai = new OpenAIProvider();
    const response = await openai.generateMenu(payload);

    return {
      success: true,
      menu: response,
      model: openai.getName(),
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error("generateOpenAIMenu error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate menu";
    throw new functions.HttpsError("internal", message, { message });
  }
});

// OpenAI Menu recipe generation endpoint
export const generateOpenAIRecipe = onCall(async (request) => {
  try {
    const params = request.data?.params as MenuRecipeGenerationParams | undefined;

    if (!params) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Menu recipe generation params are required"
      );
    }

    const openai = new OpenAIProvider();
    const response = await openai.generateRecipe(params);
    const menuRecipes = response as MenuRecipesResponse;

    if (!menuRecipes?.recipes || !Array.isArray(menuRecipes.recipes)) {
      throw new functions.HttpsError(
        "internal",
        "Menu recipes response is invalid"
      );
    }

    const provider = openai.getName();
    const userId = request.auth?.uid ?? params.userId;

    if (!userId) {
      throw new functions.HttpsError(
        "invalid-argument",
        "User id is required"
      );
    }

    const db = getDb();
    const menuDocId = buildMenuDocId(userId, params.date, menuRecipes.menuType);
    const recipesRef = db.collection("recipes");
    const menuRef = db.collection("menus").doc(menuDocId);
    const batch = db.batch();

    const recipeLinks = menuRecipes.recipes.map((recipe) => {
      const recipeRef = recipesRef.doc();
      const recipeDoc = buildRecipeDocument({
        recipe,
        menu: params.menu,
        menuId: menuDocId,
        userId,
        provider,
      });

      batch.set(recipeRef, recipeDoc);

      return {
        id: recipeRef.id,
        course: recipe.course,
        name: recipe.name,
      };
    });

    const menuDoc = buildMenuDocument({
      menu: params.menu,
      params,
      recipeLinks,
      provider,
      userId,
    });

    batch.set(menuRef, menuDoc, { merge: true });
    await batch.commit();

    return {
      success: true,
      menuRecipes,
      model: openai.getName(),
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error("generateOpenAIRecipe error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate recipe";
    throw new functions.HttpsError("internal", message, { message });
  }
});

// TODO: Full menu generation function
// export const generateMenu = onCall(async (request) => {
//   // Implementation coming soon
// });
