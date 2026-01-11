import { useMemo, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, radius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { MenuIngredient, MenuInstruction, MenuRecipe } from '../../types/menu-recipes';

type TabKey = 'ingredients' | 'instructions' | 'nutrition';

interface MealDetailProps {
    recipe: MenuRecipe;
    appName?: string;
    imageUrl?: string | null;
    isLive?: boolean;
    onBack?: () => void;
}

const HERO_HEIGHT = 320;
const PLACEHOLDER_IMAGE = require('../../../assets/splash-icon.png');

const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'ingredients', label: 'Ingredients' },
    { key: 'instructions', label: 'Instructions' },
    { key: 'nutrition', label: 'Nutrition' },
];

const formatAmount = (value: number) => {
    if (!Number.isFinite(value)) {
        return '';
    }
    if (Number.isInteger(value)) {
        return `${value}`;
    }
    const rounded = value.toFixed(1);
    return rounded.endsWith('.0') ? rounded.slice(0, -2) : rounded;
};

const formatIngredient = (item: MenuIngredient) => {
    const amount = formatAmount(item.amount);
    const unit = item.unit ? ` ${item.unit}` : '';
    const notes = item.notes ? ` (${item.notes})` : '';
    return `${amount}${unit} ${item.name}${notes}`.trim();
};

const sortInstructions = (instructions: MenuInstruction[]) =>
    [...instructions].sort((a, b) => a.step - b.step);

