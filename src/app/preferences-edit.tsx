import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Image,
    LayoutAnimation,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore, { doc, getDoc, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, SelectableTag } from '../components/ui';
import { useUser } from '../contexts/user-context';
import { useLanguage } from '../contexts/language-context';
import type { HouseholdMember, RoutineDay, WeeklyRoutine } from '../contexts/onboarding-context';
import { colors } from '../theme/colors';
import { radius, spacing, shadows } from '../theme/spacing';
import { typography } from '../theme/typography';
import { buildOnboardingHash, type OnboardingSnapshot } from '../utils/onboarding-hash';
import {
    clearWeeklyRegenerationRequest,
    persistWeeklyRegenerationRequest,
    type PreferenceChange,
    type RoutineChange,
} from '../utils/week-regeneration';
import { loadPremiumStatus } from '../utils/premium-status';
import { requestRewardedAd } from '../utils/rewarded-ads';

const STORAGE_KEY = '@smart_meal_planner:onboarding';
const HEADER_HEIGHT = 56;
const FOOTER_HEIGHT = 96;

type OnboardingSnapshotWithMembers = OnboardingSnapshot & {
    members?: HouseholdMember[];
};

type OnboardingStoredState = {
    currentStep?: number;
    isCompleted?: boolean;
    data?: OnboardingSnapshotWithMembers;
};

type PreferenceChangeSummary = PreferenceChange & {
    detail?: string;
};

type DayKey = keyof WeeklyRoutine;

type RoutineOption = {
    key: RoutineDay['type'];
    labelKey: string;
    emoji: string;
};

type LabeledEmojiItem = {
    key: string;
    labelKey: string;
    emoji?: string;
    popular?: boolean;
};

const DAY_ORDER: DayKey[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
];

const DEFAULT_ROUTINES: WeeklyRoutine = {
    monday: { type: 'office', gymTime: 'none' },
    tuesday: { type: 'office', gymTime: 'none' },
    wednesday: { type: 'office', gymTime: 'none' },
    thursday: { type: 'office', gymTime: 'none' },
    friday: { type: 'office', gymTime: 'none' },
    saturday: { type: 'remote', gymTime: 'none' },
    sunday: { type: 'remote', gymTime: 'none' },
};

const ROUTINE_OPTIONS: RoutineOption[] = [
    { key: 'office', labelKey: 'preferences.routineTypes.office', emoji: '🏢' },
    { key: 'remote', labelKey: 'preferences.routineTypes.remote', emoji: '🏠' },
    { key: 'gym', labelKey: 'preferences.routineTypes.gym', emoji: '💪' },
    { key: 'school', labelKey: 'preferences.routineTypes.school', emoji: '📚' },
    { key: 'off', labelKey: 'preferences.routineTypes.off', emoji: '🌴' },
];

const DIETARY_RESTRICTIONS: LabeledEmojiItem[] = [
    { key: 'vegetarian', labelKey: 'preferences.dietary.vegetarian', emoji: '🥬' },
    { key: 'vegan', labelKey: 'preferences.dietary.vegan', emoji: '🌱' },
    { key: 'pescatarian', labelKey: 'preferences.dietary.pescatarian', emoji: '🐟' },
    { key: 'gluten-free', labelKey: 'preferences.dietary.glutenFree', emoji: '🌾' },
    { key: 'dairy-free', labelKey: 'preferences.dietary.dairyFree', emoji: '🥛' },
    { key: 'low-carb', labelKey: 'preferences.dietary.lowCarb', emoji: '🍞' },
    { key: 'keto', labelKey: 'preferences.dietary.keto', emoji: '🥑' },
    { key: 'high-protein', labelKey: 'preferences.dietary.highProtein', emoji: '💪' },
];

const COMMON_ALLERGIES: LabeledEmojiItem[] = [
    { key: 'nuts', labelKey: 'preferences.allergies.nuts', emoji: '🥜' },
    { key: 'shellfish', labelKey: 'preferences.allergies.shellfish', emoji: '🦐' },
    { key: 'eggs', labelKey: 'preferences.allergies.eggs', emoji: '🥚' },
    { key: 'soy', labelKey: 'preferences.allergies.soy', emoji: '🫘' },
    { key: 'wheat', labelKey: 'preferences.allergies.wheat', emoji: '🌾' },
    { key: 'fish', labelKey: 'preferences.allergies.fish', emoji: '🐠' },
    { key: 'sesame', labelKey: 'preferences.allergies.sesame', emoji: '🌰' },
];

const CUISINES: LabeledEmojiItem[] = [
    { key: 'turkish', labelKey: 'preferences.cuisines.turkish', emoji: '🇹🇷', popular: true },
    { key: 'mediterranean', labelKey: 'preferences.cuisines.mediterranean', emoji: '🫒', popular: true },
    { key: 'italian', labelKey: 'preferences.cuisines.italian', emoji: '🍝', popular: true },
    { key: 'asian', labelKey: 'preferences.cuisines.asian', emoji: '🍜', popular: true },
    { key: 'middle-eastern', labelKey: 'preferences.cuisines.middleEastern', emoji: '🧆', popular: false },
    { key: 'mexican', labelKey: 'preferences.cuisines.mexican', emoji: '🌮', popular: false },
    { key: 'indian', labelKey: 'preferences.cuisines.indian', emoji: '🍛', popular: false },
    { key: 'french', labelKey: 'preferences.cuisines.french', emoji: '🥐', popular: false },
    { key: 'japanese', labelKey: 'preferences.cuisines.japanese', emoji: '🍱', popular: false },
    { key: 'chinese', labelKey: 'preferences.cuisines.chinese', emoji: '🥡', popular: false },
    { key: 'thai', labelKey: 'preferences.cuisines.thai', emoji: '🍜', popular: false },
    { key: 'american', labelKey: 'preferences.cuisines.american', emoji: '🍔', popular: false },
];

const TIME_OPTIONS: Record<
    'quick' | 'balanced' | 'elaborate',
    { key: 'quick' | 'balanced' | 'elaborate'; labelKey: string; descriptionKey: string; emoji: string }
