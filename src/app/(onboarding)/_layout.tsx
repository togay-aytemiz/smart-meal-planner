import { Stack, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { OnboardingProvider, useOnboarding, TOTAL_STEPS } from '../../contexts/onboarding-context';
import { ProgressBar } from '../../components/ui';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

function OnboardingHeader() {
    const { state, prevStep, nextStep } = useOnboarding();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const progressOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (state.currentStep === TOTAL_STEPS) {
            Animated.timing(progressOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(progressOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [state.currentStep]);

    // Hide header on welcome screen (1), scan screen (15), and processing (10)
    if (state.currentStep === 1 || state.currentStep === 15 || state.currentStep === 10) {
        return null;
    }

    // Hide back button only on welcome screen
    const showBackButton = state.currentStep > 1;

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
                <Animated.View style={[styles.progressContainer, { opacity: progressOpacity }]}>
                    {state.currentStep !== 10 && (
                        <ProgressBar current={state.currentStep - 1} total={TOTAL_STEPS - 2} />
                    )}
                </Animated.View>
                {state.currentStep === 13 ? (
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={() => {
                            nextStep();
                            router.replace('/(onboarding)/kickstart');
                        }}
                    >
                        <Text style={styles.skipText}>Geç</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backPlaceholder} />
                )}
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
    skipButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -spacing.sm,
    },
    skipText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        fontWeight: '600',
    },
});
