import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore, { doc, getDoc } from '@react-native-firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { TabScreenHeader, ReasoningBubble } from '../../components/ui';
import { functions } from '../../config/firebase';
import { useUser } from '../../contexts/user-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows, hitSlop } from '../../theme/spacing';
import { formatLongDateTr, getGreeting } from '../../utils/dates';
import { fetchMenuBundle, type MenuBundle } from '../../utils/menu-storage';
import { buildOnboardingHash, type OnboardingSnapshot } from '../../utils/onboarding-hash';
import type { MenuDecision, MenuRecipe, MenuRecipeCourse, MenuRecipesResponse } from '../../types/menu-recipes';
import type { RoutineDay, WeeklyRoutine } from '../../contexts/onboarding-context';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type CalendarDay = {
    key: string;
    label: string;
    dayNumber: number;
    date: Date;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
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

type MealSectionKey = 'breakfast' | 'lunch' | 'dinner';
type MenuMealType = MenuRecipesResponse['menuType'];

type MealSection = {
    id: MealSectionKey;
    title: string;
    icon: IconName;
    tint: string;
    iconColor: string;
    items: MealItem[];
    emptyMessage?: string;
};

type MealPlan = {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
};

type WeeklyMenuRequest = {
    userId: string;
    weekStart?: string;
    onboarding?: OnboardingSnapshot;
    onboardingHash?: string;
    repeatMode?: 'consecutive' | 'spaced';
    existingPantry?: string[];
    avoidIngredients?: string[];
    maxPrepTime?: number;
    maxCookTime?: number;
    generateImage?: boolean;
};

type WeeklyMenuResponse = {
    success: boolean;
    weekStart: string;
    totalMenus: number;
    uniqueMenus: number;
    recipesCreated: number;
    model?: string;
    timestamp: string;
};

type WeeklyMenuCache = {
    weekStart: string;
    generatedAt: string;
    onboardingHash?: string;
};

type FunctionsErrorDetails = {
    message?: string;
};

type FunctionsError = {
    code?: string;
    message?: string;
    details?: FunctionsErrorDetails | string;
};

const STORAGE_KEY = '@smart_meal_planner:onboarding';
const MENU_RECIPES_STORAGE_KEY = '@smart_meal_planner:menu_recipes';
const MENU_CACHE_STORAGE_KEY = '@smart_meal_planner:menu_cache';
const WEEKLY_MENU_CACHE_KEY = '@smart_meal_planner:weekly_menu_generation';

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

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

const CARD_GRADIENT_BASE64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAACVGAYAAADc5P5VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABVSURBVHgB7c6xDYAwDABBE2ZkFqZgL/ZmL2ZgJ0pCQ8VH+cv3yWfMzBfZ7/f7/f7+9X1/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3+/v38/p/d7f1Y5+xIAAAAASUVORK5CYII=';

const SECTION_META: Record<MealSectionKey, { title: string; icon: IconName; tint: string; iconColor: string }> = {
    breakfast: {
        title: 'Kahvaltı',
        icon: 'coffee-outline',
        tint: colors.accentSoft,
        iconColor: colors.primaryDark,
    },
    lunch: {
        title: 'Öğle',
        icon: 'weather-sunny',
        tint: colors.warningLight,
        iconColor: colors.warning,
    },
    dinner: {
        title: 'Akşam',
        icon: 'silverware-fork-knife',
        tint: colors.surfaceMuted,
        iconColor: colors.textPrimary,
    },
};

const buildDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const resolveWeekStartKey = (date: Date) => {
    const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayIndex = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - dayIndex);
    return buildDateKey(weekStart);
};

const buildWeekDays = (baseDate: Date): CalendarDay[] => {
    const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    const dayOfWeekIndex = (today.getDay() + 6) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeekIndex);

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        const isToday = date.getTime() === today.getTime();
        const isPast = date.getTime() < today.getTime();
        const isFuture = date.getTime() > today.getTime();

        return {
            key: buildDateKey(date),
            label: DAY_LABELS[index],
            dayNumber: date.getDate(),
            date,
            isToday,
            isPast,
            isFuture,
        };
    });
};

const getDayKey = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklyRoutine;

