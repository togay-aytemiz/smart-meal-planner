import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TabScreenHeader } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { useMemo, useState } from 'react';

type GroceryStatus = 'to-buy' | 'pantry';
type GroceryItem = {
    id: string;
    name: string;
    amount?: string;
    status: GroceryStatus;
    meals: string[];
};

type GroceryCategory = {
    id: string;
    title: string;
    items: GroceryItem[];
};

type FilterKey = 'all' | 'to-buy' | 'pantry';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: 'Tümü' },
    { key: 'to-buy', label: 'Alınacaklar' },
    { key: 'pantry', label: 'Dolapta' },
];

const GROCERY_CATEGORIES: GroceryCategory[] = [
    {
        id: 'produce',
        title: 'Meyve & Sebze',
        items: [
            { id: 'prod-1', name: 'Domates', amount: '4 adet', status: 'to-buy', meals: ['Akşam Menüsü', 'Salata'] },
            { id: 'prod-2', name: 'Roka', amount: '1 bağ', status: 'to-buy', meals: ['Meze', 'Salata'] },
            { id: 'prod-3', name: 'Limon', amount: '2 adet', status: 'to-buy', meals: ['Sos', 'Tatlı'] },
        ],
    },
    {
        id: 'dairy',
        title: 'Süt Ürünleri',
        items: [
            { id: 'dairy-2', name: 'Parmesan', amount: '100 g', status: 'to-buy', meals: ['Ana Yemek'] },
        ],
    },
    {
        id: 'proteins',
        title: 'Et & Protein',
        items: [
            { id: 'prot-1', name: 'Tavuk Göğsü', amount: '600 g', status: 'to-buy', meals: ['Ana Yemek'] },
        ],
    },
    {
        id: 'pantry',
        title: 'Kuru Gıdalar',
        items: [
            { id: 'pan-2', name: 'Zeytinyağı', amount: '500 ml', status: 'to-buy', meals: ['Sos', 'Salata'] },
        ],
    },
    {
        id: 'bakery',
        title: 'Fırın & Ekmek',
        items: [
            { id: 'bak-1', name: 'Baget', amount: '1 adet', status: 'to-buy', meals: ['Yan Yemek'] },
        ],
    },
];

const PANTRY_CATEGORIES: GroceryCategory[] = [
    {
        id: 'produce',
        title: 'Meyve & Sebze',
        items: [
            { id: 'pantry-prod-1', name: 'Roka', status: 'pantry', meals: [] },
        ],
    },
    {
        id: 'dairy',
        title: 'Süt Ürünleri',
        items: [
            { id: 'pantry-dairy-1', name: 'Yoğurt', status: 'pantry', meals: [] },
        ],
    },
    {
        id: 'proteins',
        title: 'Et & Protein',
        items: [
            { id: 'pantry-prot-1', name: 'Yumurta', status: 'pantry', meals: [] },
        ],
    },
    {
        id: 'pantry',
        title: 'Kuru Gıdalar',
        items: [
            { id: 'pantry-dry-1', name: 'Mercimek', status: 'pantry', meals: [] },
        ],
    },
];

