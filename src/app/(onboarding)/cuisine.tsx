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

const CUISINES = [
    { key: 'turkish', label: 'Türk', emoji: '🇹🇷', popular: true },
    { key: 'mediterranean', label: 'Akdeniz', emoji: '🫒', popular: true },
    { key: 'italian', label: 'İtalyan', emoji: '🍝', popular: true },
    { key: 'asian', label: 'Asya', emoji: '🍜', popular: true },
    { key: 'middle-eastern', label: 'Ortadoğu', emoji: '🧆', popular: false },
    { key: 'mexican', label: 'Meksika', emoji: '🌮', popular: false },
    { key: 'indian', label: 'Hint', emoji: '🍛', popular: false },
    { key: 'french', label: 'Fransız', emoji: '🥐', popular: false },
    { key: 'japanese', label: 'Japon', emoji: '🍱', popular: false },
    { key: 'chinese', label: 'Çin', emoji: '🥡', popular: false },
    { key: 'thai', label: 'Tayland', emoji: '🍜', popular: false },
    { key: 'american', label: 'Amerikan', emoji: '🍔', popular: false },
];

export default function CuisineScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const [selected, setSelected] = useState<string[]>(
        state.data.cuisine?.selected || ['turkish', 'mediterranean']
    );

    const toggleCuisine = (key: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelected(prev =>
            prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
        );
    };

    const handleContinue = () => {
        dispatch({ type: 'SET_CUISINE', payload: { selected } });
        dispatch({ type: 'SET_STEP', payload: 8 });
        router.push('/(onboarding)/cooking');
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Mutfak tercihleri</Text>
                    <Text style={styles.subtitle}>
                        Hangi mutfakların yemeklerini seviyorsunuz?
                    </Text>
                </View>

                {/* Popular Cuisines */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Popüler</Text>
                    <View style={styles.cuisineGrid}>
                        {CUISINES.filter(c => c.popular).map((cuisine) => (
                            <TouchableOpacity
                                key={cuisine.key}
                                style={[
                                    styles.cuisineCard,
                                    selected.includes(cuisine.key) && styles.cuisineCardSelected,
                                ]}
                                onPress={() => toggleCuisine(cuisine.key)}
                            >
                                <Text style={styles.cuisineEmoji}>{cuisine.emoji}</Text>
                                <Text
                                    style={[
                                        styles.cuisineLabel,
                                        selected.includes(cuisine.key) && styles.cuisineLabelSelected,
                                    ]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                >
                                    {cuisine.label}
                                </Text>
                                {selected.includes(cuisine.key) && (
                                    <View style={styles.checkmark}>
                                        <Text style={styles.checkmarkText}>✓</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* All Cuisines */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Diğer Mutfaklar</Text>
                    <View style={styles.cuisineGrid}>
                        {CUISINES.filter(c => !c.popular).map((cuisine) => (
                            <TouchableOpacity
                                key={cuisine.key}
                                style={[
                                    styles.cuisineCard,
                                    selected.includes(cuisine.key) && styles.cuisineCardSelected,
                                ]}
                                onPress={() => toggleCuisine(cuisine.key)}
                            >
                                <Text style={styles.cuisineEmoji}>{cuisine.emoji}</Text>
                                <Text
                                    style={[
                                        styles.cuisineLabel,
                                        selected.includes(cuisine.key) && styles.cuisineLabelSelected,
                                    ]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                >
                                    {cuisine.label}
                                </Text>
                                {selected.includes(cuisine.key) && (
                                    <View style={styles.checkmark}>
                                        <Text style={styles.checkmarkText}>✓</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Selection Count */}
                {selected.length > 0 && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>
                            {selected.length} mutfak seçildi
                        </Text>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Devam"
                    onPress={handleContinue}
                    fullWidth
                    size="large"
                    disabled={selected.length === 0}
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
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    cuisineGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    cuisineCard: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    cuisineCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '15',
    },
    cuisineEmoji: {
        fontSize: 24,
    },
    cuisineLabel: {
        ...typography.body,
        color: colors.textPrimary,
        flex: 1,
    },
    cuisineLabelSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    checkmark: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: colors.textInverse,
        fontSize: 12,
        fontWeight: '700',
    },
    countBadge: {
        alignSelf: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight + '20',
        marginTop: spacing.sm,
    },
    countText: {
        ...typography.caption,
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
