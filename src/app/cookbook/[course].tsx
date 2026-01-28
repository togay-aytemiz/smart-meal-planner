import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import firestore, { doc, getDoc } from '@react-native-firebase/firestore';
import { useUser } from '../../contexts/user-context';
import { useCookbook } from '../../hooks/use-cookbook';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import MealDetail from '../../components/cookbook/meal-detail';
import { functions } from '../../config/firebase';
import { fetchMenuDecision, type MenuDecisionWithLinks } from '../../utils/menu-storage';
import { buildOnboardingHash, type OnboardingSnapshot } from '../../utils/onboarding-hash';
import { MenuMealType, MenuRecipe, MenuRecipeCourse, MenuRecipesResponse } from '../../types/menu-recipes';
import type { RoutineDay, WeeklyRoutine } from '../../contexts/onboarding-context';

const STORAGE_KEY = '@smart_meal_planner:onboarding';
const MENU_RECIPES_STORAGE_KEY = '@smart_meal_planner:menu_recipes';

const normalizeCourse = (value: string | string[] | undefined): MenuRecipeCourse | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const allowed: MenuRecipeCourse[] = ['main', 'side', 'soup', 'salad', 'meze', 'dessert', 'pastry'];
    return allowed.includes(value as MenuRecipeCourse) ? (value as MenuRecipeCourse) : null;
};

const resolveMealType = (value: string | string[] | undefined): MenuMealType => {
    if (value === 'breakfast' || value === 'lunch' || value === 'dinner') {
        return value;
    }
    return 'dinner';
};

const resolveRecipeName = (value: string | string[] | undefined) => {
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }
    return null;
};

const normalizeText = (value: string) => value.trim().toLowerCase();
const normalizeMenuKey = (course: string, name: string) => `${course}:${normalizeText(name)}`;
const recipesMatchMenu = (menu: MenuDecisionWithLinks, recipes: MenuRecipe[]) => {
    const recipeKeys = new Set(recipes.map((item) => normalizeMenuKey(item.course, item.name)));
    return menu.items.every((item) => recipeKeys.has(normalizeMenuKey(item.course, item.name)));
};
const applyRecipeMetrics = (menu: MenuDecisionWithLinks, recipes: MenuRecipe[]): MenuDecisionWithLinks => {
    if (!recipes.length) {
        return menu;
    }

    const metrics = new Map<string, { timeMinutes?: number; calories?: number }>();
    recipes.forEach((recipe) => {
        const timeMinutes =
            typeof recipe.totalTimeMinutes === 'number' && recipe.totalTimeMinutes > 0
                ? recipe.totalTimeMinutes
                : undefined;
        const calories =
            typeof recipe.macrosPerServing?.calories === 'number' && recipe.macrosPerServing.calories > 0
                ? recipe.macrosPerServing.calories
                : undefined;
        if (timeMinutes || calories) {
            metrics.set(normalizeMenuKey(recipe.course, recipe.name), { timeMinutes, calories });
        }
    });

    if (!metrics.size) {
        return menu;
    }

    return {
        ...menu,
        items: menu.items.map((item) => {
            const metric = metrics.get(normalizeMenuKey(item.course, item.name));
            if (!metric) {
                return item;
            }
            return {
                ...item,
                ...(typeof metric.timeMinutes === 'number' ? { timeMinutes: metric.timeMinutes } : {}),
                ...(typeof metric.calories === 'number' ? { calories: metric.calories } : {}),
            };
        }),
    };
};
const buildFavoriteRecipeId = (course: MenuRecipeCourse, name: string) =>
    `${course}-${name}`
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

const buildMenuRecipesKey = (userId: string, mealType: MenuMealType) =>
    `${MENU_RECIPES_STORAGE_KEY}:${userId}:${mealType}`;
const MENU_CACHE_STORAGE_KEY = '@smart_meal_planner:menu_cache';

const DEFAULT_ROUTINES: WeeklyRoutine = {
    monday: { type: 'office', gymTime: 'none' },
    tuesday: { type: 'office', gymTime: 'none' },
    wednesday: { type: 'office', gymTime: 'none' },
    thursday: { type: 'office', gymTime: 'none' },
    friday: { type: 'office', gymTime: 'none' },
    saturday: { type: 'remote', gymTime: 'none' },
    sunday: { type: 'remote', gymTime: 'none' },
};