export default function GroceriesScreen() {
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

    const pantryNames = useMemo(
        () =>
            new Set(
                PANTRY_CATEGORIES.flatMap((category) =>
                    category.items.map((item) => item.name.toLocaleLowerCase('tr-TR'))
                )
            ),
        []
    );

    const filteredCategories = useMemo(() => {
        if (activeFilter === 'pantry') {
            return PANTRY_CATEGORIES.filter((category) => category.items.length > 0);
        }

        return GROCERY_CATEGORIES.map((category) => {
            const items = category.items.filter((item) => {
                if (activeFilter === 'all') return true;
                const inPantry = pantryNames.has(item.name.toLocaleLowerCase('tr-TR'));
                return !inPantry;
            });
            return { ...category, items };
        }).filter((category) => category.items.length > 0);
    }, [activeFilter, pantryNames]);

    const handleToggleUsage = (itemId: string) => {
        setExpandedItemId((prev) => (prev === itemId ? null : itemId));
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <TabScreenHeader title="Alışveriş Listem" />

            <View style={styles.content}>
                <View style={styles.filterRow}>
                    {FILTERS.map((filter) => {
                        const isActive = filter.key === activeFilter;
                        return (
                            <TouchableOpacity
                                key={filter.key}
                                onPress={() => setActiveFilter(filter.key)}
                                style={[styles.filterChip, isActive && styles.filterChipActive]}
                                activeOpacity={0.9}
                            >
                                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {filteredCategories.length === 0 ? (
                        <View style={styles.placeholder}>
                            <MaterialCommunityIcons name="cart-outline" size={56} color={colors.iconMuted} />
                            <Text style={styles.placeholderTitle}>Liste boş</Text>
                            <Text style={styles.placeholderText}>
                                Bu filtre için henüz malzeme yok.
                            </Text>
                        </View>
                    ) : (
                        filteredCategories.map((category) => (
                            <View key={category.id} style={styles.categoryBlock}>
                                <View style={styles.categoryHeader}>
                                    <Text style={styles.categoryTitle}>{category.title}</Text>
                                    <Text style={styles.categoryCount}>{category.items.length}</Text>
                                </View>
                                <View style={styles.categoryCard}>
                                    {category.items.map((item, index) => {
                                        const isExpanded = expandedItemId === item.id;
                                        const inPantry = pantryNames.has(item.name.toLocaleLowerCase('tr-TR'));
                                        const hasMeals = item.meals.length > 0;
                                        const showUsage = activeFilter !== 'pantry' && hasMeals;
                                        const isLastItem = index === category.items.length - 1;
                                        return (
                                            <View
                                                key={item.id}
                                                style={[styles.itemRow, isLastItem && styles.itemRowLast]}
                                            >
                                                <View style={styles.itemInfo}>
                                                    <Text style={styles.itemName}>{item.name}</Text>
                                                    {item.amount ? (
                                                        <Text style={styles.itemAmount}>{item.amount}</Text>
                                                    ) : null}
                                                </View>
                                                <View style={styles.itemMeta}>
                                                    {activeFilter === 'all' && inPantry ? (
                                                        <View style={styles.pantryBadge}>
                                                            <Text style={styles.pantryBadgeText}>Mevcut</Text>
                                                        </View>
                                                    ) : null}
                                                    {showUsage ? (
                                                        <TouchableOpacity
                                                            onPress={() => handleToggleUsage(item.id)}
                                                            style={styles.usageButton}
                                                        >
                                                            <MaterialCommunityIcons
                                                                name="chef-hat"
                                                                size={18}
                                                                color={colors.textSecondary}
                                                            />
                                                        </TouchableOpacity>
                                                    ) : null}
                                                </View>
                                                {isExpanded && showUsage ? (
                                                    <View style={styles.usageRow}>
                                                        <MaterialCommunityIcons
                                                            name="silverware-fork-knife"
                                                            size={14}
                                                            color={colors.textMuted}
                                                        />
                                                        <Text style={styles.usageText}>
                                                            {item.meals.join(' • ')}
                                                        </Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
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
    },
    filterRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.md,
    },
    filterChip: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        ...typography.label,
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: colors.textInverse,
    },
    scrollContent: {
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
    },
    categoryBlock: {
        gap: spacing.sm,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    categoryTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    categoryCount: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    categoryCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        paddingVertical: spacing.xs,
        ...shadows.sm,
    },
    itemRow: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    itemRowLast: {
        borderBottomWidth: 0,
    },
    itemInfo: {
        gap: 4,
    },
    itemName: {
        ...typography.body,
        color: colors.textPrimary,
    },
    itemAmount: {
        ...typography.caption,
        color: colors.textMuted,
    },
    itemMeta: {
        position: 'absolute',
        right: spacing.md,
        top: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    pantryBadge: {
        backgroundColor: colors.successLight,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    pantryBadgeText: {
        ...typography.caption,
        color: colors.success,
    },
    usageButton: {
        width: 32,
        height: 32,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    usageRow: {
        marginTop: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    usageText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    placeholderTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    placeholderText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
