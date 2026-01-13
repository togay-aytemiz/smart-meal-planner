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
import {
  MealType,
  MenuDecision,
  MenuGenerationRequest,
  WeeklyContext,
  WeeklyMenuGenerationRequest,
} from "./types/menu";
import { MenuRecipeGenerationParams } from "./types/generation-params";
import { onboardingToMenuRequest } from "./types/menu-helpers";
import { MenuRecipe, MenuRecipeCourse, MenuRecipesResponse } from "./types/menu-recipes";
import { OnboardingData, RoutineDay, WeeklyRoutine } from "./types/onboarding";

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

const findExistingRecipe = async (hash: string): Promise<string | null> => {
  const db = getDb();
  const snapshot = await db.collection("recipes")
    .where("hash", "==", hash)
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0].id;
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

type WeekdayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type MealPlan = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

type WeekDayContext = {
  date: string;
  dayOfWeek: WeekdayKey;
  dayIndex: number;
  routine?: RoutineDay;
  plan: MealPlan;
  isWeekend: boolean;
};

type LunchContext = "portable" | "fresh";

type MealAssignment = {
  date: string;
  dayOfWeek: WeekdayKey;
  dayIndex: number;
  mealType: MealType;
  slotId: string;
  isRepeatFromPreviousDay?: boolean;
  lunchContext?: LunchContext;
};

const DAY_KEYS: WeekdayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const WEEKEND_KEYS = new Set<WeekdayKey>(["saturday", "sunday"]);

const DEFAULT_ROUTINES: WeeklyRoutine = {
  monday: { type: "office", gymTime: "none" },
  tuesday: { type: "office", gymTime: "none" },
  wednesday: { type: "office", gymTime: "none" },
  thursday: { type: "office", gymTime: "none" },
  friday: { type: "office", gymTime: "none" },
  saturday: { type: "remote", gymTime: "none" },
  sunday: { type: "remote", gymTime: "none" },
};

const toUTCDate = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const parseISODate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Invalid date format");
  }
  return new Date(Date.UTC(year, month - 1, day));
};

const formatISODate = (date: Date) => date.toISOString().split("T")[0];

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const resolveWeekStart = (value?: string) => {
  if (value) {
    return parseISODate(value);
  }

  const today = toUTCDate(new Date());
  const dayIndex = (today.getUTCDay() + 6) % 7;
  return addDays(today, -dayIndex);
};

const getDayKey = (date: Date): WeekdayKey => DAY_KEYS[date.getUTCDay()];

const normalizeRoutineDay = (value: RoutineDay | undefined, fallback: RoutineDay): RoutineDay => ({
  type: value?.type ?? fallback.type,
  gymTime: value?.gymTime ?? fallback.gymTime,
  officeMealToGo: value?.officeMealToGo ?? fallback.officeMealToGo,
  officeBreakfastAtHome: value?.officeBreakfastAtHome ?? fallback.officeBreakfastAtHome,
  schoolBreakfast: value?.schoolBreakfast ?? fallback.schoolBreakfast,
  remoteMeals: value?.remoteMeals ?? fallback.remoteMeals,
  excludeFromPlan: value?.excludeFromPlan ?? fallback.excludeFromPlan,
});

const normalizeWeeklyRoutine = (value: WeeklyRoutine | undefined): WeeklyRoutine => ({
  monday: normalizeRoutineDay(value?.monday, DEFAULT_ROUTINES.monday),
  tuesday: normalizeRoutineDay(value?.tuesday, DEFAULT_ROUTINES.tuesday),
  wednesday: normalizeRoutineDay(value?.wednesday, DEFAULT_ROUTINES.wednesday),
  thursday: normalizeRoutineDay(value?.thursday, DEFAULT_ROUTINES.thursday),
  friday: normalizeRoutineDay(value?.friday, DEFAULT_ROUTINES.friday),
  saturday: normalizeRoutineDay(value?.saturday, DEFAULT_ROUTINES.saturday),
  sunday: normalizeRoutineDay(value?.sunday, DEFAULT_ROUTINES.sunday),
});

