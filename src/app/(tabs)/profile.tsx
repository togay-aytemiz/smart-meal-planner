import { type ComponentProps, type ReactNode, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore, { doc, getDoc, updateDoc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { TabScreenHeader } from '../../components/ui';
import { useUser } from '../../contexts/user-context';
import { usePremium } from '../../contexts/premium-context';
import type { OnboardingData, RoutineDay, WeeklyRoutine } from '../../contexts/onboarding-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';

const STORAGE_KEY = '@smart_meal_planner:onboarding';
const MENU_RECIPES_STORAGE_KEY = '@smart_meal_planner:menu_recipes';
const MENU_CACHE_STORAGE_KEY = '@smart_meal_planner:menu_cache';
const WEEKLY_MENU_CACHE_KEY = '@smart_meal_planner:weekly_menu_generation';
const LEGACY_ONBOARDING_KEY = '@onboarding_data';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type OnboardingStoredState = {
    currentStep?: number;
    isCompleted?: boolean;
    data?: Partial<OnboardingData>;
};

type LabeledEmojiItem = {
    key: string;
    label: string;
    emoji?: string;
};

type RoutineTypeMeta = {
    label: string;
    emoji: string;
    tint: string;
    textColor: string;
};

const DAY_ORDER: Array<{ key: keyof WeeklyRoutine; label: string }> = [
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

const ROUTINE_TYPE_META: Record<RoutineDay['type'], RoutineTypeMeta> = {
    office: {
        label: 'Ofis',
        emoji: '🏢',
        tint: colors.surfaceMuted,
        textColor: colors.textSecondary,
    },
    remote: {
        label: 'Ev',
        emoji: '🏠',
        tint: colors.accentSoft,
        textColor: colors.primaryDark,
    },
    gym: {
        label: 'Spor',
        emoji: '💪',
        tint: colors.primaryLight + '20',
        textColor: colors.primaryDark,
    },
    school: {
        label: 'Okul',
        emoji: '📚',
        tint: colors.warningLight,
        textColor: colors.warning,
    },
    off: {
        label: 'Tatil',
        emoji: '🌴',
        tint: colors.borderLight,
        textColor: colors.textMuted,
    },
};

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
    { key: 'turkish', label: 'Türk', emoji: '🇹🇷' },
    { key: 'mediterranean', label: 'Akdeniz', emoji: '🫒' },
    { key: 'italian', label: 'İtalyan', emoji: '🍝' },
    { key: 'asian', label: 'Asya', emoji: '🍜' },
    { key: 'middle-eastern', label: 'Ortadoğu', emoji: '🧆' },
    { key: 'mexican', label: 'Meksika', emoji: '🌮' },
    { key: 'indian', label: 'Hint', emoji: '🍛' },
    { key: 'french', label: 'Fransız', emoji: '🥐' },
    { key: 'japanese', label: 'Japon', emoji: '🍱' },
    { key: 'chinese', label: 'Çin', emoji: '🥡' },
    { key: 'thai', label: 'Tayland', emoji: '🍜' },
    { key: 'american', label: 'Amerikan', emoji: '🍔' },
];

const TIME_OPTIONS: Record<NonNullable<OnboardingData['cooking']>['timePreference'], LabeledEmojiItem & { description: string }> = {
    quick: { key: 'quick', label: 'Hızlı', description: '15-30 dk', emoji: '⚡' },
    balanced: { key: 'balanced', label: 'Dengeli', description: '30-60 dk', emoji: '⏱️' },
    elaborate: { key: 'elaborate', label: 'Detaylı', description: '60+ dk', emoji: '👨‍🍳' },
};

const SKILL_LEVELS: Record<NonNullable<OnboardingData['cooking']>['skillLevel'], LabeledEmojiItem & { description: string }> = {
    beginner: { key: 'beginner', label: 'Başlangıç', description: 'Temel tarifler', emoji: '🌱' },
    intermediate: { key: 'intermediate', label: 'Orta', description: 'Çoğu tarif', emoji: '🌿' },
    expert: { key: 'expert', label: 'Uzman', description: 'Her şey olur', emoji: '🌳' },
};

const EQUIPMENT: LabeledEmojiItem[] = [
    { key: 'oven', label: 'Fırın', emoji: '🔥' },
    { key: 'blender', label: 'Blender', emoji: '🫙' },
    { key: 'airfryer', label: 'Airfryer', emoji: '🍟' },
    { key: 'pressure-cooker', label: 'Düdüklü', emoji: '♨️' },
    { key: 'mixer', label: 'Mikser', emoji: '🥣' },
    { key: 'grill', label: 'Izgara', emoji: '🥩' },
];

export default function ProfileScreen() {
    const router = useRouter();
    const { state: userState } = useUser();
    const { isPremium, presentPaywall, restorePurchases } = usePremium();
    const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData> | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);

    const handleResetOnboarding = async () => {
        Alert.alert(
            'Onboarding Sıfırla',
            'Onboarding verileriniz silinecek. Devam etmek istiyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sıfırla',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const keys = await AsyncStorage.getAllKeys();
                            const keysToRemove = keys.filter(
                                (key) =>
                                    key === STORAGE_KEY ||
                                    key === LEGACY_ONBOARDING_KEY ||
                                    key.startsWith(MENU_RECIPES_STORAGE_KEY) ||
                                    key.startsWith(MENU_CACHE_STORAGE_KEY) ||
                                    key.startsWith(WEEKLY_MENU_CACHE_KEY)
                            );
                            if (keysToRemove.length) {
                                await AsyncStorage.multiRemove(keysToRemove);
                            }
                            await auth().signOut();
                        } catch (error) {
                            console.warn('Onboarding reset failed:', error);
                        }
                        router.replace('/(onboarding)/welcome');
                    },
                },
            ]
        );
    };

    const handleOpenPreferencesEdit = () => {
        router.push('/preferences-edit');
    };

    const updateLocalOnboardingName = async (nextName: string) => {
        const nextProfile = { ...(onboardingData?.profile ?? {}), name: nextName };
        const nextData = { ...(onboardingData ?? {}), profile: nextProfile };
        setOnboardingData(nextData);

        try {
            const storedRaw = await AsyncStorage.getItem(STORAGE_KEY);
            const stored = storedRaw ? (JSON.parse(storedRaw) as OnboardingStoredState) : null;
            const nextStored: OnboardingStoredState = stored
                ? {
                      ...stored,
                      data: {
                          ...(stored.data ?? {}),
                          profile: nextProfile,
                      },
                  }
                : {
                      data: {
                          profile: nextProfile,
                      },
                  };
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
        } catch (error) {
            console.warn('Failed to update local onboarding name:', error);
        }
    };

    const updateRemoteOnboardingName = async (userId: string, nextName: string) => {
        const userDocRef = doc(firestore(), 'Users', userId);
        try {
            await updateDoc(userDocRef, {
                'onboarding.profile.name': nextName,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            await setDoc(
                userDocRef,
                {
                    onboarding: {
                        profile: { name: nextName },
                    },
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
        }
    };

    const handleStartEditName = () => {
        if (isSavingName) {
            return;
        }
        setNameDraft(profileName);
        setIsEditingName(true);
    };

    const handleCancelEditName = () => {
        if (isSavingName) {
            return;
        }
        setNameDraft(profileName);
        setIsEditingName(false);
    };

    const handleSaveName = async () => {
        if (isSavingName) {
            return;
        }

        const nextName = nameDraft.trim();
        if (!nextName) {
            Alert.alert('İsim gerekli', 'Lütfen geçerli bir isim girin.');
            return;
        }

        setIsSavingName(true);
        try {
            const userId = userState.user?.uid;
            if (userId && userId !== 'anonymous') {
                await updateRemoteOnboardingName(userId, nextName);
            }
            await updateLocalOnboardingName(nextName);
            setIsEditingName(false);
        } catch (error) {
            console.warn('Failed to save profile name:', error);
            Alert.alert('Güncelleme başarısız', 'İsim güncellenirken bir hata oluştu.');
        } finally {
            setIsSavingName(false);
        }
    };

    useEffect(() => {
        if (userState.isLoading) {
            return;
        }

        let isMounted = true;

        const loadOnboardingData = async () => {
            setIsLoadingProfile(true);
            try {
                const localRaw = await AsyncStorage.getItem(STORAGE_KEY);
                const localStored = localRaw ? (JSON.parse(localRaw) as OnboardingStoredState) : null;
                const localSnapshot = localStored?.data ?? null;
                const userId = userState.user?.uid ?? 'anonymous';

                let resolvedSnapshot = localSnapshot;

                if (userId !== 'anonymous') {
                    try {
                        const userSnap = await getDoc(doc(firestore(), 'Users', userId));
                        const remoteSnapshot = userSnap.data()?.onboarding as Partial<OnboardingData> | undefined;
                        resolvedSnapshot = remoteSnapshot ?? localSnapshot;
                    } catch (error) {
                        console.warn('Failed to load onboarding profile snapshot:', error);
                    }
                }

                if (isMounted) {
                    setOnboardingData(resolvedSnapshot);
                }
            } catch (error) {
                console.warn('Failed to load local onboarding snapshot:', error);
                if (isMounted) {
                    setOnboardingData(null);
                }
            } finally {
                if (isMounted) {
                    setIsLoadingProfile(false);
                }
            }
        };

        loadOnboardingData();

        return () => {
            isMounted = false;
        };
    }, [userState.isLoading, userState.user?.uid]);

    const normalizedRoutines = useMemo(
        () => normalizeWeeklyRoutine(onboardingData?.routines),
        [onboardingData?.routines]
    );

    const profileName = onboardingData?.profile?.name?.trim() || 'Kullanıcı';
    useEffect(() => {
        if (!isEditingName) {
            setNameDraft(profileName);
        }
    }, [isEditingName, profileName]);

    const members = useMemo(() => buildProfileMembers(onboardingData, profileName, normalizedRoutines), [
        onboardingData,
        profileName,
        normalizedRoutines,
    ]);

    const dietaryRestrictions = mapSelectedItems(onboardingData?.dietary?.restrictions, DIETARY_RESTRICTIONS);
    const allergies = mapSelectedItems(onboardingData?.dietary?.allergies, COMMON_ALLERGIES);
    const selectedCuisines = mapSelectedItems(onboardingData?.cuisine?.selected, CUISINES);
    const selectedEquipment = mapSelectedItems(onboardingData?.cooking?.equipment, EQUIPMENT);

    const timePreferenceMeta =
        onboardingData?.cooking?.timePreference ? TIME_OPTIONS[onboardingData.cooking.timePreference] : TIME_OPTIONS.balanced;
    const skillLevelMeta =
        onboardingData?.cooking?.skillLevel ? SKILL_LEVELS[onboardingData.cooking.skillLevel] : SKILL_LEVELS.intermediate;

    const hasAnyOnboardingData = Boolean(
        onboardingData?.profile?.name ||
            onboardingData?.members?.length ||
            onboardingData?.dietary?.restrictions?.length ||
            onboardingData?.dietary?.allergies?.length ||
            onboardingData?.cuisine?.selected?.length ||
            onboardingData?.cooking?.equipment?.length
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <TabScreenHeader title="Profil" />

            {isLoadingProfile ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Profil bilgileri yükleniyor...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <MaterialCommunityIcons name="account" size={44} color={colors.primary} />
                        </View>
                        {isEditingName ? (
                            <View style={styles.nameEditorRow}>
                                <TextInput
                                    value={nameDraft}
                                    onChangeText={setNameDraft}
                                    placeholder="İsminiz"
                                    placeholderTextColor={colors.textMuted}
                                    style={styles.nameInput}
                                    editable={!isSavingName}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    returnKeyType="done"
                                    onSubmitEditing={handleSaveName}
                                />
                                <TouchableOpacity
                                    style={[styles.nameActionButton, isSavingName && styles.nameActionButtonDisabled]}
                                    onPress={handleSaveName}
                                    disabled={isSavingName}
                                    activeOpacity={0.9}
                                >
                                    {isSavingName ? (
                                        <ActivityIndicator size="small" color={colors.textInverse} />
                                    ) : (
                                        <MaterialCommunityIcons name="check" size={20} color={colors.textInverse} />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.nameActionButtonSecondary}
                                    onPress={handleCancelEditName}
                                    disabled={isSavingName}
                                    activeOpacity={0.9}
                                >
                                    <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.avatarNameRow}>
                                <Text style={styles.avatarName}>{profileName}</Text>
                                <TouchableOpacity
                                    style={styles.editNameButton}
                                    onPress={handleStartEditName}
                                    activeOpacity={0.9}
                                >
                                    <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {!hasAnyOnboardingData && (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconBadge}>
                                <MaterialCommunityIcons name="clipboard-text-outline" size={18} color={colors.primary} />
                            </View>
                            <View style={styles.emptyContent}>
                                <Text style={styles.emptyTitle}>Onboarding verisi bulunamadı</Text>
                                <Text style={styles.emptyText}>
                                    Onboarding&apos;i tekrar tamamladığınızda tüm tercihlerinizi burada görebileceksiniz.
                                </Text>
                            </View>
                        </View>
                    )}

                    {hasAnyOnboardingData && (
                        <>
                            <TouchableOpacity
                                style={styles.editPreferencesButton}
                                onPress={handleOpenPreferencesEdit}
                                activeOpacity={0.9}
                            >
                                <View style={styles.editPreferencesIconBadge}>
                                    <MaterialCommunityIcons name="tune-variant" size={18} color={colors.primary} />
                                </View>
                                <Text style={styles.editPreferencesText}>Tercihleri Değiştir</Text>
                                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                            </TouchableOpacity>

                            <SectionCard title="Haftalık Rutinler" icon="calendar-check-outline">
                                <View style={styles.routineList}>
                                    {members.map((member) => (
                                        <View key={`${member.id}-routine`} style={styles.routineMemberBlock}>
                                            <View style={styles.routineDays}>
                                                {DAY_ORDER.map((day) => {
                                                    const routineForDay = member.routines[day.key];
                                                    const type = routineForDay?.type ?? 'remote';
                                                    return (
                                                        <View key={`${member.id}-${day.key}`} style={styles.routineRow}>
                                                            <Text style={styles.routineDayLabel}>{day.label}</Text>
                                                            <RoutinePill type={type} />
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </SectionCard>

                            <SectionCard title="Diyet & Alerji" icon="food-apple-outline">
                                <PreferenceBlock
                                    title="Beslenme tercihleri"
                                    items={dietaryRestrictions}
                                    emptyText="Belirtilmedi"
                                />
                                <PreferenceBlock title="Alerjiler" items={allergies} emptyText="Belirtilmedi" />
                            </SectionCard>

                            <SectionCard title="Mutfak Tercihleri" icon="silverware-fork-knife">
                                <PreferenceBlock
                                    title="Seçilen mutfaklar"
                                    items={selectedCuisines}
                                    emptyText="Farketmez"
                                />
                            </SectionCard>

                            <SectionCard title="Yemek Yapma Tercihleri" icon="chef-hat">
                                <View style={styles.cookingMetaRow}>
                                    <OptionSummaryCard
                                        label="Süre"
                                        emoji={timePreferenceMeta.emoji}
                                        value={timePreferenceMeta.label}
                                        description={timePreferenceMeta.description}
                                    />
                                    <OptionSummaryCard
                                        label="Deneyim"
                                        emoji={skillLevelMeta.emoji}
                                        value={skillLevelMeta.label}
                                        description={skillLevelMeta.description}
                                    />
                                </View>
                                <PreferenceBlock
                                    title="Ekipmanlar"
                                    items={selectedEquipment}
                                    emptyText="Standart ekipmanlar"
                                />
                            </SectionCard>
                        </>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ayarlar</Text>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                if (isPremium) {
                                    restorePurchases();
                                } else {
                                    presentPaywall();
                                }
                            }}
                            activeOpacity={0.9}
                        >
                            <View style={styles.menuItemContent}>
                                <View style={styles.menuIconBadge}>
                                    <MaterialCommunityIcons name="star-circle" size={18} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.menuItemText}>Üyelik</Text>
                                    <Text style={styles.menuItemSubtext}>
                                        {isPremium ? 'Omnoo Unlimited' : 'Ücretsiz plan'}
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleResetOnboarding} activeOpacity={0.9}>
                            <View style={styles.menuItemContent}>
                                <View style={styles.menuIconBadge}>
                                    <MaterialCommunityIcons name="restart" size={18} color={colors.primary} />
                                </View>
                                <Text style={styles.menuItemText}>Onboarding&apos;i Sıfırla</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

type ProfileMember = {
    id: string;
    name: string;
    routines: WeeklyRoutine;
};

function SectionCard({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardIconBadge}>
                    <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.cardBody}>{children}</View>
        </View>
    );
}

function PreferenceBlock({ title, items, emptyText }: { title: string; items: LabeledEmojiItem[]; emptyText: string }) {
    return (
        <View style={styles.preferenceBlock}>
            <Text style={styles.preferenceTitle}>{title}</Text>
            {items.length ? (
                <View style={styles.tagList}>
                    {items.map((item) => (
                        <TagChip key={`${title}-${item.key}`} label={item.label} emoji={item.emoji} />
                    ))}
                </View>
            ) : (
                <Text style={styles.preferenceEmpty}>{emptyText}</Text>
            )}
        </View>
    );
}

function TagChip({ label, emoji }: { label: string; emoji?: string }) {
    return (
        <View style={styles.tagChip}>
            {emoji ? <Text style={styles.tagEmoji}>{emoji}</Text> : null}
            <Text style={styles.tagLabel}>{label}</Text>
        </View>
    );
}

function RoutinePill({ type }: { type: RoutineDay['type'] }) {
    const meta = ROUTINE_TYPE_META[type];
    return (
        <View style={[styles.routinePill, { backgroundColor: meta.tint }]}>
            <Text style={styles.routinePillEmoji}>{meta.emoji}</Text>
            <Text style={[styles.routinePillLabel, { color: meta.textColor }]}>{meta.label}</Text>
        </View>
    );
}

function OptionSummaryCard({
    label,
    value,
    description,
    emoji,
}: {
    label: string;
    value: string;
    description: string;
    emoji?: string;
}) {
    return (
        <View style={styles.optionCard}>
            <View style={styles.optionCardHeader}>
                {emoji ? <Text style={styles.optionEmoji}>{emoji}</Text> : null}
                <Text style={styles.optionLabel}>{label}</Text>
            </View>
            <Text style={styles.optionValue}>{value}</Text>
            <Text style={styles.optionDescription}>{description}</Text>
        </View>
    );
}

function mapSelectedItems(selectedKeys: string[] | undefined, catalog: LabeledEmojiItem[]): LabeledEmojiItem[] {
    if (!selectedKeys?.length) {
        return [];
    }
    const selectedSet = new Set(selectedKeys);
    const knownItems = catalog.filter((item) => selectedSet.has(item.key));
    const knownKeys = new Set(knownItems.map((item) => item.key));
    const fallbackItems = selectedKeys.filter((key) => !knownKeys.has(key)).map((key) => ({ key, label: key }));
    return [...knownItems, ...fallbackItems];
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

function buildProfileMembers(
    data: Partial<OnboardingData> | null,
    fallbackName: string,
    fallbackRoutine: WeeklyRoutine
): ProfileMember[] {
    const members = data?.members ?? [];
    if (!members.length) {
        return [
            {
                id: 'self',
                name: fallbackName,
                routines: fallbackRoutine,
            },
        ];
    }

    return members.map((member, index) => {
        const resolvedName = member.name?.trim() || `Kişi ${index + 1}`;
        const memberRoutine = normalizeWeeklyRoutine(member.routines ?? data?.routines ?? fallbackRoutine);

        return {
            id: member.id || `member-${index + 1}`,
            name: resolvedName,
            routines: memberRoutine,
        };
    });
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
    },
    avatarContainer: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        gap: spacing.xs,
    },
    avatar: {
        width: 104,
        height: 104,
        backgroundColor: colors.primaryLight + '18',
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.primaryLight + '35',
        ...shadows.sm,
    },
    avatarName: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    avatarNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    editNameButton: {
        width: 40,
        height: 40,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primaryLight + '18',
        borderWidth: 1,
        borderColor: colors.primaryLight + '32',
    },
    nameEditorRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    nameInput: {
        flex: 1,
        minHeight: 44,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        ...typography.body,
        color: colors.textPrimary,
    },
    nameActionButton: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
    },
    nameActionButtonDisabled: {
        opacity: 0.6,
    },
    nameActionButtonSecondary: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    section: {
        gap: spacing.sm,
    },
    sectionTitle: {
        ...typography.label,
        color: colors.textMuted,
    },
    editPreferencesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surface,
        ...shadows.sm,
    },
    editPreferencesIconBadge: {
        width: 36,
        height: 36,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primaryLight + '18',
        borderWidth: 1,
        borderColor: colors.primaryLight + '32',
    },
    editPreferencesText: {
        flex: 1,
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
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
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    cardIconBadge: {
        width: 36,
        height: 36,
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight + '18',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.primaryLight + '32',
    },
    cardTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    cardBody: {
        gap: spacing.md,
    },
    routineList: {
        gap: spacing.md,
    },
    routineMemberBlock: {
        gap: spacing.sm,
    },
    routineDays: {
        gap: spacing.xs,
    },
    routineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
    },
    routineDayLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
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
        minWidth: 96,
        justifyContent: 'center',
    },
    routinePillEmoji: {
        fontSize: 14,
    },
    routinePillLabel: {
        ...typography.caption,
        fontWeight: '600',
    },
    preferenceBlock: {
        gap: spacing.sm,
    },
    preferenceTitle: {
        ...typography.label,
        color: colors.textPrimary,
    },
    preferenceEmpty: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    tagList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    tagEmoji: {
        fontSize: 14,
    },
    tagLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    cookingMetaRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    optionCard: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.md,
        gap: spacing.xs,
    },
    optionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    optionEmoji: {
        fontSize: 16,
    },
    optionLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    optionValue: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    optionDescription: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flexShrink: 1,
    },
    menuIconBadge: {
        width: 36,
        height: 36,
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight + '18',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.primaryLight + '32',
    },
    menuItemText: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    menuItemSubtext: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
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
    emptyCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    emptyIconBadge: {
        width: 36,
        height: 36,
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight + '18',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.primaryLight + '32',
    },
    emptyContent: {
        flex: 1,
        gap: spacing.xs,
    },
    emptyTitle: {
        ...typography.label,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    emptyText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
});
