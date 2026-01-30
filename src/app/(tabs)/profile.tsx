import { type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore, { doc, getDoc, updateDoc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { Button, TabScreenHeader } from '../../components/ui';
import { useUser } from '../../contexts/user-context';
import { usePremium } from '../../contexts/premium-context';
import { useLanguage } from '../../contexts/language-context';
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
    labelKey: string;
    emoji?: string;
};

type RoutineTypeMeta = {
    labelKey: string;
    emoji: string;
    tint: string;
    textColor: string;
};

const DAY_ORDER: Array<keyof WeeklyRoutine> = [
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

const ROUTINE_TYPE_META: Record<RoutineDay['type'], RoutineTypeMeta> = {
    office: {
        labelKey: 'preferences.routineTypes.office',
        emoji: '🏢',
        tint: colors.surfaceMuted,
        textColor: colors.textSecondary,
    },
    remote: {
        labelKey: 'preferences.routineTypes.remote',
        emoji: '🏠',
        tint: colors.accentSoft,
        textColor: colors.primaryDark,
    },
    gym: {
        labelKey: 'preferences.routineTypes.gym',
        emoji: '💪',
        tint: colors.primaryLight + '20',
        textColor: colors.primaryDark,
    },
    school: {
        labelKey: 'preferences.routineTypes.school',
        emoji: '📚',
        tint: colors.warningLight,
        textColor: colors.warning,
    },
    off: {
        labelKey: 'preferences.routineTypes.off',
        emoji: '🌴',
        tint: colors.borderLight,
        textColor: colors.textMuted,
    },
};

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
    { key: 'turkish', labelKey: 'preferences.cuisines.turkish', emoji: '🇹🇷' },
    { key: 'mediterranean', labelKey: 'preferences.cuisines.mediterranean', emoji: '🫒' },
    { key: 'italian', labelKey: 'preferences.cuisines.italian', emoji: '🍝' },
    { key: 'asian', labelKey: 'preferences.cuisines.asian', emoji: '🍜' },
    { key: 'middle-eastern', labelKey: 'preferences.cuisines.middleEastern', emoji: '🧆' },
    { key: 'mexican', labelKey: 'preferences.cuisines.mexican', emoji: '🌮' },
    { key: 'indian', labelKey: 'preferences.cuisines.indian', emoji: '🍛' },
    { key: 'french', labelKey: 'preferences.cuisines.french', emoji: '🥐' },
    { key: 'japanese', labelKey: 'preferences.cuisines.japanese', emoji: '🍱' },
    { key: 'chinese', labelKey: 'preferences.cuisines.chinese', emoji: '🥡' },
    { key: 'thai', labelKey: 'preferences.cuisines.thai', emoji: '🍜' },
    { key: 'american', labelKey: 'preferences.cuisines.american', emoji: '🍔' },
];

const TIME_OPTIONS: Record<
    NonNullable<OnboardingData['cooking']>['timePreference'],
    LabeledEmojiItem & { descriptionKey: string }
> = {
    quick: { key: 'quick', labelKey: 'preferences.timeOptions.quick.label', descriptionKey: 'preferences.timeOptions.quick.description', emoji: '⚡' },
    balanced: { key: 'balanced', labelKey: 'preferences.timeOptions.balanced.label', descriptionKey: 'preferences.timeOptions.balanced.description', emoji: '⏱️' },
    elaborate: { key: 'elaborate', labelKey: 'preferences.timeOptions.elaborate.label', descriptionKey: 'preferences.timeOptions.elaborate.description', emoji: '👨‍🍳' },
};

const SKILL_LEVELS: Record<
    NonNullable<OnboardingData['cooking']>['skillLevel'],
    LabeledEmojiItem & { descriptionKey: string }
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

export default function ProfileScreen() {
    const router = useRouter();
    const { state: userState } = useUser();
    const { isPremium, openCustomerCenter } = usePremium();
    const { language, setLanguage, t } = useLanguage();
    const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData> | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);
    const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);

    const languageOptions = useMemo(
        () => [
            { key: 'tr' as const, label: t('language.tr') },
            { key: 'en' as const, label: t('language.en') },
        ],
        [t]
    );
    const languageLabel = languageOptions.find((option) => option.key === language)?.label ?? language;

    const handleResetOnboarding = async () => {
        Alert.alert(
            t('settings.resetTitle'),
            t('settings.resetMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('settings.resetConfirm'),
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
            Alert.alert(t('profile.nameRequiredTitle'), t('profile.nameRequiredMessage'));
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
            Alert.alert(t('profile.updateFailedTitle'), t('profile.updateFailedMessage'));
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

    const profileName = onboardingData?.profile?.name?.trim() || t('profile.defaultName');
    useEffect(() => {
        if (!isEditingName) {
            setNameDraft(profileName);
        }
    }, [isEditingName, profileName]);

    const members = useMemo(
        () =>
            buildProfileMembers(
                onboardingData,
                profileName,
                normalizedRoutines,
                (index) => t('profile.memberName', { index })
            ),
        [onboardingData, profileName, normalizedRoutines, t]
    );

    const resolveCatalogItems = useCallback(
        (items: LabeledEmojiItem[]) =>
            items.map((item) => ({
                key: item.key,
                label: t(item.labelKey),
                emoji: item.emoji,
            })),
        [t]
    );

    const dietaryCatalog = useMemo(() => resolveCatalogItems(DIETARY_RESTRICTIONS), [resolveCatalogItems]);
    const allergyCatalog = useMemo(() => resolveCatalogItems(COMMON_ALLERGIES), [resolveCatalogItems]);
    const cuisineCatalog = useMemo(() => resolveCatalogItems(CUISINES), [resolveCatalogItems]);
    const equipmentCatalog = useMemo(() => resolveCatalogItems(EQUIPMENT), [resolveCatalogItems]);

    const dietaryRestrictions = mapSelectedItems(onboardingData?.dietary?.restrictions, dietaryCatalog);
    const allergies = mapSelectedItems(onboardingData?.dietary?.allergies, allergyCatalog);
    const selectedCuisines = mapSelectedItems(onboardingData?.cuisine?.selected, cuisineCatalog);
    const selectedEquipment = mapSelectedItems(onboardingData?.cooking?.equipment, equipmentCatalog);

    const timePreferenceKey = onboardingData?.cooking?.timePreference ?? 'balanced';
    const skillLevelKey = onboardingData?.cooking?.skillLevel ?? 'intermediate';
    const timePreferenceMeta = TIME_OPTIONS[timePreferenceKey];
    const skillLevelMeta = SKILL_LEVELS[skillLevelKey];

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
            <TabScreenHeader title={t('profile.title')} />

            {isLoadingProfile ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>{t('profile.loading')}</Text>
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
                                    placeholder={t('profile.namePlaceholder')}
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
                                <Text style={styles.emptyTitle}>{t('profile.emptyTitle')}</Text>
                                <Text style={styles.emptyText}>
                                    {t('profile.emptyText')}
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
                                <Text style={styles.editPreferencesText}>{t('profile.editPreferences')}</Text>
                                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                            </TouchableOpacity>

                            <SectionCard title={t('profile.weeklyRoutines')} icon="calendar-check-outline">
                                <View style={styles.routineList}>
                                    {members.map((member) => (
                                        <View key={`${member.id}-routine`} style={styles.routineMemberBlock}>
                                            <View style={styles.routineDays}>
                                                {DAY_ORDER.map((dayKey) => {
                                                    const routineForDay = member.routines[dayKey];
                                                    const type = routineForDay?.type ?? 'remote';
                                                    return (
                                                        <View key={`${member.id}-${dayKey}`} style={styles.routineRow}>
                                                            <Text style={styles.routineDayLabel}>
                                                                {t(`preferences.days.${dayKey}`)}
                                                            </Text>
                                                            <RoutinePill type={type} />
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </SectionCard>

                            <SectionCard title={t('profile.dietary')} icon="food-apple-outline">
                                <PreferenceBlock
                                    title={t('profile.dietaryPreferences')}
                                    items={dietaryRestrictions}
                                    emptyText={t('profile.empty.unspecified')}
                                />
                                <PreferenceBlock
                                    title={t('profile.allergies')}
                                    items={allergies}
                                    emptyText={t('profile.empty.unspecified')}
                                />
                            </SectionCard>

                            <SectionCard title={t('profile.cuisine')} icon="silverware-fork-knife">
                                <PreferenceBlock
                                    title={t('profile.selectedCuisines')}
                                    items={selectedCuisines}
                                    emptyText={t('profile.empty.any')}
                                />
                            </SectionCard>

                            <SectionCard title={t('profile.cooking')} icon="chef-hat">
                                <View style={styles.cookingMetaRow}>
                                    <OptionSummaryCard
                                        label={t('profile.cookingTime')}
                                        emoji={timePreferenceMeta.emoji}
                                        value={t(timePreferenceMeta.labelKey)}
                                        description={t(timePreferenceMeta.descriptionKey)}
                                    />
                                    <OptionSummaryCard
                                        label={t('profile.cookingSkill')}
                                        emoji={skillLevelMeta.emoji}
                                        value={t(skillLevelMeta.labelKey)}
                                        description={t(skillLevelMeta.descriptionKey)}
                                    />
                                </View>
                                <PreferenceBlock
                                    title={t('profile.equipment')}
                                    items={selectedEquipment}
                                    emptyText={t('profile.empty.standardEquipment')}
                                />
                            </SectionCard>
                        </>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('settings.title')}</Text>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                if (isPremium) {
                                    openCustomerCenter();
                                    return;
                                }
                                router.push({ pathname: '/(onboarding)/paywall', params: { source: 'settings' } });
                            }}
                            activeOpacity={0.9}
                        >
                            <View style={styles.menuItemContent}>
                                <View style={styles.menuIconBadge}>
                                    <MaterialCommunityIcons name="star-circle" size={18} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.menuItemText}>{t('settings.membership')}</Text>
                                    <Text style={styles.menuItemSubtext}>
                                        {isPremium ? t('settings.premiumPlan') : t('settings.freePlan')}
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => setLanguageModalVisible(true)}
                            activeOpacity={0.9}
                        >
                            <View style={styles.menuItemContent}>
                                <View style={styles.menuIconBadge}>
                                    <MaterialCommunityIcons name="translate" size={18} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.menuItemText}>{t('language.title')}</Text>
                                    <Text style={styles.menuItemSubtext}>{languageLabel}</Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleResetOnboarding} activeOpacity={0.9}>
                            <View style={styles.menuItemContent}>
                                <View style={styles.menuIconBadge}>
                                    <MaterialCommunityIcons name="restart" size={18} color={colors.primary} />
                                </View>
                                <Text style={styles.menuItemText}>{t('settings.resetOnboarding')}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}

            <Modal
                visible={isLanguageModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setLanguageModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{t('language.modalTitle')}</Text>
                        <Text style={styles.modalSubtitle}>{t('language.description')}</Text>

                        <View style={styles.languageList}>
                            {languageOptions.map((option) => {
                                const isSelected = option.key === language;
                                return (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[styles.languageRow, isSelected && styles.languageRowSelected]}
                                        onPress={() => setLanguage(option.key)}
                                        activeOpacity={0.9}
                                    >
                                        <Text style={styles.languageLabel}>{option.label}</Text>
                                        {isSelected ? (
                                            <MaterialCommunityIcons
                                                name="check-circle"
                                                size={20}
                                                color={colors.primary}
                                            />
                                        ) : (
                                            <MaterialCommunityIcons
                                                name="circle-outline"
                                                size={20}
                                                color={colors.textMuted}
                                            />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Button
                            title={t('common.ok')}
                            onPress={() => setLanguageModalVisible(false)}
                            fullWidth
                        />
                    </View>
                </View>
            </Modal>
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

function PreferenceBlock({ title, items, emptyText }: { title: string; items: ResolvedEmojiItem[]; emptyText: string }) {
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
    const { t } = useLanguage();
    return (
        <View style={[styles.routinePill, { backgroundColor: meta.tint }]}>
            <Text style={styles.routinePillEmoji}>{meta.emoji}</Text>
            <Text style={[styles.routinePillLabel, { color: meta.textColor }]}>
                {t(meta.labelKey)}
            </Text>
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

type ResolvedEmojiItem = {
    key: string;
    label: string;
    emoji?: string;
};

function mapSelectedItems(selectedKeys: string[] | undefined, catalog: ResolvedEmojiItem[]): ResolvedEmojiItem[] {
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
    fallbackRoutine: WeeklyRoutine,
    resolveMemberName: (index: number) => string
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
        const resolvedName = member.name?.trim() || resolveMemberName(index + 1);
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
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.lg,
        gap: spacing.md,
        ...shadows.md,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    modalSubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    languageList: {
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    languageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surfaceAlt,
    },
    languageRowSelected: {
        borderColor: colors.primaryLight,
        backgroundColor: colors.primaryLight + '12',
    },
    languageLabel: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
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
