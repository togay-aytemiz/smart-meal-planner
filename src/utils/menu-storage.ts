import firestore, { doc, getDoc } from '@react-native-firebase/firestore';
import type { MenuDecision, MenuRecipe, MenuRecipeCourse, MenuRecipesResponse } from '../types/menu-recipes';

type FirestoreMenuDoc = {
    menuType: 'dinner';
    cuisine: string;
    totalTimeMinutes: number;
    reasoning?: string;
    items: {
        main: { name: string; recipeId: string };
        side: { name: string; recipeId: string };
        extra: { type: MenuDecision['items']['extra']['type']; name: string; recipeId: string };
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

const COURSE_VALUES: MenuRecipeCourse[] = ['main', 'side', 'soup', 'salad', 'meze', 'dessert', 'pastry'];

const normalizeCourse = (value: unknown): MenuRecipeCourse | null => {
    if (typeof value !== 'string') {
        return null;
    }
    return COURSE_VALUES.includes(value as MenuRecipeCourse) ? (value as MenuRecipeCourse) : null;
};

export const buildMenuDocId = (userId: string, date: string, menuType: string) => `${userId}_${date}_${menuType}`;

export const fetchMenuBundle = async (
    userId: string,
    date: string,
    menuType: MenuRecipesResponse['menuType']
): Promise<MenuBundle | null> => {
    const menuId = buildMenuDocId(userId, date, menuType);
    const menuSnap = await getDoc(doc(firestore(), 'menus', menuId));

    if (!menuSnap.exists()) {
        return null;
    }

    const menuData = menuSnap.data() as FirestoreMenuDoc | undefined;
    if (!menuData?.items?.main?.recipeId || !menuData.items.side?.recipeId || !menuData.items.extra?.recipeId) {
        return null;
    }

    const recipeIds = (menuData.recipeIds?.length
        ? menuData.recipeIds
        : [menuData.items.main.recipeId, menuData.items.side.recipeId, menuData.items.extra.recipeId]
    ).filter(Boolean);

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

    const resolvedMenuType = menuData.menuType === 'dinner' ? 'dinner' : menuType;
    const menu: MenuDecision = {
        menuType: resolvedMenuType,
        cuisine: menuData.cuisine ?? '',
        totalTimeMinutes: menuData.totalTimeMinutes ?? 0,
        reasoning: menuData.reasoning ?? '',
        items: {
            main: menuData.items.main.name,
            side: menuData.items.side.name,
            extra: {
                type: menuData.items.extra.type,
                name: menuData.items.extra.name,
            },
        },
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
