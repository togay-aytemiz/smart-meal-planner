import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager, Animated, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TabScreenHeader, Input, Button } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import firestore, { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { functions } from '../../config/firebase';
import { useUser } from '../../contexts/user-context';
import { fetchMenuBundle, fetchMenuDecision, type MenuDecisionWithLinks } from '../../utils/menu-storage';
import { buildOnboardingHash, type OnboardingSnapshot } from '../../utils/onboarding-hash';
import { checkWeeklyMenuCompleteness, subscribeToMenuGenerationStatus, getWeekStartDate, MenuGenerationStatus } from '../../utils/menu-generation-status';
import type { MenuMealType, MenuRecipe, MenuRecipeCourse, MenuRecipesResponse } from '../../types/menu-recipes';
import type { RoutineDay, WeeklyRoutine } from '../../contexts/onboarding-context';

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
    amountLabel?: string;
    amountValue?: number;
    unit?: string;
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

const DAY_ORDER: Record<string, number> = {
    Pazartesi: 0,
    Pzt: 0,
    Salı: 1,
    Sal: 1,
    Çarşamba: 2,
    Çar: 2,
    Perşembe: 3,
    Per: 3,
    Cuma: 4,
    Cum: 4,
    Cumartesi: 5,
    Cmt: 5,
    Pazar: 6,
    Paz: 6,
};

const MEAL_TYPE_ORDER: Record<MealUsage['mealType'], number> = {
    Kahvaltı: 0,
    Öğle: 1,
    Akşam: 2,
};

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

const buildWeekDateKeys = (startDate?: Date) => {
    const base = startDate ?? new Date();
    const reference = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const dayIndex = (reference.getDay() + 6) % 7; // Monday = 0
    const start = new Date(reference);
    start.setDate(reference.getDate() - dayIndex);

    const keys: { dateKey: string; label: string }[] = [];
    const labels = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        if (startDate && d.getTime() < reference.getTime()) {
            continue;
        }
        const year = d.getFullYear();
        const month = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        const labelIndex = (d.getDay() + 6) % 7;
        keys.push({
            dateKey: `${year}-${month}-${day}`,
            label: labels[labelIndex]
        });
    }
    return keys;
};

const buildDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const STORAGE_KEY = '@smart_meal_planner:onboarding';
const MENU_RECIPES_STORAGE_KEY = '@smart_meal_planner:menu_recipes';
const MENU_CACHE_STORAGE_KEY = '@smart_meal_planner:menu_cache';

const DEFAULT_ROUTINES: WeeklyRoutine = {
    monday: { type: 'office', gymTime: 'none' },
    tuesday: { type: 'office', gymTime: 'none' },
    wednesday: { type: 'office', gymTime: 'none' },
    thursday: { type: 'office', gymTime: 'none' },
    friday: { type: 'office', gymTime: 'none' },
    saturday: { type: 'remote', gymTime: 'none' },
    sunday: { type: 'remote', gymTime: 'none' },
};

type MenuCache = {
    menu: MenuDecisionWithLinks;
    recipes?: MenuRecipesResponse;
    cachedAt: string;
    onboardingHash?: string;
};

type MenuRecipesCache = {
    data: MenuRecipesResponse;
    cachedAt: string;
    onboardingHash?: string;
};

const buildMenuCacheKey = (userId: string, date: string, mealType: MenuMealType) =>
    `${MENU_CACHE_STORAGE_KEY}:${userId}:${date}:${mealType}`;

const buildMenuRecipesKey = (userId: string, mealType: MenuMealType) =>
    `${MENU_RECIPES_STORAGE_KEY}:${userId}:${mealType}`;

const parseMenuRecipesCache = (
    raw: string | null,
    expectedOnboardingHash?: string | null
): MenuRecipesResponse | null => {
    if (!raw) {
        return null;
    }

    const parsed = JSON.parse(raw) as MenuRecipesCache | MenuRecipesResponse;

    if ('recipes' in parsed) {
        if (typeof expectedOnboardingHash === 'string') {
            return null;
        }
        return parsed;
    }

    const data = parsed.data;
    if (!data?.recipes?.length) {
        return null;
    }

    if (typeof expectedOnboardingHash === 'string') {
        if (!parsed.onboardingHash || parsed.onboardingHash !== expectedOnboardingHash) {
            return null;
        }
    }

    return data;
};