type MenuCache = {
    menu: MenuDecision;
    recipes: MenuRecipesResponse;
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

const buildMenuRecipesKey = (userId: string, mealType: MenuMealType) =>
    `${MENU_RECIPES_STORAGE_KEY}:${userId}:${mealType}`;

const buildWeeklyCacheKey = (userId: string) => `${WEEKLY_MENU_CACHE_KEY}:${userId}`;

const loadWeeklyMenuCache = async (userId: string, expectedOnboardingHash?: string | null) => {
    try {
        const raw = await AsyncStorage.getItem(buildWeeklyCacheKey(userId));
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as WeeklyMenuCache;
        if (typeof expectedOnboardingHash === 'string') {
            if (!parsed.onboardingHash || parsed.onboardingHash !== expectedOnboardingHash) {
                return null;
            }
        }
        return parsed;
    } catch (error) {
        console.warn('Weekly menu cache read error:', error);
        return null;
    }
};

const persistWeeklyMenuCache = async (userId: string, data: WeeklyMenuCache) => {
    try {
        await AsyncStorage.setItem(buildWeeklyCacheKey(userId), JSON.stringify(data));
    } catch (error) {
        console.warn('Weekly menu cache write error:', error);
    }
};

const loadMenuCache = async (
    userId: string,
    date: string,
    mealType: MenuMealType,
    expectedOnboardingHash?: string | null
) => {
    try {
        const raw = await AsyncStorage.getItem(buildMenuCacheKey(userId, date, mealType));
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as MenuCache;
        if (typeof expectedOnboardingHash === 'string') {
            if (!parsed.onboardingHash || parsed.onboardingHash !== expectedOnboardingHash) {
                return null;
            }
        }
        return parsed;
    } catch (error) {
        console.warn('Menu cache read error:', error);
        return null;
    }
};

const persistMenuCache = async (userId: string, date: string, mealType: MenuMealType, data: MenuCache) => {
    try {
        await AsyncStorage.setItem(buildMenuCacheKey(userId, date, mealType), JSON.stringify(data));
        const recipesCache: MenuRecipesCache = {
            data: data.recipes,
            cachedAt: data.cachedAt,
            onboardingHash: data.onboardingHash,
        };
        await AsyncStorage.setItem(buildMenuRecipesKey(userId, mealType), JSON.stringify(recipesCache));
    } catch (error) {
        console.warn('Menu cache write error:', error);
    }
};

const buildMealPlan = (routine: RoutineDay | null | undefined): MealPlan => {
    if (!routine) {
        return { breakfast: false, lunch: false, dinner: true };
    }

    if (routine.excludeFromPlan) {
        return { breakfast: false, lunch: false, dinner: false };
    }

    return { breakfast: false, lunch: false, dinner: true };
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
                timeMinutes: recipe.totalTimeMinutes,
                calories: Math.round(recipe.macrosPerServing?.calories ?? 0),
                category: courseMeta.label,
                categoryIcon: courseMeta.icon,
                icon: courseMeta.icon,
                mediaTone: courseMeta.mediaTone,
                course: recipe.course,
            };
        });
};

