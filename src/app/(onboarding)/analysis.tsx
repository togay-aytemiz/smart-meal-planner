import { View, Text, StyleSheet, ScrollView, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
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

type MealRowData = {
    key: MenuMealType;
    time: string;
    title: string;
    desc: string;
    icon: IconName;
    isPlaceholder: boolean;
};

type FooterMeta = {
    icon: IconName;
    color: string;
    text: string;
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

const MEAL_META: Record<MenuMealType, { label: string; icon: IconName }> = {
    breakfast: { label: 'Sabah', icon: 'weather-sunset' },
    lunch: { label: 'Öğle', icon: 'weather-sunny' },
    dinner: { label: 'Akşam', icon: 'weather-night' },
};

const COURSE_PRIORITY: Record<MenuRecipeCourse, number> = {
    main: 0,
    pastry: 1,
    soup: 2,
    side: 3,
    salad: 4,
    meze: 5,
    dessert: 6,
};

const MEAL_ORDER: MenuMealType[] = ['breakfast', 'lunch', 'dinner'];
const DEFAULT_SAMPLE_DAY: WeekdayKey = 'tuesday';

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
    const preferredPlan = buildMealPlan(routines[DEFAULT_SAMPLE_DAY]);
    if (preferredPlan.breakfast || preferredPlan.lunch || preferredPlan.dinner) {
        return DEFAULT_SAMPLE_DAY;
    }

    for (const dayKey of Object.keys(routines) as WeekdayKey[]) {
        const plan = buildMealPlan(routines[dayKey]);
        if (plan.breakfast || plan.lunch || plan.dinner) {
            return dayKey;
        }
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

const resolvePrimaryRecipe = (recipes: MenuRecipe[] | null | undefined) => {
    if (!recipes?.length) {
        return null;
    }

    const sorted = [...recipes].sort(
        (first, second) => COURSE_PRIORITY[first.course] - COURSE_PRIORITY[second.course]
    );
    return sorted[0] ?? null;
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

    useEffect(() => {
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
                        const firestoreMenu = await fetchMenuBundle(userId, dateKey, request.mealType);
                        if (firestoreMenu) {
                            updateBundle(mealType, firestoreMenu);
                            loadedCount += 1;
                            continue;
                        }
                    } catch (firestoreError) {
                        console.warn('Menu Firestore read error:', firestoreError);
                    }

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
                    } catch (err: unknown) {
                        lastError = getFunctionsErrorMessage(err);
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
    }, [state.data, userState.isLoading, userState.user?.uid]);

    const userName = snapshot?.profile?.name || state.data.profile?.name || 'Size';
    const plannedMealCount = useMemo(() => {
        const plan = sampleDay?.mealPlan;
        if (!plan) {
            return 0;
        }
        return Number(plan.breakfast) + Number(plan.lunch) + Number(plan.dinner);
    }, [sampleDay]);

    const mealRows = useMemo(() => {
        const plan = sampleDay?.mealPlan ?? { breakfast: false, lunch: false, dinner: false };
        const rows: MealRowData[] = [];

        for (const mealType of MEAL_ORDER) {
            if (!plan[mealType]) {
                continue;
            }

            const meta = MEAL_META[mealType];
            const recipes = menuBundles[mealType]?.recipes?.recipes ?? [];
            const primary = resolvePrimaryRecipe(recipes);
            const isPlaceholder = !primary;

            const title = primary?.name
                ?? (loading
                    ? 'Menü hazırlanıyor'
                    : error
                        ? 'Bu öğün hazırlanamadı'
                        : 'Bu öğün yakında hazır');
            const desc = primary?.brief
                ?? (loading
                    ? 'Sana uygun tarifleri seçiyoruz.'
                    : error
                        ? 'Şu anda örnek gösterilemiyor.'
                        : 'Öneri hazırlanıyor.');

            rows.push({
                key: mealType,
                time: meta.label,
                title,
                desc,
                icon: meta.icon,
                isPlaceholder,
            });
        }

        return rows;
    }, [error, loading, menuBundles, sampleDay]);

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

    const footerMeta: FooterMeta = useMemo(() => {
        if (loading) {
            return {
                icon: 'clock-outline',
                color: colors.textMuted,
                text: 'Planın hazırlanıyor, birkaç saniye sürebilir.',
            };
        }

        if (error) {
            return {
                icon: 'alert-circle',
                color: colors.error,
                text: 'Plan şu anda hazırlanamadı. Yine de devam edebilirsin.',
            };
        }

        if (reasoningText) {
            return {
                icon: 'lightbulb-on-outline',
                color: colors.primary,
                text: reasoningText,
            };
        }

        const dietaryCount =
            snapshot?.dietary?.restrictions?.length
            ?? state.data.dietary?.restrictions?.length
            ?? 0;

        return {
            icon: 'check-circle',
            color: colors.success,
            text: dietaryCount > 0 ? 'Diyet tercihlerinize uygun' : 'Besin değerleri dengelendi',
        };
    }, [error, loading, reasoningText, snapshot, state.data.dietary?.restrictions?.length]);

    const handleContinue = () => {
        dispatch({ type: 'SET_STEP', payload: 12 });
        router.push('/(onboarding)/paywall');
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

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Örnek {sampleDay.label} Günü</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{loading ? 'Hazırlanıyor' : 'Mükemmel Uyum'}</Text>
                            </View>
                        </View>

                        {mealRows.length ? (
                            mealRows.map((meal, index) => (
                                <View key={meal.key}>
                                    <MealRow
                                        time={meal.time}
                                        title={meal.title}
                                        desc={meal.desc}
                                        icon={meal.icon}
                                        isPlaceholder={meal.isPlaceholder}
                                    />
                                    {index < mealRows.length - 1 ? <View style={styles.divider} /> : null}
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

                        <View style={styles.cardFooter}>
                            <MaterialCommunityIcons name={footerMeta.icon} size={16} color={footerMeta.color} />
                            <Text style={styles.footerText} numberOfLines={2}>
                                {footerMeta.text}
                            </Text>
                        </View>
                    </View>
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

function MealRow({
    time,
    title,
    desc,
    icon,
    isPlaceholder,
}: {
    time: string;
    title: string;
    desc: string;
    icon: IconName;
    isPlaceholder: boolean;
}) {
    return (
        <View style={styles.mealRow}>
            <View style={styles.mealIcon}>
                <MaterialCommunityIcons
                    name={icon}
                    size={20}
                    color={isPlaceholder ? colors.textMuted : colors.textSecondary}
                />
            </View>
            <View style={styles.mealContent}>
                <Text style={styles.mealTime}>{time}</Text>
                <Text
                    style={[styles.mealTitle, isPlaceholder && styles.mealTitlePlaceholder]}
                    numberOfLines={1}
                >
                    {title}
                </Text>
                <Text
                    style={[styles.mealDesc, isPlaceholder && styles.mealDescPlaceholder]}
                    numberOfLines={2}
                >
                    {desc}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 100,
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
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    cardTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    badge: {
        backgroundColor: colors.primaryLight + '30',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.full,
    },
    badgeText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
    },
    mealRow: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.xs,
    },
    mealIcon: {
        marginTop: 2,
    },
    mealContent: {
        flex: 1,
    },
    mealTime: {
        ...typography.caption,
        color: colors.textMuted,
        marginBottom: 2,
    },
    mealTitle: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    mealTitlePlaceholder: {
        color: colors.textSecondary,
    },
    mealDesc: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    mealDescPlaceholder: {
        color: colors.textMuted,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
        marginLeft: 32,
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
    cardFooter: {
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    footerText: {
        ...typography.caption,
        color: colors.textSecondary,
        flex: 1,
        lineHeight: 18,
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
