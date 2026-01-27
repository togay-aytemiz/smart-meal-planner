import firestore, { doc, getDoc } from '@react-native-firebase/firestore';
import type { MenuDecision, MenuMealType, MenuRecipe, MenuRecipeCourse, MenuRecipesResponse } from '../types/menu-recipes';

type FirestoreMenuDoc = {
    menuType: MenuMealType;
    cuisine: string;
    totalTimeMinutes: number;
    reasoning?: string;
    onboardingHash?: string | null;
    items:
        | Array<{ course: MenuRecipeCourse; name: string; recipeId?: string | null }>
        | {
            main: { name: string; recipeId?: string | null };
            side: { name: string; recipeId?: string | null };
            extra: { type: MenuRecipeCourse; name: string; recipeId?: string | null };
        };
    recipeIds?: string[];
};

type FirestoreRecipeDoc = {
    name: string;
    brief: string;
    ingredients: MenuRecipe['ingredients'];
    instructions: MenuRecipe['instructions'];
    macrosPerServing: MenuRecipe['macrosPerServing'];
    metadata: {
        course: MenuRecipeCourse;
        servings: number;
        prepTimeMinutes: number;
        cookTimeMinutes: number;
        totalTimeMinutes: number;
    };
};

export type MenuBundle = {
    menu: MenuDecision;
    recipes: MenuRecipesResponse;
};

export type MenuDecisionWithLinks = Omit<MenuDecision, 'items'> & {
    items: Array<{
        course: MenuRecipeCourse;
        name: string;
        recipeId?: string | null;
    }>;
};

const COURSE_VALUES: MenuRecipeCourse[] = ['main', 'side', 'soup', 'salad', 'meze', 'dessert', 'pastry'];

const normalizeCourse = (value: unknown): MenuRecipeCourse | null => {
    if (typeof value !== 'string') {
        return null;
    }
    return COURSE_VALUES.includes(value as MenuRecipeCourse) ? (value as MenuRecipeCourse) : null;
};

type ResolvedMenuItem = {
    course: MenuRecipeCourse;
    name: string;
    recipeId?: string | null;
};

const resolveMenuItems = (
    menuData: FirestoreMenuDoc,
    options?: { requireRecipeId?: boolean }
): ResolvedMenuItem[] | null => {
    const requireRecipeId = Boolean(options?.requireRecipeId);

    if (Array.isArray(menuData.items)) {
        const normalized: ResolvedMenuItem[] = [];
        for (const item of menuData.items) {
            const course = normalizeCourse(item.course);
            const name = item.name;
            const recipeId = typeof item.recipeId === 'string' ? item.recipeId : null;
            if (!course || !name) {
                continue;
            }
            if (requireRecipeId && !recipeId) {
                continue;
            }
            if (recipeId) {
                normalized.push({ course, name, recipeId });
            } else {
                normalized.push({ course, name });
            }
        }

        return normalized.length ? normalized : null;
    }

    const legacy = menuData.items;
    if (!legacy?.main?.name || !legacy?.side?.name || !legacy?.extra?.name) {
        return null;
    }
    const extraCourse = normalizeCourse(legacy?.extra?.type);
    if (!extraCourse) {
        return null;
    }

    const items: ResolvedMenuItem[] = [];
    const mainRecipeId = typeof legacy.main.recipeId === 'string' ? legacy.main.recipeId : null;
    const sideRecipeId = typeof legacy.side.recipeId === 'string' ? legacy.side.recipeId : null;
    const extraRecipeId = typeof legacy.extra.recipeId === 'string' ? legacy.extra.recipeId : null;

    if (!requireRecipeId || mainRecipeId) {
        items.push(mainRecipeId ? { course: 'main', name: legacy.main.name, recipeId: mainRecipeId } : { course: 'main', name: legacy.main.name });
    }
    if (!requireRecipeId || sideRecipeId) {
        items.push(sideRecipeId ? { course: 'side', name: legacy.side.name, recipeId: sideRecipeId } : { course: 'side', name: legacy.side.name });
    }
    if (!requireRecipeId || extraRecipeId) {
        items.push(extraRecipeId ? { course: extraCourse, name: legacy.extra.name, recipeId: extraRecipeId } : { course: extraCourse, name: legacy.extra.name });
    }

    return items.length ? items : null;
};

export const buildMenuDocId = (userId: string, date: string, menuType: MenuMealType) =>
    `${userId}_${date}_${menuType}`;

