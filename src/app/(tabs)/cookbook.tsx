import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import type { ComponentProps } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TabScreenHeader } from '../../components/ui';
import { useCookbook } from '../../hooks/use-cookbook';
import { colors } from '../../theme/colors';
import { spacing, radius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { MenuRecipeCourse } from '../../types/menu-recipes';
import type { SavedRecipe } from '../../types/cookbook';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const COURSE_ORDER: MenuRecipeCourse[] = ['main', 'side', 'soup', 'salad', 'meze', 'dessert', 'pastry'];

const COURSE_META: Record<
    MenuRecipeCourse,
    { label: string; icon: IconName; mediaTone: string }
> = {
    main: {
        label: 'Ana Yemek',
        icon: 'silverware-fork-knife',
        mediaTone: colors.surfaceAlt,
    },
    side: {
        label: 'Yan Yemek',
        icon: 'food-variant',
        mediaTone: colors.borderLight,
    },
    soup: {
        label: 'Çorba',
        icon: 'pot-steam-outline',
        mediaTone: colors.accentSoft,
    },
    salad: {
        label: 'Salata',
        icon: 'leaf',
        mediaTone: colors.successLight,
    },
    meze: {
        label: 'Meze',
        icon: 'food',
        mediaTone: colors.surfaceMuted,
    },
    dessert: {
        label: 'Tatlı',
        icon: 'cupcake',
        mediaTone: colors.errorLight,
    },
    pastry: {
        label: 'Hamur İşi',
        icon: 'bread-slice-outline',
        mediaTone: colors.surfaceAlt,
    },
};

type CategoryFilter = 'all' | MenuRecipeCourse;

const CATEGORY_FILTERS: Array<{ key: CategoryFilter; label: string }> = [
    { key: 'all', label: 'Tümü' },
    ...COURSE_ORDER.map((course) => ({ key: course, label: COURSE_META[course].label })),
];

const SEARCH_DEBOUNCE_MS = 300;

export default function CookbookScreen() {
    const router = useRouter();
    const { favorites, isLoading, error } = useCookbook();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce search
    useEffect(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        if (searchQuery !== debouncedQuery) {
            setIsSearching(true);
            debounceTimer.current = setTimeout(() => {
                setDebouncedQuery(searchQuery);
                setIsSearching(false);
            }, SEARCH_DEBOUNCE_MS);
        }

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [searchQuery, debouncedQuery]);

    const filteredRecipes = useMemo(() => {
        let recipes = [...favorites];

        // Filter by category
        if (activeCategory !== 'all') {
            recipes = recipes.filter((r) => r.course === activeCategory);
        }

        // Filter by search (using debounced query)
        if (debouncedQuery.trim()) {
            const query = debouncedQuery.toLowerCase().trim();
            recipes = recipes.filter((r) => r.name.toLowerCase().includes(query));
        }

        // Sort by course order
        return recipes.sort(
            (a, b) => COURSE_ORDER.indexOf(a.course) - COURSE_ORDER.indexOf(b.course)
        );
    }, [favorites, debouncedQuery, activeCategory]);

    const recipeCount = filteredRecipes.length;
    const recipeCountText = `${recipeCount} tarif`;

    const handleOpenRecipe = useCallback((savedRecipe: SavedRecipe) => {
        router.push({
            pathname: '/cookbook/[course]',
            params: {
                course: savedRecipe.course,
                recipeName: savedRecipe.name,
            },
        });
    }, [router]);

    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        setDebouncedQuery('');
        setIsSearching(false);
    }, []);

    const renderEmptyState = () => {
        if (isLoading) {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.emptyStateText}>Yükleniyor...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={48}
                        color={colors.textMuted}
                    />
                    <Text style={styles.emptyStateText}>{error}</Text>
                </View>
            );
        }

        if (favorites.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <View style={styles.emptyStateIconWrap}>
                        <MaterialCommunityIcons
                            name="heart-outline"
                            size={40}
                            color={colors.textMuted}
                        />
                    </View>
                    <Text style={styles.emptyStateTitle}>Henüz favori yok</Text>
                    <Text style={styles.emptyStateText}>
                        Beğendiğin tarifleri kalp ikonuna basarak buraya ekleyebilirsin
                    </Text>
                </View>
            );
        }

        if (filteredRecipes.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <View style={styles.emptyStateIconWrap}>
                        <MaterialCommunityIcons
                            name="book-open-page-variant-outline"
                            size={40}
                            color={colors.textMuted}
                        />
                    </View>
                    <Text style={styles.emptyStateText}>Bu kategoride kayıtlı tarif yok</Text>
                </View>
            );
        }

        return null;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <TabScreenHeader title="Tariflerim" />

            <ScrollView
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <MaterialCommunityIcons
                        name="magnify"
                        size={20}
                        color={colors.textMuted}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tarif ara..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                        returnKeyType="search"
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                    {isSearching && (
                        <ActivityIndicator size="small" color={colors.primary} />
                    )}
                    {!isSearching && searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={handleClearSearch}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialCommunityIcons
                                name="close-circle"
                                size={18}
                                color={colors.textMuted}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Category Filters - only show when on "Tümü" */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryContainer}
                >
                    {CATEGORY_FILTERS.map((filter) => {
                        const isActive = activeCategory === filter.key;
                        return (
                            <TouchableOpacity
                                key={filter.key}
                                style={[
                                    styles.categoryChip,
                                    isActive && styles.categoryChipActive,
                                ]}
                                onPress={() => setActiveCategory(filter.key)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.categoryChipText,
                                        isActive && styles.categoryChipTextActive,
                                    ]}
                                >
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Recipe Count */}
                {!isLoading && favorites.length > 0 && (
                    <View style={styles.countContainer}>
                        <Text style={styles.countText}>{recipeCountText}</Text>
                    </View>
                )}

                {/* Empty State */}
                {renderEmptyState()}

                {/* Recipe List - Menu page card style */}
                {filteredRecipes.length > 0 && (
                    <View style={styles.recipeList}>
                        {filteredRecipes.map((savedRecipe) => {
                            const meta = COURSE_META[savedRecipe.course];
                            const calories = savedRecipe.recipe?.macrosPerServing?.calories ?? 0;

                            return (
                                <TouchableOpacity
                                    key={savedRecipe.recipeId}
                                    style={styles.mealCard}
                                    activeOpacity={0.85}
                                    onPress={() => handleOpenRecipe(savedRecipe)}
                                >
                                    <View
                                        pointerEvents="none"
                                        style={[
                                            styles.mealAccent,
                                            { backgroundColor: meta.mediaTone },
                                        ]}
                                    />
                                    <View style={styles.mealCardHeader}>
                                        <View
                                            style={[
                                                styles.mealBadge,
                                                { backgroundColor: meta.mediaTone },
                                            ]}
                                        >
                                            <MaterialCommunityIcons
                                                name={meta.icon}
                                                size={22}
                                                color={colors.textPrimary}
                                            />
                                        </View>
                                        <View style={styles.mealMetaRow}>
                                            <View style={styles.mealMetaChip}>
                                                <MaterialCommunityIcons
                                                    name="clock-outline"
                                                    size={12}
                                                    color={colors.textSecondary}
                                                />
                                                <Text style={styles.mealMetaText}>
                                                    {savedRecipe.totalTimeMinutes} dk
                                                </Text>
                                            </View>
                                            {calories > 0 && (
                                                <View style={styles.mealMetaChip}>
                                                    <MaterialCommunityIcons
                                                        name="fire"
                                                        size={12}
                                                        color={colors.textSecondary}
                                                    />
                                                    <Text style={styles.mealMetaText}>
                                                        {Math.round(calories)} kcal
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <View style={styles.mealCardBody}>
                                        <Text style={styles.mealTitle} numberOfLines={2}>
                                            {savedRecipe.name}
                                        </Text>
                                        <View style={styles.mealCategoryRow}>
                                            <MaterialCommunityIcons
                                                name={meta.icon}
                                                size={14}
                                                color={colors.textSecondary}
                                            />
                                            <Text style={styles.mealCategoryText}>{meta.label}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
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
    contentContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
        gap: spacing.md,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
        height: 52,
        borderWidth: 1.5,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '400' as const,
        color: colors.textPrimary,
        paddingVertical: 0,
        margin: 0,
    },
    categoryContainer: {
        gap: spacing.sm,
        paddingVertical: spacing.xs,
    },
    categoryChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    categoryChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryChipText: {
        ...typography.buttonSmall,
        color: colors.textSecondary,
    },
    categoryChipTextActive: {
        color: colors.textOnPrimary,
    },
    countContainer: {
        marginTop: spacing.xs,
    },
    countText: {
        ...typography.caption,
        color: colors.textMuted,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        gap: spacing.md,
    },
    emptyStateIconWrap: {
        width: 88,
        height: 88,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.borderLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    emptyStateText: {
        ...typography.body,
        color: colors.textMuted,
        textAlign: 'center',
        maxWidth: 280,
    },
    recipeList: {
        gap: spacing.md,
    },
    // Menu page card styles (from index.tsx)
    mealCard: {
        minHeight: 160,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.md,
        gap: spacing.md,
        position: 'relative',
        ...shadows.sm,
    },
    mealAccent: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        right: -60,
        top: -60,
        opacity: 0.35,
    },
    mealCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        zIndex: 1,
    },
    mealBadge: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    mealMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginLeft: 'auto',
    },
    mealMetaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.full,
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    mealMetaText: {
        ...typography.caption,
        fontSize: 11,
        lineHeight: 14,
        color: colors.textSecondary,
    },
    mealCardBody: {
        gap: spacing.xs,
        zIndex: 1,
    },
    mealTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    mealCategoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    mealCategoryText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
});
