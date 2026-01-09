import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { Button } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

export default function ReadyScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance animations
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleStart = () => {
        dispatch({ type: 'COMPLETE_ONBOARDING' });
        router.replace('/');
    };

    const userName = state.data.profile?.name || 'Merhaba';
    const cuisineCount = state.data.cuisine?.selected?.length || 0;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
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
                        Tercihleriniz kaydedildi. Artık size ve ailenize özel yemek planları
                        oluşturmaya hazırız.
                    </Text>
                </Animated.View>

                {/* Summary Cards */}
                <Animated.View style={[styles.summaryContainer, { opacity: fadeAnim }]}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIcon}>
                            <Text style={styles.summaryEmoji}>👥</Text>
                        </View>
                        <View style={styles.summaryContent}>
                            <Text style={styles.summaryLabel}>Hane halkı</Text>
                            <Text style={styles.summaryValue}>
                                {state.data.householdSize || 1} kişi
                            </Text>
                        </View>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIcon}>
                            <Text style={styles.summaryEmoji}>🍽️</Text>
                        </View>
                        <View style={styles.summaryContent}>
                            <Text style={styles.summaryLabel}>Mutfak tercihleri</Text>
                            <Text style={styles.summaryValue}>
                                {cuisineCount} mutfak seçildi
                            </Text>
                        </View>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIcon}>
                            <Text style={styles.summaryEmoji}>⏱️</Text>
                        </View>
                        <View style={styles.summaryContent}>
                            <Text style={styles.summaryLabel}>Yemek süresi</Text>
                            <Text style={styles.summaryValue}>
                                {state.data.cooking?.timePreference === 'quick' ? 'Hızlı' :
                                    state.data.cooking?.timePreference === 'elaborate' ? 'Detaylı' : 'Dengeli'}
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            </View>

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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
    },
    successContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
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
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
});
