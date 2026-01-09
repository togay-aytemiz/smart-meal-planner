import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

const TIME_OPTIONS = [
    { key: 'quick', label: 'Hızlı', description: '15-30 dk', emoji: '⚡' },
    { key: 'balanced', label: 'Dengeli', description: '30-60 dk', emoji: '⏱️' },
    { key: 'elaborate', label: 'Detaylı', description: '60+ dk', emoji: '👨‍🍳' },
] as const;

const SKILL_LEVELS = [
    { key: 'beginner', label: 'Başlangıç', description: 'Temel tarifler', emoji: '🌱' },
    { key: 'intermediate', label: 'Orta', description: 'Çoğu tarif', emoji: '🌿' },
    { key: 'expert', label: 'Uzman', description: 'Her şey olur', emoji: '🌳' },
] as const;

const EQUIPMENT = [
    { key: 'oven', label: 'Fırın', emoji: '🔥' },
    { key: 'blender', label: 'Blender', emoji: '🫙' },
    { key: 'airfryer', label: 'Airfryer', emoji: '🍟' },
    { key: 'pressure-cooker', label: 'Düdüklü', emoji: '♨️' },
    { key: 'mixer', label: 'Mikser', emoji: '🥣' },
    { key: 'grill', label: 'Izgara', emoji: '🥩' },
];

export default function CookingScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
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
                    <Text style={styles.title}>Yemek yapma tercihleri</Text>
                    <Text style={styles.subtitle}>
                        Mutfakta ne kadar zaman harcamak istersiniz?
                    </Text>
                </View>

                {/* Time Preference */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Yemek Süresi</Text>
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
                                    {option.label}
                                </Text>
                                <Text style={styles.optionDescription}>{option.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Skill Level */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mutfak Deneyimi</Text>
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
                                    {option.label}
                                </Text>
                                <Text style={styles.optionDescription}>{option.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Equipment */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mutfak Ekipmanları (opsiyonel)</Text>
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
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Tamamla"
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
