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
const normalizePantryValue = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
const buildPantryCacheId = (normalizedKey: string) =>
  createHash("sha256").update(`v2:${normalizedKey}`).digest("hex");

const toTitleCase = (str: string) => {
  return str.toLocaleLowerCase('tr-TR').replace(/(?:^|\s|["'([{])+\S/g, match => match.toLocaleUpperCase('tr-TR'));
};

type PantryNormalizationRequest = {
  items: string[];
  locale?: string;
};

type PantryNormalizedItem = {
  input: string;
  canonical: string;
  normalized: string;
};

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

type MenuDocumentParams = Pick<MenuGenerationRequest, "date" | "dayOfWeek" | "onboardingHash">;

const buildMenuItemKey = (course: string, name: string) =>
  `${course}:${normalizeText(name)}`;

const buildExistingRecipeMap = (existing?: DocumentData): Map<string, string> => {
  const map = new Map<string, string>();
  if (!existing?.items) {
    return map;
  }

  if (Array.isArray(existing.items)) {
    for (const item of existing.items) {
      if (!item?.recipeId || !item?.course || !item?.name) {
        continue;
      }
      map.set(buildMenuItemKey(item.course, item.name), item.recipeId);
    }
    return map;
  }

  const legacy = existing.items;
  if (legacy?.main?.recipeId && legacy?.main?.name) {
    map.set(buildMenuItemKey("main", legacy.main.name), legacy.main.recipeId);
  }
  if (legacy?.side?.recipeId && legacy?.side?.name) {
    map.set(buildMenuItemKey("side", legacy.side.name), legacy.side.recipeId);
  }
  if (legacy?.extra?.recipeId && legacy?.extra?.type && legacy?.extra?.name) {
    map.set(buildMenuItemKey(legacy.extra.type, legacy.extra.name), legacy.extra.recipeId);
  }

  return map;
};

const hasMenuItems = (items: unknown): boolean => {
  if (Array.isArray(items)) {
    return items.some((item) => Boolean(item?.course) && Boolean(item?.name));
  }

  if (!items || typeof items !== "object") {
    return false;
  }

  const legacy = items as {
    main?: { name?: string | null };
    side?: { name?: string | null };
    extra?: { name?: string | null };
  };

  return Boolean(legacy.main?.name || legacy.side?.name || legacy.extra?.name);
};

const isMenuDocValid = (
  data: DocumentData | undefined,
  expectedOnboardingHash?: string | null
): boolean => {
  if (!data || !hasMenuItems(data.items)) {
    return false;
  }

  if (typeof expectedOnboardingHash === "string") {
    const storedHash =
      typeof data.onboardingHash === "string" ? data.onboardingHash : null;
    if (storedHash !== expectedOnboardingHash) {
      return false;
    }
  }

  return true;
};

const buildMenuDocument = ({
  menu,
  params,
  recipeLinks,
  existingRecipeMap,
  provider,
  userId,
}: {
  menu: MenuDecision;
  params: MenuDocumentParams | MenuRecipeGenerationParams;
  recipeLinks?: RecipeLink[];
  existingRecipeMap?: Map<string, string>;
  provider: string;
  userId: string;
}): DocumentData => {
  const hasRecipeLinks = Array.isArray(recipeLinks) && recipeLinks.length > 0;
  const existingMap = existingRecipeMap ?? new Map<string, string>();

  const resolveRecipeId = (item: MenuDecision["items"][number]) => {
    if (hasRecipeLinks) {
      const link = findRecipeLink(
        recipeLinks!,
        item.course as MenuRecipeCourse,
        item.name
      );
      if (link?.id) {
        return link.id;
      }
    }

    const existingId = existingMap.get(buildMenuItemKey(item.course, item.name));
    if (existingId) {
      return existingId;
    }

    return item.recipeId ?? null;
  };

  const menuItems = menu.items.map((item) => {
    const recipeId = resolveRecipeId(item);
    if (recipeId) {
      return {
        course: item.course,
        name: item.name,
        recipeId,
      };
    }
    return {
      course: item.course,
      name: item.name,
    };
  });

  const recipeIds = menuItems
    .map((item) => item.recipeId)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const doc: DocumentData = {
    userId,
    date: params.date,
    dayOfWeek: params.dayOfWeek ?? null,
    menuType: menu.menuType,
    cuisine: menu.cuisine,
    totalTimeMinutes: menu.totalTimeMinutes,
    reasoning: menu.reasoning,
    items: menuItems,
    source: {
      provider,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (recipeIds.length) {
    doc.recipeIds = recipeIds;
  }

  if (params.onboardingHash) {
    doc.onboardingHash = params.onboardingHash;
  }

  return doc;
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

type MealAssignment = {
  date: string;
  dayOfWeek: WeekdayKey;
  dayIndex: number;
  mealType: MealType;
  slotId: string;
  isRepeatFromPreviousDay?: boolean;
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

// Menu Generation Status Tracking
type MenuGenerationState = "pending" | "in_progress" | "completed" | "failed";

const buildStatusDocId = (userId: string, weekStart: string) =>
  `${userId}_${weekStart}`;

const updateMenuGenerationStatus = async (
  userId: string,
  weekStart: string,
  status: MenuGenerationState,
  completedDays: number,
  totalDays: number,
  error?: string
) => {
  const db = getDb();
  const statusDocId = buildStatusDocId(userId, weekStart);
  const statusRef = db.collection("menuGenerationStatus").doc(statusDocId);

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    status,
    completedDays,
    totalDays,
    updatedAt: now,
  };

  if (status === "in_progress") {
    updateData.startedAt = now;
    updateData.completedAt = null;
    updateData.error = null;
  } else if (status === "completed") {
    updateData.completedAt = now;
    updateData.error = null;
  } else if (status === "failed") {
    updateData.error = error ?? "Unknown error";
  }

  await statusRef.set(updateData, { merge: true });
};

const safeUpdateMenuGenerationStatus = async (
  userId: string,
  weekStart: string,
  status: MenuGenerationState,
  completedDays: number,
  totalDays: number,
  error?: string
) => {
  try {
    await updateMenuGenerationStatus(userId, weekStart, status, completedDays, totalDays, error);
  } catch (statusError) {
    console.warn("Failed to update menu generation status:", statusError);
  }
};
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

  if (routine.excludeFromPlan || routine.type === "off") {
    return { breakfast: false, lunch: false, dinner: false };
  }

  return { breakfast: false, lunch: false, dinner: true };
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

const toHttpsError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof functions.HttpsError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : fallbackMessage;
  return new functions.HttpsError("internal", message, { message });
};

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
    throw toHttpsError(error, "Failed to generate response");
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
    throw toHttpsError(error, "Failed to generate response");
  }
});

export const normalizePantryItems = onCall(async (request) => {
  try {
    const payload = request.data as PantryNormalizationRequest | undefined;
    const rawItems = payload?.items;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Pantry items are required"
      );
    }

    const cleanedItems = rawItems
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);

    if (!cleanedItems.length) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Pantry items are required"
      );
    }

    const uniqueByKey = new Map<string, string>();
    for (const item of cleanedItems) {
      const key = normalizePantryValue(item);
      if (!key || uniqueByKey.has(key)) {
        continue;
      }
      uniqueByKey.set(key, item);
    }

    const db = getDb();
    const cacheRefs = Array.from(uniqueByKey.keys()).map((key) =>
      db.collection("pantry_normalizations").doc(buildPantryCacheId(key))
    );
    const cacheSnaps = await db.getAll(...cacheRefs);

    const cachedByKey = new Map<string, { canonical: string; categoryId: string }>();
    cacheSnaps.forEach((snap) => {
      if (!snap.exists) return;
      const data = snap.data() as { canonicalName?: string; normalizedKey?: string; categoryId?: string };
      if (data?.canonicalName && data?.normalizedKey) {
        cachedByKey.set(data.normalizedKey, {
          canonical: data.canonicalName,
          categoryId: data.categoryId || 'other'
        });
      }
    });

    const missingKeys = Array.from(uniqueByKey.keys()).filter(
      (key) => !cachedByKey.has(key)
    );

    let modelName = "cache";
    const llmByKey = new Map<string, { canonical: string; categoryId: string }>();

    if (missingKeys.length > 0) {
      const inputs = missingKeys.map((key) => uniqueByKey.get(key) ?? key);
      const openai = new OpenAIProvider();
      modelName = openai.getName();

      const response = await openai.normalizePantryItems(inputs);
      const responseItems = (response as { items?: Array<{ input?: string; canonical?: string; categoryId?: string }> })
        ?.items;

      if (Array.isArray(responseItems)) {
        responseItems.forEach((item) => {
          const input = typeof item.input === "string" ? item.input : "";
          const canonical = typeof item.canonical === "string" ? item.canonical.trim() : "";
          const categoryId = typeof item.categoryId === "string" ? item.categoryId : "other";
          if (!input || !canonical) return;
          const key = normalizePantryValue(input);
          if (!key) return;
          llmByKey.set(key, { canonical, categoryId });
        });
      }

      const batch = db.batch();
      missingKeys.forEach((key) => {
        const result = llmByKey.get(key);
        if (!result) return;
        const ref = db.collection("pantry_normalizations").doc(buildPantryCacheId(key));
        batch.set(
          ref,
          {
            input: uniqueByKey.get(key) ?? "",
            normalizedKey: key,
            canonicalName: result.canonical,
            categoryId: result.categoryId,
            provider: modelName,
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
      await batch.commit();
    }

    const results: PantryNormalizedItem[] = cleanedItems.map((input) => {
      const key = normalizePantryValue(input);
      const cached = cachedByKey.get(key);
      const llmResult = llmByKey.get(key);

      let canonical = cached?.canonical || llmResult?.canonical || input.trim();
      let categoryId = cached?.categoryId || llmResult?.categoryId || "other";

      // Enforce Title Case
      canonical = toTitleCase(canonical);

      return {
        input,
        canonical,
        normalized: normalizePantryValue(canonical),
        categoryId,
      };
    });

    return {
      success: true,
      items: results,
      model: modelName,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error("normalizePantryItems error:", error);
    throw toHttpsError(error, "Failed to normalize pantry items");
  }
});

// Grocery list categorization endpoint
type GroceryCategorizationRequest = {
  items: Array<{
    name: string;
    amount?: string;
    unit?: string;
    meals: string[];
  }>;
};

export const categorizeGroceryItems = onCall(async (request) => {
  try {
    const payload = request.data as GroceryCategorizationRequest | undefined;
    const rawItems = payload?.items;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Grocery items are required"
      );
    }

    const openai = new OpenAIProvider();
    const response = await openai.categorizeGroceryItems(rawItems);

    const responseItems = (response as {
      items?: Array<{
        name: string;
        amount?: string;
        unit?: string;
        meals: string[];
        categoryId: string;
      }>
    })?.items;

    if (!Array.isArray(responseItems)) {
      throw new functions.HttpsError(
        "internal",
        "Invalid response from LLM"
      );
    }

    // Apply Title Case to all item names
    const categorizedItems = responseItems.map((item) => ({
      ...item,
      name: toTitleCase(item.name),
    }));

    return {
      success: true,
      items: categorizedItems,
      model: openai.getName(),
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error("categorizeGroceryItems error:", error);
    throw toHttpsError(error, "Failed to categorize grocery items");
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
    throw toHttpsError(error, "Failed to generate menu");
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
    throw toHttpsError(error, "Failed to generate recipe");
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
    const dinnerAssignments = assignDinnerSlots(weekDays, repeatMode);

    let assignments = [...dinnerAssignments];

    // Filter to single day if requested
    const singleDay = payload.singleDay;
    if (singleDay) {
      assignments = assignments.filter((a) => a.date === singleDay);
    }

    const startDate = payload.startDate;
    if (!singleDay && startDate) {
      const startDateValue = parseISODate(startDate).getTime();
      assignments = assignments.filter(
        (assignment) => parseISODate(assignment.date).getTime() >= startDateValue
      );
    }

    const excludeDates = payload.excludeDates?.length
      ? new Set(payload.excludeDates)
      : null;
    if (!singleDay && excludeDates?.size) {
      assignments = assignments.filter((assignment) => !excludeDates.has(assignment.date));
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

    const dinnerSlots = Array.from(uniqueSlots.entries())
      .filter(([, assignment]) => assignment.mealType === "dinner")
      .sort(([, first], [, second]) => first.dayIndex - second.dayIndex);

    const totalDinnerDays = dinnerSlots.length;
    const expectedOnboardingHash =
      typeof payload.onboardingHash === "string" ? payload.onboardingHash : null;
    const menusRef = db.collection("menus");

    const menuRefs = assignments.map((assignment) =>
      menusRef.doc(buildMenuDocId(userId, assignment.date, assignment.mealType))
    );
    const menuSnaps = await db.getAll(...menuRefs);
    const allMenusExist = menuSnaps.every((snap) =>
      snap.exists ? isMenuDocValid(snap.data(), expectedOnboardingHash) : false
    );

    if (allMenusExist) {
      try {
        await updateMenuGenerationStatus(
          userId,
          weekStart,
          "completed",
          totalDinnerDays,
          totalDinnerDays
        );
      } catch (statusError) {
        console.warn("Failed to update status for cached weekly menu:", statusError);
      }

      return {
        success: true,
        weekStart,
        singleDay: singleDay ?? null,
        totalMenus: assignments.length,
        uniqueMenus: uniqueSlots.size,
        recipesCreated: 0,
        model: "cache",
        timestamp: new Date().toISOString(),
      };
    }

    const openai = new OpenAIProvider();
    const provider = openai.getName();
    const batch = db.batch();

    const slotResults = new Map<
      string,
      {
        menu: MenuDecision;
        mainDishName?: string;
      }
    >();

    let menuCount = 0;

    const normalizeDishName = (value: string) =>
      value.trim().toLocaleLowerCase("tr-TR");

    const buildMenuRequest = (
      assignment: MealAssignment,
      ingredientSynergyFrom?: WeeklyContext["ingredientSynergyFrom"],
      leftoverMainDish?: string
    ): MenuGenerationRequest => {
      const avoidItemNames = Array.from(usedDishNames);
      const cleanedAvoidItemNames = leftoverMainDish
        ? avoidItemNames.filter(
          (name) =>
            normalizeDishName(name) !== normalizeDishName(leftoverMainDish)
        )
        : avoidItemNames;
      const baseRequest = onboardingToMenuRequest(onboarding, assignment.date, {
        mealType: assignment.mealType,
        existingPantry: payload.existingPantry,
        pantryOnly: payload.pantryOnly,
        requiredIngredients: payload.requiredIngredients,
        avoidIngredients: payload.avoidIngredients,
        avoidItemNames: cleanedAvoidItemNames.length ? cleanedAvoidItemNames : undefined,
        maxPrepTime: payload.maxPrepTime,
        maxCookTime: payload.maxCookTime,
        generateImage: payload.generateImage,
        onboardingHash: payload.onboardingHash,
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

      const mainDishName = menu.items.find((item) => item.course === "main")?.name;

      slotResults.set(slotKey, {
        menu,
        mainDishName,
      });
    };

    // Update status to in_progress before generating
    let completedDinnerDays = 0;
    await safeUpdateMenuGenerationStatus(userId, weekStart, "in_progress", 0, totalDinnerDays);

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

      // Update progress after each dinner slot
      completedDinnerDays += 1;
      await safeUpdateMenuGenerationStatus(userId, weekStart, "in_progress", completedDinnerDays, totalDinnerDays);
    }

    for (const assignment of assignments) {
      const slotKey = assignment.isRepeatFromPreviousDay
        ? `${assignment.mealType}:${assignment.slotId}:repeat`
        : `${assignment.mealType}:${assignment.slotId}`;
      const slotResult = slotResults.get(slotKey);

      if (!slotResult) {
        throw new functions.HttpsError(
          "internal",
          "Weekly menu slot generation failed"
        );
      }

      const menuForDay: MenuDecision = {
        ...slotResult.menu,
        menuType: assignment.mealType,
      };

      const menuDocId = buildMenuDocId(userId, assignment.date, assignment.mealType);
      const existingSnap = await menusRef.doc(menuDocId).get();
      const existingRecipeMap = buildExistingRecipeMap(existingSnap.data());

      const menuRequest = onboardingToMenuRequest(onboarding, assignment.date, {
        mealType: assignment.mealType,
        existingPantry: payload.existingPantry,
        pantryOnly: payload.pantryOnly,
        requiredIngredients: payload.requiredIngredients,
        avoidIngredients: payload.avoidIngredients,
        maxPrepTime: payload.maxPrepTime,
        maxCookTime: payload.maxCookTime,
        generateImage: payload.generateImage,
        onboardingHash: payload.onboardingHash,
      });

      const menuDoc = buildMenuDocument({
        menu: menuForDay,
        params: menuRequest,
        existingRecipeMap,
        provider,
        userId,
      });
      batch.set(menusRef.doc(menuDocId), menuDoc, { merge: true });
      menuCount += 1;
    }

    await batch.commit();

    // Update status to completed
    await safeUpdateMenuGenerationStatus(userId, weekStart, "completed", totalDinnerDays, totalDinnerDays);

    return {
      success: true,
      weekStart,
      singleDay: singleDay ?? null,
      totalMenus: menuCount,
      uniqueMenus: slotResults.size,
      recipesCreated: 0,
      model: provider,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error("generateWeeklyMenu error:", error);
    const resolvedError = toHttpsError(error, "Failed to generate weekly menu");
    const message = resolvedError.message;

    // Try to update status to failed (best effort)
    try {
      const payload = request.data?.request as WeeklyMenuGenerationRequest | undefined;
      const userId = request.auth?.uid ?? payload?.userId;
      const weekStartDate = resolveWeekStart(payload?.weekStart);
      const weekStart = formatISODate(weekStartDate);
      if (userId) {
        await safeUpdateMenuGenerationStatus(userId, weekStart, "failed", 0, 0, message);
      }
    } catch (statusError) {
      console.error("Failed to update status on error:", statusError);
    }

    throw resolvedError;
  }
});

// TODO: Full menu generation function
// export const generateMenu = onCall(async (request) => {
//   // Implementation coming soon
// });
