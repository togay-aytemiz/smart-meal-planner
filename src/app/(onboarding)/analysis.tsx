import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useOnboarding } from '../../contexts/onboarding-context';

export default function AnalysisScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleContinue = () => {
        dispatch({ type: 'SET_STEP', payload: 12 });
        router.push('/(onboarding)/paywall');
    };

    const userName = state.data.profile?.name || 'Size';
    // Mock logic for personalization text
    const goalText = "sağlıklı beslenme";

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <View style={styles.header}>
                        <MaterialCommunityIcons name="star-four-points" size={32} color={colors.primary} />
                        <Text style={styles.title}>İşte {userName} özel planın!</Text>
                        <Text style={styles.subtitle}>
                            Alışkanlıklarınıza ve hedeflerinize göre oluşturduğumuz örnek bir gün:
                        </Text>
                    </View>

                    {/* Sample Day Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Örnek Salı Günü</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>Mükemmel Uyum</Text>
                            </View>
                        </View>

                        <MealRow
                            time="Sabah"
                            title="Yulaflı Muzlu Bowl"
                            desc="Hızlı hazırlanan, enerji veren başlangıç."
                            icon="weather-sunset"
                        />
                        <View style={styles.divider} />
                        <MealRow
                            time="Öğle"
                            title="Izgara Tavuklu Kinoa Salatası"
                            desc="Ofiste kolayca yiyebileceğin hafif öğün."
                            icon="weather-sunny"
                        />
                        <View style={styles.divider} />
                        <MealRow
                            time="Akşam"
                            title="Fırında Sebzeli Somon"
                            desc="30 dakikada hazır, tüm aile için uygun."
                            icon="weather-night"
                        />

                        <View style={styles.cardFooter}>
                            <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                            <Text style={styles.footerText}>
                                {state.data.dietary?.restrictions?.length ? 'Diyet tercihlerinize uygun' : 'Besin değerleri dengelendi'}
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

function MealRow({ time, title, desc, icon }: { time: string, title: string, desc: string, icon: any }) {
    return (
        <View style={styles.mealRow}>
            <View style={styles.mealIcon}>
                <MaterialCommunityIcons name={icon} size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.mealContent}>
                <Text style={styles.mealTime}>{time}</Text>
                <Text style={styles.mealTitle}>{title}</Text>
                <Text style={styles.mealDesc}>{desc}</Text>
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
        paddingTop: spacing.sm, // Reduced from implicit padding: spacing.lg
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        marginTop: spacing.sm,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: spacing.sm,
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
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: colors.border,
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
        backgroundColor: colors.primaryLight + '30', // Transparent primary
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
    mealDesc: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
        marginLeft: 32, // Indent to align with text
    },
    cardFooter: {
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        justifyContent: 'center',
    },
    footerText: {
        ...typography.caption,
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