> = {
    quick: { key: 'quick', labelKey: 'preferences.timeOptions.quick.label', descriptionKey: 'preferences.timeOptions.quick.description', emoji: '⚡' },
    balanced: { key: 'balanced', labelKey: 'preferences.timeOptions.balanced.label', descriptionKey: 'preferences.timeOptions.balanced.description', emoji: '⏱️' },
    elaborate: { key: 'elaborate', labelKey: 'preferences.timeOptions.elaborate.label', descriptionKey: 'preferences.timeOptions.elaborate.description', emoji: '👨‍🍳' },
};

const SKILL_LEVELS: Record<
    'beginner' | 'intermediate' | 'expert',
    { key: 'beginner' | 'intermediate' | 'expert'; labelKey: string; descriptionKey: string; emoji: string }
> = {
    beginner: { key: 'beginner', labelKey: 'preferences.skillLevels.beginner.label', descriptionKey: 'preferences.skillLevels.beginner.description', emoji: '🌱' },
    intermediate: { key: 'intermediate', labelKey: 'preferences.skillLevels.intermediate.label', descriptionKey: 'preferences.skillLevels.intermediate.description', emoji: '🌿' },
    expert: { key: 'expert', labelKey: 'preferences.skillLevels.expert.label', descriptionKey: 'preferences.skillLevels.expert.description', emoji: '🌳' },
};

const EQUIPMENT: LabeledEmojiItem[] = [
    { key: 'oven', labelKey: 'preferences.equipment.oven', emoji: '🔥' },
    { key: 'blender', labelKey: 'preferences.equipment.blender', emoji: '🫙' },
    { key: 'airfryer', labelKey: 'preferences.equipment.airfryer', emoji: '🍟' },
    { key: 'pressure-cooker', labelKey: 'preferences.equipment.pressureCooker', emoji: '♨️' },
    { key: 'mixer', labelKey: 'preferences.equipment.mixer', emoji: '🥣' },
    { key: 'grill', labelKey: 'preferences.equipment.grill', emoji: '🥩' },
];