const buildEmptyMessage = (meal: MealSectionKey, isLoading: boolean, error?: string | null) => {
    if (error) {
        return 'Menü oluşturulamadı. Lütfen tekrar deneyin.';
    }

    if (isLoading) {
        return 'Menü hazırlanıyor.';
    }

    return 'Menü henüz hazırlanmadı.';
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

const ensureWeeklyMenu = async ({
    userId,
    weekStart,
    onboarding,
    onboardingHash,
    singleDay,
}: {
    userId: string;
    weekStart: string;
    onboarding: OnboardingSnapshot | null;
    onboardingHash?: string | null;
    singleDay?: string;
}): Promise<{ cache: WeeklyMenuCache | null; error: string | null }> => {
    // If requesting full week, check cache first
    if (!singleDay) {
        const cached = await loadWeeklyMenuCache(userId, onboardingHash);
        if (cached?.weekStart === weekStart) {
            return { cache: cached, error: null };
        }
    }

    try {
        const callWeeklyMenu = functions.httpsCallable<
            { request: WeeklyMenuRequest },
            WeeklyMenuResponse
        >('generateWeeklyMenu');
        const response = await callWeeklyMenu({
            request: {
                userId,
                weekStart,
                ...(singleDay ? { singleDay } : {}),
                ...(onboarding ? { onboarding } : {}),
                ...(typeof onboardingHash === 'string' ? { onboardingHash } : {}),
            },
        });
        const resolvedWeekStart = response.data?.weekStart ?? weekStart;

        // Only cache if we generated the full week
        if (!singleDay) {
            const cache: WeeklyMenuCache = {
                weekStart: resolvedWeekStart,
                generatedAt: new Date().toISOString(),
                ...(typeof onboardingHash === 'string' ? { onboardingHash } : {}),
            };
            await persistWeeklyMenuCache(userId, cache);
            return { cache, error: null };
        }

        return { cache: null, error: null };
    } catch (error) {
        console.warn('Weekly menu generation failed:', error);
        return { cache: null, error: getFunctionsErrorMessage(error) };
    }
};

// Generate remaining days in background (fire and forget)
const generateRemainingDaysInBackground = (
    userId: string,
    weekStart: string,
    onboarding: OnboardingSnapshot | null,
    onboardingHash: string | null,
    excludeDay: string
) => {
    // Fire and forget - don't await
    (async () => {
        try {
            const callWeeklyMenu = functions.httpsCallable<
                { request: WeeklyMenuRequest },
                WeeklyMenuResponse
            >('generateWeeklyMenu');
            await callWeeklyMenu({
                request: {
                    userId,
                    weekStart,
                    ...(onboarding ? { onboarding } : {}),
                    ...(typeof onboardingHash === 'string' ? { onboardingHash } : {}),
                },
            });
            // Cache the full week once complete
            await persistWeeklyMenuCache(userId, {
                weekStart,
                generatedAt: new Date().toISOString(),
                ...(typeof onboardingHash === 'string' ? { onboardingHash } : {}),
            });
            console.log('Background menu generation complete');
        } catch (error) {
            console.warn('Background menu generation failed:', error);
        }
    })();
};

export default function TodayScreen() {
    const router = useRouter();
    const { state: userState } = useUser();
    const now = new Date();
    const greeting = getGreeting(now);
    const weekDays = buildWeekDays(now);
    const todayKey = weekDays.find((day) => day.isToday)?.key ?? weekDays[0].key;
    const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
    const selectedDay = weekDays.find((day) => day.key === selectedDayKey) ?? weekDays[0];
    const selectedDayName = selectedDay.date.toLocaleDateString('tr-TR', { weekday: 'long' });
    const selectedDayLabel = selectedDay.isToday ? 'Bugün' : selectedDayName;
    const selectedDaySubtitle = selectedDay.isToday
        ? formatLongDateTr(selectedDay.date)
        : selectedDay.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    const [menuBundles, setMenuBundles] = useState<Record<MealSectionKey, MenuBundle | null>>({
        breakfast: null,
        lunch: null,
        dinner: null,
    });
    const [weeklyRoutine, setWeeklyRoutine] = useState<WeeklyRoutine>(DEFAULT_ROUTINES);
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigation = useNavigation();

    useEffect(() => {
        navigation.setOptions({
            tabBarStyle: {
                display: (loading && isInitialLoading) ? 'none' : undefined
            }
        });
    }, [loading, isInitialLoading, navigation]);

    const selectedRoutine = weeklyRoutine[getDayKey(selectedDay.date)];
    const isHoliday = Boolean(selectedRoutine?.type === 'off' || selectedRoutine?.excludeFromPlan);

    const mealPlan = useMemo(() => buildMealPlan(selectedRoutine), [selectedRoutine]);
    const menuTitle = selectedDay.isToday ? 'Bugünün menüsü' : 'Günün menüsü';
    const mealItemsByType = useMemo(() => {
        const buildItems = (mealType: MealSectionKey) => {
            const bundle = menuBundles[mealType];
            if (!bundle?.recipes?.recipes?.length) {
                return [] as MealItem[];
            }
            return buildMealItems(bundle.recipes.recipes);
        };

        return {
            breakfast: buildItems('breakfast'),
            lunch: buildItems('lunch'),
            dinner: buildItems('dinner'),
        };
    }, [menuBundles]);

    const mealSections = useMemo(() => {
        const sections: MealSection[] = [];

        if (mealPlan.breakfast) {
            const items = mealItemsByType.breakfast;
            sections.push({
                id: 'breakfast',
                ...SECTION_META.breakfast,
                items,
                emptyMessage: items.length ? undefined : buildEmptyMessage('breakfast', loading, error),
            });
        }

        if (mealPlan.lunch) {
            const items = mealItemsByType.lunch;
            sections.push({
                id: 'lunch',
                ...SECTION_META.lunch,
                items,
                emptyMessage: items.length ? undefined : buildEmptyMessage('lunch', loading, error),
            });
        }

        if (mealPlan.dinner) {
            const items = mealItemsByType.dinner;
            sections.push({
                id: 'dinner',
                ...SECTION_META.dinner,
                title: menuTitle,
                items,
                emptyMessage: items.length ? undefined : buildEmptyMessage('dinner', loading, error),
            });
        }

        return sections;
    }, [error, loading, mealItemsByType, mealPlan.breakfast, mealPlan.dinner, mealPlan.lunch, menuTitle]);

    const reasoningText = useMemo(() => {
        const order: MealSectionKey[] = ['dinner'];
        for (const mealType of order) {
            const text = menuBundles[mealType]?.menu.reasoning?.trim();
            if (text) {
                return text;
            }
        }
        return '';
    }, [menuBundles]);
    const showReasoning = !error && reasoningText.length > 0;

    useEffect(() => {
        if (userState.isLoading) {
            return;
        }

        let isMounted = true;

        const fetchMenu = async () => {
            setLoading(true);
            setError(null);
            try {
                const fallbackRaw = await AsyncStorage.getItem(STORAGE_KEY);
                const stored = fallbackRaw ? (JSON.parse(fallbackRaw) as { data?: OnboardingSnapshot }) : null;
                const fallbackSnapshot = stored?.data ?? null;
                const userId = userState.user?.uid ?? 'anonymous';

                let resolvedSnapshot = fallbackSnapshot;

                if (userId !== 'anonymous') {
                    try {
                        const userDoc = await getDoc(doc(firestore(), 'Users', userId));
                        const data = userDoc.data();
                        const remoteSnapshot = data?.onboarding as OnboardingSnapshot | undefined;
                        resolvedSnapshot = remoteSnapshot ?? fallbackSnapshot;
                    } catch (readError) {
                        console.warn('Failed to load onboarding data:', readError);
                    }
                }

                if (!isMounted) {
                    return;
                }

                const onboardingHash = buildOnboardingHash(resolvedSnapshot);

                setUserName(resolvedSnapshot?.profile?.name ?? '');
                setWeeklyRoutine(resolvedSnapshot?.routines ?? DEFAULT_ROUTINES);

                const activeDate = selectedDay.date;
                const dateKey = selectedDay.key;
                const dayKey = getDayKey(activeDate);
                const routines = resolvedSnapshot?.routines ?? DEFAULT_ROUTINES;
                const routineForDay = routines[dayKey];
                const planForDay = buildMealPlan(routineForDay);
                const mealTypes = (['breakfast', 'lunch', 'dinner'] as MealSectionKey[]).filter(
                    (mealType) => planForDay[mealType]
                );
                const weekStart = resolveWeekStartKey(activeDate);

                if (!mealTypes.length) {
                    if (isMounted) {
                        setMenuBundles({ breakfast: null, lunch: null, dinner: null });
                        setError(null);
                    }
                    return;
                }

                const cachedBundles: Record<MealSectionKey, MenuBundle | null> = {
                    breakfast: null,
                    lunch: null,
                    dinner: null,
                };

                for (const mealType of mealTypes) {
                    const cachedMenu = await loadMenuCache(userId, dateKey, mealType, onboardingHash);
                    if (cachedMenu) {
                        cachedBundles[mealType] = {
                            menu: cachedMenu.menu,
                            recipes: cachedMenu.recipes,
                        };
                    }
                }

                if (isMounted) {
                    setMenuBundles(cachedBundles);
                }

                const hasCachedMenu = mealTypes.some((mealType) => Boolean(cachedBundles[mealType]));

                const updateBundle = (mealType: MealSectionKey, bundle: MenuBundle) => {
                    if (!isMounted) {
                        return;
                    }
                    setMenuBundles((prev) => ({
                        ...prev,
                        [mealType]: bundle,
                    }));
                };

                const loadMenusFromFirestore = async () => {
                    let loadedCount = 0;
                    let lastError: string | null = null;

                    for (const mealType of mealTypes) {
                        try {
                            const firestoreMenu = await fetchMenuBundle(userId, dateKey, mealType, onboardingHash);
                            if (firestoreMenu) {
                                updateBundle(mealType, firestoreMenu);
                                await persistMenuCache(userId, dateKey, mealType, {
                                    menu: firestoreMenu.menu,
                                    recipes: firestoreMenu.recipes,
                                    cachedAt: new Date().toISOString(),
                                    onboardingHash: onboardingHash ?? undefined,
                                });
                                loadedCount += 1;
                            }
                        } catch (firestoreError) {
                            console.warn('Menu Firestore read error:', firestoreError);
                            if (!lastError) {
                                lastError = 'Menü yüklenemedi.';
                            }
                        }
                    }

                    return { loadedCount, lastError };
                };

                let { loadedCount, lastError } = await loadMenusFromFirestore();

                if (!hasCachedMenu && loadedCount === 0) {
                    const todayResult = await ensureWeeklyMenu({
                        userId,
                        weekStart,
                        onboarding: resolvedSnapshot,
                        onboardingHash,
                        singleDay: dateKey,
                    });

                    if (todayResult.error && isMounted) {
                        setError(todayResult.error);
                    } else {
                        const retry = await loadMenusFromFirestore();
                        loadedCount = retry.loadedCount;
                        lastError = retry.lastError;

                        // Start background generation for remaining days
                        generateRemainingDaysInBackground(
                            userId,
                            weekStart,
                            resolvedSnapshot,
                            onboardingHash,
                            dateKey
                        );
                    }
                }

                if (isMounted) {
                    if (!hasCachedMenu && loadedCount === 0 && lastError) {
                        setError(lastError);
                    } else {
                        setError(null);
                    }
                }
            } catch (err: unknown) {
                console.error('Menu fetch error:', err);
                if (isMounted) {
                    setError(getFunctionsErrorMessage(err));
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                    setIsInitialLoading((prev) => (prev ? false : prev));
                }
            }
        };

        fetchMenu();

        return () => {
            isMounted = false;
        };
    }, [selectedDayKey, userState.isLoading, userState.user?.uid]);

    const displayName = userName.trim() ? `${greeting} ${userName}` : greeting;

    const handleOpenMeal = (mealType: MealSectionKey, course: MenuRecipeCourse, recipeName: string) => {
        const date = selectedDay?.key ?? buildDateKey(new Date());
        router.push({
            pathname: '/cookbook/[course]',
            params: { course, mealType, date, recipeName },
        });
    };

    if (loading && isInitialLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Image
                        source={require('../../../assets/food-loader.gif')}
                        style={{ width: 200, height: 200 }}
                        resizeMode="contain"
                    />
                    <Text style={styles.loadingText}>Menü hazırlanıyor...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <TabScreenHeader title={displayName} />
            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

                <View style={styles.calendarRow}>
                    {weekDays.map((day) => {
                        const isSelected = day.key === selectedDayKey;
                        const isSelectedToday = isSelected && day.isToday;
                        const isSelectedOther = isSelected && !day.isToday;

                        return (
                            <View key={day.key} style={styles.daySlot}>
                                <TouchableOpacity
                                    style={[
                                        styles.dayCard,
                                        day.isPast && styles.dayCardPast,
                                        day.isFuture && styles.dayCardFuture,
                                        isSelectedToday && styles.dayCardSelectedToday,
                                        isSelectedOther && styles.dayCardSelectedOther,
                                    ]}
                                    onPress={() => setSelectedDayKey(day.key)}
                                    disabled={day.isPast}
                                    hitSlop={hitSlop}
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        style={[
                                            styles.dayLabel,
                                            isSelectedToday && styles.dayLabelToday,
                                            isSelectedOther && styles.dayLabelSelectedOther,
                                            day.isPast && styles.dayLabelPast,
                                        ]}
                                    >
                                        {day.label}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.dayNumber,
                                            isSelectedToday && styles.dayNumberToday,
                                            isSelectedOther && styles.dayNumberSelectedOther,
                                            day.isPast && styles.dayNumberPast,
                                        ]}
                                    >
                                        {day.dayNumber}
                                    </Text>
                                </TouchableOpacity>
                                <Text style={[styles.dayStatus, !day.isToday && styles.dayStatusHidden]}>Bugün</Text>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.dayHeader}>
                    <View>
                        <Text style={styles.dayTitle}>{selectedDayLabel}</Text>
                        <Text style={styles.daySubtitle}>{selectedDaySubtitle}</Text>
                    </View>
                </View>

                {isHoliday ? (
                    <View style={styles.holidayCard}>
                        <MaterialCommunityIcons name="calendar-star" size={18} color={colors.accent} />
                        <Text style={styles.holidayText}>Bu günü tatil olarak işaretledin.</Text>
                    </View>
                ) : null}

                {showReasoning ? (
                    <ReasoningBubble text={reasoningText} />
                ) : null}

                {mealSections.map((section) => (
                    <View key={section.id} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIcon, { backgroundColor: section.tint }]}>
                                <MaterialCommunityIcons name={section.icon} size={18} color={section.iconColor} />
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
                                        onPress={() => handleOpenMeal(section.id, item.course, item.title)}
                                    >
                                        <View style={[styles.mealHero, { backgroundColor: item.mediaTone }]} />
                                        <MaterialCommunityIcons
                                            name={item.icon}
                                            size={72}
                                            color={colors.textPrimary}
                                            style={styles.mealHeroIcon}
                                        />
                                        <Image
                                            source={{ uri: CARD_GRADIENT_BASE64 }}
                                            style={styles.mealGradient}
                                            resizeMode="stretch"
                                        />
                                        <View style={styles.mealChips}>
                                            <View style={styles.mealChip}>
                                                <MaterialCommunityIcons
                                                    name={item.categoryIcon}
                                                    size={12}
                                                    color={colors.textInverse}
                                                />
                                                <Text style={styles.mealChipText}>{item.category}</Text>
                                            </View>
                                            <View style={styles.mealChip}>
                                                <MaterialCommunityIcons
                                                    name="clock-outline"
                                                    size={12}
                                                    color={colors.textInverse}
                                                />
                                                <Text style={styles.mealChipText}>{item.timeMinutes} dk</Text>
                                            </View>
                                            <View style={styles.mealChip}>
                                                <MaterialCommunityIcons
                                                    name="fire"
                                                    size={12}
                                                    color={colors.textInverse}
                                                />
                                                <Text style={styles.mealChipText}>{item.calories} kcal</Text>
                                            </View>
                                        </View>
                                        <View style={styles.mealTitleRow}>
                                            <Text style={styles.mealTitle} numberOfLines={2}>
                                                {item.title}
                                            </Text>
                                        </View>
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
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        ...typography.h3,
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: spacing.md,
    },
    contentContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        gap: spacing.md,
    },
    calendarRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    daySlot: {
        flex: 1,
        alignItems: 'center',
        gap: spacing.xs,
    },
    dayCard: {
        width: '100%',
        minHeight: 72,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        gap: 2,
        ...shadows.sm,
    },
    dayCardPast: {
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.borderLight,
        opacity: 0.5,
    },
    dayCardFuture: {
        backgroundColor: colors.surface,
    },
    dayCardSelectedToday: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        shadowOpacity: 0.16,
        shadowRadius: 10,
        elevation: 4,
    },
    dayCardSelectedOther: {
        backgroundColor: colors.accentSoft,
        borderColor: colors.accentLight,
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
    },
    dayLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    dayLabelToday: {
        color: colors.textOnPrimary,
    },
    dayLabelSelectedOther: {
        color: colors.primaryDark,
    },
    dayLabelPast: {
        color: colors.textMuted,
    },
    dayNumber: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    dayNumberToday: {
        color: colors.textOnPrimary,
    },
    dayNumberSelectedOther: {
        color: colors.primaryDark,
    },
    dayNumberPast: {
        color: colors.textMuted,
    },
    dayStatus: {
        ...typography.caption,
        color: colors.textMuted,
        fontSize: 11,
        lineHeight: 14,
    },
    dayStatusHidden: {
        opacity: 0,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    holidayCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        ...shadows.sm,
    },
    holidayText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
    },
    dayTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    daySubtitle: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
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
        minHeight: 180,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    mealHero: {
        ...StyleSheet.absoluteFillObject,
    },
    mealHeroIcon: {
        position: 'absolute',
        right: spacing.lg,
        top: spacing.lg,
        opacity: 0.18,
    },
    mealGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 120,
        opacity: 0.8,
    },
    mealChips: {
        position: 'absolute',
        top: spacing.sm,
        left: spacing.sm,
        right: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    mealChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        borderRadius: radius.full,
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
    },
    mealChipText: {
        ...typography.caption,
        fontSize: 11,
        lineHeight: 14,
        color: colors.textInverse,
    },
    mealTitleRow: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
    },
    mealTitle: {
        ...typography.h3,
        color: colors.textInverse,
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
});
