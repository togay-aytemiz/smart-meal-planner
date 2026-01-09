import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useOnboarding } from '../../contexts/onboarding-context';

export default function PaywallScreen() {
    const router = useRouter();
    const { dispatch } = useOnboarding();
    const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');

    // Simple pulse animation for the badge
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const handleContinue = () => {
        dispatch({ type: 'SET_STEP', payload: 13 });
        router.push('/(onboarding)/auth');
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.title}>En iyi haline{'\n'}merhaba de.</Text>
                    <Text style={styles.subtitle}>
                    </Text>
                </View>

                {/* Benefits List */}
                <View style={styles.benefitsContainer}>
                    <BenefitRow
                        icon="chef-hat"
                        title="Sınırsız AI Şef"
                        desc="Sana özel, dolabındakilerle anlık tarifler yarat."
                    />
                    <BenefitRow
                        icon="chart-timeline-variant"
                        title="Akıllı Makro Takibi"
                        desc="Hedeflerine giden yolda besin değerlerini izle."
                    />
                    <BenefitRow
                        icon="barcode-scan"
                        title="Hızlı Ürün Ekleme"
                        desc="Barkod okutarak dolabını saniyeler içinde doldur."
                    />
                </View>

                <Text style={styles.planLabel}>Deneme süresi için plan seçin:</Text>

                {/* Plans Row */}
                <View style={styles.plansRow}>
                    {/* Yearly Plan */}
                    <TouchableOpacity
                        style={[styles.planCard, selectedPlan === 'yearly' && styles.selectedCard]}
                        onPress={() => setSelectedPlan('yearly')}
                        activeOpacity={0.9}
                    >
                        <Animated.View style={[styles.badgeContainer, { transform: [{ scale: scaleAnim }] }]}>
                            <Text style={styles.badgeText}>%62 TASARRUF</Text>
                        </Animated.View>

                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>YILLIK</Text>
                            {selectedPlan === 'yearly' ? (
                                <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
                            ) : (
                                <MaterialCommunityIcons name="circle-outline" size={24} color={colors.textMuted} />
                            )}
                        </View>

                        <Text style={styles.priceText}>₺39.99<Text style={styles.pricePeriod}>/ay</Text></Text>
                        <Text style={styles.secondaryPrice}>₺479.99/yıl</Text>
                        <Text style={styles.billingText}>7 gün sonra faturalanır</Text>
                    </TouchableOpacity>

                    {/* Monthly Plan */}
                    <TouchableOpacity
                        style={[styles.planCard, selectedPlan === 'monthly' && styles.selectedCard]}
                        onPress={() => setSelectedPlan('monthly')}
                        activeOpacity={0.9}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>AYLIK</Text>
                            {selectedPlan === 'monthly' ? (
                                <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
                            ) : (
                                <MaterialCommunityIcons name="circle-outline" size={24} color={colors.textMuted} />
                            )}
                        </View>

                        <Text style={styles.priceText}>₺79.99<Text style={styles.pricePeriod}>/ay</Text></Text>
                        <Text style={styles.billingText}>7 gün sonra faturalanır</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.cancelText}>Planı istediğin zaman değiştirebilir veya iptal edebilirsin.</Text>

            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <Button
                    title="7 Gün Ücretsiz Dene"
                    onPress={handleContinue}
                    fullWidth
                    size="large"
                />
                <Button
                    title="Şimdilik Geç"
                    onPress={handleContinue}
                    variant="ghost"
                    size="small"
                    style={{ marginTop: spacing.xs }}
                />
            </View>
        </SafeAreaView>
    );
}

function BenefitRow({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <View style={styles.benefitRow}>
            <MaterialCommunityIcons name={icon} size={28} color={colors.warning} style={styles.benefitIcon} />
            <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>{title}</Text>
                <Text style={styles.benefitDesc}>{desc}</Text>
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
        paddingBottom: 120,
    },
    header: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    title: {
        ...typography.h1,
        fontSize: 32,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    benefitsContainer: {
        gap: spacing.lg,
        marginBottom: spacing.xl,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    benefitIcon: {
        marginTop: 2,
    },
    benefitContent: {
        flex: 1,
    },
    benefitTitle: {
        ...typography.body,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    benefitDesc: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    planLabel: {
        ...typography.h3,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    plansRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    planCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: 2,
        borderColor: colors.border,
        // justifyContent: 'space-between', // Removed to foster top alignment
        justifyContent: 'flex-start',
        minHeight: 160,
    },
    selectedCard: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '05',
    },
    badgeContainer: {
        position: 'absolute',
        top: -10,
        left: 12, // Align with left padding
        backgroundColor: colors.success,
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 6, // Square-ish rounded
        zIndex: 10,
    },
    badgeText: {
        ...typography.caption,
        color: '#FFF',
        fontWeight: '700',
        fontSize: 10,
        textTransform: 'uppercase',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
        marginTop: spacing.xs,
    },
    cardTitle: {
        ...typography.caption,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    priceText: {
        ...typography.h3,
        fontSize: 20,
        color: colors.textPrimary,
        marginBottom: 4, // Add spacing for alignment
    },
    pricePeriod: {
        ...typography.caption,
        color: colors.textMuted,
        fontWeight: '600',
        fontSize: 14,
        textTransform: 'lowercase',
    },
    secondaryPrice: {
        ...typography.caption,
        color: colors.textSecondary,
        fontSize: 12,
        marginBottom: 2,
    },
    billingText: {
        ...typography.caption,
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 'auto', // Push to bottom
    },
    cancelText: {
        ...typography.caption,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: spacing.sm,
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
