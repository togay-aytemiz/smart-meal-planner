import { View, Text, StyleSheet, ScrollView, Animated, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, ReasoningBubble } from '../../components/ui';
import { useOnboarding, type RoutineDay, type WeeklyRoutine } from '../../contexts/onboarding-context';
import { useSampleMenu } from '../../contexts/sample-menu-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
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
    isLoading: boolean;
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
    dinner: { label: 'Bugünün menüsü', icon: 'silverware-fork-knife', tint: colors.surfaceMuted, iconColor: colors.textPrimary },
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

const CARD_GRADIENT_BASE64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAACVGAYAAADc5P5VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABVSURBVHgB7c6xDYAwDABBE2ZkFqZgL/ZmL2ZgJ0pCQ8VH+cv3yWfMzBfZ7/f7/f7+9X1/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3+/v38/p/d7f1Y5+xIAAAAASUVORK5CYII=';

const MEAL_ORDER: MenuMealType[] = ['dinner'];
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

const getMealCount = (plan: MealPlan) => Number(plan.dinner);

const buildMealPlan = (routine: RoutineDay | null | undefined): MealPlan => {
    if (!routine) {
        return { breakfast: false, lunch: false, dinner: true };
    }

    if (routine.excludeFromPlan) {
        return { breakfast: false, lunch: false, dinner: false };
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
        pickByMinMeals(WEEKDAY_PRIORITY, 1)
        ?? pickByMaxMeals(WEEKDAY_PRIORITY);
    if (weekdayChoice) {
        return weekdayChoice;
    }

    const weekendChoice =
        pickByMinMeals(WEEKEND_PRIORITY, 1)
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
        return 'Menü hazırlanamadı.';
    }
    return 'Menü hazırlanıyor.';
};

export default function AnalysisScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const {
        menuBundles,
        loadingStates,
        error,
        sampleDay: contextSampleDay,
        snapshot: contextSnapshot,
    } = useSampleMenu();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    // Fallback sample day if context hasn't loaded yet
    const sampleDay = contextSampleDay ?? {
        key: DEFAULT_SAMPLE_DAY as WeekdayKey,
        label: DAY_LABELS[DEFAULT_SAMPLE_DAY],
        dateKey: buildDateKey(getNextWeekdayDate(DEFAULT_SAMPLE_DAY)),
        mealPlan: buildMealPlan(DEFAULT_ROUTINES[DEFAULT_SAMPLE_DAY]),
    };

    useEffect(() => {
        dispatch({ type: 'SET_STEP', payload: 11 });
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start();
    }, [dispatch, fadeAnim, slideAnim]);

    const userName = contextSnapshot?.profile?.name || state.data.profile?.name || 'Size';
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
            const isLoading = loadingStates[mealType];
            sections.push({
                id: mealType,
                title: meta.label,
                icon: meta.icon,
                tint: meta.tint,
                iconColor: meta.iconColor,
                items,
                emptyMessage: isLoading ? '' : (error ? 'Menü hazırlanamadı.' : 'Menü hazırlanıyor.'),
                isLoading,
            });
        }

        return sections;
    }, [error, loadingStates, menuBundles, sampleDay]);

    const [displayedText, setDisplayedText] = useState('');
    const [messageIndex, setMessageIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    const LOADING_REASONING_MESSAGES = useMemo(() => [
        'Haftalık rutinini inceliyorum...',
        'Akşam menüsü için öncelikleri netleştiriyorum...',
        'Hazırlık süresini optimize ediyorum...',
        'Mevsime uygun malzemeleri seçiyorum...',
        'Lezzet dengesini kuruyorum...',
        'Son dokunuşları yapıyorum...',
    ], []);

    useEffect(() => {
        const allLoaded = !loadingStates.breakfast && !loadingStates.lunch && !loadingStates.dinner;
        if (allLoaded) return;

        const currentMessage = LOADING_REASONING_MESSAGES[messageIndex];
        const typeSpeed = isDeleting ? 30 : 50;

        const timer = setTimeout(() => {
            if (!isDeleting && displayedText === currentMessage) {
                // Determine wait time based on whether it's the full message or just a pause
                setTimeout(() => setIsDeleting(true), 1500);
            } else if (isDeleting && displayedText === '') {
                setIsDeleting(false);
                setMessageIndex((prev) => (prev + 1) % LOADING_REASONING_MESSAGES.length);
            } else {
                setDisplayedText(
                    currentMessage.substring(0, displayedText.length + (isDeleting ? -1 : 1))
                );
            }
        }, typeSpeed);

        return () => clearTimeout(timer);
    }, [displayedText, isDeleting, messageIndex, loadingStates, LOADING_REASONING_MESSAGES]);

    const reasoningText = useMemo(() => {
        const allLoaded = !loadingStates.breakfast && !loadingStates.lunch && !loadingStates.dinner;

        if (!allLoaded) {
            return displayedText;
        }

        const order: MenuMealType[] = ['dinner'];
        for (const mealType of order) {
            const text = menuBundles[mealType]?.menu?.reasoning?.trim();
            if (text) {
                return text;
            }
        }
        return '';
    }, [menuBundles, loadingStates, displayedText]);

    const showReasoning = !error;

    const handleContinue = () => {
        dispatch({ type: 'SET_STEP', payload: 12 });
        router.push('/(onboarding)/paywall');
    };

    const handleOpenMeal = (mealType: MenuMealType, course: MenuRecipeCourse, recipeName: string) => {
        const fallbackDate = new Date().toISOString().split('T')[0];
        const date = sampleDay?.dateKey ?? fallbackDate;
        router.push({
            pathname: '/cookbook/[course]',
            params: { course, mealType, date, recipeName },
        });
    };

    const subtitleText = plannedMealCount > 0
        ? 'Alışkanlıklarınıza ve hedeflerinize göre oluşturduğumuz örnek bir akşam menüsü:'
        : 'Alışkanlıklarınıza ve hedeflerinize göre oluşturduğumuz örnek bir gün menüsü:';

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
                    </View>

                    {showReasoning ? (
                        <ReasoningBubble text={reasoningText} />
                    ) : null}

                {mealSections.length ? (
                    mealSections.map((section, index) => (
                            <View key={section.id} style={[styles.section, index > 0 && { marginTop: spacing.lg }]}>
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
                                                        {item.title.charAt(0).toUpperCase() + item.title.slice(1)}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <View style={styles.emptyMealCard}>
                                            {section.isLoading ? (
                                                <ActivityIndicator size="small" color={colors.textMuted} />
                                            ) : (
                                                <MaterialCommunityIcons
                                                    name="calendar-blank-outline"
                                                    size={16}
                                                    color={colors.textMuted}
                                                />
                                            )}
                                            <Text style={styles.emptyMealText}>
                                                {section.isLoading ? 'Menü hazırlanıyor...' : section.emptyMessage}
                                            </Text>
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
                            <Text style={styles.emptyText}>Bu gün için menü planlanmadı.</Text>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Haftalık Planı Göster"
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
