import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui';
import { functions } from '../../config/firebase';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows, hitSlop } from '../../theme/spacing';
import { formatLongDateTr, getGreeting } from '../../utils/dates';
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
    context: string;
    contextIcon: IconName;
    icon: IconName;
    mediaTone: string;
    course: MenuRecipeCourse;
};

type MealSectionKey = 'breakfast' | 'lunch' | 'dinner';

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
    mealType: 'dinner';
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

type ContextMeta = {
    label: string;
    icon: IconName;
};

const STORAGE_KEY = '@smart_meal_planner:onboarding';
const MENU_RECIPES_STORAGE_KEY = '@smart_meal_planner:menu_recipes';

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

const COURSE_ORDER: MenuRecipeCourse[] = ['main', 'side', 'soup', 'salad', 'meze', 'dessert', 'pastry'];

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

const buildMenuRequest = (snapshot: OnboardingSnapshot | null): MenuRequestPayload => {
    const today = new Date();
    const date = today.toISOString().split('T')[0];
    const dayKey = getDayKey(today);
    const routines = snapshot?.routines ?? DEFAULT_ROUTINES;
    const routine = routines?.[dayKey];

    return {
        userId: 'anonymous',
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
        mealType: 'dinner',
    };
};

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

const getContextMeta = (routine: RoutineDay | null | undefined): ContextMeta => {
    if (!routine) {
        return { label: 'Günlük', icon: 'calendar-blank-outline' };
    }

    switch (routine.type) {
        case 'office':
            if (routine.officeMealToGo === 'yes') {
                return { label: 'Ofise Uygun', icon: 'briefcase-outline' };
            }
            return { label: 'Evde', icon: 'home-outline' };
        case 'remote':
            return { label: 'Evde', icon: 'home-outline' };
        case 'gym':
            return { label: 'High Protein', icon: 'dumbbell' };
        case 'school':
            return { label: 'Okul Günü', icon: 'school-outline' };
        case 'off':
            return { label: 'Aile', icon: 'account-group-outline' };
        default:
            return { label: 'Günlük', icon: 'calendar-blank-outline' };
    }
};

const buildDinnerItems = (recipes: MenuRecipe[], contextMeta: ContextMeta): MealItem[] => {
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
                context: contextMeta.label,
                contextIcon: contextMeta.icon,
                icon: courseMeta.icon,
                mediaTone: courseMeta.mediaTone,
                course: recipe.course,
            };
        });
};

