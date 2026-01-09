import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export default function WelcomeScreen() {
    const router = useRouter();
    const { dispatch } = useOnboarding();

    const handleStart = () => {
        dispatch({ type: 'SET_STEP', payload: 2 });
        router.push('/(onboarding)/profile');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Hero Illustration Placeholder */}
                <View style={styles.illustrationContainer}>
                    <View style={styles.illustration}>
                        <Text style={styles.illustrationEmoji}>🥗</Text>
                    </View>
                </View>

                {/* Value Proposition */}
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Akıllı Yemek Planlama</Text>
                    <Text style={styles.subtitle}>
                        Rutinlerinize göre kişiselleştirilmiş haftalık yemek planları ile
                        "Akşam ne yemek yapsam?" stresinden kurtulun.
                    </Text>
                </View>

                {/* Features */}
                <View style={styles.features}>
                    <FeatureItem emoji="📅" text="Rutinlerinize göre planlama" />
                    <FeatureItem emoji="👨‍👩‍👧‍👦" text="Tüm aile için özelleştirme" />
                    <FeatureItem emoji="🤖" text="Yapay zeka destekli öneriler" />
                </View>
            </View>

            {/* CTA */}
            <View style={styles.footer}>
                <Button
                    title="Başlayalım"
                    onPress={handleStart}
                    fullWidth
                    size="large"
                />
            </View>
        </SafeAreaView>
    );
}

function FeatureItem({ emoji, text }: { emoji: string; text: string }) {
    return (
        <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>{emoji}</Text>
            <Text style={styles.featureText}>{text}</Text>
        </View>
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
    illustrationContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    illustration: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: colors.primaryLight + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustrationEmoji: {
        fontSize: 80,
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
    features: {
        gap: spacing.md,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: 12,
        gap: spacing.md,
    },
    featureEmoji: {
        fontSize: 24,
    },
    featureText: {
        ...typography.body,
        color: colors.textPrimary,
        flex: 1,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
});
