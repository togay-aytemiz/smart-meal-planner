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
    label: string;
    emoji: string;
};

type LabeledEmojiItem = {
    key: string;
    label: string;
    emoji?: string;
    popular?: boolean;
};

const DAY_ORDER: Array<{ key: DayKey; label: string }> = [
    { key: 'monday', label: 'Pazartesi' },
    { key: 'tuesday', label: 'Salı' },
    { key: 'wednesday', label: 'Çarşamba' },
    { key: 'thursday', label: 'Perşembe' },
    { key: 'friday', label: 'Cuma' },
    { key: 'saturday', label: 'Cumartesi' },
    { key: 'sunday', label: 'Pazar' },
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
    { key: 'office', label: 'Ofis', emoji: '🏢' },
    { key: 'remote', label: 'Ev', emoji: '🏠' },
    { key: 'gym', label: 'Spor', emoji: '💪' },
    { key: 'school', label: 'Okul', emoji: '📚' },
    { key: 'off', label: 'Tatil', emoji: '🌴' },
];

const DIETARY_RESTRICTIONS: LabeledEmojiItem[] = [
    { key: 'vegetarian', label: 'Vejetaryen', emoji: '🥬' },
    { key: 'vegan', label: 'Vegan', emoji: '🌱' },
    { key: 'pescatarian', label: 'Pesketaryen', emoji: '🐟' },
    { key: 'gluten-free', label: 'Glütensiz', emoji: '🌾' },
    { key: 'dairy-free', label: 'Süt Ürünsüz', emoji: '🥛' },
    { key: 'low-carb', label: 'Düşük Karbonhidrat', emoji: '🍞' },
    { key: 'keto', label: 'Keto', emoji: '🥑' },
    { key: 'high-protein', label: 'Protein Ağırlıklı', emoji: '💪' },
];

const COMMON_ALLERGIES: LabeledEmojiItem[] = [
    { key: 'nuts', label: 'Kuruyemiş', emoji: '🥜' },
    { key: 'shellfish', label: 'Kabuklu Deniz', emoji: '🦐' },
    { key: 'eggs', label: 'Yumurta', emoji: '🥚' },
    { key: 'soy', label: 'Soya', emoji: '🫘' },
    { key: 'wheat', label: 'Buğday', emoji: '🌾' },
    { key: 'fish', label: 'Balık', emoji: '🐠' },
    { key: 'sesame', label: 'Susam', emoji: '🌰' },
];

const CUISINES: LabeledEmojiItem[] = [
    { key: 'turkish', label: 'Türk', emoji: '🇹🇷', popular: true },
    { key: 'mediterranean', label: 'Akdeniz', emoji: '🫒', popular: true },
    { key: 'italian', label: 'İtalyan', emoji: '🍝', popular: true },
    { key: 'asian', label: 'Asya', emoji: '🍜', popular: true },
    { key: 'middle-eastern', label: 'Ortadoğu', emoji: '🧆', popular: false },
    { key: 'mexican', label: 'Meksika', emoji: '🌮', popular: false },
    { key: 'indian', label: 'Hint', emoji: '🍛', popular: false },
    { key: 'french', label: 'Fransız', emoji: '🥐', popular: false },
    { key: 'japanese', label: 'Japon', emoji: '🍱', popular: false },
    { key: 'chinese', label: 'Çin', emoji: '🥡', popular: false },
    { key: 'thai', label: 'Tayland', emoji: '🍜', popular: false },
    { key: 'american', label: 'Amerikan', emoji: '🍔', popular: false },
];

const TIME_OPTIONS: Array<{ key: 'quick' | 'balanced' | 'elaborate'; label: string; description: string; emoji: string }> = [
    { key: 'quick', label: 'Hızlı', description: '15-30 dk', emoji: '⚡' },
    { key: 'balanced', label: 'Dengeli', description: '30-60 dk', emoji: '⏱️' },
    { key: 'elaborate', label: 'Detaylı', description: '60+ dk', emoji: '👨‍🍳' },
];

const SKILL_LEVELS: Array<{ key: 'beginner' | 'intermediate' | 'expert'; label: string; description: string; emoji: string }> = [
    { key: 'beginner', label: 'Başlangıç', description: 'Temel tarifler', emoji: '🌱' },
    { key: 'intermediate', label: 'Orta', description: 'Çoğu tarif', emoji: '🌿' },
    { key: 'expert', label: 'Uzman', description: 'Her şey olur', emoji: '🌳' },
];

const EQUIPMENT: LabeledEmojiItem[] = [
    { key: 'oven', label: 'Fırın', emoji: '🔥' },
    { key: 'blender', label: 'Blender', emoji: '🫙' },
    { key: 'airfryer', label: 'Airfryer', emoji: '🍟' },
    { key: 'pressure-cooker', label: 'Düdüklü', emoji: '♨️' },
    { key: 'mixer', label: 'Mikser', emoji: '🥣' },
    { key: 'grill', label: 'Izgara', emoji: '🥩' },
];

