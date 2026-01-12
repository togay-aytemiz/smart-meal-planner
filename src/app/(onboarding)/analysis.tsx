import { View, Text, StyleSheet, ScrollView, Animated, Image, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import firestore, { doc, getDoc } from '@react-native-firebase/firestore';
import { Button } from '../../components/ui';
import { functions } from '../../config/firebase';
import { useOnboarding, type RoutineDay, type WeeklyRoutine } from '../../contexts/onboarding-context';
import { useUser } from '../../contexts/user-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { fetchMenuBundle, type MenuBundle } from '../../utils/menu-storage';
import type { MenuDecision, MenuRecipe, MenuRecipeCourse, MenuRecipesResponse } from '../../types/menu-recipes';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type MenuMealType = MenuRecipesResponse['menuType'];
type WeekdayKey = keyof WeeklyRoutine;

type MealPlan = {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
};

type MealItem = {
    id: string;
    title: string;
    timeMinutes: number;
    calories: number;
    category: string;
    categoryIcon: IconName;
    icon: IconName;
    mediaTone: string;
    course: MenuRecipeCourse;
};

type OnboardingSnapshot = {
    profile?: {
        name?: string;
    };
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
    weeklyContext?: {
        reasoningHint?: string;
        seasonalityHint?: string;
    };
};

type MenuRecipeParams = MenuRequestPayload & {
    menu: MenuDecision;
};

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

type FunctionsErrorDetails = {
    message?: string;
};

type FunctionsError = {
    code?: string;
    message?: string;
    details?: FunctionsErrorDetails | string;
};

type SampleDay = {
    key: WeekdayKey;
    label: string;
    dateKey: string;
    mealPlan: MealPlan;
};

type MealSectionData = {
    id: MenuMealType;
    title: string;
    icon: IconName;
    tint: string;
    iconColor: string;
    items: MealItem[];
    emptyMessage: string;
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

const DAY_LABELS: Record<WeekdayKey, string> = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma',
    saturday: 'Cumartesi',
    sunday: 'Pazar',
};

const WEEKDAY_INDEX: Record<WeekdayKey, number> = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
};

const MEAL_META: Record<MenuMealType, { label: string; icon: IconName; tint: string; iconColor: string }> = {
    breakfast: { label: 'Kahvaltı', icon: 'coffee-outline', tint: colors.accentSoft, iconColor: colors.primaryDark },
    lunch: { label: 'Öğle', icon: 'weather-sunny', tint: colors.warningLight, iconColor: colors.warning },
    dinner: { label: 'Akşam', icon: 'silverware-fork-knife', tint: colors.surfaceMuted, iconColor: colors.textPrimary },
};

const COURSE_META: Record<MenuRecipeCourse, { label: string; icon: IconName; mediaTone: string }> = {
    main: {
        label: 'Ana Yemek',
        icon: 'silverware-fork-knife',
        mediaTone: colors.surfaceAlt,
    },
    side: {
        label: 'Yan Yemek',
        icon: 'pot-steam-outline',
        mediaTone: colors.borderLight,
    },
    soup: {
        label: 'Çorba',
        icon: 'pot-steam-outline',
        mediaTone: colors.accentSoft,
    },
    salad: {
        label: 'Salata',
        icon: 'leaf',
        mediaTone: colors.successLight,
    },
    meze: {
        label: 'Meze',
        icon: 'food',
        mediaTone: colors.surfaceMuted,
    },
    dessert: {
        label: 'Tatlı',
        icon: 'cupcake',
        mediaTone: colors.errorLight,
    },
    pastry: {
        label: 'Hamur İşi',
        icon: 'bread-slice-outline',
        mediaTone: colors.surfaceAlt,
    },
};

const COURSE_ORDER: MenuRecipeCourse[] = ['soup', 'main', 'side', 'pastry', 'salad', 'meze', 'dessert'];

const MEAL_ORDER: MenuMealType[] = ['breakfast', 'lunch', 'dinner'];
const DEFAULT_SAMPLE_DAY: WeekdayKey = 'tuesday';
const WEEKDAY_PRIORITY: WeekdayKey[] = ['tuesday', 'monday', 'wednesday', 'thursday', 'friday'];
const WEEKEND_PRIORITY: WeekdayKey[] = ['saturday', 'sunday'];
const WOW_REASONING_HINT =
    'Sana daha wow ve modern tabaklar seçtim; klasik ev yemeği ve sokak lezzeti kombinasyonlarından uzak durdum.';

const buildDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getNextWeekdayDate = (weekday: WeekdayKey) => {
    const today = new Date();
    const todayIndex = (today.getDay() + 6) % 7;
    const targetIndex = WEEKDAY_INDEX[weekday];
    const diff = (targetIndex - todayIndex + 7) % 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + diff);
    return nextDate;
};

const getMealCount = (plan: MealPlan) =>
    Number(plan.breakfast) + Number(plan.lunch) + Number(plan.dinner);

const buildMealPlan = (routine: RoutineDay | null | undefined): MealPlan => {
    if (!routine) {
        return { breakfast: false, lunch: false, dinner: true };
    }

    if (routine.excludeFromPlan) {
        return { breakfast: false, lunch: false, dinner: false };
    }

    if (routine.type === 'office') {
        return {
            breakfast: routine.officeBreakfastAtHome === 'yes',
            lunch: routine.officeMealToGo === 'yes',
            dinner: true,
        };
    }

    if (routine.type === 'remote') {
        if (routine.remoteMeals?.length) {
            return {
                breakfast: routine.remoteMeals.includes('breakfast'),
                lunch: routine.remoteMeals.includes('lunch'),
                dinner: routine.remoteMeals.includes('dinner'),
            };
        }
        return { breakfast: true, lunch: true, dinner: true };
    }

    if (routine.type === 'school') {
        return {
            breakfast: routine.schoolBreakfast === 'yes',
            lunch: false,
            dinner: true,
        };
    }

    if (routine.type === 'gym' || routine.type === 'off') {
        return { breakfast: true, lunch: true, dinner: true };
    }

    return { breakfast: false, lunch: false, dinner: true };
};

const pickSampleDayKey = (routines: WeeklyRoutine): WeekdayKey => {
    const pickByMinMeals = (days: WeekdayKey[], minMeals: number) => {
        for (const dayKey of days) {
            const plan = buildMealPlan(routines[dayKey]);
            if (getMealCount(plan) >= minMeals) {
                return dayKey;
            }
        }
        return null;
    };

    const pickByMaxMeals = (days: WeekdayKey[]) => {
        let bestDay: WeekdayKey | null = null;
        let bestCount = 0;

        for (const dayKey of days) {
            const plan = buildMealPlan(routines[dayKey]);
            const count = getMealCount(plan);
            if (count > bestCount) {
                bestDay = dayKey;
                bestCount = count;
            }
        }

        return bestCount > 0 ? bestDay : null;
    };

    const weekdayChoice =
        pickByMinMeals(WEEKDAY_PRIORITY, 2)
        ?? pickByMaxMeals(WEEKDAY_PRIORITY);
    if (weekdayChoice) {
        return weekdayChoice;
    }

    const weekendChoice =
        pickByMinMeals(WEEKEND_PRIORITY, 2)
        ?? pickByMaxMeals(WEEKEND_PRIORITY);
    if (weekendChoice) {
        return weekendChoice;
    }

    return DEFAULT_SAMPLE_DAY;
};

const buildMenuRequest = (
    snapshot: OnboardingSnapshot | null,
    userId: string,
    date: string,
    dayKey: WeekdayKey,
    mealType: MenuMealType
): MenuRequestPayload => {
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
        weeklyContext: {
            reasoningHint: WOW_REASONING_HINT,
        },
    };
};

const getFunctionsErrorMessage = (error: unknown) => {
    if (error && typeof error === 'object') {
        const maybeError = error as FunctionsError;
        if (typeof maybeError.details === 'string') {
            return maybeError.details;
        }
        if (maybeError.details && typeof maybeError.details === 'object' && maybeError.details.message) {
            return maybeError.details.message;
        }
        if (maybeError.message) {
            return maybeError.message;
        }
    }
    return 'Bir hata oluştu.';
};

const buildMealItems = (recipes: MenuRecipe[]): MealItem[] => {
    return recipes
        .filter((recipe) => COURSE_META[recipe.course])
        .sort((first, second) => COURSE_ORDER.indexOf(first.course) - COURSE_ORDER.indexOf(second.course))
        .map((recipe) => {
            const courseMeta = COURSE_META[recipe.course];
            return {
                id: `${recipe.course}-${recipe.name}`,
                title: recipe.name,
                timeMinutes: Math.round(recipe.totalTimeMinutes ?? 0),
                calories: Math.round(recipe.macrosPerServing?.calories ?? 0),
                category: courseMeta.label,
                categoryIcon: courseMeta.icon,
                icon: courseMeta.icon,
                mediaTone: courseMeta.mediaTone,
                course: recipe.course,
            };
        });
};