export const fetchMenuBundle = async (
    userId: string,
    date: string,
    menuType: MenuRecipesResponse['menuType'],
    expectedOnboardingHash?: string | null
): Promise<MenuBundle | null> => {
    const menuId = buildMenuDocId(userId, date, menuType);
    const menuSnap = await getDoc(doc(firestore(), 'menus', menuId));

    if (!menuSnap.exists()) {
        return null;
    }

    const menuData = menuSnap.data() as FirestoreMenuDoc | undefined;
    if (!menuData) {
        return null;
    }

    if (typeof expectedOnboardingHash === 'string') {
        const storedHash = typeof menuData.onboardingHash === 'string' ? menuData.onboardingHash : null;
        if (!storedHash || storedHash !== expectedOnboardingHash) {
            return null;
        }
    }

    const resolvedItems = resolveMenuItems(menuData, { requireRecipeId: true });
    if (!resolvedItems?.length) {
        return null;
    }

    const recipeIds = (menuData.recipeIds?.length
        ? menuData.recipeIds
        : resolvedItems.map((item) => item.recipeId)
    ).filter((value): value is string => typeof value === 'string' && value.length > 0);

    const recipeSnaps = await Promise.all(
        recipeIds.map((recipeId) => getDoc(doc(firestore(), 'recipes', recipeId)))
    );

    const recipes: MenuRecipe[] = [];

    for (const recipeSnap of recipeSnaps) {
        if (!recipeSnap.exists()) {
            continue;
        }

        const recipeData = recipeSnap.data() as FirestoreRecipeDoc | undefined;
        const course = normalizeCourse(recipeData?.metadata?.course);

        if (!recipeData || !course) {
            continue;
        }

        recipes.push({
            course,
            name: recipeData.name,
            brief: recipeData.brief,
            servings: recipeData.metadata?.servings ?? 1,
            prepTimeMinutes: recipeData.metadata?.prepTimeMinutes ?? 0,
            cookTimeMinutes: recipeData.metadata?.cookTimeMinutes ?? 0,
            totalTimeMinutes: recipeData.metadata?.totalTimeMinutes ?? 0,
            ingredients: recipeData.ingredients ?? [],
            instructions: recipeData.instructions ?? [],
            macrosPerServing: recipeData.macrosPerServing ?? {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
            },
        });
    }

    if (recipes.length !== recipeIds.length) {
        return null;
    }

    const resolvedMenuType = menuData.menuType ?? menuType;
    const menu: MenuDecision = {
        menuType: resolvedMenuType,
        cuisine: menuData.cuisine ?? '',
        totalTimeMinutes: menuData.totalTimeMinutes ?? 0,
        reasoning: menuData.reasoning ?? '',
        items: resolvedItems.map((item) => ({
            course: item.course,
            name: item.name,
        })),
    };

    return {
        menu,
        recipes: {
            menuType: resolvedMenuType,
            cuisine: menuData.cuisine ?? '',
            totalTimeMinutes: menuData.totalTimeMinutes ?? 0,
            recipes,
        },
    };
};

export const fetchMenuDecision = async (
    userId: string,
    date: string,
    menuType: MenuMealType,
    expectedOnboardingHash?: string | null
): Promise<MenuDecisionWithLinks | null> => {
    const menuId = buildMenuDocId(userId, date, menuType);
    const menuSnap = await getDoc(doc(firestore(), 'menus', menuId));

    if (!menuSnap.exists()) {
        return null;
    }

    const menuData = menuSnap.data() as FirestoreMenuDoc | undefined;
    if (!menuData) {
        return null;
    }

    if (typeof expectedOnboardingHash === 'string') {
        const storedHash = typeof menuData.onboardingHash === 'string' ? menuData.onboardingHash : null;
        if (!storedHash || storedHash !== expectedOnboardingHash) {
            return null;
        }
    }

    const resolvedItems = resolveMenuItems(menuData, { requireRecipeId: false });
    if (!resolvedItems?.length) {
        return null;
    }

    const resolvedMenuType = menuData.menuType ?? menuType;
    return {
        menuType: resolvedMenuType,
        cuisine: menuData.cuisine ?? '',
        totalTimeMinutes: menuData.totalTimeMinutes ?? 0,
        reasoning: menuData.reasoning ?? '',
        items: resolvedItems.map((item) => ({
            course: item.course,
            name: item.name,
            ...(item.recipeId ? { recipeId: item.recipeId } : {}),
        })),
    };
};
