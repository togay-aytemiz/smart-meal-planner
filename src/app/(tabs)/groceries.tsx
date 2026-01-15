import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TabScreenHeader, Input, Button } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { useMemo, useState, useEffect } from 'react';
import firestore, { doc, onSnapshot, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { functions } from '../../config/firebase';
import { useUser } from '../../contexts/user-context';

type GroceryStatus = 'to-buy' | 'pantry';
type GroceryItem = {
    id: string;
    name: string;
    amount?: string;
    status: GroceryStatus;
    meals: string[];
    normalizedName?: string;
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

type PantryItem = {
    name: string;
    normalizedName: string;
};

const CATEGORY_CONFIG = [
    {
        id: 'produce',
        title: 'Meyve & Sebze',
        keywords: ['domates', 'salatalık', 'biber', 'soğan', 'sarımsak', 'patates', 'havuç', 'roka', 'marul', 'limon', 'elma', 'muz'],
    },
    {
        id: 'dairy',
        title: 'Süt Ürünleri',
        keywords: ['süt', 'yoğurt', 'peynir', 'tereyağı', 'kaymak', 'krema'],
    },
    {
        id: 'proteins',
        title: 'Et & Protein',
        keywords: ['tavuk', 'et', 'kıyma', 'balık', 'yumurta', 'hindi'],
    },
    {
        id: 'pantry',
        title: 'Kuru Gıdalar',
        keywords: ['mercimek', 'pirinç', 'bulgur', 'makarna', 'un', 'şeker', 'tuz', 'zeytinyağı', 'nohut', 'fasulye'],
    },
    {
        id: 'bakery',
        title: 'Fırın & Ekmek',
        keywords: ['ekmek', 'baget', 'lavaş', 'simit'],
    },
    {
        id: 'frozen',
        title: 'Dondurulmuş',
        keywords: ['dondurulmuş', 'buzluk'],
    },
    {
        id: 'beverages',
        title: 'İçecekler',
        keywords: ['su', 'maden suyu', 'soda', 'çay', 'kahve', 'meşrubat'],
    },
    {
        id: 'spices',
        title: 'Baharat & Soslar',
        keywords: ['baharat', 'karabiber', 'kimyon', 'pul biber', 'ketçap', 'mayonez'],
    },
];

const buildWeekRange = () => {
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - dayIndex);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const format = (date: Date) =>
        date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

    return `${format(start)} - ${format(end)} Plan`;
};

const normalizeName = (value: string) =>
    value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');

const categorizePantryItems = (items: PantryItem[]): GroceryCategory[] => {
    const buckets = new Map<string, GroceryCategory>();
    CATEGORY_CONFIG.forEach((config) => {
        buckets.set(config.id, { id: config.id, title: config.title, items: [] });
    });

    items.forEach((item) => {
        const normalized = item.normalizedName || normalizeName(item.name);
        const match = CATEGORY_CONFIG.find((config) =>
            config.keywords.some((keyword) => normalized.includes(keyword))
        );
        const category = buckets.get(match?.id ?? 'pantry');
        if (!category) return;
        category.items.push({
            id: `${category.id}-${normalized}`,
            name: item.name,
            status: 'pantry',
            meals: [],
            normalizedName: normalized,
        });
    });

    return Array.from(buckets.values()).filter((category) => category.items.length > 0);
};

export default function GroceriesScreen() {
    const { state: userState } = useUser();
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
    const [newPantryItem, setNewPantryItem] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    const pantryNames = useMemo(
        () =>
            new Set(
                pantryItems.map((item) => item.normalizedName || normalizeName(item.name))
            ),
        [pantryItems]
    );

    const filteredCategories = useMemo(() => {
        if (activeFilter === 'pantry') {
            return categorizePantryItems(pantryItems);
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

    const totalItemCount = useMemo(
        () => filteredCategories.reduce((sum, category) => sum + category.items.length, 0),
        [filteredCategories]
    );

    useEffect(() => {
        const userId = userState.user?.uid;
        if (!userId) return;

        const unsubscribe = onSnapshot(doc(firestore(), 'Users', userId), (snapshot) => {
            const data = snapshot.data();
            const rawItems = Array.isArray(data?.pantry?.items) ? data?.pantry?.items : [];
            const mapped = rawItems
                .map((item: { name?: string; normalizedName?: string }) => ({
                    name: item?.name ?? '',
                    normalizedName: item?.normalizedName ?? normalizeName(item?.name ?? ''),
                }))
                .filter((item) => item.name.length > 0);
            setPantryItems(mapped);
        });

        return unsubscribe;
    }, [userState.user?.uid]);

    const tokenizeInput = (value: string) =>
        value
            .split(/[\n,;•]+/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);

    const handleAddPantryItem = async () => {
        const tokens = tokenizeInput(newPantryItem);
        if (!tokens.length || isSaving) return;

        const userId = userState.user?.uid;
        if (!userId) return;

        setIsSaving(true);
        try {
            const normalizePantry = functions.httpsCallable<
                { items: string[] },
                { success: boolean; items: Array<{ input: string; canonical: string; normalized: string }> }
            >('normalizePantryItems');
            const response = await normalizePantry({ items: tokens });
            const normalizedItems = response.data?.items ?? [];

            const merged = new Map<string, PantryItem>();
            pantryItems.forEach((item) => {
                const normalized = item.normalizedName || normalizeName(item.name);
                if (!normalized) return;
                merged.set(normalized, { name: item.name, normalizedName: normalized });
            });

            normalizedItems.forEach((item) => {
                const canonical = item.canonical?.trim();
                if (!canonical) return;
                const normalized = item.normalized || normalizeName(canonical);
                if (!normalized || merged.has(normalized)) return;
                merged.set(normalized, { name: canonical, normalizedName: normalized });
            });

            const updatedItems = Array.from(merged.values());
            await setDoc(
                doc(firestore(), 'Users', userId),
                {
                    pantry: {
                        items: updatedItems,
                        updatedAt: serverTimestamp(),
                    },
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
            setNewPantryItem('');
            setShowQuickAdd(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemovePantryItem = async (normalizedName?: string) => {
        if (!normalizedName || isSaving) return;
        const userId = userState.user?.uid;
        if (!userId) return;

        const updatedItems = pantryItems.filter(
            (item) => (item.normalizedName || normalizeName(item.name)) !== normalizedName
        );

        setIsSaving(true);
        try {
            await setDoc(
                doc(firestore(), 'Users', userId),
                {
                    pantry: {
                        items: updatedItems,
                        updatedAt: serverTimestamp(),
                    },
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
        } finally {
            setIsSaving(false);
        }
    };

    const renderItemRow = (item: GroceryItem, index: number, totalItems: number) => {
        const isExpanded = expandedItemId === item.id;
        const inPantry = pantryNames.has(item.name.toLocaleLowerCase('tr-TR'));
        const hasMeals = item.meals.length > 0;
        const showUsage = activeFilter !== 'pantry' && hasMeals;
        const isLastItem = index === totalItems - 1;

        const content = (
            <View style={[styles.itemRow, isLastItem && styles.itemRowLast]}>
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

        if (activeFilter === 'pantry') {
            return (
                <View style={styles.pantryRow}>
                    {content}
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleRemovePantryItem(item.normalizedName)}
                    >
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>
            );
        }

        return content;
    };

    const handleToggleUsage = (itemId: string) => {
        setExpandedItemId((prev) => (prev === itemId ? null : itemId));
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <TabScreenHeader
                title="Alışveriş Listem"
                subtitle={buildWeekRange()}
                rightSlot={(
                    <View style={styles.headerMeta}>
                        <Text style={styles.headerCount}>{totalItemCount}</Text>
                        <Text style={styles.headerCountLabel}>ÜRÜN</Text>
                    </View>
                )}
            />

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
                    {activeFilter === 'pantry' ? (
                        <View style={styles.quickAddCard}>
                            {showQuickAdd ? (
                                <>
                                    <Input
                                        label="Yeni ürün ekle"
                                        placeholder="Örn: Nane, sirke, bulgur"
                                        value={newPantryItem}
                                        onChangeText={setNewPantryItem}
                                        autoCapitalize="sentences"
                                    />
                                    <View style={styles.quickAddActions}>
                                        <Button
                                            title="Vazgeç"
                                            variant="ghost"
                                            onPress={() => {
                                                setShowQuickAdd(false);
                                                setNewPantryItem('');
                                            }}
                                            size="small"
                                        />
                                        <Button
                                            title="Ekle"
                                            onPress={handleAddPantryItem}
                                            size="small"
                                            disabled={!newPantryItem.trim().length || isSaving}
                                            loading={isSaving}
                                        />
                                    </View>
                                </>
                            ) : (
                                <TouchableOpacity
                                    style={styles.quickAddButton}
                                    onPress={() => setShowQuickAdd(true)}
                                    activeOpacity={0.9}
                                >
                                    <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
                                    <Text style={styles.quickAddText}>Yeni ürün ekle</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : null}

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
                                    {category.items.map((item, index) => (
                                        <View key={item.id}>
                                            {renderItemRow(item, index, category.items.length)}
                                        </View>
                                    ))}
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
    headerMeta: {
        alignItems: 'flex-end',
    },
    headerCount: {
        ...typography.h2,
        color: colors.accent,
    },
    headerCountLabel: {
        ...typography.caption,
        color: colors.textMuted,
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
    quickAddCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.md,
        ...shadows.sm,
    },
    quickAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
    },
    quickAddText: {
        ...typography.label,
        color: colors.primary,
    },
    quickAddActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
        marginTop: spacing.sm,
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
    pantryRow: {
        position: 'relative',
    },
    deleteButton: {
        position: 'absolute',
        right: spacing.md,
        top: 0,
        bottom: 0,
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
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