const buildEmptyMessage = (isLoading: boolean, errorText: string | null) => {
    if (isLoading) {
        return 'Menü hazırlanıyor.';
    }
    if (errorText) {
        return 'Bu öğün hazırlanamadı.';
    }
    return 'Öneri hazırlanıyor.';
};

export default function AnalysisScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const { state: userState } = useUser();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    const [menuBundles, setMenuBundles] = useState<Record<MenuMealType, MenuBundle | null>>({
        breakfast: null,
        lunch: null,
        dinner: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snapshot, setSnapshot] = useState<OnboardingSnapshot | null>(null);
    const [sampleDay, setSampleDay] = useState<SampleDay>(() => {
        const date = getNextWeekdayDate(DEFAULT_SAMPLE_DAY);
        return {
            key: DEFAULT_SAMPLE_DAY,
            label: DAY_LABELS[DEFAULT_SAMPLE_DAY],
            dateKey: buildDateKey(date),
            mealPlan: buildMealPlan(DEFAULT_ROUTINES[DEFAULT_SAMPLE_DAY]),
        };
    });

    useEffect(() => {
        dispatch({ type: 'SET_STEP', payload: 11 });
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start();
    }, [dispatch, fadeAnim, slideAnim]);

    useFocusEffect(
        useCallback(() => {
            if (userState.isLoading) {
                return;
            }

            let isMounted = true;

            const loadOnboardingSnapshot = async (): Promise<OnboardingSnapshot | null> => {
                const fallback = (state.data ?? {}) as OnboardingSnapshot;
                const userId = userState.user?.uid;

                if (!userId) {
                    return fallback;
                }

                try {
                    const userDoc = await getDoc(doc(firestore(), 'Users', userId));
                    const data = userDoc.data();
                    const remoteSnapshot = data?.onboarding as OnboardingSnapshot | undefined;
                    return remoteSnapshot ?? fallback;
                } catch (readError) {
                    console.warn('Failed to load onboarding data:', readError);
                    return fallback;
                }
            };

            const fetchSampleMenu = async () => {
                setLoading(true);
                setError(null);
                if (isMounted) {
                    setMenuBundles({ breakfast: null, lunch: null, dinner: null });
                }

                try {
                    const resolvedSnapshot = await loadOnboardingSnapshot();
                    if (!isMounted) {
                        return;
                    }

                    setSnapshot(resolvedSnapshot);

                    const routines = resolvedSnapshot?.routines ?? DEFAULT_ROUTINES;
                    const dayKey = pickSampleDayKey(routines);
                    const planForDay = buildMealPlan(routines[dayKey]);
                    const dateKey = buildDateKey(getNextWeekdayDate(dayKey));

                    setSampleDay({
                        key: dayKey,
                        label: DAY_LABELS[dayKey],
                        dateKey,
                        mealPlan: planForDay,
                    });

                    const mealTypes = MEAL_ORDER.filter((mealType) => planForDay[mealType]);
                    if (!mealTypes.length) {
                        return;
                    }

                    const userId = userState.user?.uid ?? 'anonymous';
                    const callMenu = functions.httpsCallable<{ request: MenuRequestPayload }, MenuCallResponse>(
                        'generateOpenAIMenu'
                    );
                    const callRecipes = functions.httpsCallable<
                        { params: MenuRecipeParams },
                        MenuRecipesCallResponse
                    >('generateOpenAIRecipe');

                    let lastError: string | null = null;
                    let loadedCount = 0;

                    const updateBundle = (mealType: MenuMealType, bundle: MenuBundle) => {
                        if (!isMounted) {
                            return;
                        }
                        setMenuBundles((prev) => ({
                            ...prev,
                            [mealType]: bundle,
                        }));
                    };

                    for (const mealType of mealTypes) {
                        const request = buildMenuRequest(resolvedSnapshot, userId, dateKey, dayKey, mealType);

                        try {
                            const menuResult = await callMenu({ request });
                            const menuData = menuResult.data?.menu;

                            if (!menuData?.items?.length) {
                                throw new Error('Menü verisi alınamadı');
                            }

                            const recipeParams: MenuRecipeParams = {
                                ...request,
                                menu: menuData,
                            };

                            const recipesResult = await callRecipes({ params: recipeParams });
                            const recipesData = recipesResult.data?.menuRecipes;

                            if (!recipesData?.recipes?.length) {
                                throw new Error('Tarif verisi alınamadı');
                            }

                            updateBundle(mealType, {
                                menu: menuData,
                                recipes: recipesData,
                            });
                            loadedCount += 1;
                            continue;
                        } catch (err: unknown) {
                            lastError = getFunctionsErrorMessage(err);
                        }

                        try {
                            const firestoreMenu = await fetchMenuBundle(userId, dateKey, request.mealType);
                            if (firestoreMenu) {
                                updateBundle(mealType, firestoreMenu);
                                loadedCount += 1;
                            }
                        } catch (firestoreError) {
                            console.warn('Menu Firestore read error:', firestoreError);
                        }
                    }

                    if (lastError && loadedCount === 0 && isMounted) {
                        setError(lastError);
                    }
                } catch (err: unknown) {
                    console.error('Sample menu fetch error:', err);
                    if (isMounted) {
                        setError(getFunctionsErrorMessage(err));
                    }
                } finally {
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            };

            fetchSampleMenu();

            return () => {
                isMounted = false;
            };
        }, [state.data, userState.isLoading, userState.user?.uid])
    );

    const userName = snapshot?.profile?.name || state.data.profile?.name || 'Size';
    const plannedMealCount = useMemo(() => {
        const plan = sampleDay?.mealPlan;
        return plan ? getMealCount(plan) : 0;
    }, [sampleDay]);

    const mealSections = useMemo(() => {
        const plan = sampleDay?.mealPlan ?? { breakfast: false, lunch: false, dinner: false };
        const sections: MealSectionData[] = [];

        for (const mealType of MEAL_ORDER) {
            if (!plan[mealType]) {
                continue;
            }

            const meta = MEAL_META[mealType];
            const items = buildMealItems(menuBundles[mealType]?.recipes?.recipes ?? []);
            sections.push({
                id: mealType,
                title: meta.label,
                icon: meta.icon,
                tint: meta.tint,
                iconColor: meta.iconColor,
                items,
                emptyMessage: buildEmptyMessage(loading, error),
            });
        }

        return sections;
    }, [error, loading, menuBundles, sampleDay]);
    const mealCount = mealSections.length;

    const reasoningText = useMemo(() => {
        const order: MenuMealType[] = ['dinner', 'lunch', 'breakfast'];
        for (const mealType of order) {
            const text = menuBundles[mealType]?.menu.reasoning?.trim();
            if (text) {
                return text;
            }
        }
        return '';
    }, [menuBundles]);

    const showReasoning = !error && reasoningText.length > 0;

    const handleContinue = () => {
        dispatch({ type: 'SET_STEP', payload: 12 });
        router.push('/(onboarding)/paywall');
    };

    const handleOpenMeal = (mealType: MenuMealType, course: MenuRecipeCourse) => {
        const fallbackDate = new Date().toISOString().split('T')[0];
        const date = sampleDay?.dateKey ?? fallbackDate;
        router.push({ pathname: '/cookbook/[course]', params: { course, mealType, date } });
    };

    const subtitleText = plannedMealCount > 0
        ? `Alışkanlıklarınıza ve hedeflerinize göre oluşturduğumuz ${plannedMealCount} öğünlük örnek bir gün:`
        : 'Alışkanlıklarınıza ve hedeflerinize göre oluşturduğumuz örnek bir gün:';

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <View style={styles.header}>
                        <View style={styles.heroImageWrap}>
                            <Image
                                source={require('../../../assets/onboarding-samplemenu.png')}
                                style={styles.heroImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.title}>İşte {userName} özel planın!</Text>
                        <Text style={styles.subtitle}>{subtitleText}</Text>
                    </View>

                    <View style={styles.dayHeader}>
                        <Text style={styles.dayTitle}>Örnek {sampleDay.label} Günü</Text>
                        <View style={styles.mealCountPill}>
                            <Text style={styles.mealCountText}>{mealCount} öğün</Text>
                        </View>
                    </View>

                    {showReasoning ? (
                        <View style={styles.reasoningCard}>
                            <View style={styles.reasoningHeader}>
                                <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.primary} />
                                <Text style={styles.reasoningTitle}>Neden bu menü?</Text>
                            </View>
                            <Text style={styles.reasoningText}>{reasoningText}</Text>
                        </View>
                    ) : null}

                    {mealSections.length ? (
                        mealSections.map((section) => (
                            <View key={section.id} style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionIcon, { backgroundColor: section.tint }]}>
                                        <MaterialCommunityIcons
                                            name={section.icon}
                                            size={18}
                                            color={section.iconColor}
                                        />
                                    </View>
                                    <Text style={styles.sectionTitle}>{section.title}</Text>
                                </View>

                                <View style={styles.sectionCards}>
                                    {section.items.length ? (
                                        section.items.map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                activeOpacity={0.85}
                                                style={styles.mealCard}
                                                onPress={() => handleOpenMeal(section.id, item.course)}
                                            >
                                                <View style={[styles.mealMedia, { backgroundColor: item.mediaTone }]}>
                                                    <MaterialCommunityIcons
                                                        name={item.icon}
                                                        size={24}
                                                        color={colors.textPrimary}
                                                    />
                                                </View>
                                                <View style={styles.mealContent}>
                                                    <View style={styles.mealMetaRow}>
                                                        <View style={styles.metaItem}>
                                                            <MaterialCommunityIcons
                                                                name={item.categoryIcon}
                                                                size={12}
                                                                color={colors.textMuted}
                                                            />
                                                            <Text style={styles.metaText}>{item.category}</Text>
                                                        </View>
                                                        <View style={styles.metaItem}>
                                                            <MaterialCommunityIcons
                                                                name="clock-outline"
                                                                size={12}
                                                                color={colors.textMuted}
                                                            />
                                                            <Text style={styles.metaText}>{item.timeMinutes} dk</Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.mealTitle} numberOfLines={1}>
                                                        {item.title}
                                                    </Text>
                                                    <View style={styles.mealFooterRow}>
                                                        <View style={styles.calorieRow}>
                                                            <MaterialCommunityIcons
                                                                name="fire"
                                                                size={12}
                                                                color={colors.accent}
                                                            />
                                                            <Text style={styles.calorieText}>
                                                                {item.calories} kcal
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <MaterialCommunityIcons
                                                    name="chevron-right"
                                                    size={18}
                                                    color={colors.iconMuted}
                                                    style={styles.chevron}
                                                />
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <View style={styles.emptyMealCard}>
                                            <MaterialCommunityIcons
                                                name="calendar-blank-outline"
                                                size={16}
                                                color={colors.textMuted}
                                            />
                                            <Text style={styles.emptyMealText}>{section.emptyMessage}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons
                                name="calendar-blank-outline"
                                size={18}
                                color={colors.textMuted}
                            />
                            <Text style={styles.emptyText}>Bu gün için öğün planlanmadı.</Text>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Tam Planı Göster"
                    onPress={handleContinue}
                    fullWidth
                    size="large"
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 120,
        gap: spacing.md,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        marginTop: spacing.sm,
    },
    heroImageWrap: {
        marginBottom: 0,
    },
    heroImage: {
        width: 140,
        height: 140,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: -spacing.md,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    dayTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    mealCountPill: {
        backgroundColor: colors.surface,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    mealCountText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    reasoningCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        gap: spacing.sm,
        ...shadows.sm,
    },
    reasoningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    reasoningTitle: {
        ...typography.label,
        color: colors.textPrimary,
    },
    reasoningText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    section: {
        gap: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    sectionCards: {
        gap: spacing.md,
    },
    mealCard: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        minHeight: 80,
        ...shadows.md,
    },
    mealMedia: {
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    mealContent: {
        flex: 1,
        paddingVertical: spacing.sm + 4,
        paddingHorizontal: spacing.sm + 4,
        gap: spacing.xs,
        justifyContent: 'center',
    },
    mealMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    metaText: {
        ...typography.caption,
        fontSize: 11,
        lineHeight: 14,
        color: colors.textMuted,
    },
    mealTitle: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        color: colors.textPrimary,
    },
    mealFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    calorieRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    calorieText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    chevron: {
        alignSelf: 'center',
        marginLeft: spacing.sm,
        marginRight: spacing.sm + 4,
    },
    emptyMealCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.md,
        paddingVertical: spacing.sm + 4,
        paddingHorizontal: spacing.md,
    },
    emptyMealText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
    },
    emptyState: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    emptyText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        paddingTop: spacing.md,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
});
