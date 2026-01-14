import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '../../contexts/user-context';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import MealDetail from '../../components/cookbook/meal-detail';
import { fetchMenuBundle } from '../../utils/menu-storage';
import { MenuDecision, MenuMealType, MenuRecipe, MenuRecipeCourse, MenuRecipesResponse } from '../../types/menu-recipes';

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

const buildMenuRecipesKey = (mealType: MenuMealType) => `${MENU_RECIPES_STORAGE_KEY}:${mealType}`;
const MENU_CACHE_STORAGE_KEY = '@smart_meal_planner:menu_cache';

type MenuCache = {
    menu: MenuDecision;
    recipes: MenuRecipesResponse;
    cachedAt: string;
};

const buildMenuCacheKey = (date: string, mealType: MenuMealType) =>
    `${MENU_CACHE_STORAGE_KEY}:${date}:${mealType}`;

const resolveDate = (value: string | string[] | undefined) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    return new Date().toISOString().split('T')[0];
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
    const [recipe, setRecipe] = useState<MenuRecipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userState.isLoading) {
            return;
        }

        let isMounted = true;

        const loadRecipe = async () => {
            setLoading(true);
            setError(null);

            try {
                const courseKey = normalizeCourse(course);
                if (!courseKey) {
                    throw new Error('Tarif bulunamadı');
                }

                const userId = userState.user?.uid ?? 'anonymous';
                const resolvedDate = resolveDate(date);
                const resolvedMealType = resolveMealType(mealType);
                const resolvedRecipeName = resolveRecipeName(recipeName);
                const normalizedRecipeName = resolvedRecipeName ? normalizeText(resolvedRecipeName) : null;

                const findRecipeMatch = (recipes: MenuRecipe[]) => {
                    if (normalizedRecipeName) {
                        const exactMatch = recipes.find(
                            (item) =>
                                item.course === courseKey && normalizeText(item.name) === normalizedRecipeName
                        );
                        if (exactMatch) {
                            return exactMatch;
                        }
                    }
                    return recipes.find((item) => item.course === courseKey) ?? null;
                };

                try {
                    const firestoreMenu = await fetchMenuBundle(userId, resolvedDate, resolvedMealType);
                    const match = firestoreMenu?.recipes?.recipes
                        ? findRecipeMatch(firestoreMenu.recipes.recipes)
                        : null;
                    if (match && isMounted) {
                        setRecipe(match);
                        await AsyncStorage.setItem(
                            buildMenuRecipesKey(resolvedMealType),
                            JSON.stringify(firestoreMenu.recipes)
                        );
                        return;
                    }
                } catch (firestoreError) {
                    console.warn('Cookbook Firestore read error:', firestoreError);
                }

                try {
                    const cachedMenuRaw = await AsyncStorage.getItem(
                        buildMenuCacheKey(resolvedDate, resolvedMealType)
                    );
                    if (cachedMenuRaw) {
                        const cachedMenu = JSON.parse(cachedMenuRaw) as MenuCache;
                        const match = cachedMenu?.recipes?.recipes
                            ? findRecipeMatch(cachedMenu.recipes.recipes)
                            : null;
                        if (match && isMounted) {
                            setRecipe(match);
                            return;
                        }
                    }
                } catch (cacheError) {
                    console.warn('Cookbook cache read error:', cacheError);
                }

                const raw =
                    (await AsyncStorage.getItem(buildMenuRecipesKey(resolvedMealType))) ??
                    (await AsyncStorage.getItem(MENU_RECIPES_STORAGE_KEY));
                if (!raw) {
                    throw new Error('Tarif bulunamadı');
                }

                const parsed = JSON.parse(raw) as MenuRecipesResponse;
                if (!parsed?.recipes?.length) {
                    throw new Error('Tarif bulunamadı');
                }

                const match = findRecipeMatch(parsed.recipes);
                if (!match) {
                    throw new Error('Tarif bulunamadı');
                }

                if (isMounted) {
                    setRecipe(match);
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
    }, [course, userState.isLoading, userState.user?.uid]);

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            {loading && (
                <View style={styles.stateContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.stateText}>Tarif hazırlanıyor...</Text>
                </View>
            )}

            {error && !loading && (
                <View style={styles.stateContainer}>
                    <Text style={styles.stateText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                        <Text style={styles.retryButtonText}>Geri Dön</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!loading && !error && recipe && (
                <MealDetail recipe={recipe} onBack={() => router.back()} onFavorite={() => { }} appName="Omnoo" />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    stateContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
        alignItems: 'center',
        gap: spacing.sm,
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
});
