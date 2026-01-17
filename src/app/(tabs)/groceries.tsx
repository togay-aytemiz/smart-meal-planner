import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager, Animated, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TabScreenHeader, Input, Button } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import firestore, { doc, onSnapshot, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { functions } from '../../config/firebase';
import { useUser } from '../../contexts/user-context';
import { fetchMenuBundle } from '../../utils/menu-storage';
import { buildOnboardingHash } from '../../utils/onboarding-hash';
import { checkWeeklyMenuCompleteness, subscribeToMenuCompletion, MenuGenerationStatus } from '../../utils/menu-generation-status';

// Category configuration (must match Cloud Function)
const CATEGORY_TITLES: Record<string, string> = {
    produce: 'Meyve & Sebze',
    proteins: 'Et & Protein',
    dairy: 'Süt Ürünleri',
    grains: 'Tahıllar & Bakliyat',
    spices: 'Baharatlar',
    sauces: 'Sos & Çeşni',
    bakery: 'Fırın & Ekmek',
    frozen: 'Dondurulmuş',
    beverages: 'İçecekler',
    other: 'Diğer',
};

type MealUsage = {
    recipeName: string;
    course: 'main' | 'side' | 'appetizer' | 'soup' | 'salad' | 'dessert' | 'drink' | 'other';
    day: string;
    mealType: 'Kahvaltı' | 'Öğle' | 'Akşam';
};

type GroceryStatus = 'to-buy' | 'pantry';
type GroceryItem = {
    id: string;
    name: string;
    amount?: string;
    status: GroceryStatus;
    meals: MealUsage[];
    normalizedName?: string;
};

const ExpandButton = ({ isExpanded }: { isExpanded: boolean }) => {
    const rotateAnim = useMemo(() => new Animated.Value(isExpanded ? 1 : 0), []);

    useEffect(() => {
        Animated.timing(rotateAnim, {
            toValue: isExpanded ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [isExpanded]);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-180deg'],
    });

    return (
        <View style={styles.usageButton}>
            <Animated.View style={{ transform: [{ rotate }] }}>
                <MaterialCommunityIcons
                    name="chevron-down"
                    size={24}
                    color={colors.textSecondary}
                />
            </Animated.View>
        </View>
    );
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



type PantryItem = {
    name: string;
    normalizedName: string;
};

const getCourseIcon = (course: MealUsage['course']): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (course) {
        case 'main': return 'food-steak';
        case 'side': return 'food-drumstick';
        case 'soup': return 'bowl-mix';
        case 'salad': return 'leaf';
        case 'appetizer': return 'food-croissant';
        case 'dessert': return 'cupcake';
        case 'drink': return 'cup';
        default: return 'silverware-fork-knife';
    }
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

const buildWeekDateKeys = () => {
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7; // Monday = 0
    const start = new Date(now);
    start.setDate(now.getDate() - dayIndex);

    const keys: { dateKey: string; label: string }[] = [];
    const labels = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const year = d.getFullYear();
        const month = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        keys.push({
            dateKey: `${year}-${month}-${day}`,
            label: labels[i]
        });
    }
    return keys;
};

const categorizeItems = (items: GroceryItem[]): GroceryCategory[] => {
    const buckets = new Map<string, GroceryCategory>();
    // Pre-fill all categories to order them as per config
    CATEGORY_CONFIG.forEach((config) => {
        buckets.set(config.id, { id: config.id, title: config.title, items: [] });
    });
    // Add 'other' category for unmatched items
    buckets.set('other', { id: 'other', title: 'Diğer', items: [] });

    items.forEach((item) => {
        const normalized = item.normalizedName || normalizeName(item.name);
        const match = CATEGORY_CONFIG.find((config) =>
            config.keywords.some((keyword) => normalized.includes(keyword))
        );
        const categoryId = match?.id ?? 'other';
        const category = buckets.get(categoryId);
        if (category) {
            category.items.push(item);
        }
    });

    return Array.from(buckets.values()).filter((category) => category.items.length > 0);
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
    const [groceryCategories, setGroceryCategories] = useState<GroceryCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPantryItem, setNewPantryItem] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [menuStatus, setMenuStatus] = useState<MenuGenerationStatus | null>(null);
    const [isMenuGenerating, setIsMenuGenerating] = useState(false);
    const pollCleanupRef = useRef<(() => void) | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const floatingButtonAnim = useRef(new Animated.Value(0)).current;

    // Animate floating button when selection changes
    useEffect(() => {
        Animated.spring(floatingButtonAnim, {
            toValue: selectedItems.size > 0 ? 1 : 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
        }).start();
    }, [selectedItems.size]);

    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    const fetchWeeklyGroceries = useCallback(async () => {
        const userId = userState.user?.uid;
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const today = new Date();

        // First, check if menu generation is complete
        const status = await checkWeeklyMenuCompleteness(userId, today);
        setMenuStatus(status);

        if (!status.complete) {
            // Menu is still generating - start polling
            setIsMenuGenerating(true);
            setLoading(false);

            // Clean up any existing poll
            if (pollCleanupRef.current) {
                pollCleanupRef.current();
            }

            // Start polling for completion
            pollCleanupRef.current = subscribeToMenuCompletion(
                userId,
                (newStatus) => {
                    setMenuStatus(newStatus);
                    if (newStatus.complete) {
                        setIsMenuGenerating(false);
                        // Trigger a refresh to load the grocery list
                        fetchWeeklyGroceries();
                    }
                },
                5000,
                today // Poll every 5 seconds
            );
            return;
        }

        // Menu is complete - proceed to fetch groceries
        setIsMenuGenerating(false);

        try {
            const weekDates = buildWeekDateKeys(today);
            const allIngredients = new Map<string, GroceryItem>();
            const onboardingHash = buildOnboardingHash(null); // Or pass actual onboarding if needed

            const processMeal = (
                dateLabel: string,
                mealType: 'Kahvaltı' | 'Öğle' | 'Akşam',
                recipeName: string,
                course: string,
                items: { name: string; amount?: string | number; unit?: string }[]
            ) => {
                items.forEach((ing) => {
                    const normalized = normalizeName(ing.name);
                    const existing = allIngredients.get(normalized);
                    const mealUsage: MealUsage = {
                        recipeName,
                        course: (course as MealUsage['course']) || 'other',
                        day: dateLabel,
                        mealType,
                    };

                    if (existing) {
                        // Check if this exact meal usage already exists
                        const exists = existing.meals.some(
                            m => m.recipeName === recipeName && m.day === dateLabel
                        );
                        if (!exists) {
                            existing.meals.push(mealUsage);
                        }
                    } else {
                        const amountStr = ing.amount ? `${ing.amount} ${ing.unit ?? ''}`.trim() : undefined;
                        allIngredients.set(normalized, {
                            id: `g-${normalized}`,
                            name: ing.name,
                            amount: amountStr,
                            status: 'to-buy',
                            meals: [mealUsage],
                            normalizedName: normalized,
                        });
                    }
                });
            };

            const promises = weekDates.map(async ({ dateKey, label }) => {
                const [breakfast, lunch, dinner] = await Promise.all([
                    fetchMenuBundle(userId, dateKey, 'breakfast', onboardingHash),
                    fetchMenuBundle(userId, dateKey, 'lunch', onboardingHash),
                    fetchMenuBundle(userId, dateKey, 'dinner', onboardingHash),
                ]);

                if (breakfast?.recipes?.recipes) {
                    breakfast.recipes.recipes.forEach(r =>
                        processMeal(label, 'Kahvaltı', r.name, r.course, r.ingredients || [])
                    );
                }
                if (lunch?.recipes?.recipes) {
                    lunch.recipes.recipes.forEach(r =>
                        processMeal(label, 'Öğle', r.name, r.course, r.ingredients || [])
                    );
                }
                if (dinner?.recipes?.recipes) {
                    dinner.recipes.recipes.forEach(r =>
                        processMeal(label, 'Akşam', r.name, r.course, r.ingredients || [])
                    );
                }
            });

            await Promise.all(promises);

            const items = Array.from(allIngredients.values());
            const categorized = categorizeItems(items);
            setGroceryCategories(categorized);

        } catch (error) {
            console.error('Failed to fetch grocery list:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userState.user?.uid]);

    useEffect(() => {
        fetchWeeklyGroceries();
    }, [fetchWeeklyGroceries]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchWeeklyGroceries();
    }, [fetchWeeklyGroceries]);

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

        return groceryCategories.map((category) => {
            const items = category.items.filter((item) => {
                if (activeFilter === 'all') return true;
                const inPantry = pantryNames.has(item.normalizedName || normalizeName(item.name));
                return !inPantry;
            });
            return { ...category, items };
        }).filter((category) => category.items.length > 0);
    }, [activeFilter, pantryNames, groceryCategories, pantryItems]);

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
                .filter((item: PantryItem) => item.name.length > 0);
            setPantryItems(mapped);
        });

        return unsubscribe;
    }, [userState.user?.uid]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollCleanupRef.current) {
                pollCleanupRef.current();
            }
        };
    }, []);

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
            toggleQuickAdd(false);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleQuickAdd = (nextState: boolean) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowQuickAdd(nextState);
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

    const handleToggleSelect = (itemId: string) => {
        setSelectedItems((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const handleCheckout = async () => {
        const userId = userState.user?.uid;
        if (!userId || selectedItems.size === 0 || isCheckingOut) return;

        setIsCheckingOut(true);
        try {
            // Get all selected items from categories
            const itemsToAdd: { name: string; normalizedName: string }[] = [];
            groceryCategories.forEach((category) => {
                category.items.forEach((item) => {
                    if (selectedItems.has(item.id)) {
                        itemsToAdd.push({
                            name: item.name,
                            normalizedName: item.normalizedName || normalizeName(item.name),
                        });
                    }
                });
            });

            // Merge with existing pantry items (no duplicates)
            const merged = new Map<string, PantryItem>();
            pantryItems.forEach((item) => {
                merged.set(item.normalizedName, item);
            });
            itemsToAdd.forEach((item) => {
                merged.set(item.normalizedName, item);
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

            // Clear selection
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelectedItems(new Set());
        } finally {
            setIsCheckingOut(false);
        }
    };

    const renderItemRow = (item: GroceryItem, index: number, totalItems: number) => {
        const isExpanded = expandedItemId === item.id;
        const inPantry = pantryNames.has(item.name.toLocaleLowerCase('tr-TR'));
        const hasMeals = item.meals.length > 0;
        const showUsage = activeFilter !== 'pantry' && hasMeals;
        const isLastItem = index === totalItems - 1;
        const isSelected = selectedItems.has(item.id);
        const showCheckbox = activeFilter !== 'pantry';

        const content = (
            <View style={[styles.itemRow, isLastItem && styles.itemRowLast]}>
                <View style={styles.itemMainRow}>
                    {showCheckbox && (
                        <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => handleToggleSelect(item.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                {isSelected && (
                                    <MaterialCommunityIcons name="check" size={14} color={colors.textInverse} />
                                )}
                            </View>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.itemContent}
                        onPress={showUsage ? () => handleToggleUsage(item.id) : undefined}
                        activeOpacity={showUsage ? 0.7 : 1}
                        disabled={!showUsage}
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
                                <ExpandButton isExpanded={isExpanded} />
                            ) : null}
                        </View>
                    </TouchableOpacity>
                </View>
                {isExpanded && showUsage ? (
                    <View style={styles.usageContainer}>
                        {item.meals.map((meal, idx) => {
                            const courseIcon = getCourseIcon(meal.course);
                            return (
                                <View key={idx} style={styles.usageRow}>
                                    <MaterialCommunityIcons
                                        name={courseIcon}
                                        size={14}
                                        color={colors.textMuted}
                                    />
                                    <Text style={styles.usageText}>
                                        {meal.recipeName}
                                    </Text>
                                    <Text style={styles.usageDay}>
                                        {meal.day}
                                    </Text>
                                </View>
                            );
                        })}
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
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
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
                                                toggleQuickAdd(false);
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
                                    onPress={() => toggleQuickAdd(true)}
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
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text style={styles.loadingText}>Liste hazırlanıyor...</Text>
                                </View>
                            ) : isMenuGenerating ? (
                                <View style={styles.loadingContainer}>
                                    <MaterialCommunityIcons name="chef-hat" size={56} color={colors.accent} />
                                    <Text style={styles.placeholderTitle}>Haftalık Menü Hazırlanıyor</Text>
                                    <Text style={styles.placeholderText}>
                                        Menünüz arka planda oluşturuluyor...
                                    </Text>
                                    {menuStatus && (
                                        <View style={styles.progressContainer}>
                                            <View style={styles.progressBar}>
                                                <View
                                                    style={[
                                                        styles.progressFill,
                                                        { width: `${(menuStatus.generatedDays / menuStatus.totalDays) * 100}%` }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.progressText}>
                                                {menuStatus.generatedDays}/{menuStatus.totalDays} gün tamamlandı
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="cart-outline" size={56} color={colors.iconMuted} />
                                    <Text style={styles.placeholderTitle}>Liste boş</Text>
                                    <Text style={styles.placeholderText}>
                                        Bu filtre için henüz malzeme yok.
                                    </Text>
                                </>
                            )}
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

            {/* Floating Checkout Button */}
            <Animated.View
                style={[
                    styles.floatingButtonContainer,
                    {
                        opacity: floatingButtonAnim,
                        transform: [{
                            translateY: floatingButtonAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [100, 0],
                            }),
                        }],
                    },
                ]}
                pointerEvents={selectedItems.size > 0 ? 'auto' : 'none'}
            >
                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={handleCheckout}
                    activeOpacity={0.9}
                    disabled={isCheckingOut}
                >
                    {isCheckingOut ? (
                        <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.textInverse} />
                            <Text style={styles.floatingButtonText}>
                                Satın alındı işaretle ({selectedItems.size})
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </Animated.View>
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
        paddingTop: spacing.xs,
        paddingBottom: spacing.md,
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
        paddingBottom: 120,
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
    itemMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
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
        right: 0,
        top: 0,
        bottom: 0,
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    usageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.xs / 2,
    },
    usageText: {
        ...typography.caption,
        color: colors.textPrimary,
        flex: 1,
    },
    usageContainer: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        paddingLeft: 22 + spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    usageSeparator: {
        ...typography.caption,
        color: colors.textMuted,
        marginHorizontal: spacing.xs / 2,
    },
    usageDay: {
        ...typography.caption,
        color: colors.textMuted,
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
    loadingContainer: {
        alignItems: 'center',
        gap: spacing.md,
    },
    progressContainer: {
        marginTop: spacing.lg,
        width: '80%',
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: colors.border,
        borderRadius: radius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: radius.full,
    },
    progressText: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    spinner: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: colors.primary,
        borderTopColor: 'transparent',
        // Note: Simple CSS spinner, in RN use ActivityIndicator usually, 
        // but since we want to keep it simple without importing ActivityIndicator for now or use it if available
    },
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    checkboxContainer: {
        paddingRight: spacing.sm,
        justifyContent: 'center',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: radius.sm,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    checkboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    itemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    floatingButtonContainer: {
        position: 'absolute',
        bottom: spacing.md,
        left: spacing.lg,
        right: spacing.lg,
    },
    floatingButton: {
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        ...shadows.md,
    },
    floatingButtonText: {
        ...typography.label,
        color: colors.textInverse,
        fontWeight: '600',
    },
});
