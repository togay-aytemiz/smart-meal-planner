import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Button, SelectableTag } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { useLanguage } from '../../contexts/language-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

const DIETARY_RESTRICTIONS = [
    { key: 'vegetarian', labelKey: 'preferences.dietary.vegetarian', emoji: '🥬' },
    { key: 'vegan', labelKey: 'preferences.dietary.vegan', emoji: '🌱' },
    { key: 'pescatarian', labelKey: 'preferences.dietary.pescatarian', emoji: '🐟' },
    { key: 'gluten-free', labelKey: 'preferences.dietary.glutenFree', emoji: '🌾' },
    { key: 'dairy-free', labelKey: 'preferences.dietary.dairyFree', emoji: '🥛' },
    { key: 'low-carb', labelKey: 'preferences.dietary.lowCarb', emoji: '🍞' },
    { key: 'keto', labelKey: 'preferences.dietary.keto', emoji: '🥑' },
    { key: 'high-protein', labelKey: 'preferences.dietary.highProtein', emoji: '💪' },
];

const COMMON_ALLERGIES = [
    { key: 'nuts', labelKey: 'preferences.allergies.nuts', emoji: '🥜' },
    { key: 'shellfish', labelKey: 'preferences.allergies.shellfish', emoji: '🦐' },
    { key: 'eggs', labelKey: 'preferences.allergies.eggs', emoji: '🥚' },
    { key: 'soy', labelKey: 'preferences.allergies.soy', emoji: '🫘' },
    { key: 'wheat', labelKey: 'preferences.allergies.wheat', emoji: '🌾' },
    { key: 'fish', labelKey: 'preferences.allergies.fish', emoji: '🐠' },
    { key: 'sesame', labelKey: 'preferences.allergies.sesame', emoji: '🌰' },
];

export default function DietaryScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const { t } = useLanguage();
    const [restrictions, setRestrictions] = useState<string[]>(
        state.data.dietary?.restrictions || []
    );
    const [allergies, setAllergies] = useState<string[]>(
        state.data.dietary?.allergies || []
    );

    const toggleRestriction = (key: string) => {
        setRestrictions(prev =>
            prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]
        );
    };

    const toggleAllergy = (key: string) => {
        setAllergies(prev =>
            prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]
        );
    };

    const handleContinue = () => {
        dispatch({ type: 'SET_DIETARY', payload: { restrictions, allergies } });
        dispatch({ type: 'SET_STEP', payload: 7 });
        router.push('/(onboarding)/cuisine');
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('onboarding.dietary.title')}</Text>
                    <Text style={styles.subtitle}>
                        {t('onboarding.dietary.subtitle')}
                    </Text>
                </View>

                {/* Dietary Restrictions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('onboarding.dietary.restrictionsTitle')}</Text>
                    <View style={styles.tagsContainer}>
                        {DIETARY_RESTRICTIONS.map((item) => (
                            <SelectableTag
                                key={item.key}
                                label={t(item.labelKey)}
                                selected={restrictions.includes(item.key)}
                                onPress={() => toggleRestriction(item.key)}
                                icon={<Text style={styles.tagEmoji}>{item.emoji}</Text>}
                            />
                        ))}
                    </View>
                </View>

                {/* Allergies */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('onboarding.dietary.allergiesTitle')}</Text>
                    <View style={styles.tagsContainer}>
                        {COMMON_ALLERGIES.map((item) => (
                            <SelectableTag
                                key={item.key}
                                label={t(item.labelKey)}
                                selected={allergies.includes(item.key)}
                                onPress={() => toggleAllergy(item.key)}
                                icon={<Text style={styles.tagEmoji}>{item.emoji}</Text>}
                            />
                        ))}
                    </View>
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoEmoji}>💡</Text>
                    <Text style={styles.infoText}>
                        {t('onboarding.dietary.info')}
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title={t('onboarding.common.continue')}
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
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
    },
    header: {
        marginBottom: spacing.lg,
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
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    tagEmoji: {
        fontSize: 14,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryLight + '15',
        padding: spacing.md,
        borderRadius: radius.md,
        gap: spacing.sm,
    },
    infoEmoji: {
        fontSize: 20,
    },
    infoText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        paddingTop: spacing.sm,
        gap: spacing.sm,
        backgroundColor: colors.background,
    },
});
