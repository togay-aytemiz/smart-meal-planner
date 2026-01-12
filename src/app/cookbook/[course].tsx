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
import { MenuMealType, MenuRecipe, MenuRecipeCourse, MenuRecipesResponse } from '../../types/menu-recipes';

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

const buildMenuRecipesKey = (mealType: MenuMealType) => `${MENU_RECIPES_STORAGE_KEY}:${mealType}`;

export default function CookbookDetailScreen() {
    const router = useRouter();
    const { course, mealType } = useLocalSearchParams<{ course?: string; mealType?: string }>();
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
                const today = new Date().toISOString().split('T')[0];
                const resolvedMealType = resolveMealType(mealType);

                try {
                    const firestoreMenu = await fetchMenuBundle(userId, today, resolvedMealType);
                    const match = firestoreMenu?.recipes.recipes.find((item) => item.course === courseKey);
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

                const match = parsed.recipes.find((item) => item.course === courseKey);
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
