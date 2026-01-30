import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { useLanguage } from '../../contexts/language-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

const TIME_OPTIONS = [
    { key: 'quick', labelKey: 'preferences.timeOptions.quick.label', descriptionKey: 'preferences.timeOptions.quick.description', emoji: '⚡' },
    { key: 'balanced', labelKey: 'preferences.timeOptions.balanced.label', descriptionKey: 'preferences.timeOptions.balanced.description', emoji: '⏱️' },
    { key: 'elaborate', labelKey: 'preferences.timeOptions.elaborate.label', descriptionKey: 'preferences.timeOptions.elaborate.description', emoji: '👨‍🍳' },
] as const;

const SKILL_LEVELS = [
    { key: 'beginner', labelKey: 'preferences.skillLevels.beginner.label', descriptionKey: 'preferences.skillLevels.beginner.description', emoji: '🌱' },
    { key: 'intermediate', labelKey: 'preferences.skillLevels.intermediate.label', descriptionKey: 'preferences.skillLevels.intermediate.description', emoji: '🌿' },
    { key: 'expert', labelKey: 'preferences.skillLevels.expert.label', descriptionKey: 'preferences.skillLevels.expert.description', emoji: '🌳' },
] as const;

const EQUIPMENT = [
    { key: 'oven', labelKey: 'preferences.equipment.oven', emoji: '🔥' },
    { key: 'blender', labelKey: 'preferences.equipment.blender', emoji: '🫙' },
    { key: 'airfryer', labelKey: 'preferences.equipment.airfryer', emoji: '🍟' },
    { key: 'pressure-cooker', labelKey: 'preferences.equipment.pressureCooker', emoji: '♨️' },
    { key: 'mixer', labelKey: 'preferences.equipment.mixer', emoji: '🥣' },
    { key: 'grill', labelKey: 'preferences.equipment.grill', emoji: '🥩' },
];

export default function CookingScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const { t } = useLanguage();
    const [timePreference, setTimePreference] = useState<'quick' | 'balanced' | 'elaborate'>(
        state.data.cooking?.timePreference || 'balanced'
    );
    const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'expert'>(
        state.data.cooking?.skillLevel || 'intermediate'
    );
    const [equipment, setEquipment] = useState<string[]>(
        state.data.cooking?.equipment || []
    );

    const toggleEquipment = (key: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEquipment(prev =>
            prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]
        );
    };

    const handleContinue = () => {
        dispatch({
            type: 'SET_COOKING',
            payload: { timePreference, skillLevel, equipment }
        });
        dispatch({ type: 'SET_STEP', payload: 9 });
        router.push('/(onboarding)/ready');
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('onboarding.cooking.title')}</Text>
                    <Text style={styles.subtitle}>
                        {t('onboarding.cooking.subtitle')}
                    </Text>
                </View>

                {/* Time Preference */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('onboarding.cooking.timeTitle')}</Text>
                    <View style={styles.optionsRow}>
                        {TIME_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.key}
                                style={[
                                    styles.optionCard,
                                    timePreference === option.key && styles.optionCardSelected,
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTimePreference(option.key);
                                }}
                            >
                                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                                <Text style={[
                                    styles.optionLabel,
                                    timePreference === option.key && styles.optionLabelSelected,
                                ]}>
                                    {t(option.labelKey)}
                                </Text>
                                <Text style={styles.optionDescription}>{t(option.descriptionKey)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Skill Level */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('onboarding.cooking.skillTitle')}</Text>
                    <View style={styles.optionsRow}>
                        {SKILL_LEVELS.map((option) => (
                            <TouchableOpacity
                                key={option.key}
                                style={[
                                    styles.optionCard,
                                    skillLevel === option.key && styles.optionCardSelected,
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSkillLevel(option.key);
                                }}
                            >
                                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                                <Text style={[
                                    styles.optionLabel,
                                    skillLevel === option.key && styles.optionLabelSelected,
                                ]}>
                                    {t(option.labelKey)}
                                </Text>
                                <Text style={styles.optionDescription}>{t(option.descriptionKey)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Equipment */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('onboarding.cooking.equipmentTitle')}</Text>
                    <View style={styles.equipmentGrid}>
                        {EQUIPMENT.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={[
                                    styles.equipmentItem,
                                    equipment.includes(item.key) && styles.equipmentItemSelected,
                                ]}
                                onPress={() => toggleEquipment(item.key)}
                            >
                                <Text style={styles.equipmentEmoji}>{item.emoji}</Text>
                                <Text style={[
                                    styles.equipmentLabel,
                                    equipment.includes(item.key) && styles.equipmentLabelSelected,
                                ]}>
                                    {t(item.labelKey)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title={t('onboarding.cooking.cta')}
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
    optionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    optionCard: {
        flex: 1,
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    optionCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '15',
    },
    optionEmoji: {
        fontSize: 28,
        marginBottom: spacing.xs,
    },
    optionLabel: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    optionLabelSelected: {
        color: colors.primary,
    },
    optionDescription: {
        ...typography.caption,
        color: colors.textMuted,
    },
    equipmentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    equipmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        gap: spacing.xs,
    },
    equipmentItemSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '15',
    },
    equipmentEmoji: {
        fontSize: 16,
    },
    equipmentLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    equipmentLabelSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        paddingTop: spacing.sm,
        backgroundColor: colors.background,
    },
});