type MenuCache = {
    menu: MenuDecisionWithLinks;
    recipes?: MenuRecipesResponse;
    cachedAt: string;
    onboardingHash?: string;
};

type MenuRecipesCache = {
    data: MenuRecipesResponse;
    cachedAt: string;
    onboardingHash?: string;
};

const buildMenuCacheKey = (userId: string, date: string, mealType: MenuMealType) =>
    `${MENU_CACHE_STORAGE_KEY}:${userId}:${date}:${mealType}`;

const recipeMemoryCache = new Map<string, MenuRecipe>();

const buildDetailCacheKey = ({
    userId,
    date,
    mealType,
    course,
    recipeName,
}: {
    userId: string;
    date: string;
    mealType: MenuMealType;
    course: MenuRecipeCourse;
    recipeName?: string | null;
}) => `${userId}:${date}:${mealType}:${course}:${recipeName ?? ''}`;

const resolveDate = (value: string | string[] | undefined) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    return new Date().toISOString().split('T')[0];
};

const parseMenuRecipesCache = (
    raw: string | null,
    expectedOnboardingHash?: string | null
): MenuRecipesResponse | null => {
    if (!raw) {
        return null;
    }

    const parsed = JSON.parse(raw) as MenuRecipesCache | MenuRecipesResponse;

    if ('recipes' in parsed) {
        if (typeof expectedOnboardingHash === 'string') {
            return null;
        }
        return parsed;
    }

    const data = parsed.data;
    if (!data?.recipes?.length) {
        return null;
    }

    if (typeof expectedOnboardingHash === 'string') {
        if (!parsed.onboardingHash || parsed.onboardingHash !== expectedOnboardingHash) {
            return null;
        }
    }

    return data;
};

const getDayKey = (dateKey: string): keyof WeeklyRoutine => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklyRoutine;
};