const normalizeOnboarding = (value: Partial<OnboardingData> | undefined): OnboardingData => ({
  profile: {
    name: value?.profile?.name ?? "",
    avatarUrl: value?.profile?.avatarUrl,
  },
  householdSize: value?.householdSize ?? 1,
  members: value?.members ?? [],
  routines: normalizeWeeklyRoutine(value?.routines),
  dietary: {
    restrictions: value?.dietary?.restrictions ?? [],
    allergies: value?.dietary?.allergies ?? [],
  },
  cuisine: {
    selected: value?.cuisine?.selected ?? [],
  },
  cooking: {
    timePreference: value?.cooking?.timePreference ?? "balanced",
    skillLevel: value?.cooking?.skillLevel ?? "intermediate",
    equipment: value?.cooking?.equipment ?? [],
  },
});

const resolveMealPlan = (routine: RoutineDay | undefined): MealPlan => {
  if (!routine) {
    return { breakfast: false, lunch: false, dinner: true };
  }

  if (routine.excludeFromPlan) {
    return { breakfast: false, lunch: false, dinner: false };
  }

  if (routine.type === "office") {
    return {
      breakfast: routine.officeBreakfastAtHome === "yes",
      lunch: routine.officeMealToGo === "yes",
      dinner: true,
    };
  }

  if (routine.type === "remote") {
    if (routine.remoteMeals?.length) {
      return {
        breakfast: routine.remoteMeals.includes("breakfast"),
        lunch: routine.remoteMeals.includes("lunch"),
        dinner: routine.remoteMeals.includes("dinner"),
      };
    }
    return { breakfast: true, lunch: true, dinner: true };
  }

  if (routine.type === "school") {
    return {
      breakfast: routine.schoolBreakfast === "yes",
      lunch: false,
      dinner: true,
    };
  }

  if (routine.type === "gym" || routine.type === "off") {
    return { breakfast: true, lunch: true, dinner: true };
  }

  return { breakfast: false, lunch: false, dinner: true };
};

const getLunchContext = (routine: RoutineDay | undefined): LunchContext => {
  if (!routine) {
    return "fresh";
  }

  if (
    routine.type === "office" ||
    routine.type === "school" ||
    routine.officeMealToGo === "yes"
  ) {
    return "portable";
  }

  return "fresh";
};

const getSeasonalityHint = (date: Date) => {
  const month = date.getUTCMonth();
  if (month === 11 || month <= 1) {
    return "Kış mevsimi: kök sebzeler (kereviz, havuç), bakliyat ve kış yeşillikleri.";
  }
  if (month >= 2 && month <= 4) {
    return "İlkbahar: enginar, taze bezelye, kuşkonmaz ve yeşil otlar.";
  }
  if (month >= 5 && month <= 7) {
    return "Yaz: domates, biber, kabak, patlıcan ve taze meyveler.";
  }
  return "Sonbahar: kabak, mantar, kök sebzeler ve bakliyat.";
};

const buildWeekDays = (weekStart: Date, routines: WeeklyRoutine): WeekDayContext[] => {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dayOfWeek = getDayKey(date);
    const routine = routines[dayOfWeek];

    return {
      date: formatISODate(date),
      dayOfWeek,
      dayIndex: index,
      routine,
      plan: resolveMealPlan(routine),
      isWeekend: WEEKEND_KEYS.has(dayOfWeek),
    };
  });
};

const assignBreakfastSlots = (days: WeekDayContext[]): MealAssignment[] => {
  let weekdayToggle = 0;
  const assignments: MealAssignment[] = [];

  for (const day of days) {
    if (!day.plan.breakfast) {
      continue;
    }

    const slotId = day.isWeekend ? "C" : weekdayToggle % 2 === 0 ? "A" : "B";
    if (!day.isWeekend) {
      weekdayToggle += 1;
    }

    assignments.push({
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      dayIndex: day.dayIndex,
      mealType: "breakfast",
      slotId,
    });
  }

  return assignments;
};

