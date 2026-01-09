import { Stack, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingProvider, useOnboarding, TOTAL_STEPS } from '../../contexts/onboarding-context';
import { ProgressBar } from '../../components/ui';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

function OnboardingHeader() {
    const { state, prevStep } = useOnboarding();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Hide header on welcome screen
    if (state.currentStep === 1) {
        return <View style={{ height: insets.top }} />;
    }

    // Hide back button on ready screen
    const showBackButton = state.currentStep > 1 && state.currentStep < TOTAL_STEPS;

    const handleBack = () => {
        prevStep();
        router.back();
    };

    return (
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.headerRow}>
                {showBackButton ? (
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backPlaceholder} />
                )}
                <View style={styles.progressContainer}>
                    <ProgressBar current={state.currentStep - 1} total={TOTAL_STEPS - 2} />
                </View>
                <View style={styles.backPlaceholder} />
            </View>
        </View>
    );
}

function OnboardingLayoutContent() {
    return (
        <View style={styles.container}>
            <OnboardingHeader />
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'ios_from_right',
                    animationDuration: 300,
                    gestureEnabled: true,
                    gestureDirection: 'horizontal',
                    contentStyle: { backgroundColor: colors.background },
                }}
            />
        </View>
    );
}

export default function OnboardingLayout() {
    return (
        <OnboardingProvider>
            <OnboardingLayoutContent />
        </OnboardingProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -spacing.sm,
    },
    backIcon: {
        fontSize: 24,
        color: colors.textPrimary,
    },
    backPlaceholder: {
        width: 40,
    },
    progressContainer: {
        flex: 1,
        marginHorizontal: spacing.sm,
    },
});
