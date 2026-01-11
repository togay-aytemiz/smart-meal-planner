import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, radius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
    MenuIngredient,
    MenuInstruction,
    MenuRecipe,
    MenuRecipeCourse,
    MenuRecipesResponse,
} from '../../types/menu-recipes';

type TabKey = 'ingredients' | 'instructions' | 'nutrition';

type NutritionRow = {
    label: string;
    value: string;
};

const MENU_RECIPES_STORAGE_KEY = '@smart_meal_planner:menu_recipes';

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

const normalizeCourse = (value: string | string[] | undefined): MenuRecipeCourse | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const allowed: MenuRecipeCourse[] = ['main', 'side', 'soup', 'salad', 'meze'];
    return allowed.includes(value as MenuRecipeCourse) ? (value as MenuRecipeCourse) : null;
};

export default function CookbookDetailScreen() {
    const router = useRouter();
    const { course } = useLocalSearchParams<{ course?: string }>();
    const [activeTab, setActiveTab] = useState<TabKey>('ingredients');
    const [recipe, setRecipe] = useState<MenuRecipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadRecipe = async () => {
            setLoading(true);
            setError(null);

            try {
                const courseKey = normalizeCourse(course);
                if (!courseKey) {
                    throw new Error('Tarif bulunamadı');
                }

                const raw = await AsyncStorage.getItem(MENU_RECIPES_STORAGE_KEY);
                if (!raw) {
                    throw new Error('Tarif bulunamadı');
                }

                const parsed = JSON.parse(raw) as MenuRecipesResponse;
                if (!parsed?.recipes?.length) {
                    throw new Error('Tarif bulunamadı');
                }

                const match = parsed.recipes.find((item) => item.course === courseKey);
                if (!match) {
                    throw new Error('Tarif bulunamadı');
                }

                if (isMounted) {
                    setRecipe(match);
                }
            } catch (err: unknown) {
                console.error('Cookbook detail error:', err);
                const message = err instanceof Error ? err.message : 'Bir hata oluştu';
                if (isMounted) {
                    setError(message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadRecipe();

        return () => {
            isMounted = false;
        };
    }, [course]);

    const brief = recipe?.brief || 'Kısa özet yakında.';

    const nutritionRows = useMemo(() => {
        if (!recipe?.macrosPerServing) {
            return [] as NutritionRow[];
        }
        const { calories, protein, carbs, fat } = recipe.macrosPerServing;
        return [
            { label: 'Kalori', value: `${calories} kcal` },
            { label: 'Protein', value: `${protein} g` },
            { label: 'Karbonhidrat', value: `${carbs} g` },
            { label: 'Yağ', value: `${fat} g` },
        ];
    }, [recipe]);

    const instructions = useMemo(() => {
        if (!recipe?.instructions) {
            return [] as MenuInstruction[];
        }
        return [...recipe.instructions].sort((a, b) => a.step - b.step);
    }, [recipe]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tarif Detayı</Text>
            </View>

            <ScrollView contentContainerStyle={styles.contentContainer}>
                {loading && (
                    <View style={styles.stateCard}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.stateText}>Tarif hazırlanıyor...</Text>
                    </View>
                )}

                {error && !loading && (
                    <View style={styles.stateCard}>
                        <Text style={styles.stateText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                            <Text style={styles.retryButtonText}>Geri Dön</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!loading && !error && recipe && (
                    <>
                        <View style={styles.recipeCard}>
                            <Text style={styles.recipeTitle}>{recipe.name}</Text>
                            <View style={styles.metaRow}>
                                <View style={styles.metaItem}>
                                    <MaterialCommunityIcons name="clock-outline" size={18} color={colors.iconMuted} />
                                    <Text style={styles.metaValue}>{recipe.prepTimeMinutes} dk</Text>
                                    <Text style={styles.metaLabel}>Hazırlık süresi</Text>
                                </View>
                                <View style={styles.metaDivider} />
                                <View style={styles.metaItem}>
                                    <MaterialCommunityIcons
                                        name="pot-steam-outline"
                                        size={18}
                                        color={colors.iconMuted}
                                    />
                                    <Text style={styles.metaValue}>{recipe.cookTimeMinutes} dk</Text>
                                    <Text style={styles.metaLabel}>Cook time</Text>
                                </View>
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

                        <View style={styles.sectionCard}>
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
                                            <Text style={styles.stepText}>{step.text}</Text>
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
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    contentContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
    },
    stateCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        gap: spacing.sm,
        ...shadows.sm,
    },
    stateText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    retryButtonText: {
        ...typography.buttonSmall,
        color: colors.primary,
    },
    recipeCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.sm,
        gap: spacing.md,
    },
    recipeTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    metaItem: {
        flex: 1,
        alignItems: 'center',
        gap: spacing.xs,
    },
    metaDivider: {
        width: 1,
        height: '100%',
        backgroundColor: colors.borderLight,
    },
    metaValue: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    metaLabel: {
        ...typography.caption,
        color: colors.textMuted,
        textAlign: 'center',
    },
    briefCard: {
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    sectionLabel: {
        ...typography.label,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
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
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.sm,
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
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    stepNumber: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    stepText: {
        ...typography.body,
        color: colors.textPrimary,
        flex: 1,
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
