import { useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui';
import { useUser } from '../../contexts/user-context';
import { colors } from '../../theme/colors';
import { spacing, radius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { functions } from '../../config/firebase';
import { fetchMenuBundle } from '../../utils/menu-storage';
import { MenuDecision, MenuMealType, MenuRecipe, MenuRecipeCourse, MenuRecipesResponse } from '../../types/menu-recipes';

type MenuCallResponse = {
    success: boolean;
    menu: MenuDecision;
    model: string;
    timestamp: string;
};

type MenuRecipesCallResponse = {
    success: boolean;
    menuRecipes: MenuRecipesResponse;
    model: string;
    timestamp: string;
};

type RoutineDay = {
    type: 'office' | 'remote' | 'gym' | 'school' | 'off';
    gymTime?: 'morning' | 'afternoon' | 'evening' | 'none';
    remoteMeals?: Array<'breakfast' | 'lunch' | 'dinner'>;
    excludeFromPlan?: boolean;
};

type WeeklyRoutine = {
    monday: RoutineDay;
    tuesday: RoutineDay;
    wednesday: RoutineDay;
    thursday: RoutineDay;
    friday: RoutineDay;
    saturday: RoutineDay;
    sunday: RoutineDay;
};

type OnboardingSnapshot = {
    householdSize?: number;
    dietary?: {
        restrictions?: string[];
        allergies?: string[];
    };
    cuisine?: {
        selected?: string[];
    };
    cooking?: {
        timePreference?: 'quick' | 'balanced' | 'elaborate';
        skillLevel?: 'beginner' | 'intermediate' | 'expert';
        equipment?: string[];
    };
    routines?: WeeklyRoutine;
};

type MenuRequestPayload = {
    userId: string;
    date: string;
    dayOfWeek: string;
    dietaryRestrictions: string[];
    allergies: string[];
    cuisinePreferences: string[];
    timePreference: 'quick' | 'balanced' | 'elaborate';
    skillLevel: 'beginner' | 'intermediate' | 'expert';
    equipment: string[];
    householdSize: number;
    routine?: {
        type: 'office' | 'remote' | 'gym' | 'school' | 'off';
        gymTime?: 'morning' | 'afternoon' | 'evening' | 'none';
        officeMealToGo?: 'yes' | 'no';
        officeBreakfastAtHome?: 'yes' | 'no';
        schoolBreakfast?: 'yes' | 'no';
        remoteMeals?: Array<'breakfast' | 'lunch' | 'dinner'>;
        excludeFromPlan?: boolean;
    };
    mealType: MenuMealType;
};

type MenuRecipeParams = MenuRequestPayload & {
    menu: MenuDecision;
};

const STORAGE_KEY = '@smart_meal_planner:onboarding';
const MENU_RECIPES_STORAGE_KEY = '@smart_meal_planner:menu_recipes';
const MENU_CACHE_STORAGE_KEY = '@smart_meal_planner:menu_cache';

type FunctionsErrorDetails = {
    message?: string;
};

type FunctionsError = {
    code?: string;
    message?: string;
    details?: FunctionsErrorDetails | string;
};

const DEFAULT_ROUTINES: WeeklyRoutine = {
    monday: { type: 'office', gymTime: 'none' },
    tuesday: { type: 'office', gymTime: 'none' },
    wednesday: { type: 'office', gymTime: 'none' },
    thursday: { type: 'office', gymTime: 'none' },
    friday: { type: 'office', gymTime: 'none' },
    saturday: { type: 'remote', gymTime: 'none' },
    sunday: { type: 'remote', gymTime: 'none' },
};

const COURSE_ORDER: MenuRecipeCourse[] = ['soup', 'main', 'side', 'pastry', 'salad', 'meze', 'dessert'];

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const COURSE_META: Record<
    MenuRecipeCourse,
    { label: string; icon: IconName; background: string; accent: string; glow: string; textColor: string }
> = {
    main: {
        label: 'Ana Yemek',
        icon: 'silverware-fork-knife',
        background: colors.primaryLight,
        accent: colors.primaryDark,
        glow: colors.accentSoft,
        textColor: colors.textOnPrimary,
    },
    side: {
        label: 'Yan Yemek',
        icon: 'food-variant',
        background: colors.warningLight,
        accent: colors.warning,
        glow: colors.accentLight,
        textColor: colors.textOnPrimary,
    },
    soup: {
        label: 'Çorba',
        icon: 'pot-steam-outline',
        background: colors.accentSoft,
        accent: colors.accent,
        glow: colors.accentLight,
        textColor: colors.textOnPrimary,
    },
    salad: {
        label: 'Salata',
        icon: 'leaf',
        background: colors.successLight,
        accent: colors.success,
        glow: colors.surface,
        textColor: colors.textOnPrimary,
    },
    meze: {
        label: 'Meze',
        icon: 'food',
        background: colors.surfaceMuted,
        accent: colors.tabIconInactive,
        glow: colors.accentSoft,
        textColor: colors.textPrimary,
    },
    dessert: {
        label: 'Tatlı',
        icon: 'cupcake',
        background: colors.errorLight,
        accent: colors.error,
        glow: colors.surface,
        textColor: colors.textOnPrimary,
    },
    pastry: {
        label: 'Hamur İşi',
        icon: 'bread-slice-outline',
        background: colors.surfaceAlt,
        accent: colors.iconMuted,
        glow: colors.surfaceMuted,
        textColor: colors.textOnPrimary,
    },
};

const getDayKey = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklyRoutine;

const formatToday = () => {
    const today = new Date();
    const dayLabel = today.toLocaleDateString('tr-TR', { weekday: 'long' });
    const dateLabel = today.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    return { dayLabel, dateLabel };
};

const buildMenuRequest = (
    snapshot: OnboardingSnapshot | null,
    userId: string,
    mealType: MenuMealType
): MenuRequestPayload => {
    const today = new Date();
    const date = today.toISOString().split('T')[0];
    const dayKey = getDayKey(today);
    const routines = snapshot?.routines ?? DEFAULT_ROUTINES;
    const routine = routines?.[dayKey];

    return {
        userId,
        date,
        dayOfWeek: dayKey,
        dietaryRestrictions: snapshot?.dietary?.restrictions ?? [],
        allergies: snapshot?.dietary?.allergies ?? [],
        cuisinePreferences: snapshot?.cuisine?.selected ?? [],
        timePreference: snapshot?.cooking?.timePreference ?? 'balanced',
        skillLevel: snapshot?.cooking?.skillLevel ?? 'intermediate',
        equipment: snapshot?.cooking?.equipment ?? [],
        householdSize: snapshot?.householdSize ?? 1,
        routine: routine
            ? {
                type: routine.type,
                gymTime: routine.gymTime,
                officeMealToGo: routine.officeMealToGo,
                officeBreakfastAtHome: routine.officeBreakfastAtHome,
                schoolBreakfast: routine.schoolBreakfast,
                remoteMeals: routine.remoteMeals,
                excludeFromPlan: routine.excludeFromPlan,
            }
            : undefined,
        mealType,
    };
};

const getFunctionsErrorMessage = (error: unknown) => {
    if (error && typeof error === 'object') {
        const maybeError = error as FunctionsError;
        if (typeof maybeError.details === 'string') {
            return maybeError.details;
        }
        if (maybeError.details?.message) {
            return maybeError.details.message;
        }
        if (maybeError.message) {
            return maybeError.message;
        }
        if (maybeError.code) {
            return maybeError.code;
        }
    }
    return 'Bir hata oluştu';
};

type MenuCache = {
    menu: MenuDecision;
    recipes: MenuRecipesResponse;
    cachedAt: string;
};

const buildMenuCacheKey = (date: string, mealType: MenuMealType) => `${MENU_CACHE_STORAGE_KEY}:${date}:${mealType}`;
const buildMenuRecipesKey = (mealType: MenuMealType) => `${MENU_RECIPES_STORAGE_KEY}:${mealType}`;

const loadMenuCache = async (date: string, mealType: MenuMealType) => {
    try {
        const raw = await AsyncStorage.getItem(buildMenuCacheKey(date, mealType));
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as MenuCache;
    } catch (error) {
        console.warn('Menu cache read error:', error);
        return null;
    }
};

const persistMenuCache = async (date: string, mealType: MenuMealType, data: MenuCache) => {
    try {
        await AsyncStorage.setItem(buildMenuCacheKey(date, mealType), JSON.stringify(data));
        await AsyncStorage.setItem(buildMenuRecipesKey(mealType), JSON.stringify(data.recipes));
    } catch (error) {
        console.warn('Menu cache write error:', error);
    }
};

export default function CookbookScreen() {
    const router = useRouter();
    const { state: userState } = useUser();
    const [menuRecipes, setMenuRecipes] = useState<MenuRecipesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { dayLabel, dateLabel } = useMemo(() => formatToday(), []);

    const orderedRecipes = useMemo(() => {
        if (!menuRecipes?.recipes?.length) {
            return [] as MenuRecipe[];
        }
        return [...menuRecipes.recipes].sort(
            (a, b) => COURSE_ORDER.indexOf(a.course) - COURSE_ORDER.indexOf(b.course)
        );
    }, [menuRecipes]);

    const fetchRecipe = async () => {
        setLoading(true);
        setError(null);

        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const stored = raw ? (JSON.parse(raw) as { data?: OnboardingSnapshot }) : null;
            const userId = userState.user?.uid ?? 'anonymous';
            const mealType: MenuMealType = 'dinner';
            const request = buildMenuRequest(stored?.data ?? null, userId, mealType);
            const cachedMenu = await loadMenuCache(request.date, mealType);

            try {
                const firestoreMenu = await fetchMenuBundle(userId, request.date, request.mealType);
                if (firestoreMenu) {
                    setMenuRecipes(firestoreMenu.recipes);
                    await persistMenuCache(request.date, mealType, {
                        menu: firestoreMenu.menu,
                        recipes: firestoreMenu.recipes,
                        cachedAt: new Date().toISOString(),
                    });
                    return;
                }
            } catch (firestoreError) {
                console.warn('Menu Firestore read error:', firestoreError);
                if (cachedMenu) {
                    setMenuRecipes(cachedMenu.recipes);
                    return;
                }
            }

            const callMenu = functions.httpsCallable<{ request: MenuRequestPayload }, MenuCallResponse>(
                'generateOpenAIMenu'
            );
            const menuResult = await callMenu({ request });
            const menuData = menuResult.data?.menu;

            if (!menuData?.items?.length) {
                throw new Error('Menü verisi alınamadı');
            }

            const recipeParams: MenuRecipeParams = {
                ...request,
                menu: menuData,
            };

            const callRecipes = functions.httpsCallable<{ params: MenuRecipeParams }, MenuRecipesCallResponse>(
                'generateOpenAIRecipe'
            );
            const recipesResult = await callRecipes({ params: recipeParams });
            const recipesData = recipesResult.data?.menuRecipes;

            if (!recipesData?.recipes?.length) {
                throw new Error('Tarif verisi alınamadı');
            }

            setMenuRecipes(recipesData);
            await persistMenuCache(request.date, mealType, {
                menu: menuData,
                recipes: recipesData,
                cachedAt: new Date().toISOString(),
            });
        } catch (err: unknown) {
            console.error('Menu fetch error:', err);
            const cachedMenu = await loadMenuCache(new Date().toISOString().split('T')[0], mealType);
            if (cachedMenu) {
                setMenuRecipes(cachedMenu.recipes);
                return;
            }
            setError(getFunctionsErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!userState.isLoading) {
            fetchRecipe();
        }
    }, [userState.isLoading, userState.user?.uid]);

    const handleOpenRecipe = (course: MenuRecipeCourse, recipeName: string) => {
        router.push({ pathname: '/cookbook/[course]', params: { course, recipeName } });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScreenHeader title="Tarifler" subtitle="Bugün için seçilen akşam menüsü" />

            <ScrollView contentContainerStyle={styles.contentContainer}>
                {loading && (
                    <View style={styles.stateCard}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.stateText}>Menü hazırlanıyor...</Text>
                    </View>
                )}

                {error && !loading && (
                    <View style={styles.stateCard}>
                        <Text style={styles.stateText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={fetchRecipe}>
                            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!loading && !error && menuRecipes && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Bugün</Text>
                            <Text style={styles.sectionSubtitle}>
                                {dayLabel} • {dateLabel}
                            </Text>
                        </View>

                        {orderedRecipes.map((recipe) => {
                            const meta = COURSE_META[recipe.course];

                            return (
                                <TouchableOpacity
                                    key={`${recipe.course}-${recipe.name}`}
                                    activeOpacity={0.85}
                                    onPress={() => handleOpenRecipe(recipe.course, recipe.name)}
                                >
                                    <View style={styles.recipeCard}>
                                        <View
                                            style={[
                                                styles.cardMedia,
                                                {
                                                    backgroundColor: meta.background,
                                                },
                                            ]}
                                        >
                                            <View style={styles.cardMetaRow}>
                                                <View style={styles.timeBadge}>
                                                    <MaterialCommunityIcons
                                                        name="clock-outline"
                                                        size={16}
                                                        color={colors.textSecondary}
                                                    />
                                                    <Text style={styles.timeBadgeText}>
                                                        {recipe.totalTimeMinutes} dk
                                                    </Text>
                                                </View>
                                                <View style={[styles.courseBadge, { backgroundColor: meta.accent }]}>
                                                    <MaterialCommunityIcons
                                                        name={meta.icon}
                                                        size={14}
                                                        color={meta.textColor}
                                                    />
                                                    <Text style={[styles.courseBadgeText, { color: meta.textColor }]}>
                                                        {meta.label}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={[styles.mediaGlow, { backgroundColor: meta.glow }]} />
                                            <View style={[styles.mediaOrb, { backgroundColor: meta.accent }]} />
                                        </View>
                                        <View style={styles.cardContent}>
                                            <Text style={styles.cardTitle}>{recipe.name}</Text>
                                            <Text style={styles.cardBrief} numberOfLines={2}>
                                                {recipe.brief}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    contentContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
    },
    sectionHeader: {
        gap: spacing.xs,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    sectionSubtitle: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    stateCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        gap: spacing.sm,
        ...shadows.sm,
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
    recipeCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        ...shadows.md,
    },
    cardMedia: {
        height: 170,
        padding: spacing.md,
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        zIndex: 1,
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    timeBadgeText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    courseBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    courseBadgeText: {
        ...typography.caption,
    },
    mediaGlow: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        top: -110,
        right: -80,
        opacity: 0.4,
    },
    mediaOrb: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        bottom: -40,
        left: -30,
        opacity: 0.25,
    },
    cardContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.xs,
    },
    cardTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    cardBrief: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
});