const getDayKey = (dateKey: string): keyof WeeklyRoutine => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklyRoutine;
};

const isRoutineExcluded = (routine: RoutineDay | undefined) => {
    if (!routine) {
        return false;
    }
    return routine.excludeFromPlan === true || routine.type === 'off';
};

const loadOnboardingSnapshot = async (userId: string): Promise<OnboardingSnapshot | null> => {
    const localRaw = await AsyncStorage.getItem(STORAGE_KEY);
    const localStored = localRaw ? (JSON.parse(localRaw) as { data?: OnboardingSnapshot }) : null;
    const localSnapshot = localStored?.data ?? null;

    if (userId === 'anonymous') {
        return localSnapshot;
    }

    try {
        const userSnap = await getDoc(doc(firestore(), 'Users', userId));
        const remoteSnapshot = userSnap.data()?.onboarding as OnboardingSnapshot | undefined;
        return remoteSnapshot ?? localSnapshot;
    } catch (error) {
        console.warn('Failed to load onboarding snapshot:', error);
        return localSnapshot;
    }
};

const COURSE_VALUES: MenuRecipeCourse[] = ['main', 'side', 'soup', 'salad', 'meze', 'dessert', 'pastry'];

const normalizeCourseValue = (value: unknown): MenuRecipeCourse | null => {
    if (typeof value !== 'string') {
        return null;
    }
    return COURSE_VALUES.includes(value as MenuRecipeCourse) ? (value as MenuRecipeCourse) : null;
};

type FirestoreRecipeDoc = {
    name: string;
    brief: string;
    ingredients: MenuRecipe['ingredients'];
    instructions: MenuRecipe['instructions'];
    macrosPerServing: MenuRecipe['macrosPerServing'];
    metadata: {
        course: MenuRecipeCourse;
        servings: number;
        prepTimeMinutes: number;
        cookTimeMinutes: number;
        totalTimeMinutes: number;
    };
};

const parseRecipeDoc = (data?: FirestoreRecipeDoc): MenuRecipe | null => {
    const course = normalizeCourseValue(data?.metadata?.course);
    if (!data || !course) {
        return null;
    }

    return {
        course,
        name: data.name,
        brief: data.brief,
        servings: data.metadata?.servings ?? 1,
        prepTimeMinutes: data.metadata?.prepTimeMinutes ?? 0,
        cookTimeMinutes: data.metadata?.cookTimeMinutes ?? 0,
        totalTimeMinutes: data.metadata?.totalTimeMinutes ?? 0,
        ingredients: data.ingredients ?? [],
        instructions: data.instructions ?? [],
        macrosPerServing: data.macrosPerServing ?? {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
        },
    };
};

const fetchRecipeById = async (recipeId: string) => {
    try {
        const recipeSnap = await getDoc(doc(firestore(), 'recipes', recipeId));
        if (!recipeSnap.exists()) {
            return null;
        }
        const data = recipeSnap.data() as FirestoreRecipeDoc | undefined;
        return parseRecipeDoc(data);
    } catch (error) {
        console.warn('Failed to fetch recipe by id:', error);
        return null;
    }
};

type MenuRecipeParamsPayload = {
    userId: string;
    date: string;
    dayOfWeek: string;
    onboardingHash?: string;
    dietaryRestrictions: string[];
    allergies: string[];
    cuisinePreferences: string[];
    timePreference: 'quick' | 'balanced' | 'elaborate';
    skillLevel: 'beginner' | 'intermediate' | 'expert';
    equipment: string[];
    householdSize: number;
    routine?: RoutineDay;
    mealType: MenuMealType;
    generateImage?: boolean;
    menu: MenuDecisionWithLinks;
};