export default function MealDetail({
    recipe,
    appName = 'Omnoo',
    imageUrl,
    isLive = true,
    onBack,
}: MealDetailProps) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<TabKey>('ingredients');

    const brief = recipe.brief || 'Kısa özet yakında.';
    const resolvedImageUrl = imageUrl?.trim();
    const imageSource = resolvedImageUrl ? { uri: resolvedImageUrl } : PLACEHOLDER_IMAGE;

    const nutritionRows = useMemo(() => {
        const { calories, protein, carbs, fat } = recipe.macrosPerServing;
        return [
            { label: 'Kalori', value: `${calories} kcal` },
            { label: 'Protein', value: `${protein} g` },
            { label: 'Karbonhidrat', value: `${carbs} g` },
            { label: 'Yağ', value: `${fat} g` },
        ];
    }, [recipe.macrosPerServing]);

    const instructions = useMemo(
        () => sortInstructions(recipe.instructions),
        [recipe.instructions]
    );

    return (
        <ScrollView contentContainerStyle={styles.contentContainer}>
            <View style={styles.hero}>
                <Image source={imageSource} style={styles.heroImage} />
                <View style={styles.heroScrim} />
                <View style={[styles.heroHeader, { paddingTop: insets.top + spacing.sm }]}
                >
                    {onBack ? (
                        <TouchableOpacity style={styles.iconButton} onPress={onBack}>
                            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textInverse} />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerSpacer} />
                    )}
                    <View style={styles.brandWrapper} pointerEvents="none">
                        <Text style={styles.brandText}>{appName}</Text>
                    </View>
                    {isLive ? (
                        <View style={styles.liveBadge}>
                            <MaterialCommunityIcons name="checkbox-blank-circle" size={12} color={colors.textInverse} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    ) : (
                        <View style={styles.headerSpacer} />
                    )}
                </View>
            </View>

            <View style={styles.details}>
                <Text style={styles.title}>{recipe.name}</Text>

                <View style={styles.metaRow}>
                    <View style={styles.metaPill}>
                        <MaterialCommunityIcons name="account-group" size={18} color={colors.textSecondary} />
                        <Text style={styles.metaValue}>{recipe.servings}</Text>
                        <Text style={styles.metaLabel}>Porsiyon</Text>
                    </View>
                    <View style={styles.metaPill}>
                        <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
                        <Text style={styles.metaValue}>{recipe.prepTimeMinutes} dk</Text>
                        <Text style={styles.metaLabel}>Hazırlık</Text>
                    </View>
                    <View style={styles.metaPill}>
                        <MaterialCommunityIcons name="pot-steam-outline" size={18} color={colors.textSecondary} />
                        <Text style={styles.metaValue}>{recipe.cookTimeMinutes} dk</Text>
                        <Text style={styles.metaLabel}>Pişirme</Text>
                    </View>
                </View>

                <View style={styles.briefCard}>
                    <Text style={styles.sectionLabel}>Brief</Text>
                    <Text style={styles.briefText}>{brief}</Text>
                </View>

                <View style={styles.tabContainer}>
                    {tabs.map((tab) => {
                        const isActive = tab.key === activeTab;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => setActiveTab(tab.key)}
                                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                            >
                                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {activeTab === 'ingredients' && (
                    <View style={styles.listContainer}>
                        {recipe.ingredients.map((item, index) => (
                            <View key={`${item.name}-${index}`} style={styles.listRow}>
                                <View style={styles.bullet} />
                                <Text style={styles.listText}>{formatIngredient(item)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {activeTab === 'instructions' && (
                    <View style={styles.listContainer}>
                        {instructions.map((step) => (
                            <View key={`step-${step.step}`} style={styles.stepRow}>
                                <View style={styles.stepBadge}>
                                    <Text style={styles.stepNumber}>{step.step}</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepText}>{step.text}</Text>
                                    {step.durationMinutes > 0 && (
                                        <Text style={styles.stepDuration}>{step.durationMinutes} dk</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {activeTab === 'nutrition' && (
                    <View style={styles.listContainer}>
                        <Text style={styles.nutritionNote}>Porsiyon başına</Text>
                        {nutritionRows.map((row) => (
                            <View key={row.label} style={styles.nutritionRow}>
                                <Text style={styles.nutritionLabel}>{row.label}</Text>
                                <Text style={styles.nutritionValue}>{row.value}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    contentContainer: {
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
    },
    hero: {
        height: HERO_HEIGHT,
        backgroundColor: colors.surfaceMuted,
        overflow: 'hidden',
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    heroScrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.heroScrim,
        opacity: 0.2,
    },
    heroHeader: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    brandWrapper: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandText: {
        ...typography.brand,
        color: colors.textInverse,
        textShadowColor: colors.overlay,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.glassSurface,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    headerSpacer: {
        width: 44,
        height: 44,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.liveBadge,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        ...shadows.sm,
    },
    liveText: {
        ...typography.caption,
        color: colors.textInverse,
        letterSpacing: 0.8,
    },
    details: {
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.glassSurface,
        borderRadius: radius.full,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    metaValue: {
        ...typography.label,
        color: colors.textPrimary,
    },
    metaLabel: {
        ...typography.caption,
        color: colors.textMuted,
    },
    briefCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
        gap: spacing.sm,
    },
    sectionLabel: {
        ...typography.label,
        color: colors.textSecondary,
    },
    briefText: {
        ...typography.body,
        color: colors.textPrimary,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.full,
        padding: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
    },
    tabButtonActive: {
        backgroundColor: colors.surface,
        ...shadows.sm,
    },
    tabButtonText: {
        ...typography.buttonSmall,
        color: colors.textMuted,
    },
    tabButtonTextActive: {
        color: colors.textPrimary,
    },
    listContainer: {
        gap: spacing.md,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
        marginTop: 8,
    },
    listText: {
        ...typography.body,
        color: colors.textPrimary,
        flex: 1,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    stepBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    stepNumber: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    stepContent: {
        flex: 1,
        gap: spacing.xs,
    },
    stepText: {
        ...typography.body,
        color: colors.textPrimary,
    },
    stepDuration: {
        ...typography.caption,
        color: colors.textMuted,
    },
    nutritionNote: {
        ...typography.caption,
        color: colors.textMuted,
    },
    nutritionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    nutritionLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    nutritionValue: {
        ...typography.body,
        color: colors.textPrimary,
    },
});
