import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { Button } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

const CUISINES = [
    { key: 'turkish', label: 'Türk' },
    { key: 'mediterranean', label: 'Akdeniz' },
    { key: 'italian', label: 'İtalyan' },
    { key: 'asian', label: 'Asya' },
    { key: 'middle-eastern', label: 'Ortadoğu' },
    { key: 'mexican', label: 'Meksika' },
    { key: 'indian', label: 'Hint' },
    { key: 'french', label: 'Fransız' },
    { key: 'japanese', label: 'Japon' },
    { key: 'chinese', label: 'Çin' },
    { key: 'thai', label: 'Tayland' },
    { key: 'american', label: 'Amerikan' },
];

const EQUIPMENT = [
    { key: 'oven', label: 'Fırın' },
    { key: 'blender', label: 'Blender' },
    { key: 'airfryer', label: 'Airfryer' },
    { key: 'pressure-cooker', label: 'Düdüklü' },
    { key: 'mixer', label: 'Mikser' },
    { key: 'grill', label: 'Izgara' },
];

export default function ReadyScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();

    // Animations
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Staggered anims for cards (4 cards now instead of 5)
    const card1Anim = useRef(new Animated.Value(0)).current;
    const card2Anim = useRef(new Animated.Value(0)).current;
    const card3Anim = useRef(new Animated.Value(0)).current;
    const card4Anim = useRef(new Animated.Value(0)).current;


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

    const handleStart = () => {
        dispatch({ type: 'SET_STEP', payload: 10 });
        router.push('/(onboarding)/processing');
    };

    const handleBack = () => {
        router.back();
    };

    const userName = state.data.profile?.name || 'Merhaba';
    const selectedCuisines = state.data.cuisine?.selected || [];
    const dietaryRestrictions = state.data.dietary?.restrictions?.length || 0;
    const allergies = state.data.dietary?.allergies?.length || 0;
    const selectedEquipment = state.data.cooking?.equipment || [];

    // Helper function to format list with +N
    const formatListWithMore = (keys: string[], lookup: { key: string; label: string }[], maxShow: number = 2) => {
        if (keys.length === 0) return '';
        const labels = keys.map(key => lookup.find(item => item.key === key)?.label || key);
        const shown = labels.slice(0, maxShow).join(', ');
        const remaining = labels.length - maxShow;
        return remaining > 0 ? `${shown} +${remaining}` : shown;
    };

    const cuisineDisplay = selectedCuisines.length > 0
        ? formatListWithMore(selectedCuisines, CUISINES, 2)
        : 'Farketmez';

    const equipmentDisplay = selectedEquipment.length > 0
        ? formatListWithMore(selectedEquipment, EQUIPMENT, 3)
        : 'Standart ekipmanlar';

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
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
                    <View style={styles.successCircle}>
                        <Text style={styles.successEmoji}>🎉</Text>
                    </View>
                </Animated.View>

                {/* Message */}
                <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
                    <Text style={styles.title}>Hazırsınız, {userName}!</Text>
                    <Text style={styles.subtitle}>
                        Tercihleriniz kaydedildi. Artık size özel yemek planları oluşturmaya hazırız.
                    </Text>
                </Animated.View>

                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                    <SummaryCard
                        anim={card1Anim}
                        emoji="🍽️"
                        label="Mutfak tercihleri"
                        value={cuisineDisplay}
                    />
                    <SummaryCard
                        anim={card2Anim}
                        emoji="🥗"
                        label="Diyet & Alerji"
                        value={
                            dietaryRestrictions + allergies > 0
                                ? `${dietaryRestrictions} kısıtlama, ${allergies} alerji`
                                : 'Herhangi bir kısıtlama yok'
                        }
                    />
                    <SummaryCard
                        anim={card3Anim}
                        emoji="⏱️"
                        label="Yemek Süresi"
                        value={state.data.cooking?.timePreference === 'quick' ? 'Hızlı ve Pratik' :
                            state.data.cooking?.timePreference === 'elaborate' ? 'Detaylı ve Gurme' : 'Dengeli'}
                    />
                    <SummaryCard
                        anim={card4Anim}
                        emoji="🍳"
                        label="Mutfak Ekipmanı"
                        value={equipmentDisplay}
                    />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Planlamaya Başla"
                    onPress={handleStart}
                    fullWidth
                    size="large"
                />
            </View>
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
    successCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primaryLight + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successEmoji: {
        fontSize: 64,
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