type GenerateRecipeResponse = {
    success: boolean;
    menuRecipes: MenuRecipesResponse;
};

type WeeklyMenuRequest = {
    userId: string;
    weekStart: string;
    startDate?: string;
    onboarding?: OnboardingSnapshot | null;
    onboardingHash?: string;
    generateImage?: boolean;
};

type WeeklyMenuResponse = {
    success: boolean;
    weekStart: string;
    timestamp?: string;
};

type LoadGroceriesOptions = {
    allowWeeklyGeneration?: boolean;
};

type LoadGroceriesResult = {
    hasAnyMenu: boolean;
    ingredientCount: number;
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

const normalizeUnit = (value?: string) =>
    value?.trim().toLocaleLowerCase('tr-TR') ?? '';

const parseAmountValue = (value?: string | number) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (fractionMatch) {
            const numerator = Number(fractionMatch[1]);
            const denominator = Number(fractionMatch[2]);
            if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
                return numerator / denominator;
            }
        }
        const numericMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)$/);
        if (numericMatch) {
            return Number(numericMatch[1].replace(',', '.'));
        }
    }
    return null;
};

const formatAmountValue = (value: number) => {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
};

const buildTotalAmountLabel = (totals: Map<string, { total: number; label: string }>) => {
    const parts = Array.from(totals.values())
        .filter((entry) => Number.isFinite(entry.total) && entry.total > 0)
        .map((entry) => {
            const amountText = formatAmountValue(entry.total);
            return entry.label ? `${amountText} ${entry.label}` : amountText;
        });
    return parts.length ? parts.join(' + ') : undefined;
};

const USAGE_UNIT_HIDE = new Set(['adet', 'ad', 'tane']);

const USAGE_UNIT_ABBREVIATIONS: Record<string, string> = {
    'yemek kaşığı': 'yk',
    'yemek kasigi': 'yk',
    'çay kaşığı': 'çk',
    'cay kasigi': 'çk',
    'tatlı kaşığı': 'tk',
    'tatli kasigi': 'tk',
    'su bardağı': 'sb',
    'su bardagi': 'sb',
    'çay bardağı': 'çb',
    'cay bardagi': 'çb',
    'gram': 'g',
    'g': 'g',
    'kilogram': 'kg',
    'kg': 'kg',
    'mililitre': 'ml',
    'ml': 'ml',
    'litre': 'l',
    'l': 'l',
};