const loadOnboardingSnapshot = async (userId: string): Promise<OnboardingSnapshot | null> => {
    const localRaw = await AsyncStorage.getItem(STORAGE_KEY);
    const localStored = localRaw ? (JSON.parse(localRaw) as { data?: OnboardingSnapshot }) : null;
    const localSnapshot = localStored?.data ?? null;

    if (userId === 'anonymous') {
        return localSnapshot;
    }

    try {
        const userSnap = await getDoc(doc(firestore(), 'Users', userId));
        const remoteSnapshot = userSnap.data()?.onboarding as OnboardingSnapshot | undefined;
        return remoteSnapshot ?? localSnapshot;
    } catch (error) {
        console.warn('Failed to load onboarding snapshot:', error);
        return localSnapshot;
    }
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

const parseRecipeDoc = (data?: FirestoreRecipeDoc): MenuRecipe | null => {
    const course = normalizeCourse(data?.metadata?.course);
    if (!data || !course) {
        return null;
    }

    return {
        course,
        name: data.name,
        brief: data.brief,
        servings: data.metadata?.servings ?? 1,
        prepTimeMinutes: data.metadata?.prepTimeMinutes ?? 0,
        cookTimeMinutes: data.metadata?.cookTimeMinutes ?? 0,
        totalTimeMinutes: data.metadata?.totalTimeMinutes ?? 0,
        ingredients: data.ingredients ?? [],
        instructions: data.instructions ?? [],
        macrosPerServing: data.macrosPerServing ?? {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
        },
    };
};

const fetchRecipeById = async (recipeId: string) => {
    try {
        const recipeSnap = await getDoc(doc(firestore(), 'recipes', recipeId));
        if (!recipeSnap.exists()) {
            return null;
        }
        const data = recipeSnap.data() as FirestoreRecipeDoc | undefined;
        return parseRecipeDoc(data);
    } catch (error) {
        console.warn('Failed to fetch recipe by id:', error);
        return null;
    }
};

const fetchFavoriteRecipe = async (
    userId: string,
    course: MenuRecipeCourse,
    recipeName: string
) => {
    if (userId === 'anonymous') {
        return null;
    }

    const favoriteId = buildFavoriteRecipeId(course, recipeName);
    try {
        const favoriteSnap = await getDoc(doc(firestore(), 'Users', userId, 'favorites', favoriteId));
        if (!favoriteSnap.exists()) {
            return null;
        }
        const data = favoriteSnap.data() as { recipe?: MenuRecipe } | undefined;
        const recipe = data?.recipe;
        if (!recipe) {
            return null;
        }
        // Favoriler, detay ekranında tarih/menuden bagimsiz en guvenilir kaynaktir.
        return recipe;
    } catch (error) {
        console.warn('Failed to fetch favorite recipe:', error);
        return null;
    }
};

type MenuRecipeParamsPayload = {
    userId: string;
    date: string;
    dayOfWeek: string;
    onboardingHash?: string;
    dietaryRestrictions: string[];
    allergies: string[];
    cuisinePreferences: string[];
    timePreference: 'quick' | 'balanced' | 'elaborate';
    skillLevel: 'beginner' | 'intermediate' | 'expert';
    equipment: string[];
    householdSize: number;
    routine?: RoutineDay;
    mealType: MenuMealType;
    generateImage?: boolean;
    menu: MenuDecisionWithLinks;
};

type GenerateRecipeResponse = {
    success: boolean;
    menuRecipes: MenuRecipesResponse;
    reusedRecipeCount?: number;
    newRecipeCount?: number;
    model?: string;
    timestamp?: string;
};

export default function CookbookDetailScreen() {
    const router = useRouter();
    const { course, mealType, date, recipeName } = useLocalSearchParams<{
        course?: string;
        mealType?: string;
        date?: string;
        recipeName?: string;
    }>();
    const { state: userState } = useUser();
    const { isFavorite, toggleFavorite } = useCookbook();
    const resolvedDate = resolveDate(date);
    const resolvedMealType = resolveMealType(mealType);
    const resolvedRecipeName = resolveRecipeName(recipeName);
    const normalizedRecipeName = resolvedRecipeName ? normalizeText(resolvedRecipeName) : null;
    const courseKey = normalizeCourse(course);
    const isCookbookEntry = !date || !mealType;
    const userId = userState.user?.uid ?? 'anonymous';
    const detailCacheKey = courseKey
        ? buildDetailCacheKey({
            userId,
            date: resolvedDate,
            mealType: resolvedMealType,
            course: courseKey,
            recipeName: normalizedRecipeName,
        })
        : null;
    const cachedRecipe = detailCacheKey ? recipeMemoryCache.get(detailCacheKey) ?? null : null;
    const [recipe, setRecipe] = useState<MenuRecipe | null>(() => cachedRecipe);
    const [loading, setLoading] = useState(() => !cachedRecipe);
    const [error, setError] = useState<string | null>(null);
    const [showFeedback, setShowFeedback] = useState<'added' | 'removed' | null>(null);
    const feedbackOpacity = useRef(new Animated.Value(0)).current;

    const handleFavoriteToggle = useCallback(async () => {
        if (!recipe) return;
        try {
            const wasAdded = await toggleFavorite(recipe);
            setShowFeedback(wasAdded ? 'added' : 'removed');
            // Animate feedback
            Animated.sequence([
                Animated.timing(feedbackOpacity, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.delay(800),
                Animated.timing(feedbackOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => setShowFeedback(null));
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    }, [recipe, toggleFavorite, feedbackOpacity]);

    const isRecipeFavorited = recipe ? isFavorite(recipe) : false;

    useEffect(() => {
        if (userState.isLoading) {
            return;
        }

        let isMounted = true;

        const loadRecipe = async () => {
            setError(null);

            try {
                if (!courseKey) {
                    throw new Error('Tarif bulunamadı');
                }

                let hasResolved = Boolean(cachedRecipe);

                if (isMounted) {
                    if (cachedRecipe) {
                        setRecipe(cachedRecipe);
                        setLoading(false);
                    } else {
                        setRecipe(null);
                        setLoading(true);
                    }
                }

                const onboardingSnapshot = await loadOnboardingSnapshot(userId);
                const onboardingHash = buildOnboardingHash(onboardingSnapshot);
                const dayKey = getDayKey(resolvedDate);
                const routines = onboardingSnapshot?.routines ?? DEFAULT_ROUTINES;
                const routineForDay = routines[dayKey];

                const findRecipeMatch = (recipes: MenuRecipe[]) => {
                    if (normalizedRecipeName) {
                        const exactMatch = recipes.find(
                            (item) =>
                                item.course === courseKey && normalizeText(item.name) === normalizedRecipeName
                        );
                        return exactMatch ?? null;
                    }
                    return recipes.find((item) => item.course === courseKey) ?? null;
                };

                const cacheKey = detailCacheKey;
                const setRecipeFromMatch = (match: MenuRecipe) => {
                    hasResolved = true;
                    if (cacheKey) {
                        recipeMemoryCache.set(cacheKey, match);
                    }
                    if (isMounted) {
                        setRecipe(match);
                        setLoading(false);
                    }
                };

                if (isCookbookEntry && resolvedRecipeName) {
                    const favoriteRecipe = await fetchFavoriteRecipe(userId, courseKey, resolvedRecipeName);
                    if (favoriteRecipe) {
                        setRecipeFromMatch(favoriteRecipe);
                        return;
                    }
                    throw new Error('Tarif bulunamadı');
                }

                const persistRecipeCaches = async (
                    menuDecision: MenuDecisionWithLinks,
                    menuRecipes: MenuRecipesResponse
                ) => {
                    try {
                        const cachedAt = new Date().toISOString();
                        const mergedMenu = applyRecipeMetrics(menuDecision, menuRecipes.recipes);
                        const cacheData: MenuCache = {
                            menu: mergedMenu,
                            recipes: menuRecipes,
                            cachedAt,
                            onboardingHash: onboardingHash ?? undefined,
                        };
                        await AsyncStorage.setItem(
                            buildMenuCacheKey(userId, resolvedDate, resolvedMealType),
                            JSON.stringify(cacheData)
                        );
                        const recipesCache: MenuRecipesCache = {
                            data: menuRecipes,
                            cachedAt,
                            onboardingHash: onboardingHash ?? undefined,
                        };
                        await AsyncStorage.setItem(
                            buildMenuRecipesKey(userId, resolvedMealType),
                            JSON.stringify(recipesCache)
                        );
                    } catch (cacheError) {
                        console.warn('Cookbook cache write error:', cacheError);
                    }
                };

                let menuDecision: MenuDecisionWithLinks | null = null;

                try {
                    const cachedMenuRaw = await AsyncStorage.getItem(
                        buildMenuCacheKey(userId, resolvedDate, resolvedMealType)
                    );
                    if (cachedMenuRaw) {
                        const cachedMenu = JSON.parse(cachedMenuRaw) as MenuCache;
                        const hasHashMismatch =
                            typeof onboardingHash === 'string' &&
                            (!cachedMenu.onboardingHash || cachedMenu.onboardingHash !== onboardingHash);
                        if (!hasHashMismatch) {
                            menuDecision = cachedMenu.menu;
                            const match = cachedMenu.recipes?.recipes
                                ? findRecipeMatch(cachedMenu.recipes.recipes)
                                : null;
                            if (match) {
                                setRecipeFromMatch(match);
                                return;
                            }
                        }
                    }
                } catch (cacheError) {
                    console.warn('Cookbook cache read error:', cacheError);
                }

                try {
                    const firestoreMenu = await fetchMenuDecision(userId, resolvedDate, resolvedMealType, null);
                    if (firestoreMenu) {
                        menuDecision = firestoreMenu;
                    }
                } catch (firestoreError) {
                    console.warn('Cookbook menu read error:', firestoreError);
                }

                if (!menuDecision?.items?.length) {
                    throw new Error('Menü bulunamadı');
                }

                const raw =
                    (await AsyncStorage.getItem(buildMenuRecipesKey(userId, resolvedMealType))) ??
                    (await AsyncStorage.getItem(MENU_RECIPES_STORAGE_KEY));
                const parsed = parseMenuRecipesCache(raw, onboardingHash);
                if (!parsed) {
                    if (isMounted && !cachedRecipe) {
                        setLoading(true);
                    }
                } else if (recipesMatchMenu(menuDecision, parsed.recipes)) {
                    const match = findRecipeMatch(parsed.recipes);
                    if (match) {
                        setRecipeFromMatch(match);
                        return;
                    }
                }

                const menuItem = menuDecision.items.find((item) => {
                    if (item.course !== courseKey) {
                        return false;
                    }
                    if (normalizedRecipeName) {
                        return normalizeText(item.name) === normalizedRecipeName;
                    }
                    return true;
                });

                if (!menuItem) {
                    throw new Error('Tarif bulunamadı');
                }

                if (typeof menuItem.recipeId === 'string' && menuItem.recipeId.length > 0) {
                    const recipeFromDb = await fetchRecipeById(menuItem.recipeId);
                    if (recipeFromDb) {
                        setRecipeFromMatch(recipeFromDb);
                        return;
                    }
                }

                const menuParams: MenuRecipeParamsPayload = {
                    userId,
                    date: resolvedDate,
                    dayOfWeek: dayKey,
                    dietaryRestrictions: onboardingSnapshot?.dietary?.restrictions ?? [],
                    allergies: onboardingSnapshot?.dietary?.allergies ?? [],
                    cuisinePreferences: onboardingSnapshot?.cuisine?.selected ?? [],
                    timePreference: onboardingSnapshot?.cooking?.timePreference ?? 'balanced',
                    skillLevel: onboardingSnapshot?.cooking?.skillLevel ?? 'intermediate',
                    equipment: onboardingSnapshot?.cooking?.equipment ?? [],
                    householdSize: onboardingSnapshot?.householdSize ?? 1,
                    routine: routineForDay
                        ? {
                            type: routineForDay.type,
                            gymTime: routineForDay.gymTime,
                            officeMealToGo: routineForDay.officeMealToGo,
                            officeBreakfastAtHome: routineForDay.officeBreakfastAtHome,
                            schoolBreakfast: routineForDay.schoolBreakfast,
                            remoteMeals: routineForDay.remoteMeals,
                            excludeFromPlan: routineForDay.excludeFromPlan,
                        }
                        : undefined,
                    mealType: resolvedMealType,
                    generateImage: false,
                    menu: menuDecision,
                    ...(typeof onboardingHash === 'string' ? { onboardingHash } : {}),
                };

                try {
                    const callRecipe = functions.httpsCallable<
                        { params: MenuRecipeParamsPayload },
                        GenerateRecipeResponse
                    >('generateOpenAIRecipe');
                    const response = await callRecipe({ params: menuParams });
                    const menuRecipes = response.data?.menuRecipes;

                    if (!menuRecipes?.recipes?.length) {
                        throw new Error('Tarif üretilemedi');
                    }

                    const generatedMatch = findRecipeMatch(menuRecipes.recipes);
                    if (!generatedMatch) {
                        throw new Error('Tarif bulunamadı');
                    }

                    setRecipeFromMatch(generatedMatch);
                    await persistRecipeCaches(menuDecision, menuRecipes);
                    return;
                } catch (generationError) {
                    console.warn('Cookbook recipe generation error:', generationError);
                }

                if (!hasResolved) {
                    throw new Error('Tarif bulunamadı');
                }
            } catch (err: unknown) {
                console.error('Cookbook detail error:', err);
                const message = err instanceof Error ? err.message : 'Bir hata oluştu';
                if (isMounted) {
                    setError(message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadRecipe();

        return () => {
            isMounted = false;
        };
    }, [course, date, mealType, recipeName, userState.isLoading, userState.user?.uid]);

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            {loading && !recipe && (
                <View style={styles.stateContainer}>
                    <Image
                        source={require('../../../assets/food-loader.gif')}
                        style={styles.stateLoaderImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.stateTitle}>Tarif hazırlanıyor...</Text>
                    <Text style={styles.stateSubtext}>
                        Omnoo senin için lezzeti ve dengeyi ayarlıyor.
                    </Text>
                </View>
            )}

            {error && !loading && !recipe && (
                <View style={styles.stateContainer}>
                    <Text style={styles.stateText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                        <Text style={styles.retryButtonText}>Geri Dön</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!error && recipe && (
                <>
                    <MealDetail
                        recipe={recipe}
                        onBack={() => router.back()}
                        onFavorite={handleFavoriteToggle}
                        isFavorited={isRecipeFavorited}
                        appName="Omnoo"
                    />
                    {showFeedback && (
                        <Animated.View
                            style={[
                                styles.feedbackToast,
                                { opacity: feedbackOpacity },
                            ]}
                            pointerEvents="none"
                        >
                            <Text style={styles.feedbackText}>
                                {showFeedback === 'added'
                                    ? 'Tariflere eklendi'
                                    : 'Tariflerden kaldırıldı'}
                            </Text>
                        </Animated.View>
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    stateContainer: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    stateLoaderImage: {
        width: 200,
        height: 200,
    },
    stateTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    stateSubtext: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    stateText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    retryButtonText: {
        ...typography.buttonSmall,
        color: colors.primary,
    },
    feedbackToast: {
        position: 'absolute',
        bottom: 100,
        left: spacing.lg,
        right: spacing.lg,
        backgroundColor: colors.textPrimary,
        borderRadius: radius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
    },
    feedbackText: {
        ...typography.buttonSmall,
        color: colors.surface,
    },
});