const assignLunchSlots = (days: WeekDayContext[]): MealAssignment[] => {
  const lunchDays = days.filter((day) => day.plan.lunch);
  if (!lunchDays.length) {
    return [];
  }

  const uniqueCount = lunchDays.length >= 4 ? 4 : Math.max(1, Math.min(3, lunchDays.length));
  const slots = Array.from({ length: uniqueCount }, (_, index) => `L${index + 1}`);
  const slotContexts = new Map<string, LunchContext>();
  const assignments: MealAssignment[] = [];
  let slotIndex = 0;
  let prevSlot: string | null = null;

  for (const day of lunchDays) {
    const lunchContext = getLunchContext(day.routine);
    let attempts = 0;
    let slotId = slots[slotIndex % slots.length];

    while (attempts < slots.length) {
      const assignedContext = slotContexts.get(slotId);
      const isCompatible = !assignedContext || assignedContext === lunchContext;
      const isConsecutive = prevSlot === slotId && slots.length > 1;

      if (isCompatible && !isConsecutive) {
        break;
      }

      slotIndex += 1;
      slotId = slots[slotIndex % slots.length];
      attempts += 1;
    }

    slotContexts.set(slotId, lunchContext);
    assignments.push({
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      dayIndex: day.dayIndex,
      mealType: "lunch",
      slotId,
      lunchContext,
    });
    prevSlot = slotId;
    slotIndex += 1;
  }

  return assignments;
};

const assignDinnerSlots = (
  days: WeekDayContext[],
  repeatMode: "consecutive" | "spaced"
): MealAssignment[] => {
  const dinnerDays = days.filter((day) => day.plan.dinner);
  if (!dinnerDays.length) {
    return [];
  }

  const consecutivePattern = ["D1", "D1", "D2", "D2", "D3", "D4", "D4"];
  const spacedPattern = ["D1", "D2", "D1", "D3", "D2", "D4", "D4"];
  let pattern = repeatMode === "spaced" ? spacedPattern : consecutivePattern;

  if (repeatMode === "spaced" && dinnerDays.length <= 2) {
    pattern = ["D1", "D2"];
  }

  const assignments: MealAssignment[] = [];
  let prevSlot: string | null = null;

  for (const [index, day] of dinnerDays.entries()) {
    const slotId = pattern[index] ?? pattern[pattern.length - 1];
    const isRepeatFromPreviousDay = repeatMode === "consecutive" && prevSlot === slotId;

    assignments.push({
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      dayIndex: day.dayIndex,
      mealType: "dinner",
      slotId,
      isRepeatFromPreviousDay,
    });

    prevSlot = slotId;
  }

  return assignments;
};

const buildWeeklyContext = ({
  weekStart,
  dayIndex,
  repeatMode,
  slotId,
  ingredientSynergyFrom,
  seasonalityHint,
}: {
  weekStart: string;
  dayIndex: number;
  repeatMode: "consecutive" | "spaced";
  slotId: string;
  ingredientSynergyFrom?: WeeklyContext["ingredientSynergyFrom"];
  seasonalityHint?: string;
}): WeeklyContext => ({
  weekStart,
  dayIndex,
  repeatMode,
  repeatGroupId: slotId,
  ingredientSynergyFrom,
  seasonalityHint,
});


const buildRepeatReasoning = () =>
  "Bu yemeği verimli bir mutfak planlaması için (Cook Once Eat Twice) iki günlük düşündüm. Yanına taze ve farklı eşlikçiler ekleyerek çeşitliliği korudum.";

const buildGenericRepeatReasoning = () =>
  "Haftalık dengeyi gözeterek bu öğünü tekrar değerlendirdim.";

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

    const recipeLinks: RecipeLink[] = [];
    let reusedCount = 0;

    for (const recipe of menuRecipes.recipes) {
      const hash = buildRecipeHash(recipe, params.menu.cuisine);
      const existingId = await findExistingRecipe(hash);

      if (existingId) {
        // Reuse existing recipe
        console.log(`Reusing existing recipe: ${recipe.name} (hash: ${hash.slice(0, 8)})`);
        recipeLinks.push({
          id: existingId,
          course: recipe.course,
          name: recipe.name,
        });
        reusedCount += 1;
      } else {
        // Create new recipe
        const recipeRef = recipesRef.doc();
        const recipeDoc = buildRecipeDocument({
          recipe,
          menu: params.menu,
          menuId: menuDocId,
          userId,
          provider,
        });

        batch.set(recipeRef, recipeDoc);
        recipeLinks.push({
          id: recipeRef.id,
          course: recipe.course,
          name: recipe.name,
        });
      }
    }

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
      reusedRecipeCount: reusedCount,
      newRecipeCount: menuRecipes.recipes.length - reusedCount,
      model: openai.getName(),
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error("generateOpenAIRecipe error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate recipe";
    throw new functions.HttpsError("internal", message, { message });
  }
});