export default function PreferencesEditScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { state: userState } = useUser();

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

                const normalizedSnapshot = resolvedSnapshot ?? buildDefaultSnapshot();

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
                    const fallback = buildDefaultSnapshot();
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
    }, [userState.isLoading, userState.user?.uid]);

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
        return buildRoutineChanges(initialSnapshot.routines, routines);
    }, [initialSnapshot, routines]);
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
                label: 'Beslenme tercihleri',
                detail: buildSelectionDetail(restrictions.length),
            });
        }

        if (!areStringListsEqual(initialAllergies, allergies)) {
            summaries.push({
                key: 'dietary-allergies',
                label: 'Alerjiler',
                detail: buildSelectionDetail(allergies.length),
            });
        }

        if (!areStringListsEqual(initialCuisines, selectedCuisines)) {
            summaries.push({
                key: 'cuisine',
                label: 'Mutfak tercihleri',
                detail: buildSelectionDetail(selectedCuisines.length),
            });
        }

        if (initialTimePreference !== timePreference) {
            const timeLabel = TIME_OPTIONS.find((option) => option.key === timePreference)?.label ?? 'Dengeli';
            summaries.push({
                key: 'cooking-time',
                label: 'Yemek süresi',
                detail: timeLabel,
            });
        }

        if (initialSkillLevel !== skillLevel) {
            const skillLabel = SKILL_LEVELS.find((option) => option.key === skillLevel)?.label ?? 'Orta';
            summaries.push({
                key: 'cooking-skill',
                label: 'Beceri seviyesi',
                detail: skillLabel,
            });
        }

        if (!areStringListsEqual(initialEquipment, equipment)) {
            summaries.push({
                key: 'cooking-equipment',
                label: 'Ekipmanlar',
                detail: buildSelectionDetail(equipment.length),
            });
        }

        if (routineChanges.length > 0) {
            summaries.push({
                key: 'routines',
                label: 'Haftalık rutinler',
                detail: `${routineChanges.length} gün`,
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
            'Kaydedilmemiş değişiklikler',
            'Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinize emin misiniz?',
            [
                { text: 'Kal', style: 'cancel' },
                {
                    text: 'Çık',
                    style: 'destructive',
                    onPress: navigateBack,
                },
            ]
        );
    }, [navigateBack]);

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
            'Değişikliklerden vazgeç',
            'Yaptığınız değişiklikler kaydedilmeyecek. Devam etmek istiyor musunuz?',
            [
                { text: 'Kal', style: 'cancel' },
                {
                    text: 'Vazgeç',
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
                error instanceof Error ? error.message : typeof error === 'string' ? error : 'Bilinmeyen hata';
            console.warn('Failed to save onboarding preferences:', errorMessage, error);
            const alertMessage = __DEV__
                ? `Tercihler kaydedilirken bir hata oluştu.\n\n${errorMessage}`
                : 'Tercihler kaydedilirken bir hata oluştu.';
            Alert.alert('Kaydetme başarısız', alertMessage);
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
                    <Text style={styles.loadingText}>Tercihler yükleniyor...</Text>
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
                    <Text style={styles.brandText}>Tercihler</Text>
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
                        title="Haftalık Rutinler"
                        subtitle="Gününüz nerede geçiyor, planı buna göre ayarlayalım"
                        icon="calendar-check-outline"
                    />
                    <View style={styles.card}>
                        {DAY_ORDER.map((day, index) => {
                            const dayRoutine = routines[day.key];
                            const routineMeta = ROUTINE_OPTIONS.find((item) => item.key === dayRoutine.type) ?? ROUTINE_OPTIONS[1];
                            const isActive = activeRoutineDay === day.key;
                            const isLastDay = index === DAY_ORDER.length - 1;

                            return (
                                <View
                                    key={day.key}
                                    style={[styles.routineDayBlock, isLastDay && styles.routineDayBlockLast]}
                                >
                                    <TouchableOpacity
                                        style={[styles.routineRow, isActive && styles.routineRowActive]}
                                        onPress={() => handleToggleRoutineDay(day.key)}
                                        activeOpacity={0.9}
                                    >
                                        <Text style={styles.routineDayLabel}>{day.label}</Text>
                                        <View style={styles.routineRight}>
                                            <RoutinePill label={routineMeta.label} emoji={routineMeta.emoji} />
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
                                                    key={`${day.key}-${option.key}`}
                                                    label={option.label}
                                                    selected={dayRoutine.type === option.key}
                                                    onPress={() => handleUpdateRoutineType(day.key, option.key)}
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
                        title="Diyet & Alerji"
                        subtitle="İstemediğiniz içerikleri netleştirelim"
                        icon="food-apple-outline"
                    />
                    <View style={styles.card}>
                        <PreferenceBlock title="Beslenme tercihleri">
                            {DIETARY_RESTRICTIONS.map((item) => (
                                <SelectableTag
                                    key={`restriction-${item.key}`}
                                    label={item.label}
                                    selected={restrictions.includes(item.key)}
                                    onPress={() => toggleRestriction(item.key)}
                                    icon={<Text style={styles.tagEmoji}>{item.emoji}</Text>}
                                />
                            ))}
                        </PreferenceBlock>

                        <PreferenceBlock title="Alerjiler">
                            {COMMON_ALLERGIES.map((item) => (
                                <SelectableTag
                                    key={`allergy-${item.key}`}
                                    label={item.label}
                                    selected={allergies.includes(item.key)}
                                    onPress={() => toggleAllergy(item.key)}
                                    icon={<Text style={styles.tagEmoji}>{item.emoji}</Text>}
                                />
                            ))}
                        </PreferenceBlock>
                    </View>

                    <SectionHeader
                        title="Mutfak Tercihleri"
                        subtitle="Sevdiğiniz mutfaklara öncelik verelim"
                        icon="silverware-fork-knife"
                    />
                    <View style={styles.card}>
                        <CuisineGrid
                            title="Popüler"
                            cuisines={CUISINES.filter((item) => item.popular)}
                            selectedKeys={selectedCuisines}
                            onToggle={toggleCuisine}
                        />
                        <CuisineGrid
                            title="Diğer mutfaklar"
                            cuisines={CUISINES.filter((item) => !item.popular)}
                            selectedKeys={selectedCuisines}
                            onToggle={toggleCuisine}
                        />
                    </View>

                    <SectionHeader
                        title="Yemek Yapma Tercihleri"
                        subtitle="Süre, deneyim ve ekipmanları güncelleyin"
                        icon="chef-hat"
                    />
                    <View style={styles.card}>
                        <Text style={styles.blockTitle}>Yemek süresi</Text>
                        <View style={styles.optionRow}>
                            {TIME_OPTIONS.map((option) => (
                                <OptionCard
                                    key={`time-${option.key}`}
                                    label={option.label}
                                    description={option.description}
                                    emoji={option.emoji}
                                    selected={timePreference === option.key}
                                    onPress={() => setTimePreference(option.key)}
                                />
                            ))}
                        </View>

                        <Text style={styles.blockTitle}>Mutfak deneyimi</Text>
                        <View style={styles.optionRow}>
                            {SKILL_LEVELS.map((option) => (
                                <OptionCard
                                    key={`skill-${option.key}`}
                                    label={option.label}
                                    description={option.description}
                                    emoji={option.emoji}
                                    selected={skillLevel === option.key}
                                    onPress={() => setSkillLevel(option.key)}
                                />
                            ))}
                        </View>

                        <PreferenceBlock title="Ekipmanlar (opsiyonel)">
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
                                        {item.label}
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
                            <Text style={styles.modalTitle}>Tercihler Güncellendi</Text>
                        </View>

                        <View style={styles.modalChangeList}>
                            <Text style={styles.modalChangeTitle}>Neler değişti?</Text>
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
                                <Text style={styles.modalSummaryFallback}>Tercihleriniz güncellendi.</Text>
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
                                                        label={previousMeta.label}
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
                                                        label={nextMeta.label}
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
                                Bu haftanın geri kalan günleri için menüyü yeniden oluşturmak ister misiniz?
                            </Text>
                        </View>

                        <View style={styles.modalActions}>
                            <View style={styles.modalActionButtonSlot}>
                                <Button
                                    title="Şimdilik Değiştirme"
                                    variant="secondary"
                                    onPress={handleSaveWithoutRegeneration}
                                    disabled={isSaving}
                                    loading={isSaving && saveIntent === 'save'}
                                    fullWidth
                                />
                            </View>
                            <View style={styles.modalActionButtonSlot}>
                                <Button
                                    title="Kalan Haftayı Yenile"
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
                            title="Vazgeç"
                            variant="secondary"
                            onPress={handleDiscardChanges}
                            disabled={!isDirty || isSaving}
                            fullWidth
                        />
                    </View>
                    <View style={styles.footerButtonSlot}>
                        <Button
                            title="Kaydet"
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
                                {cuisine.label}
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

function buildRoutineChanges(initialRoutine: WeeklyRoutine | undefined, nextRoutine: WeeklyRoutine): RoutineChange[] {
    const baseRoutine = normalizeWeeklyRoutine(initialRoutine);
    const changes: RoutineChange[] = [];

    for (const day of DAY_ORDER) {
        const previousType = baseRoutine[day.key].type;
        const nextType = nextRoutine[day.key].type;
        if (previousType === nextType) {
            continue;
        }
        changes.push({
            dayKey: day.key,
            dayLabel: day.label,
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

function buildSelectionDetail(count: number): string {
    return count > 0 ? `${count} seçim` : 'Seçilmedi';
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

function buildDefaultSnapshot(): OnboardingSnapshot {
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
        profile: { name: 'Kullanıcı' },
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