const buildEmptyMessage = (meal: MealSectionKey, isSelectedToday: boolean, error?: string | null) => {
    if (!isSelectedToday) {
        return 'Bu gün için menü henüz hazırlanmadı.';
    }

    if (error) {
        return 'Menü oluşturulamadı. Lütfen tekrar deneyin.';
    }

    if (meal === 'dinner') {
        return 'Akşam menüsü hazırlanıyor.';
    }

    return 'Bu öğün için öneri yakında.';
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

export default function TodayScreen() {
    const router = useRouter();
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

    const [menuRecipes, setMenuRecipes] = useState<MenuRecipesResponse | null>(null);
    const [menuReasoning, setMenuReasoning] = useState('');
    const [weeklyRoutine, setWeeklyRoutine] = useState<WeeklyRoutine>(DEFAULT_ROUTINES);
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isSelectedToday = selectedDay.isToday;
    const selectedRoutine = weeklyRoutine[getDayKey(selectedDay.date)];

    const mealPlan = useMemo(() => buildMealPlan(selectedRoutine), [selectedRoutine]);
    const contextMeta = useMemo(() => getContextMeta(selectedRoutine), [selectedRoutine]);

    const dinnerItems = useMemo(() => {
        if (!isSelectedToday || !menuRecipes?.recipes?.length) {
            return [];
        }
        return buildDinnerItems(menuRecipes.recipes, contextMeta);
    }, [contextMeta, isSelectedToday, menuRecipes]);

    const mealSections = useMemo(() => {
        const sections: MealSection[] = [];

        if (mealPlan.breakfast) {
            sections.push({
                id: 'breakfast',
                ...SECTION_META.breakfast,
                items: [],
                emptyMessage: buildEmptyMessage('breakfast', isSelectedToday, error),
            });
        }

        if (mealPlan.lunch) {
            sections.push({
                id: 'lunch',
                ...SECTION_META.lunch,
                items: [],
                emptyMessage: buildEmptyMessage('lunch', isSelectedToday, error),
            });
        }

        if (mealPlan.dinner) {
            sections.push({
                id: 'dinner',
                ...SECTION_META.dinner,
                items: dinnerItems,
                emptyMessage: dinnerItems.length
                    ? undefined
                    : buildEmptyMessage('dinner', isSelectedToday, error),
            });
        }

        return sections;
    }, [dinnerItems, error, isSelectedToday, mealPlan.breakfast, mealPlan.dinner, mealPlan.lunch]);

    const mealCount = mealSections.length;

    const reasoningText = menuReasoning.trim();
    const showReasoning = isSelectedToday && !error && reasoningText.length > 0;

    useEffect(() => {
        let isMounted = true;

        const fetchMenu = async () => {
            setLoading(true);
            setError(null);
            if (isMounted) {
                setMenuRecipes(null);
                setMenuReasoning('');
            }

            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                const stored = raw ? (JSON.parse(raw) as { data?: OnboardingSnapshot }) : null;
                const snapshot = stored?.data ?? null;

                if (isMounted) {
                    setUserName(snapshot?.profile?.name ?? '');
                    setWeeklyRoutine(snapshot?.routines ?? DEFAULT_ROUTINES);
                }

                const request = buildMenuRequest(snapshot);

                const callMenu = functions.httpsCallable<{ request: MenuRequestPayload }, MenuCallResponse>(
                    'generateOpenAIMenu'
                );
                const menuResult = await callMenu({ request });
                const menuData = menuResult.data?.menu;

                if (!menuData?.items) {
                    throw new Error('Menü verisi alınamadı');
                }

                if (isMounted) {
                    setMenuReasoning(menuData.reasoning ?? '');
                }

                const recipeParams: MenuRecipeParams = {
                    ...request,
                    menu: menuData,
                };

                const callRecipes = functions.httpsCallable<
                    { params: MenuRecipeParams },
                    MenuRecipesCallResponse
                >('generateOpenAIRecipe');
                const recipesResult = await callRecipes({ params: recipeParams });
                const recipesData = recipesResult.data?.menuRecipes;

                if (!recipesData?.recipes?.length) {
                    throw new Error('Tarif verisi alınamadı');
                }

                await AsyncStorage.setItem(MENU_RECIPES_STORAGE_KEY, JSON.stringify(recipesData));

                if (isMounted) {
                    setMenuRecipes(recipesData);
                }
            } catch (err: unknown) {
                console.error('Menu fetch error:', err);
                if (isMounted) {
                    setError(getFunctionsErrorMessage(err));
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchMenu();

        return () => {
            isMounted = false;
        };
    }, []);

    const displayName = userName.trim() ? `${greeting} ${userName}` : greeting;

    const handleOpenMeal = (course: MenuRecipeCourse) => {
        router.push({ pathname: '/cookbook/[course]', params: { course } });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                <ScreenHeader title={displayName} size="compact" style={styles.header} />

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
                                        onPress={() => handleOpenMeal(item.course)}
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
                                                    <Text style={styles.calorieText}>{item.calories} kcal</Text>
                                                </View>
                                                <View style={styles.chipRow}>
                                                    <View style={styles.contextChip}>
                                                        <MaterialCommunityIcons
                                                            name={item.contextIcon}
                                                            size={12}
                                                            color={colors.textSecondary}
                                                        />
                                                        <Text style={styles.contextChipText}>{item.context}</Text>
                                                    </View>
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
    header: {
        paddingHorizontal: 0,
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
    reasoningCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
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
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    chipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    contextChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        gap: spacing.xs,
    },
    contextChipText: {
        ...typography.caption,
        fontSize: 11,
        lineHeight: 14,
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
});
