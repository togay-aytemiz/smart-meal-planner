import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    LayoutAnimation,
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
import type { RoutineDay, WeeklyRoutine } from '../contexts/onboarding-context';
import { colors } from '../theme/colors';
import { radius, spacing, shadows } from '../theme/spacing';
import { typography } from '../theme/typography';
import { buildOnboardingHash, type OnboardingSnapshot } from '../utils/onboarding-hash';

const STORAGE_KEY = '@smart_meal_planner:onboarding';
const HEADER_HEIGHT = 56;
const FOOTER_HEIGHT = 96;

type OnboardingStoredState = {
    currentStep?: number;
    isCompleted?: boolean;
    data?: OnboardingSnapshot;
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
        if (!isDirty || isSaving) {
            navigateBack();
            return;
        }
        confirmDiscardChanges();
    };

    useFocusEffect(
        useCallback(() => {
            const onHardwareBack = () => {
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
        }, [confirmDiscardChanges, isDirty, isSaving])
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

    const persistLocalSnapshot = async (nextSnapshot: OnboardingSnapshot) => {
        try {
            const storedRaw = await AsyncStorage.getItem(STORAGE_KEY);
            const stored = storedRaw ? (JSON.parse(storedRaw) as OnboardingStoredState) : null;
            const nextData = {
                ...(stored?.data ?? {}),
                ...nextSnapshot,
                dietary: nextSnapshot.dietary,
                cuisine: nextSnapshot.cuisine,
                cooking: nextSnapshot.cooking,
                routines: nextSnapshot.routines,
            };
            const nextStored: OnboardingStoredState = stored
                ? {
                      ...stored,
                      data: nextData,
                  }
                : {
                      data: nextData,
                  };
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
        } catch (error) {
            console.warn('Failed to persist onboarding snapshot locally:', error);
        }
    };

    const persistRemoteSnapshot = async (userId: string, nextSnapshot: OnboardingSnapshot) => {
        const userDocRef = doc(firestore(), 'Users', userId);
        await setDoc(
            userDocRef,
            {
                onboarding: nextSnapshot,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    };

    const handleSaveChanges = async () => {
        if (!currentSnapshot || !isDirty || isSaving) {
            return;
        }

        setIsSaving(true);
        try {
            const userId = userState.user?.uid;
            if (userId && userId !== 'anonymous') {
                await persistRemoteSnapshot(userId, currentSnapshot);
            }
            await persistLocalSnapshot(currentSnapshot);
            setInitialSnapshot(currentSnapshot);
            setActiveRoutineDay(null);
        } catch (error) {
            console.warn('Failed to save onboarding preferences:', error);
        } finally {
            setIsSaving(false);
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
    routineDayBlock: {
        gap: spacing.sm,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    routineDayBlockLast: {
        borderBottomWidth: 0,
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
