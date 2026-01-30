import { View, Text, StyleSheet, Animated, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Button } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { useLanguage } from '../../contexts/language-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

const CUISINES = [
    { key: 'turkish', labelKey: 'preferences.cuisines.turkish' },
    { key: 'mediterranean', labelKey: 'preferences.cuisines.mediterranean' },
    { key: 'italian', labelKey: 'preferences.cuisines.italian' },
    { key: 'asian', labelKey: 'preferences.cuisines.asian' },
    { key: 'middle-eastern', labelKey: 'preferences.cuisines.middleEastern' },
    { key: 'mexican', labelKey: 'preferences.cuisines.mexican' },
    { key: 'indian', labelKey: 'preferences.cuisines.indian' },
    { key: 'french', labelKey: 'preferences.cuisines.french' },
    { key: 'japanese', labelKey: 'preferences.cuisines.japanese' },
    { key: 'chinese', labelKey: 'preferences.cuisines.chinese' },
    { key: 'thai', labelKey: 'preferences.cuisines.thai' },
    { key: 'american', labelKey: 'preferences.cuisines.american' },
];

const EQUIPMENT = [
    { key: 'oven', labelKey: 'preferences.equipment.oven' },
    { key: 'blender', labelKey: 'preferences.equipment.blender' },
    { key: 'airfryer', labelKey: 'preferences.equipment.airfryer' },
    { key: 'pressure-cooker', labelKey: 'preferences.equipment.pressureCooker' },
    { key: 'mixer', labelKey: 'preferences.equipment.mixer' },
    { key: 'grill', labelKey: 'preferences.equipment.grill' },
];

export default function ReadyScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const { t } = useLanguage();

    // Animations
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Staggered anims for cards (4 cards now instead of 5)
    const card1Anim = useRef(new Animated.Value(0)).current;
    const card2Anim = useRef(new Animated.Value(0)).current;
    const card3Anim = useRef(new Animated.Value(0)).current;
    const card4Anim = useRef(new Animated.Value(0)).current;


    useFocusEffect(
        useCallback(() => {
            // Set step to 9 (Ready) so header appears if we come back
            dispatch({ type: 'SET_STEP', payload: 9 });

            // Reset opacity to 1 when screen is focused
            Animated.timing(containerOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }, [])
    );

    useEffect(() => {
        // Entrance animations
        Animated.sequence([
            // 1. Success Circle Pop
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 80, // Faster spring
                friction: 6,
                useNativeDriver: true,
            }),
            // 2. Text Fade In
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300, // Faster Fade
                useNativeDriver: true,
            }),
            // 3. Staggered Cards (Faster)
            Animated.stagger(50, [ // 150ms -> 50ms stagger
                Animated.timing(card1Anim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(card2Anim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(card3Anim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(card4Anim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ])
        ]).start();
    }, []);

    const containerOpacity = useRef(new Animated.Value(1)).current;

    const handleStart = () => {
        Animated.timing(containerOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            dispatch({ type: 'SET_STEP', payload: 10 });
            router.push('/(onboarding)/processing');
        });
    };

    const handleBack = () => {
        router.back();
    };

    const userName = state.data.profile?.name || t('profile.defaultName');
    const selectedCuisines = state.data.cuisine?.selected || [];
    const dietaryRestrictions = state.data.dietary?.restrictions?.length || 0;
    const allergies = state.data.dietary?.allergies?.length || 0;
    const selectedEquipment = state.data.cooking?.equipment || [];

    // Helper function to format list with +N
    const formatListWithMore = (
        keys: string[],
        lookup: { key: string; labelKey: string }[],
        maxShow: number = 2
    ) => {
        if (keys.length === 0) return '';
        const labels = keys.map(key => {
            const match = lookup.find(item => item.key === key);
            return match ? t(match.labelKey) : key;
        });
        const shown = labels.slice(0, maxShow).join(', ');
        const remaining = labels.length - maxShow;
        return remaining > 0 ? `${shown} +${remaining}` : shown;
    };

    const cuisineDisplay = selectedCuisines.length > 0
        ? formatListWithMore(selectedCuisines, CUISINES, 2)
        : t('onboarding.ready.cuisineFallback');

    const equipmentDisplay = selectedEquipment.length > 0
        ? formatListWithMore(selectedEquipment, EQUIPMENT, 3)
        : t('onboarding.ready.equipmentFallback');

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Animated.View style={{ flex: 1, opacity: containerOpacity }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Success Animation */}
                    <Animated.View
                        style={[
                            styles.successContainer,
                            { transform: [{ scale: scaleAnim }] },
                        ]}
                    >
                        <Image
                            source={require('../../../assets/onboarding-ready.png')}
                            style={styles.successImage}
                            resizeMode="contain"
                        />
                    </Animated.View>

                    {/* Message */}
                    <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
                        <Text style={styles.title}>{t('onboarding.ready.title', { name: userName })}</Text>
                        <Text style={styles.subtitle}>
                            {t('onboarding.ready.subtitle')}
                        </Text>
                    </Animated.View>

                    {/* Summary Cards */}
                    <View style={styles.summaryContainer}>
                        <SummaryCard
                            anim={card1Anim}
                            emoji="🍽️"
                            label={t('onboarding.ready.cuisineLabel')}
                            value={cuisineDisplay}
                        />
                        <SummaryCard
                            anim={card2Anim}
                            emoji="🥗"
                            label={t('onboarding.ready.dietaryLabel')}
                            value={
                                dietaryRestrictions + allergies > 0
                                    ? t('onboarding.ready.dietarySummary.withCounts', {
                                        dietary: dietaryRestrictions,
                                        allergies,
                                    })
                                    : t('onboarding.ready.dietarySummary.empty')
                            }
                        />
                        <SummaryCard
                            anim={card3Anim}
                            emoji="⏱️"
                            label={t('onboarding.ready.timeLabel')}
                            value={state.data.cooking?.timePreference === 'quick'
                                ? t('onboarding.ready.timeSummary.quick')
                                : state.data.cooking?.timePreference === 'elaborate'
                                    ? t('onboarding.ready.timeSummary.elaborate')
                                    : t('onboarding.ready.timeSummary.balanced')}
                        />
                        <SummaryCard
                            anim={card4Anim}
                            emoji="🍳"
                            label={t('onboarding.ready.equipmentLabel')}
                            value={equipmentDisplay}
                        />
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <Button
                        title={t('onboarding.ready.cta')}
                        onPress={handleStart}
                        fullWidth
                        size="large"
                    />
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

function SummaryCard({ emoji, label, value, anim }: { emoji: string; label: string; value: string; anim: Animated.Value }) {
    return (
        <Animated.View
            style={[
                styles.summaryCard,
                {
                    opacity: anim,
                    transform: [{
                        translateY: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0]
                        })
                    }]
                }
            ]}
        >
            <View style={styles.summaryIcon}>
                <Text style={styles.summaryEmoji}>{emoji}</Text>
            </View>
            <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryValue}>{value}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: colors.surface,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 100,
    },
    successContainer: {
        alignItems: 'center',
        marginBottom: spacing.lg,
        marginTop: spacing.sm, // Reduced from md
    },
    successImage: {
        width: 140,
        height: 140,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        ...typography.h1,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
    },
    summaryContainer: {
        gap: spacing.sm,
    },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        gap: spacing.md,
    },
    summaryIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primaryLight + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryEmoji: {
        fontSize: 20,
    },
    summaryContent: {
        flex: 1,
    },
    summaryLabel: {
        ...typography.caption,
        color: colors.textMuted,
    },
    summaryValue: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
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