const buildUsageAmountLabel = (amountValue: number | null, unitLabel?: string) => {
    if (amountValue === null) return undefined;
    const amountText = formatAmountValue(amountValue);
    if (!unitLabel) return amountText;
    const unitKey = normalizeUnit(unitLabel);
    if (USAGE_UNIT_HIDE.has(unitKey)) return amountText;
    const abbreviatedUnit = USAGE_UNIT_ABBREVIATIONS[unitKey] ?? unitLabel;
    return `${amountText} ${abbreviatedUnit}`;
};

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
    const loadInProgressRef = useRef(false);
    const clearGeneratingAfterLoadRef = useRef(false);
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
        const weekStart = getWeekStartDate(today);

        // Clean up any existing subscription
        if (pollCleanupRef.current) {
            pollCleanupRef.current();
            pollCleanupRef.current = null;
        }

        // Helper to load groceries from existing menus
        const loadGroceriesFromMenus = async (
            attempt = 0,
            options?: LoadGroceriesOptions
        ): Promise<LoadGroceriesResult> => {
            if (attempt === 0) {
                if (loadInProgressRef.current) {
                    return { hasAnyMenu: false, ingredientCount: 0 };
                }
                loadInProgressRef.current = true;
            }
            try {
                const weekDates = buildWeekDateKeys(today);
                const allIngredients = new Map<string, GroceryItem>();
                const amountTotals = new Map<string, Map<string, { total: number; label: string }>>();
                const onboardingSnapshot = await loadOnboardingSnapshot(userId);
                const onboardingHash = buildOnboardingHash(onboardingSnapshot);
                const routines = onboardingSnapshot?.routines ?? DEFAULT_ROUTINES;
                let hasAnyMenu = false;
                const allowWeeklyGeneration = options?.allowWeeklyGeneration ?? true;

                const normalizeMenuKey = (course: string, name: string) =>
                    `${course}:${name.trim().toLocaleLowerCase('tr-TR')}`;

                const recipesMatchMenu = (menu: MenuDecisionWithLinks, recipes: MenuRecipe[]) => {
                    const recipeKeys = new Set(recipes.map((item) => normalizeMenuKey(item.course, item.name)));
                    return menu.items.every((item) => recipeKeys.has(normalizeMenuKey(item.course, item.name)));
                };

                const persistRecipeCaches = async (
                    dateKey: string,
                    mealType: MenuMealType,
                    menuDecision: MenuDecisionWithLinks,
                    menuRecipes: MenuRecipesResponse
                ) => {
                    try {
                        const cachedAt = new Date().toISOString();
                        const cacheData: MenuCache = {
                            menu: menuDecision,
                            recipes: menuRecipes,
                            cachedAt,
                            onboardingHash: onboardingHash ?? undefined,
                        };
                        await AsyncStorage.setItem(
                            buildMenuCacheKey(userId, dateKey, mealType),
                            JSON.stringify(cacheData)
                        );
                        const recipesCache: MenuRecipesCache = {
                            data: menuRecipes,
                            cachedAt,
                            onboardingHash: onboardingHash ?? undefined,
                        };
                        await AsyncStorage.setItem(
                            buildMenuRecipesKey(userId, mealType),
                            JSON.stringify(recipesCache)
                        );
                    } catch (cacheError) {
                        console.warn('Grocery cache write error:', cacheError);
                    }
                };

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
                        const amountValue = parseAmountValue(ing.amount);
                        const unitLabel = ing.unit?.trim();
                        const totals = amountTotals.get(normalized) ?? new Map<string, { total: number; label: string }>();
                        if (!amountTotals.has(normalized)) {
                            amountTotals.set(normalized, totals);
                        }

                        if (amountValue !== null) {
                            const unitKey = normalizeUnit(unitLabel);
                            const existingTotal = totals.get(unitKey);
                            if (existingTotal) {
                                existingTotal.total += amountValue;
                            } else {
                                totals.set(unitKey, { total: amountValue, label: unitLabel ?? '' });
                            }
                        }

                        const totalAmountLabel = buildTotalAmountLabel(totals);
                        const usageAmountLabel = buildUsageAmountLabel(amountValue, unitLabel);
                        const mealUsage: MealUsage = {
                            recipeName,
                            course: (course as MealUsage['course']) || 'other',
                            day: dateLabel,
                            mealType,
                            amountLabel: usageAmountLabel,
                            amountValue: amountValue ?? undefined,
                            unit: unitLabel,
                        };

                        if (existing) {
                            const existingUsage = existing.meals.find(
                                (m) => m.recipeName === recipeName && m.day === dateLabel && m.mealType === mealType
                            );
                            if (existingUsage) {
                                if (amountValue !== null) {
                                    const existingUnit = normalizeUnit(existingUsage.unit);
                                    const incomingUnit = normalizeUnit(unitLabel);
                                    if (!existingUsage.unit || existingUnit === incomingUnit) {
                                        const mergedValue = (existingUsage.amountValue ?? 0) + amountValue;
                                        existingUsage.amountValue = mergedValue;
                                        existingUsage.unit = unitLabel || existingUsage.unit;
                                        existingUsage.amountLabel = buildUsageAmountLabel(mergedValue, existingUsage.unit);
                                    }
                                }
                            } else {
                                existing.meals.push(mealUsage);
                            }
                            existing.amount = totalAmountLabel;
                        } else {
                            allIngredients.set(normalized, {
                                id: `g-${normalized}`,
                                name: ing.name,
                                amount: totalAmountLabel,
                                status: 'to-buy',
                                meals: [mealUsage],
                                normalizedName: normalized,
                            });
                        }
                    });
                };

                const loadRecipesForMeal = async (
                    dateKey: string,
                    mealType: MenuMealType
                ): Promise<MenuRecipe[]> => {
                    try {
                        const bundle = await fetchMenuBundle(userId, dateKey, mealType, null);
                        if (bundle?.recipes?.recipes?.length) {
                            await persistRecipeCaches(dateKey, mealType, bundle.menu, bundle.recipes);
                            return bundle.recipes.recipes;
                        }
                    } catch (bundleError) {
                        console.warn('Grocery menu bundle read error:', bundleError);
                    }

                    let cachedMenu: MenuCache | null = null;
                    try {
                        const cachedMenuRaw = await AsyncStorage.getItem(buildMenuCacheKey(userId, dateKey, mealType));
                        if (cachedMenuRaw) {
                            cachedMenu = JSON.parse(cachedMenuRaw) as MenuCache;
                        }
                    } catch (cacheError) {
                        console.warn('Grocery menu cache read error:', cacheError);
                    }

                    let menuDecision: MenuDecisionWithLinks | null = cachedMenu?.menu ?? null;
                    try {
                        const firestoreMenu = await fetchMenuDecision(userId, dateKey, mealType, null);
                        if (firestoreMenu) {
                            menuDecision = firestoreMenu;
                        }
                    } catch (menuError) {
                        console.warn('Grocery menu decision read error:', menuError);
                    }

                    if (!menuDecision?.items?.length) {
                        return [];
                    }
                    hasAnyMenu = true;

                    const hasHashMismatch =
                        typeof onboardingHash === 'string' &&
                        cachedMenu?.onboardingHash &&
                        cachedMenu.onboardingHash !== onboardingHash;

                    if (!hasHashMismatch && cachedMenu?.recipes?.recipes?.length) {
                        if (recipesMatchMenu(menuDecision, cachedMenu.recipes.recipes)) {
                            return cachedMenu.recipes.recipes;
                        }
                    }

                    try {
                        const rawRecipesCache = await AsyncStorage.getItem(buildMenuRecipesKey(userId, mealType));
                        const parsedRecipes = parseMenuRecipesCache(rawRecipesCache, onboardingHash);
                        if (parsedRecipes?.recipes?.length && recipesMatchMenu(menuDecision, parsedRecipes.recipes)) {
                            return parsedRecipes.recipes;
                        }
                    } catch (recipesCacheError) {
                        console.warn('Grocery recipes cache read error:', recipesCacheError);
                    }

                    const recipeIds = menuDecision.items
                        .map((item) => (typeof item.recipeId === 'string' ? item.recipeId : null))
                        .filter((value): value is string => Boolean(value));

                    if (recipeIds.length) {
                        const recipesFromDb: MenuRecipe[] = [];
                        for (const recipeId of recipeIds) {
                            const recipe = await fetchRecipeById(recipeId);
                            if (recipe) {
                                recipesFromDb.push(recipe);
                            }
                        }

                        if (recipesFromDb.length && recipesMatchMenu(menuDecision, recipesFromDb)) {
                            const menuRecipes: MenuRecipesResponse = {
                                menuType: menuDecision.menuType,
                                cuisine: menuDecision.cuisine,
                                totalTimeMinutes: menuDecision.totalTimeMinutes,
                                recipes: recipesFromDb,
                            };
                            await persistRecipeCaches(dateKey, mealType, menuDecision, menuRecipes);
                            return recipesFromDb;
                        }
                    }

                    const dayKey = getDayKey(dateKey);
                    const routineForDay = routines[dayKey];

                    const menuParams: MenuRecipeParamsPayload = {
                        userId,
                        date: dateKey,
                        dayOfWeek: dayKey,
                        dietaryRestrictions: onboardingSnapshot?.dietary?.restrictions ?? [],
                        allergies: onboardingSnapshot?.dietary?.allergies ?? [],
                        cuisinePreferences: onboardingSnapshot?.cuisine?.selected ?? [],
                        timePreference: onboardingSnapshot?.cooking?.timePreference ?? 'balanced',
                        skillLevel: onboardingSnapshot?.cooking?.skillLevel ?? 'intermediate',
                        equipment: onboardingSnapshot?.cooking?.equipment ?? [],
                        householdSize: onboardingSnapshot?.householdSize ?? 1,
                        routine: routineForDay
                            ? {
                                type: routineForDay.type,
                                gymTime: routineForDay.gymTime,
                                officeMealToGo: routineForDay.officeMealToGo,
                                officeBreakfastAtHome: routineForDay.officeBreakfastAtHome,
                                schoolBreakfast: routineForDay.schoolBreakfast,
                                remoteMeals: routineForDay.remoteMeals,
                                excludeFromPlan: routineForDay.excludeFromPlan,
                            }
                            : undefined,
                        mealType,
                        generateImage: false,
                        menu: menuDecision,
                        ...(typeof onboardingHash === 'string' ? { onboardingHash } : {}),
                    };

                    try {
                        const callRecipe = functions.httpsCallable<
                            { params: MenuRecipeParamsPayload },
                            GenerateRecipeResponse
                        >('generateOpenAIRecipe');
                        const response = await callRecipe({ params: menuParams });
                        const menuRecipes = response.data?.menuRecipes;

                        if (!menuRecipes?.recipes?.length) {
                            return [];
                        }

                        if (!recipesMatchMenu(menuDecision, menuRecipes.recipes)) {
                            return [];
                        }

                        await persistRecipeCaches(dateKey, mealType, menuDecision, menuRecipes);
                        return menuRecipes.recipes;
                    } catch (generationError) {
                        console.warn('Grocery recipe generation error:', generationError);
                        return [];
                    }
                };

                const mealTypes: MenuMealType[] = ['breakfast', 'lunch', 'dinner'];
                const mealLabels: Record<MenuMealType, 'Kahvaltı' | 'Öğle' | 'Akşam'> = {
                    breakfast: 'Kahvaltı',
                    lunch: 'Öğle',
                    dinner: 'Akşam',
                };
                const runWithConcurrencyLimit = async (tasks: Array<() => Promise<void>>, limit: number) => {
                    const queue = [...tasks];
                    const workerCount = Math.min(limit, queue.length);
                    const workers = Array.from({ length: workerCount }, async () => {
                        while (queue.length) {
                            const task = queue.shift();
                            if (!task) {
                                return;
                            }
                            await task();
                        }
                    });
                    await Promise.all(workers);
                };
                const recipeTasks: Array<() => Promise<void>> = [];
                const excludedDateKeys = new Set(
                    weekDates
                        .filter(({ dateKey }) => isRoutineExcluded(routines[getDayKey(dateKey)]))
                        .map(({ dateKey }) => dateKey)
                );

                for (const { dateKey, label } of weekDates) {
                    if (excludedDateKeys.has(dateKey)) {
                        continue;
                    }
                    for (const mealType of mealTypes) {
                        recipeTasks.push(async () => {
                            const recipes = await loadRecipesForMeal(dateKey, mealType);
                            const mealLabel = mealLabels[mealType];
                            recipes.forEach((recipe) =>
                                processMeal(label, mealLabel, recipe.name, recipe.course, recipe.ingredients || [])
                            );
                        });
                    }
                }

                await runWithConcurrencyLimit(recipeTasks, 4);

                if (!hasAnyMenu && attempt === 0 && allowWeeklyGeneration) {
                    try {
                        const todayKey = buildDateKey(today);
                        const callWeeklyMenu = functions.httpsCallable<
                            { request: WeeklyMenuRequest },
                            WeeklyMenuResponse
                        >('generateWeeklyMenu');
                        await callWeeklyMenu({
                            request: {
                                userId,
                                weekStart,
                                startDate: todayKey,
                                generateImage: false,
                                ...(onboardingSnapshot ? { onboarding: onboardingSnapshot } : {}),
                                ...(typeof onboardingHash === 'string' ? { onboardingHash } : {}),
                            },
                        });
                        return loadGroceriesFromMenus(1, options);
                    } catch (weeklyError) {
                        console.warn('Grocery weekly menu generation error:', weeklyError);
                    }
                }

                const items = Array.from(allIngredients.values());
                const categorized = categorizeItems(items);
                setGroceryCategories(categorized);
                if (clearGeneratingAfterLoadRef.current && hasAnyMenu) {
                    clearGeneratingAfterLoadRef.current = false;
                    setIsMenuGenerating(false);
                }
                return {
                    hasAnyMenu,
                    ingredientCount: allIngredients.size,
                };
            } catch (error) {
                console.error('Failed to fetch grocery list:', error);
                clearGeneratingAfterLoadRef.current = false;
                return { hasAnyMenu: false, ingredientCount: 0 };
            } finally {
                if (attempt === 0) {
                    loadInProgressRef.current = false;
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        };

        const triggerLoadGroceries = (options?: LoadGroceriesOptions) => {
            loadGroceriesFromMenus(0, options)
                .then((result) => {
                    if (options?.allowWeeklyGeneration === false && result.hasAnyMenu) {
                        setIsMenuGenerating(false);
                    }
                })
                .catch((error) => {
                    console.warn('Grocery load trigger error:', error);
                });
        };

        // Subscribe to menu generation status
        pollCleanupRef.current = subscribeToMenuGenerationStatus(
            userId,
            weekStart,
            (status) => {
                setMenuStatus(status);

                if (status.state === 'in_progress') {
                    // Still generating - show progress UI
                    clearGeneratingAfterLoadRef.current = true;
                    setIsMenuGenerating(true);
                    setLoading(false);
                    setRefreshing(false);
                    // If menus already exist, load them without re-triggering weekly generation.
                    triggerLoadGroceries({ allowWeeklyGeneration: false });
                } else if (status.state === 'completed') {
                    // Generation complete - fetch groceries
                    clearGeneratingAfterLoadRef.current = false;
                    setIsMenuGenerating(false);
                    triggerLoadGroceries({ allowWeeklyGeneration: true });
                } else if (status.state === 'failed') {
                    // Generation failed
                    clearGeneratingAfterLoadRef.current = false;
                    setIsMenuGenerating(false);
                    setLoading(false);
                    setRefreshing(false);
                } else {
                    // Pending (no generation started yet) - try to load existing menus
                    clearGeneratingAfterLoadRef.current = false;
                    setIsMenuGenerating(false);
                    triggerLoadGroceries({ allowWeeklyGeneration: true });
                }
            }
        );
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

    // Cleanup subscription on unmount
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
                        {[...item.meals]
                            .sort((first, second) => {
                                const dayOrder =
                                    (DAY_ORDER[first.day] ?? 99) - (DAY_ORDER[second.day] ?? 99);
                                if (dayOrder !== 0) return dayOrder;
                                const mealOrder =
                                    (MEAL_TYPE_ORDER[first.mealType] ?? 99) -
                                    (MEAL_TYPE_ORDER[second.mealType] ?? 99);
                                if (mealOrder !== 0) return mealOrder;
                                return first.recipeName.localeCompare(second.recipeName, 'tr-TR');
                            })
                            .map((meal, idx) => {
                                const courseIcon = getCourseIcon(meal.course);
                                return (
                                    <View key={idx} style={styles.usageRow}>
                                        <MaterialCommunityIcons
                                            name={courseIcon}
                                            size={14}
                                            color={colors.textMuted}
                                        />
                                        <Text style={styles.usageText}>
                                            {meal.amountLabel ? `${meal.amountLabel} x ${meal.recipeName}` : meal.recipeName}
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
                                                        { width: `${(menuStatus.completedDays / menuStatus.totalDays) * 100}%` }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.progressText}>
                                                {menuStatus.completedDays}/{menuStatus.totalDays} gün tamamlandı
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
        paddingLeft: 0,
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
