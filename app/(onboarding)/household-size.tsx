import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

export default function HouseholdSizeScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const [count, setCount] = useState(state.data.householdSize || 1);

    const handleIncrement = () => {
        if (count < 10) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCount(count + 1);
        }
    };

    const handleDecrement = () => {
        if (count > 1) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCount(count - 1);
        }
    };

    const handleContinue = () => {
        dispatch({ type: 'SET_HOUSEHOLD_SIZE', payload: count });
        dispatch({ type: 'SET_STEP', payload: 4 });

        if (count === 1) {
            // Skip member roles for single person
            router.push('/(onboarding)/routines');
        } else {
            router.push('/(onboarding)/member-roles');
        }
    };

    // Generate person icons based on count
    const renderPeopleIcons = () => {
        // Max 5 icons to keep in one line
        const maxIcons = 5;
        const showCount = Math.min(count, maxIcons);
        const icons = [];

        for (let i = 0; i < showCount; i++) {
            icons.push(
                <Text key={i} style={styles.personIcon}>
                    👤
                </Text>
            );
        }

        if (count > maxIcons) {
            icons.push(
                <Text key="more" style={styles.moreText}>
                    +{count - maxIcons}
                </Text>
            );
        }
        return icons;
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Kaç kişilik ev?</Text>
                    <Text style={styles.subtitle}>
                        Yemek planlaması yapılacak kişi sayısını belirtin
                    </Text>
                </View>

                {/* People visualization */}
                <View style={styles.visualization}>
                    <View style={styles.peopleContainer}>
                        {renderPeopleIcons()}
                    </View>
                </View>

                {/* Counter */}
                <View style={styles.counterContainer}>
                    <TouchableOpacity
                        style={[styles.counterButton, count === 1 && styles.counterButtonDisabled]}
                        onPress={handleDecrement}
                        disabled={count === 1}
                    >
                        <Text style={[styles.counterButtonText, count === 1 && styles.counterButtonTextDisabled]}>
                            −
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.countDisplay}>
                        <Text style={styles.countNumber}>{count}</Text>
                        <Text style={styles.countLabel}>kişi</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.counterButton, count === 10 && styles.counterButtonDisabled]}
                        onPress={handleIncrement}
                        disabled={count === 10}
                    >
                        <Text style={[styles.counterButtonText, count === 10 && styles.counterButtonTextDisabled]}>
                            +
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.footer}>
                <Button
                    title="Devam"
                    onPress={handleContinue}
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
        paddingTop: spacing.xl,
    },
    header: {
        marginBottom: spacing.xxl,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
    },
    visualization: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    peopleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // flexWrap: 'wrap', // Keeping single line as requested
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    personIcon: {
        fontSize: 40,
    },
    moreText: {
        ...typography.h3,
        color: colors.textSecondary,
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xl,
    },
    counterButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterButtonDisabled: {
        opacity: 0.4,
    },
    counterButtonText: {
        fontSize: 28,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    counterButtonTextDisabled: {
        color: colors.textMuted,
    },
    countDisplay: {
        alignItems: 'center',
        minWidth: 80,
    },
    countNumber: {
        fontSize: 48,
        fontWeight: '700',
        color: colors.primary,
    },
    countLabel: {
        ...typography.body,
        color: colors.textSecondary,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
});