export default function PreferencesEditScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { state: userState } = useUser();
    const { t } = useLanguage();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [initialSnapshot, setInitialSnapshot] = useState<OnboardingSnapshot | null>(null);
    const [isRoutineModalVisible, setRoutineModalVisible] = useState(false);
    const [pendingSaveSnapshot, setPendingSaveSnapshot] = useState<OnboardingSnapshot | null>(null);
    const [pendingRegenerationChanges, setPendingRegenerationChanges] = useState<{
        preferenceChanges: PreferenceChangeSummary[];
        routineChanges: RoutineChange[];
    } | null>(null);
    const [saveIntent, setSaveIntent] = useState<'save' | 'regenerate' | null>(null);

    const [routines, setRoutines] = useState<WeeklyRoutine>(DEFAULT_ROUTINES);
    const [activeRoutineDay, setActiveRoutineDay] = useState<DayKey | null>(null);

    const [restrictions, setRestrictions] = useState<string[]>([]);
    const [allergies, setAllergies] = useState<string[]>([]);
    const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);

    const [timePreference, setTimePreference] = useState<'quick' | 'balanced' | 'elaborate'>('balanced');
    const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
    const [equipment, setEquipment] = useState<string[]>([]);

    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    useEffect(() => {
        if (userState.isLoading) {
            return;
        }

        let isMounted = true;

        const loadSnapshot = async () => {
            setIsLoading(true);
            try {
                const localRaw = await AsyncStorage.getItem(STORAGE_KEY);
                const localStored = localRaw ? (JSON.parse(localRaw) as OnboardingStoredState) : null;
                const localSnapshot = localStored?.data ?? null;
                const userId = userState.user?.uid ?? 'anonymous';

                let resolvedSnapshot = localSnapshot;

                if (userId !== 'anonymous') {
                    try {
                        const userSnap = await getDoc(doc(firestore(), 'Users', userId));
                        const remoteSnapshot = userSnap.data()?.onboarding as OnboardingSnapshot | undefined;
                        resolvedSnapshot = remoteSnapshot ?? localSnapshot;
                    } catch (error) {
                        console.warn('Failed to load onboarding snapshot for edit:', error);
                    }
                }

                const normalizedSnapshot = resolvedSnapshot ?? buildDefaultSnapshot(t('profile.defaultName'));

                if (!isMounted) {
                    return;
                }

                setInitialSnapshot(normalizedSnapshot);
                setRoutines(normalizeWeeklyRoutine(normalizedSnapshot.routines));
                setRestrictions(normalizedSnapshot.dietary?.restrictions ?? []);
                setAllergies(normalizedSnapshot.dietary?.allergies ?? []);
                setSelectedCuisines(normalizedSnapshot.cuisine?.selected ?? []);
                setTimePreference(normalizedSnapshot.cooking?.timePreference ?? 'balanced');
                setSkillLevel(normalizedSnapshot.cooking?.skillLevel ?? 'intermediate');
                setEquipment(normalizedSnapshot.cooking?.equipment ?? []);
            } catch (error) {
                console.warn('Failed to prepare onboarding edit state:', error);
                if (isMounted) {
                    const fallback = buildDefaultSnapshot(t('profile.defaultName'));
                    setInitialSnapshot(fallback);
                    setRoutines(fallback.routines ?? DEFAULT_ROUTINES);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadSnapshot();

        return () => {
            isMounted = false;
        };
    }, [t, userState.isLoading, userState.user?.uid]);

    const initialHash = useMemo(() => buildOnboardingHash(initialSnapshot), [initialSnapshot]);

    const currentSnapshot = useMemo<OnboardingSnapshot | null>(() => {
        if (!initialSnapshot) {
            return null;
        }

        const nextCooking = {
            timePreference,
            skillLevel,
            equipment,
        };

        return {
            ...initialSnapshot,
            dietary: {
                restrictions,
                allergies,
            },
            cuisine: {
                selected: selectedCuisines,
            },
            cooking: nextCooking,
            routines,
        };
    }, [
        allergies,
        equipment,
        initialSnapshot,
        restrictions,
        routines,
        selectedCuisines,
        skillLevel,
        timePreference,
    ]);

    const currentHash = useMemo(() => buildOnboardingHash(currentSnapshot), [currentSnapshot]);
    const isDirty = Boolean(initialHash && currentHash && initialHash !== currentHash);
    const routineChanges = useMemo<RoutineChange[]>(() => {
        if (!initialSnapshot) {
            return [];
        }
        return buildRoutineChanges(initialSnapshot.routines, routines, t);
    }, [initialSnapshot, routines, t]);
    const preferenceChangeSummaries = useMemo<PreferenceChangeSummary[]>(() => {
        if (!initialSnapshot) {
            return [];
        }

        const summaries: PreferenceChangeSummary[] = [];
        const initialRestrictions = initialSnapshot.dietary?.restrictions ?? [];
        const initialAllergies = initialSnapshot.dietary?.allergies ?? [];
        const initialCuisines = initialSnapshot.cuisine?.selected ?? [];
        const initialTimePreference = initialSnapshot.cooking?.timePreference ?? 'balanced';
        const initialSkillLevel = initialSnapshot.cooking?.skillLevel ?? 'intermediate';
        const initialEquipment = initialSnapshot.cooking?.equipment ?? [];

        if (!areStringListsEqual(initialRestrictions, restrictions)) {
            summaries.push({
                key: 'dietary-restrictions',
                label: t('preferences.summary.dietary'),
                detail: buildSelectionDetail(restrictions.length, t),
            });
        }

        if (!areStringListsEqual(initialAllergies, allergies)) {
            summaries.push({
                key: 'dietary-allergies',
                label: t('preferences.summary.allergies'),
                detail: buildSelectionDetail(allergies.length, t),
            });
        }

        if (!areStringListsEqual(initialCuisines, selectedCuisines)) {
            summaries.push({
                key: 'cuisine',
                label: t('preferences.summary.cuisine'),
                detail: buildSelectionDetail(selectedCuisines.length, t),
            });
        }

        if (initialTimePreference !== timePreference) {
            const timeLabel = TIME_OPTIONS[timePreference]
                ? t(TIME_OPTIONS[timePreference].labelKey)
                : t(TIME_OPTIONS.balanced.labelKey);
            summaries.push({
                key: 'cooking-time',
                label: t('preferences.summary.cookingTime'),
                detail: timeLabel,
            });
        }

        if (initialSkillLevel !== skillLevel) {
            const skillLabel = SKILL_LEVELS[skillLevel]
                ? t(SKILL_LEVELS[skillLevel].labelKey)
                : t(SKILL_LEVELS.intermediate.labelKey);
            summaries.push({
                key: 'cooking-skill',
                label: t('preferences.summary.cookingSkill'),
                detail: skillLabel,
            });
        }

        if (!areStringListsEqual(initialEquipment, equipment)) {
            summaries.push({
                key: 'cooking-equipment',
                label: t('preferences.summary.equipment'),
                detail: buildSelectionDetail(equipment.length, t),
            });
        }

        if (routineChanges.length > 0) {
            summaries.push({
                key: 'routines',
                label: t('preferences.summary.routines'),
                detail: t('preferences.routineChangesDetail', { count: routineChanges.length }),
            });
        }

        return summaries;
    }, [
        allergies,
        equipment,
        initialSnapshot,
        restrictions,
        routineChanges.length,
        selectedCuisines,
        skillLevel,
        t,
        timePreference,
    ]);
    const modalPreferenceChanges = pendingRegenerationChanges?.preferenceChanges ?? preferenceChangeSummaries;
    const modalRoutineChanges = pendingRegenerationChanges?.routineChanges ?? routineChanges;
    const userId = userState.user?.uid ?? 'anonymous';

    const navigateBack = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
            return;
        }
        router.replace('/(tabs)/profile');
    }, [router]);

    const confirmDiscardChanges = useCallback(() => {
        Alert.alert(
            t('preferences.discardTitle'),
            t('preferences.discardMessage'),
            [
                { text: t('preferences.discardCancel'), style: 'cancel' },
                {
                    text: t('preferences.discardConfirm'),
                    style: 'destructive',
                    onPress: navigateBack,
                },
            ]
        );
    }, [navigateBack, t]);

    const handleBack = () => {
        if (isRoutineModalVisible) {
            setRoutineModalVisible(false);
            setPendingSaveSnapshot(null);
            setPendingRegenerationChanges(null);
            return;
        }
        if (!isDirty || isSaving) {
            navigateBack();
            return;
        }
        confirmDiscardChanges();
    };

    useFocusEffect(
        useCallback(() => {
            const onHardwareBack = () => {
                if (isRoutineModalVisible) {
                    setRoutineModalVisible(false);
                    setPendingSaveSnapshot(null);
                    setPendingRegenerationChanges(null);
                    return true;
                }
                if (!isDirty || isSaving) {
                    return false;
                }
                confirmDiscardChanges();
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
            return () => {
                subscription.remove();
            };
        }, [confirmDiscardChanges, isDirty, isRoutineModalVisible, isSaving])
    );

    const handleToggleRoutineDay = (dayKey: DayKey) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveRoutineDay((prev) => (prev === dayKey ? null : dayKey));
    };

    const handleUpdateRoutineType = (dayKey: DayKey, type: RoutineDay['type']) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setRoutines((prev) => {
            const currentDay = prev[dayKey];
            const nextDay: RoutineDay = {
                ...currentDay,
                type,
            };
            if (type === 'gym' && !nextDay.gymTime) {
                nextDay.gymTime = 'none';
            }
            nextDay.excludeFromPlan = type === 'off';
            return {
                ...prev,
                [dayKey]: nextDay,
            };
        });
    };

    const toggleRestriction = (key: string) => {
        setRestrictions((prev) =>
            prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
        );
    };

    const toggleAllergy = (key: string) => {
        setAllergies((prev) =>
            prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
        );
    };

    const toggleCuisine = (key: string) => {
        setSelectedCuisines((prev) =>
            prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
        );
    };

    const toggleEquipment = (key: string) => {
        setEquipment((prev) =>
            prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
        );
    };

    const applyDiscardChanges = () => {
        if (!initialSnapshot) {
            return;
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setRoutines(normalizeWeeklyRoutine(initialSnapshot.routines));
        setRestrictions(initialSnapshot.dietary?.restrictions ?? []);
        setAllergies(initialSnapshot.dietary?.allergies ?? []);
        setSelectedCuisines(initialSnapshot.cuisine?.selected ?? []);
        setTimePreference(initialSnapshot.cooking?.timePreference ?? 'balanced');
        setSkillLevel(initialSnapshot.cooking?.skillLevel ?? 'intermediate');
        setEquipment(initialSnapshot.cooking?.equipment ?? []);
        setActiveRoutineDay(null);
    };

    const handleDiscardChanges = () => {
        if (!initialSnapshot || !isDirty || isSaving) {
            return;
        }
        Alert.alert(
            t('preferences.discardChangesTitle'),
            t('preferences.discardChangesMessage'),
            [
                { text: t('preferences.discardChangesCancel'), style: 'cancel' },
                {
                    text: t('preferences.discardChangesConfirm'),
                    style: 'destructive',
                    onPress: applyDiscardChanges,
                },
            ]
        );
    };

    const loadStoredState = async (): Promise<OnboardingStoredState | null> => {
        try {
            const storedRaw = await AsyncStorage.getItem(STORAGE_KEY);
            return storedRaw ? (JSON.parse(storedRaw) as OnboardingStoredState) : null;
        } catch (error) {
            console.warn('Failed to read stored onboarding snapshot:', error);
            return null;
        }
    };

    const applyRoutinesToMembers = (
        members: HouseholdMember[] | undefined,
        routines: WeeklyRoutine | undefined
    ): HouseholdMember[] | undefined => {
        if (!members || routines === undefined) {
            return members;
        }
        const normalizedRoutine = normalizeWeeklyRoutine(routines);
        return members.map((member) => ({
            ...member,
            routines: normalizeWeeklyRoutine(normalizedRoutine),
        }));
    };

    const persistLocalSnapshot = async (snapshotToPersist: OnboardingSnapshotWithMembers, stored: OnboardingStoredState | null) => {
        try {
            const nextData: OnboardingSnapshotWithMembers = {
                ...(stored?.data ?? {}),
                ...snapshotToPersist,
                dietary: snapshotToPersist.dietary,
                cuisine: snapshotToPersist.cuisine,
                cooking: snapshotToPersist.cooking,
                routines: snapshotToPersist.routines,
                ...(snapshotToPersist.members ? { members: snapshotToPersist.members } : {}),
            };
            const sanitizedData = sanitizeForFirestore(nextData) as OnboardingSnapshotWithMembers;
            const nextStored: OnboardingStoredState = stored
                ? {
                      ...stored,
                      data: sanitizedData,
                  }
                : {
                      data: sanitizedData,
                  };
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
        } catch (error) {
            console.warn('Failed to persist onboarding snapshot locally:', error);
        }
    };

    const persistRemoteSnapshot = async (userId: string, snapshotToPersist: OnboardingSnapshotWithMembers) => {
        const userDocRef = doc(firestore(), 'Users', userId);
        const sanitizedOnboarding = sanitizeForFirestore(snapshotToPersist) as OnboardingSnapshotWithMembers;
        await setDoc(
            userDocRef,
            {
                onboarding: sanitizedOnboarding,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    };

    const persistSnapshot = async (nextSnapshot: OnboardingSnapshot): Promise<boolean> => {
        try {
            const stored = await loadStoredState();
            const initialMembers = (initialSnapshot as OnboardingSnapshotWithMembers | null)?.members;
            const baseMembers = stored?.data?.members ?? initialMembers;
            const nextMembers = applyRoutinesToMembers(baseMembers, nextSnapshot.routines);
            const snapshotToPersist = buildSnapshotForPersistence(nextSnapshot, nextMembers);
            if (userId !== 'anonymous') {
                await persistRemoteSnapshot(userId, snapshotToPersist);
            }
            await persistLocalSnapshot(snapshotToPersist, stored);
            setInitialSnapshot(snapshotToPersist);
            setActiveRoutineDay(null);
            return true;
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : typeof error === 'string'
                    ? error
                    : t('preferences.saveErrorUnknown');
            console.warn('Failed to save onboarding preferences:', errorMessage, error);
            const baseMessage = t('preferences.saveErrorMessage');
            const alertMessage = __DEV__ ? `${baseMessage}\n\n${errorMessage}` : baseMessage;
            Alert.alert(t('preferences.saveErrorTitle'), alertMessage);
            return false;
        }
    };

    const requestWeeklyRegeneration = async (
        nextSnapshot: OnboardingSnapshot,
        routineChangesToPersist: RoutineChange[],
        preferenceChangesToPersist: PreferenceChangeSummary[]
    ) => {
        const today = new Date();
        const startDate = buildDateKey(today);
        const weekStart = resolveWeekStartKey(today);
        const onboardingHash = buildOnboardingHash(nextSnapshot);
        await persistWeeklyRegenerationRequest(userId, {
            weekStart,
            startDate,
            requestedAt: new Date().toISOString(),
            onboardingHash,
            preferenceChanges: preferenceChangesToPersist,
            ...(routineChangesToPersist.length ? { routineChanges: routineChangesToPersist } : {}),
        });
    };

    const handleSaveChanges = async () => {
        if (!currentSnapshot || !isDirty || isSaving) {
            return;
        }

        const changesForModal = preferenceChangeSummaries;
        const routineChangesForModal = routineChanges;

        setSaveIntent('save');
        setIsSaving(true);
        try {
            const didPersist = await persistSnapshot(currentSnapshot);
            if (!didPersist) {
                return;
            }
            await clearWeeklyRegenerationRequest(userId);
            setPendingSaveSnapshot(currentSnapshot);
            setPendingRegenerationChanges({
                preferenceChanges: changesForModal,
                routineChanges: routineChangesForModal,
            });
            setRoutineModalVisible(true);
        } finally {
            setIsSaving(false);
            setSaveIntent(null);
        }
    };

    const handleSaveWithoutRegeneration = async () => {
        if (isSaving) {
            return;
        }

        try {
            await clearWeeklyRegenerationRequest(userId);
        } catch (error) {
            console.warn('Failed to clear weekly regeneration request:', error);
        } finally {
            setRoutineModalVisible(false);
            setPendingSaveSnapshot(null);
            setPendingRegenerationChanges(null);
            router.replace('/(tabs)/profile');
        }
    };

    const handleSaveWithRegeneration = async () => {
        const snapshotToSave = pendingSaveSnapshot ?? currentSnapshot ?? initialSnapshot;
        if (!snapshotToSave || isSaving) {
            return;
        }

        const routineChangesToPersist = modalRoutineChanges;
        const preferenceChangesToPersist = modalPreferenceChanges;

        setSaveIntent('regenerate');
        setIsSaving(true);
        try {
            const isPremium = await loadPremiumStatus(userId);
            if (!isPremium) {
                const allowed = await requestRewardedAd({
                    title: t('ads.rewarded.weeklyRegenerateTitle'),
                    message: t('ads.rewarded.weeklyRegenerateMessage'),
                    confirmText: t('ads.rewarded.confirm'),
                    cancelText: t('ads.rewarded.cancel'),
                    errorTitle: t('ads.rewarded.errorTitle'),
                    errorMessage: t('ads.rewarded.errorMessage'),
                });
                if (!allowed) {
                    return;
                }
            }
            await requestWeeklyRegeneration(snapshotToSave, routineChangesToPersist, preferenceChangesToPersist);
            setPendingSaveSnapshot(null);
            setPendingRegenerationChanges(null);
            setRoutineModalVisible(false);
            router.replace('/(tabs)');
        } finally {
            setIsSaving(false);
            setSaveIntent(null);
        }
    };

    if (isLoading || !initialSnapshot) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>{t('preferences.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const footerPaddingBottom = Math.max(insets.bottom, spacing.md);
    const scrollPaddingBottom = FOOTER_HEIGHT + footerPaddingBottom + spacing.lg;

    return (
        <View style={styles.container}>
            <View style={[styles.topBar, { paddingTop: insets.top }]}> 
                <View style={styles.topBarContent}>
                    <TouchableOpacity onPress={handleBack} activeOpacity={0.8} style={styles.iconButton}>
                        <MaterialCommunityIcons name="arrow-left" size={26} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.brandText}>{t('preferences.title')}</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <SectionHeader
                        title={t('preferences.routineSectionTitle')}
                        subtitle={t('preferences.routineSectionSubtitle')}
                        icon="calendar-check-outline"
                    />
                    <View style={styles.card}>
                        {DAY_ORDER.map((dayKey, index) => {
                            const dayRoutine = routines[dayKey];
                            const routineMeta =
                                ROUTINE_OPTIONS.find((item) => item.key === dayRoutine.type) ?? ROUTINE_OPTIONS[1];
                            const routineLabel = t(routineMeta.labelKey);
                            const isActive = activeRoutineDay === dayKey;
                            const isLastDay = index === DAY_ORDER.length - 1;

                            return (
                                <View
                                    key={dayKey}
                                    style={[styles.routineDayBlock, isLastDay && styles.routineDayBlockLast]}
                                >
                                    <TouchableOpacity
                                        style={[styles.routineRow, isActive && styles.routineRowActive]}
                                        onPress={() => handleToggleRoutineDay(dayKey)}
                                        activeOpacity={0.9}
                                    >
                                        <Text style={styles.routineDayLabel}>{t(`preferences.days.${dayKey}`)}</Text>
                                        <View style={styles.routineRight}>
                                            <RoutinePill label={routineLabel} emoji={routineMeta.emoji} />
                                            <MaterialCommunityIcons
                                                name={isActive ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color={colors.textMuted}
                                            />
                                        </View>
                                    </TouchableOpacity>

                                    {isActive && (
                                        <View style={styles.routineOptions}>
                                            {ROUTINE_OPTIONS.map((option) => (
                                                <SelectableTag
                                                    key={`${dayKey}-${option.key}`}
                                                    label={t(option.labelKey)}
                                                    selected={dayRoutine.type === option.key}
                                                    onPress={() => handleUpdateRoutineType(dayKey, option.key)}
                                                    icon={<Text style={styles.tagEmoji}>{option.emoji}</Text>}
                                                />
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    <SectionHeader
                        title={t('preferences.dietaryTitle')}
                        subtitle={t('preferences.dietarySubtitle')}
                        icon="food-apple-outline"
                    />
                    <View style={styles.card}>
                        <PreferenceBlock title={t('preferences.summary.dietary')}>
                            {DIETARY_RESTRICTIONS.map((item) => (
                                <SelectableTag
                                    key={`restriction-${item.key}`}
                                    label={t(item.labelKey)}
                                    selected={restrictions.includes(item.key)}
                                    onPress={() => toggleRestriction(item.key)}
                                    icon={<Text style={styles.tagEmoji}>{item.emoji}</Text>}
                                />
                            ))}
                        </PreferenceBlock>

                        <PreferenceBlock title={t('preferences.summary.allergies')}>
                            {COMMON_ALLERGIES.map((item) => (
                                <SelectableTag
                                    key={`allergy-${item.key}`}
                                    label={t(item.labelKey)}
                                    selected={allergies.includes(item.key)}
                                    onPress={() => toggleAllergy(item.key)}
                                    icon={<Text style={styles.tagEmoji}>{item.emoji}</Text>}
                                />
                            ))}
                        </PreferenceBlock>
                    </View>

                    <SectionHeader
                        title={t('preferences.cuisineTitle')}
                        subtitle={t('preferences.cuisineSubtitle')}
                        icon="silverware-fork-knife"
                    />
                    <View style={styles.card}>
                        <CuisineGrid
                            title={t('preferences.cuisinePopularTitle')}
                            cuisines={CUISINES.filter((item) => item.popular)}
                            selectedKeys={selectedCuisines}
                            onToggle={toggleCuisine}
                        />
                        <CuisineGrid
                            title={t('preferences.cuisineOtherTitle')}
                            cuisines={CUISINES.filter((item) => !item.popular)}
                            selectedKeys={selectedCuisines}
                            onToggle={toggleCuisine}
                        />
                    </View>

                    <SectionHeader
                        title={t('preferences.cookingTitle')}
                        subtitle={t('preferences.cookingSubtitle')}
                        icon="chef-hat"
                    />
                    <View style={styles.card}>
                        <Text style={styles.blockTitle}>{t('preferences.cookingTimeTitle')}</Text>
                        <View style={styles.optionRow}>
                            {Object.values(TIME_OPTIONS).map((option) => (
                                <OptionCard
                                    key={`time-${option.key}`}
                                    label={t(option.labelKey)}
                                    description={t(option.descriptionKey)}
                                    emoji={option.emoji}
                                    selected={timePreference === option.key}
                                    onPress={() => setTimePreference(option.key)}
                                />
                            ))}
                        </View>

                        <Text style={styles.blockTitle}>{t('preferences.cookingSkillTitle')}</Text>
                        <View style={styles.optionRow}>
                            {Object.values(SKILL_LEVELS).map((option) => (
                                <OptionCard
                                    key={`skill-${option.key}`}
                                    label={t(option.labelKey)}
                                    description={t(option.descriptionKey)}
                                    emoji={option.emoji}
                                    selected={skillLevel === option.key}
                                    onPress={() => setSkillLevel(option.key)}
                                />
                            ))}
                        </View>

                        <PreferenceBlock title={t('preferences.equipmentOptional')}>
                            {EQUIPMENT.map((item) => (
                                <TouchableOpacity
                                    key={`equipment-${item.key}`}
                                    style={[styles.equipmentItem, equipment.includes(item.key) && styles.equipmentItemSelected]}
                                    onPress={() => toggleEquipment(item.key)}
                                    activeOpacity={0.9}
                                >
                                    {item.emoji ? <Text style={styles.equipmentEmoji}>{item.emoji}</Text> : null}
                                    <Text
                                        style={[
                                            styles.equipmentLabel,
                                            equipment.includes(item.key) && styles.equipmentLabelSelected,
                                        ]}
                                    >
                                        {t(item.labelKey)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </PreferenceBlock>
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={isRoutineModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setRoutineModalVisible(false);
                    setPendingSaveSnapshot(null);
                    setPendingRegenerationChanges(null);
                    clearWeeklyRegenerationRequest(userId).catch((error) => {
                        console.warn('Failed to clear weekly regeneration request:', error);
                    });
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <View style={styles.modalIconBadge}>
                                    <Image source={require('../../assets/onboarding-ready.png')} style={styles.modalIconImage} />
                                </View>
                                <Text style={styles.modalTitle}>{t('preferences.routineModalTitle')}</Text>
                            </View>

                            <View style={styles.modalChangeList}>
                                <Text style={styles.modalChangeTitle}>{t('preferences.routineModalChangesTitle')}</Text>
                                {modalPreferenceChanges.length ? (
                                    <View style={styles.modalSummaryList}>
                                        {modalPreferenceChanges.map((change) => (
                                            <View key={`summary-${change.key}`} style={styles.modalSummaryRow}>
                                                <Text style={styles.modalSummaryLabel}>{change.label}</Text>
                                            {change.detail ? (
                                                <Text style={styles.modalSummaryDetail}>{change.detail}</Text>
                                            ) : null}
                                        </View>
                                    ))}
                                </View>
                                ) : (
                                    <Text style={styles.modalSummaryFallback}>{t('preferences.routineModalFallback')}</Text>
                                )}

                            {modalRoutineChanges.length > 0 ? (
                                <View style={styles.modalRoutineDetailList}>
                                    {modalRoutineChanges.map((change) => {
                                        const previousMeta = getRoutineOption(change.previousType);
                                        const nextMeta = getRoutineOption(change.nextType);
                                        return (
                                            <View key={`change-${change.dayKey}`} style={styles.modalChangeRow}>
                                                <Text style={styles.modalChangeDay}>{change.dayLabel}</Text>
                                                <View style={styles.modalChangeMetaRow}>
                                                    <RoutineChangePill
                                                        label={t(previousMeta.labelKey)}
                                                        emoji={previousMeta.emoji}
                                                        tone="muted"
                                                    />
                                                    <MaterialCommunityIcons
                                                        name="arrow-right"
                                                        size={18}
                                                        color={colors.textMuted}
                                                        style={styles.modalChangeArrow}
                                                    />
                                                    <RoutineChangePill
                                                        label={t(nextMeta.labelKey)}
                                                        emoji={nextMeta.emoji}
                                                        tone="highlight"
                                                    />
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            ) : null}
                        </View>

                        <View style={styles.modalQuestionBlock}>
                            <Text style={styles.modalQuestionText}>
                                {t('preferences.routineModalQuestion')}
                            </Text>
                        </View>

                        <View style={styles.modalActions}>
                            <View style={styles.modalActionButtonSlot}>
                                <Button
                                    title={t('preferences.routineModalSecondary')}
                                    variant="secondary"
                                    onPress={handleSaveWithoutRegeneration}
                                    disabled={isSaving}
                                    loading={isSaving && saveIntent === 'save'}
                                    fullWidth
                                />
                            </View>
                            <View style={styles.modalActionButtonSlot}>
                                <Button
                                    title={t('preferences.routineModalPrimary')}
                                    variant="primary"
                                    onPress={handleSaveWithRegeneration}
                                    disabled={isSaving}
                                    loading={isSaving && saveIntent === 'regenerate'}
                                    fullWidth
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}> 
                <View style={styles.footerContent}>
                    <View style={styles.footerButtonSlot}>
                        <Button
                            title={t('preferences.discardChangesConfirm')}
                            variant="secondary"
                            onPress={handleDiscardChanges}
                            disabled={!isDirty || isSaving}
                            fullWidth
                        />
                    </View>
                    <View style={styles.footerButtonSlot}>
                        <Button
                            title={t('preferences.save')}
                            variant="primary"
                            onPress={handleSaveChanges}
                            disabled={!isDirty || isSaving}
                            loading={isSaving}
                            fullWidth
                        />
                    </View>
                </View>
            </View>
        </View>
    );
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }) {
    return (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}>
                <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionSubtitle}>{subtitle}</Text>
            </View>
        </View>
    );
}

function PreferenceBlock({ title, children }: { title: string; children: ReactNode }) {
    return (
        <View style={styles.preferenceBlock}>
            <Text style={styles.blockTitle}>{title}</Text>
            <View style={styles.tagList}>{children}</View>
        </View>
    );
}

function RoutinePill({ label, emoji }: { label: string; emoji: string }) {
    return (
        <View style={styles.routinePill}>
            <Text style={styles.routinePillEmoji}>{emoji}</Text>
            <Text style={styles.routinePillLabel}>{label}</Text>
        </View>
    );
}

function CuisineGrid({
    title,
    cuisines,
    selectedKeys,
    onToggle,
}: {
    title: string;
    cuisines: LabeledEmojiItem[];
    selectedKeys: string[];
    onToggle: (key: string) => void;
}) {
    const { t } = useLanguage();
    return (
        <View style={styles.cuisineBlock}>
            <Text style={styles.blockTitle}>{title}</Text>
            <View style={styles.cuisineGrid}>
                {cuisines.map((cuisine) => {
                    const isSelected = selectedKeys.includes(cuisine.key);
                    return (
                        <TouchableOpacity
                            key={`cuisine-${title}-${cuisine.key}`}
                            style={[styles.cuisineCard, isSelected && styles.cuisineCardSelected]}
                            onPress={() => onToggle(cuisine.key)}
                            activeOpacity={0.9}
                        >
                            {cuisine.emoji ? <Text style={styles.cuisineEmoji}>{cuisine.emoji}</Text> : null}
                            <Text style={[styles.cuisineLabel, isSelected && styles.cuisineLabelSelected]} numberOfLines={1}>
                                {t(cuisine.labelKey)}
                            </Text>
                            {isSelected ? (
                                <View style={styles.cuisineCheck}>
                                    <MaterialCommunityIcons name="check" size={14} color={colors.textInverse} />
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

function OptionCard({
    label,
    description,
    emoji,
    selected,
    onPress,
}: {
    label: string;
    description: string;
    emoji: string;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.optionCard, selected && styles.optionCardSelected]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <Text style={styles.optionEmoji}>{emoji}</Text>
            <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
            <Text style={styles.optionDescription}>{description}</Text>
        </TouchableOpacity>
    );
}

function RoutineChangePill({
    label,
    emoji,
    tone,
}: {
    label: string;
    emoji: string;
    tone: 'muted' | 'highlight';
}) {
    return (
        <View style={[styles.changePill, tone === 'highlight' ? styles.changePillHighlight : styles.changePillMuted]}>
            <Text style={styles.changePillEmoji}>{emoji}</Text>
            <Text style={[styles.changePillLabel, tone === 'highlight' && styles.changePillLabelHighlight]}>
                {label}
            </Text>
        </View>
    );
}

function getRoutineOption(type: RoutineDay['type']): RoutineOption {
    return ROUTINE_OPTIONS.find((option) => option.key === type) ?? ROUTINE_OPTIONS[1];
}

function buildRoutineChanges(
    initialRoutine: WeeklyRoutine | undefined,
    nextRoutine: WeeklyRoutine,
    t: (key: string, params?: Record<string, string | number>) => string
): RoutineChange[] {
    const baseRoutine = normalizeWeeklyRoutine(initialRoutine);
    const changes: RoutineChange[] = [];

    for (const dayKey of DAY_ORDER) {
        const previousType = baseRoutine[dayKey].type;
        const nextType = nextRoutine[dayKey].type;
        if (previousType === nextType) {
            continue;
        }
        changes.push({
            dayKey,
            dayLabel: t(`preferences.days.${dayKey}`),
            previousType,
            nextType,
        });
    }

    return changes;
}

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

const normalizeStringList = (values: string[]) => {
    const cleaned = values
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    const unique = Array.from(new Set(cleaned));
    return unique.sort((first, second) => first.localeCompare(second, 'tr-TR'));
};

function areStringListsEqual(left: string[], right: string[]): boolean {
    const normalizedLeft = normalizeStringList(left);
    const normalizedRight = normalizeStringList(right);
    if (normalizedLeft.length !== normalizedRight.length) {
        return false;
    }
    return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function buildSelectionDetail(
    count: number,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    return count > 0 ? t('preferences.selectionCount', { count }) : t('preferences.selectionEmpty');
}

function buildSnapshotForPersistence(
    snapshot: OnboardingSnapshot,
    members?: HouseholdMember[]
): OnboardingSnapshotWithMembers {
    const normalizedRoutines = snapshot.routines
        ? normalizeWeeklyRoutine(snapshot.routines)
        : normalizeWeeklyRoutine(DEFAULT_ROUTINES);
    const dietary = {
        restrictions: snapshot.dietary?.restrictions ?? [],
        allergies: snapshot.dietary?.allergies ?? [],
    };
    const cuisine = {
        selected: snapshot.cuisine?.selected ?? [],
    };
    const cooking = {
        timePreference: snapshot.cooking?.timePreference ?? 'balanced',
        skillLevel: snapshot.cooking?.skillLevel ?? 'intermediate',
        equipment: snapshot.cooking?.equipment ?? [],
    };
    const profile = snapshot.profile
        ? {
              name: snapshot.profile.name ?? '',
              ...(snapshot.profile.avatarUrl ? { avatarUrl: snapshot.profile.avatarUrl } : {}),
          }
        : undefined;
    const updatedMembers = members
        ? members.map((member) => ({
              ...member,
              routines: normalizeWeeklyRoutine(normalizedRoutines),
          }))
        : undefined;

    const base: OnboardingSnapshotWithMembers = {
        ...(profile ? { profile } : {}),
        ...(typeof snapshot.householdSize === 'number' ? { householdSize: snapshot.householdSize } : {}),
        dietary,
        cuisine,
        cooking,
        routines: normalizedRoutines,
        ...(updatedMembers ? { members: updatedMembers } : {}),
    };

    return sanitizeForFirestore(base) as OnboardingSnapshotWithMembers;
}

function sanitizeForFirestore(value: unknown): unknown {
    if (value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        const sanitizedItems = value
            .map((item) => sanitizeForFirestore(item))
            .filter((item) => item !== undefined);
        return sanitizedItems;
    }
    if (value && typeof value === 'object') {
        const sanitizedObject: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value)) {
            const sanitizedEntry = sanitizeForFirestore(entry);
            if (sanitizedEntry !== undefined) {
                sanitizedObject[key] = sanitizedEntry;
            }
        }
        return sanitizedObject;
    }
    return value;
}

function buildDefaultSnapshot(defaultName: string): OnboardingSnapshot {
    return {
        householdSize: 1,
        dietary: { restrictions: [], allergies: [] },
        cuisine: { selected: [] },
        cooking: {
            timePreference: 'balanced',
            skillLevel: 'intermediate',
            equipment: [],
        },
        routines: DEFAULT_ROUTINES,
        profile: { name: defaultName },
    };
}

function normalizeRoutineDay(value: RoutineDay | undefined, fallback: RoutineDay): RoutineDay {
    return {
        type: value?.type ?? fallback.type,
        gymTime: value?.gymTime ?? fallback.gymTime,
        officeMealToGo: value?.officeMealToGo ?? fallback.officeMealToGo,
        officeBreakfastAtHome: value?.officeBreakfastAtHome ?? fallback.officeBreakfastAtHome,
        schoolBreakfast: value?.schoolBreakfast ?? fallback.schoolBreakfast,
        remoteMeals: value?.remoteMeals ?? fallback.remoteMeals,
        excludeFromPlan: value?.excludeFromPlan ?? fallback.excludeFromPlan,
    };
}

function normalizeWeeklyRoutine(routine: WeeklyRoutine | undefined): WeeklyRoutine {
    return {
        monday: normalizeRoutineDay(routine?.monday, DEFAULT_ROUTINES.monday),
        tuesday: normalizeRoutineDay(routine?.tuesday, DEFAULT_ROUTINES.tuesday),
        wednesday: normalizeRoutineDay(routine?.wednesday, DEFAULT_ROUTINES.wednesday),
        thursday: normalizeRoutineDay(routine?.thursday, DEFAULT_ROUTINES.thursday),
        friday: normalizeRoutineDay(routine?.friday, DEFAULT_ROUTINES.friday),
        saturday: normalizeRoutineDay(routine?.saturday, DEFAULT_ROUTINES.saturday),
        sunday: normalizeRoutineDay(routine?.sunday, DEFAULT_ROUTINES.sunday),
    };
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topBar: {
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    topBarContent: {
        height: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
    },
    brandText: {
        ...typography.h3,
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    iconButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: {
        width: 44,
        height: 44,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: spacing.md,
    },
    content: {
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    sectionIconBadge: {
        width: 38,
        height: 38,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primaryLight + '18',
        borderWidth: 1,
        borderColor: colors.primaryLight + '32',
    },
    sectionHeaderText: {
        flex: 1,
        gap: 2,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    sectionSubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.md,
        gap: spacing.md,
        ...shadows.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.lg,
        gap: spacing.lg,
        ...shadows.md,
    },
    modalHeader: {
        alignItems: 'center',
        gap: spacing.sm,
    },
    modalIconBadge: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalIconImage: {
        width: 56,
        height: 56,
        resizeMode: 'contain',
    },
    modalTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    modalChangeList: {
        gap: spacing.sm,
    },
    modalChangeTitle: {
        ...typography.label,
        color: colors.textPrimary,
    },
    modalQuestionBlock: {
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    modalQuestionText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    modalSummaryList: {
        gap: spacing.xs,
    },
    modalSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
        gap: spacing.sm,
    },
    modalSummaryLabel: {
        ...typography.bodySmall,
        color: colors.textPrimary,
    },
    modalSummaryDetail: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    modalSummaryFallback: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    modalRoutineDetailList: {
        gap: spacing.xs,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    modalChangeRow: {
        gap: spacing.xs,
        paddingVertical: spacing.xs,
    },
    modalChangeDay: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    modalChangeMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    modalChangeArrow: {
        marginHorizontal: spacing.xs,
    },
    modalActions: {
        gap: spacing.sm,
    },
    modalActionButtonSlot: {
        width: '100%',
    },
    changePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    changePillMuted: {
        backgroundColor: colors.surfaceMuted,
    },
    changePillHighlight: {
        backgroundColor: colors.primaryLight + '18',
        borderColor: colors.primaryLight + '32',
    },
    changePillEmoji: {
        fontSize: 14,
    },
    changePillLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    changePillLabelHighlight: {
        color: colors.primaryDark,
    },
    routineDayBlock: {
        gap: spacing.sm,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    routineDayBlockLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    routineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        paddingVertical: spacing.xs,
    },
    routineRowActive: {
        paddingBottom: spacing.xs,
    },
    routineDayLabel: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    routineRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    routinePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surfaceMuted,
        minWidth: 96,
        justifyContent: 'center',
    },
    routinePillEmoji: {
        fontSize: 14,
    },
    routinePillLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    routineOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    preferenceBlock: {
        gap: spacing.sm,
    },
    blockTitle: {
        ...typography.label,
        color: colors.textPrimary,
    },
    tagList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    tagEmoji: {
        fontSize: 14,
    },
    cuisineBlock: {
        gap: spacing.sm,
    },
    cuisineGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    cuisineCard: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    cuisineCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '15',
    },
    cuisineEmoji: {
        fontSize: 22,
    },
    cuisineLabel: {
        flex: 1,
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    cuisineLabelSelected: {
        color: colors.primaryDark,
    },
    cuisineCheck: {
        width: 22,
        height: 22,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
    },
    optionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    optionCard: {
        flex: 1,
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        gap: spacing.xs,
    },
    optionCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '15',
    },
    optionEmoji: {
        fontSize: 26,
    },
    optionLabel: {
        ...typography.label,
        color: colors.textPrimary,
    },
    optionLabelSelected: {
        color: colors.primaryDark,
    },
    optionDescription: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    equipmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    equipmentItemSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '15',
    },
    equipmentEmoji: {
        fontSize: 16,
    },
    equipmentLabel: {
        ...typography.label,
        color: colors.textPrimary,
    },
    equipmentLabelSelected: {
        color: colors.primaryDark,
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        backgroundColor: colors.background,
    },
    footerContent: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    footerButtonSlot: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    loadingText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
});
