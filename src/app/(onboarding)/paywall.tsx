import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image, ImageSourcePropType, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Purchases, { type PurchasesOffering, type PurchasesPackage } from 'react-native-purchases';
import { Button } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useOnboarding } from '../../contexts/onboarding-context';
import { usePremium } from '../../contexts/premium-context';

export default function PaywallScreen() {
    const router = useRouter();
    const { dispatch } = useOnboarding();
    const { presentPaywall, restorePurchases, openCustomerCenter, isPremium } = usePremium();
    const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('monthly');
    const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
    const [pricingError, setPricingError] = useState<string | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

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

    useEffect(() => {
        const loadOfferings = async () => {
            try {
                const offerings = await Purchases.getOfferings();
                setCurrentOffering(offerings.current ?? null);
            } catch (error) {
                console.warn('RevenueCat offerings error:', error);
                setPricingError('Fiyatlar yüklenemedi.');
            }
        };

        loadOfferings();
    }, []);

    const weeklyPackage = currentOffering?.availablePackages.find(
        (pkg) => pkg.packageType === Purchases.PACKAGE_TYPE.WEEKLY
    );
    const monthlyPackage = currentOffering?.availablePackages.find(
        (pkg) => pkg.packageType === Purchases.PACKAGE_TYPE.MONTHLY
    );

    const resolvePriceLabel = (pkg?: PurchasesPackage | null) =>
        pkg?.product?.priceString ? pkg.product.priceString : '—';

    const handlePurchase = async () => {
        if (isPurchasing) {
            return;
        }
        if (isPremium) {
            handleContinue();
            return;
        }
        setIsPurchasing(true);
        await presentPaywall();
        setIsPurchasing(false);
        if (isPremium) {
            handleContinue();
        }
    };

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
                    <Image
                        source={require('../../../assets/pw-superomnoo.png')}
                        style={styles.headerImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>En iyi haline{'\n'}merhaba de.</Text>
                    <Text style={styles.subtitle}>
                    </Text>
                </View>

                {/* Benefits List */}
                <View style={styles.benefitsContainer}>
                    <BenefitRow
                        image={require('../../../assets/pw-chef.png')}
                        title="Sınırsız AI Şef"
                        desc="Sadece sana özel tarifler."
                    />
                    <BenefitRow
                        image={require('../../../assets/pw-plan.png')}
                        title="Akıllı Haftalık Plan"
                        desc="Rutinine uygun otomatik plan."
                    />
                    <BenefitRow
                        image={require('../../../assets/pw-groc.png')}
                        title="Alışveriş Listesi"
                        desc="Saniyeler içinde hazır, eksiksiz alışveriş listesi."
                    />
                </View>

                <Text style={styles.planLabel}>Deneme süresi için plan seçin:</Text>
                {pricingError ? <Text style={styles.priceError}>{pricingError}</Text> : null}

                {/* Plans Row */}
                <View style={styles.plansRow}>
                    {/* Weekly Plan */}
                    <TouchableOpacity
                        style={[styles.planCard, selectedPlan === 'weekly' && styles.selectedCard]}
                        onPress={() => setSelectedPlan('weekly')}
                        activeOpacity={0.9}
                    >
                        <Animated.View style={[styles.badgeContainer, { transform: [{ scale: scaleAnim }] }]}>
                            <Text style={styles.badgeText}>ESNEK</Text>
                        </Animated.View>

                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>HAFTALIK</Text>
                            {selectedPlan === 'weekly' ? (
                                <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
                            ) : (
                                <MaterialCommunityIcons name="circle-outline" size={24} color={colors.textMuted} />
                            )}
                        </View>

                        <Text style={styles.priceText}>
                            {resolvePriceLabel(weeklyPackage)}
                            <Text style={styles.pricePeriod}>/hafta</Text>
                        </Text>
                        <Text style={styles.billingText}>İstediğin zaman iptal edebilirsin</Text>
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

                        <Text style={styles.priceText}>
                            {resolvePriceLabel(monthlyPackage)}
                            <Text style={styles.pricePeriod}>/ay</Text>
                        </Text>
                        <Text style={styles.billingText}>İstediğin zaman iptal edebilirsin</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.cancelText}>Planı istediğin zaman değiştirebilir veya iptal edebilirsin.</Text>

            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <Button
                    title="Premium'a Geç"
                    onPress={handlePurchase}
                    fullWidth
                    size="large"
                    loading={isPurchasing}
                />
                <View style={styles.footerLinks}>
                    <TouchableOpacity onPress={restorePurchases} activeOpacity={0.8}>
                        <Text style={styles.footerLinkText}>Restore Purchases</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL('https://omnoo.app/terms')} activeOpacity={0.8}>
                        <Text style={styles.footerLinkText}>Terms</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL('https://omnoo.app/privacy')} activeOpacity={0.8}>
                        <Text style={styles.footerLinkText}>Privacy</Text>
                    </TouchableOpacity>
                </View>
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

function BenefitRow({ image, title, desc }: { image: ImageSourcePropType, title: string, desc: string }) {
    return (
        <View style={styles.benefitRow}>
            <Image source={image} style={styles.benefitIcon} resizeMode="contain" />
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
    headerImage: {
        position: 'absolute',
        top: 0,
        right: -20,
        width: 140,
        height: 140,
        zIndex: -1,
        opacity: 0.8,
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
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    benefitIcon: {
        width: 48,
        height: 48,
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
    priceError: {
        ...typography.caption,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    footerLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
        marginTop: spacing.sm,
    },
    footerLinkText: {
        ...typography.caption,
        color: colors.primary,
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