// Weekly menu generation endpoint
export const generateWeeklyMenu = onCall(async (request) => {
  try {
    const payload = request.data?.request as WeeklyMenuGenerationRequest | undefined;

    if (!payload) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Weekly menu generation request payload is required"
      );
    }

    const userId = request.auth?.uid ?? payload.userId;
    if (!userId) {
      throw new functions.HttpsError(
        "invalid-argument",
        "User id is required"
      );
    }

    const db = getDb();
    let onboardingSource = payload.onboarding as Partial<OnboardingData> | undefined;

    if (!onboardingSource) {
      const userSnap = await db.collection("Users").doc(userId).get();
      onboardingSource = userSnap.data()?.onboarding as Partial<OnboardingData> | undefined;
    }

    if (!onboardingSource) {
      throw new functions.HttpsError(
        "failed-precondition",
        "Onboarding data is required"
      );
    }

    const onboarding = normalizeOnboarding(onboardingSource);
    const weekStartDate = resolveWeekStart(payload.weekStart);
    const weekStart = formatISODate(weekStartDate);
    const repeatMode = payload.repeatMode ?? "consecutive";

    const weekDays = buildWeekDays(weekStartDate, onboarding.routines);
    const breakfastAssignments = assignBreakfastSlots(weekDays);
    const lunchAssignments = assignLunchSlots(weekDays);
    const dinnerAssignments = assignDinnerSlots(weekDays, repeatMode);

    let assignments = [
      ...breakfastAssignments,
      ...lunchAssignments,
      ...dinnerAssignments,
    ];

    // Filter to single day if requested
    const singleDay = payload.singleDay;
    if (singleDay) {
      assignments = assignments.filter((a) => a.date === singleDay);
    }

    if (!assignments.length) {
      return {
        success: true,
        weekStart,
        singleDay: singleDay ?? null,
        totalMenus: 0,
        uniqueMenus: 0,
        recipesCreated: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const uniqueSlots = new Map<string, MealAssignment>();
    for (const assignment of assignments) {
      let slotKey = `${assignment.mealType}:${assignment.slotId}`;
      if (assignment.isRepeatFromPreviousDay) {
        slotKey += ":repeat";
      }
      if (!uniqueSlots.has(slotKey)) {
        uniqueSlots.set(slotKey, assignment);
      }
    }

    const usedDishNames = new Set<string>();
    const createdRecipeHashes = new Map<string, string>(); // Hash -> ID (for batch deduplication)

    const openai = new OpenAIProvider();
    const provider = openai.getName();
    const recipesRef = db.collection("recipes");
    const menusRef = db.collection("menus");
    const batch = db.batch();

    const slotResults = new Map<
      string,
      {
        menu: MenuDecision;
        recipeLinks: RecipeLink[];
        mainDishName?: string;
        ingredientSynergyUsed?: boolean;
      }
    >();

    let recipeCount = 0;
    let menuCount = 0;

    const buildMenuRequest = (
      assignment: MealAssignment,
      ingredientSynergyFrom?: WeeklyContext["ingredientSynergyFrom"],
      leftoverMainDish?: string
    ): MenuGenerationRequest => {
      const baseRequest = onboardingToMenuRequest(onboarding, assignment.date, {
        mealType: assignment.mealType,
        existingPantry: payload.existingPantry,
        avoidIngredients: payload.avoidIngredients,
        avoidItemNames: Array.from(usedDishNames),
        maxPrepTime: payload.maxPrepTime,
        maxCookTime: payload.maxCookTime,
        generateImage: payload.generateImage,
      });
      const weeklyContext = buildWeeklyContext({
        weekStart,
        dayIndex: assignment.dayIndex,
        repeatMode,
        slotId: assignment.slotId,
        ingredientSynergyFrom,
        seasonalityHint: getSeasonalityHint(parseISODate(assignment.date)),
      });

      if (leftoverMainDish) {
        weeklyContext.leftoverMainDish = leftoverMainDish;
      }

      return {
        ...baseRequest,
        userId,
        weeklyContext,
      };
    };

    const generateSlot = async (
      slotKey: string,
      assignment: MealAssignment,
      ingredientSynergyFrom?: WeeklyContext["ingredientSynergyFrom"],
      leftoverMainDish?: string
    ) => {
      const menuRequest = buildMenuRequest(assignment, ingredientSynergyFrom, leftoverMainDish);
      const menuResponse = await openai.generateMenu(menuRequest);
      const menu = menuResponse as unknown as MenuDecision;

      if (!menu?.items?.length) {
        throw new functions.HttpsError(
          "internal",
          "Menu response is invalid"
        );
      }

      // Accumulate generated dish names to avoid repetition
      menu.items.forEach((item) => {
        if (item.name) {
          usedDishNames.add(item.name);
        }
      });

      if (menu.menuType !== assignment.mealType) {
        menu.menuType = assignment.mealType;
      }

      const recipeParams: MenuRecipeGenerationParams = {
        ...menuRequest,
        menu,
      };
      const recipesResponse = await openai.generateRecipe(recipeParams);
      const menuRecipes = recipesResponse as MenuRecipesResponse;

      if (!menuRecipes?.recipes || !Array.isArray(menuRecipes.recipes)) {
        throw new functions.HttpsError(
          "internal",
          "Menu recipes response is invalid"
        );
      }

      const menuDocId = buildMenuDocId(userId, assignment.date, menu.menuType);

      // Process recipes with deduplication (parallel for speed, but coordinated via map)
      const recipeLinks = await Promise.all(menuRecipes.recipes.map(async (recipe) => {
        const hash = buildRecipeHash(recipe, menu.cuisine);

        // 1. Check in-memory batch cache (created in this request)
        if (createdRecipeHashes.has(hash)) {
          const existingId = createdRecipeHashes.get(hash)!;
          // console.log(`Reusing IN-BATCH recipe: ${recipe.name}`);
          return {
            id: existingId,
            course: recipe.course,
            name: recipe.name,
          };
        }

        // 2. Check Firestore (globally existing)
        const existingId = await findExistingRecipe(hash);
        if (existingId) {
          // console.log(`Reusing FIRESTORE recipe: ${recipe.name}`);
          // Cache for subsequent slots in this request
          createdRecipeHashes.set(hash, existingId);
          return {
            id: existingId,
            course: recipe.course,
            name: recipe.name,
          };
        }

        // 3. Create new
        const recipeRef = recipesRef.doc();
        const recipeDoc = buildRecipeDocument({
          recipe,
          menu,
          menuId: menuDocId,
          userId,
          provider,
        });

        batch.set(recipeRef, recipeDoc);

        // Register in cache
        createdRecipeHashes.set(hash, recipeRef.id);

        return {
          id: recipeRef.id,
          course: recipe.course,
          name: recipe.name,
        };
      }));

      recipeCount += recipeLinks.length;

      const mainDishName = menu.items.find((item) => item.course === "main")?.name;

      slotResults.set(slotKey, {
        menu,
        recipeLinks,
        mainDishName,
        ingredientSynergyUsed: Boolean(ingredientSynergyFrom),
      });
    };

    const dinnerAssignmentsByDate = new Map<string, MealAssignment>();
    for (const assignment of dinnerAssignments) {
      dinnerAssignmentsByDate.set(assignment.date, assignment);
    }

    const dinnerSlots = Array.from(uniqueSlots.entries())
      .filter(([, assignment]) => assignment.mealType === "dinner")
      .sort(([, first], [, second]) => first.dayIndex - second.dayIndex);

    for (const [slotKey, assignment] of dinnerSlots) {
      let leftoverMainDish: string | undefined;

      if (assignment.isRepeatFromPreviousDay) {
        // Parent key is the base slotId (without :repeat suffix)
        // Our uniqueSlots map keys are "dinner:D1" and "dinner:D1:repeat"
        // So parent is "dinner:D1"
        const parentKey = `dinner:${assignment.slotId}`;
        const parentResult = slotResults.get(parentKey);
        if (parentResult?.mainDishName) {
          leftoverMainDish = parentResult.mainDishName;
        }
      }
      await generateSlot(slotKey, assignment, undefined, leftoverMainDish);
    }

    const breakfastSlots = Array.from(uniqueSlots.entries())
      .filter(([, assignment]) => assignment.mealType === "breakfast")
      .sort(([, first], [, second]) => first.dayIndex - second.dayIndex);

    for (const [slotKey, assignment] of breakfastSlots) {
      await generateSlot(slotKey, assignment);
    }

    const lunchSlots = Array.from(uniqueSlots.entries())
      .filter(([, assignment]) => assignment.mealType === "lunch")
      .sort(([, first], [, second]) => first.dayIndex - second.dayIndex);

    for (const [slotKey, assignment] of lunchSlots) {
      const previousDay = weekDays[assignment.dayIndex - 1];
      const previousDinner = previousDay
        ? dinnerAssignmentsByDate.get(previousDay.date)
        : undefined;

      // Previous dinner might be fresh (D1) or repeat (D1).
      // We need to construct the correct key to find the result.
      const previousDinnerKey = previousDinner
        ? `dinner:${previousDinner.slotId}${previousDinner.isRepeatFromPreviousDay ? ":repeat" : ""}`
        : null;

      const previousDinnerMenu = previousDinnerKey
        ? slotResults.get(previousDinnerKey)
        : undefined;
      const ingredientSynergyFrom: WeeklyContext["ingredientSynergyFrom"] | undefined =
        previousDinner && previousDinnerMenu?.mainDishName
          ? {
            mealType: "dinner",
            date: previousDinner.date,
            mainDishName: previousDinnerMenu.mainDishName,
          }
          : undefined;

      await generateSlot(slotKey, assignment, ingredientSynergyFrom);
    }

    const slotFirstDates = new Map<string, string>();
    for (const [slotKey, assignment] of uniqueSlots) {
      slotFirstDates.set(slotKey, assignment.date);
    }

    for (const assignment of assignments) {
      const slotKey = `${assignment.mealType}:${assignment.slotId}`;
      const slotResult = slotResults.get(slotKey);

      if (!slotResult) {
        throw new functions.HttpsError(
          "internal",
          "Weekly menu slot generation failed"
        );
      }

      const isFirstOccurrence = slotFirstDates.get(slotKey) === assignment.date;
      let reasoning = slotResult.menu.reasoning;

      if (assignment.mealType === "dinner" && assignment.isRepeatFromPreviousDay) {
        reasoning = buildRepeatReasoning();
      } else if (!isFirstOccurrence && slotResult.ingredientSynergyUsed) {
        reasoning = buildGenericRepeatReasoning();
      }

      const menuForDay: MenuDecision = {
        ...slotResult.menu,
        reasoning,
        menuType: assignment.mealType,
      };

      const menuRequest = onboardingToMenuRequest(onboarding, assignment.date, {
        mealType: assignment.mealType,
        existingPantry: payload.existingPantry,
        avoidIngredients: payload.avoidIngredients,
        maxPrepTime: payload.maxPrepTime,
        maxCookTime: payload.maxCookTime,
        generateImage: payload.generateImage,
      });

      const menuParams: MenuRecipeGenerationParams = {
        ...menuRequest,
        userId,
        menu: menuForDay,
      };

      const menuDoc = buildMenuDocument({
        menu: menuForDay,
        params: menuParams,
        recipeLinks: slotResult.recipeLinks,
        provider,
        userId,
      });
      const menuDocId = buildMenuDocId(userId, assignment.date, assignment.mealType);
      batch.set(menusRef.doc(menuDocId), menuDoc, { merge: true });
      menuCount += 1;
    }

    await batch.commit();

    return {
      success: true,
      weekStart,
      singleDay: singleDay ?? null,
      totalMenus: menuCount,
      uniqueMenus: slotResults.size,
      recipesCreated: recipeCount,
      model: provider,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error("generateWeeklyMenu error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate weekly menu";
    throw new functions.HttpsError("internal", message, { message });
  }
});

// TODO: Full menu generation function
// export const generateMenu = onCall(async (request) => {
//   // Implementation coming soon
// });
