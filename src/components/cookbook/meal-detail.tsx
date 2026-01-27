import { useMemo, useState, useRef, useEffect, type ComponentProps } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    type ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, radius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { MenuIngredient, MenuInstruction, MenuRecipe, MenuRecipeCourse } from '../../types/menu-recipes';

type TabKey = 'ingredients' | 'instructions' | 'nutrition';

interface MealDetailProps {
    recipe: MenuRecipe;
    appName?: string;
    onBack?: () => void;
    onFavorite?: () => void;
    isFavorited?: boolean;
}

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const HEADER_HEIGHT = 56;
const BRIEF_FALLBACK =
    'Taze sebzelerle zenginleştirilmiş hafif bulgur pilavı; pratik, dengeli ve güne iyi gelen bir lezzet.';


const COURSE_META: Record<MenuRecipeCourse, { label: string; icon: IconName; tone: string }> = {
    main: {
        label: 'Ana Yemek',
        icon: 'silverware-fork-knife',
        tone: colors.surfaceAlt,
    },
    side: {
        label: 'Yan Yemek',
        icon: 'pot-steam-outline',
        tone: colors.borderLight,
    },
    soup: {
        label: 'Çorba',
        icon: 'pot-steam-outline',
        tone: colors.accentSoft,
    },
    salad: {
        label: 'Salata',
        icon: 'leaf',
        tone: colors.successLight,
    },
    meze: {
        label: 'Meze',
        icon: 'food',
        tone: colors.surfaceMuted,
    },
    dessert: {
        label: 'Tatlı',
        icon: 'cupcake',
        tone: colors.errorLight,
    },
    pastry: {
        label: 'Hamur İşi',
        icon: 'bread-slice-outline',
        tone: colors.surfaceAlt,
    },
};

const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'ingredients', label: 'Malzemeler' },
    { key: 'instructions', label: 'Hazırlanış' },
    { key: 'nutrition', label: 'Besin' },
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

const formatTimeValue = (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return 'N/A';
    }
    return `${minutes} dk`;
};

export default function MealDetail({
    recipe,
    appName = 'Omnoo',
    onBack,
    onFavorite,
    isFavorited = false,
}: MealDetailProps) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<TabKey>('ingredients');
    const [tabContainerWidth, setTabContainerWidth] = useState(0);
    const [tabContainerY, setTabContainerY] = useState(0);
    const tabIndicatorX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView | null>(null);

    const brief = recipe.brief?.trim() || BRIEF_FALLBACK;
    const courseMeta = COURSE_META[recipe.course] ?? COURSE_META.main;

    const headerTextColor = colors.textPrimary;

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
    const showCookTime =
        Number.isFinite(recipe.cookTimeMinutes) && recipe.cookTimeMinutes > 0;
    const activeTabIndex = useMemo(
        () => tabs.findIndex((tab) => tab.key === activeTab),
        [activeTab]
    );
    const indicatorWidth = tabContainerWidth
        ? (tabContainerWidth - spacing.xs * 2) / tabs.length
        : 0;

    useEffect(() => {
        if (!indicatorWidth || activeTabIndex < 0) {
            return;
        }
        Animated.spring(tabIndicatorX, {
            toValue: indicatorWidth * activeTabIndex,
            useNativeDriver: true,
            damping: 16,
            stiffness: 160,
            mass: 0.6,
        }).start();
    }, [activeTabIndex, indicatorWidth, tabIndicatorX]);

    const handleTabPress = (tabKey: TabKey) => {
        setActiveTab(tabKey);
        const targetY = Math.max(tabContainerY - HEADER_HEIGHT - insets.top - spacing.sm, 0);
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    };

    return (
        <View style={styles.container}>
            <View style={[styles.topBar, { paddingTop: insets.top }]}>
                <View style={styles.topBarContent}>
                    {onBack ? (
                        <TouchableOpacity
                            onPress={onBack}
                            activeOpacity={0.7}
                            style={styles.iconButton}
                        >
                            <MaterialCommunityIcons
                                name="arrow-left"
                                size={26}
                                color={headerTextColor}
                            />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerSpacer} />
                    )}

                    <Text style={styles.brandText}>{appName}</Text>

                    {onFavorite ? (
                        <TouchableOpacity
                            onPress={onFavorite}
                            activeOpacity={0.7}
                            style={styles.iconButton}
                        >
                            <MaterialCommunityIcons
                                name={isFavorited ? 'heart' : 'heart-outline'}
                                size={26}
                                color={isFavorited ? colors.error : headerTextColor}
                            />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerSpacer} />
                    )}
                </View>
            </View>

            {/* Scrollable Content */}
            <Animated.ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={[styles.details, { paddingBottom: spacing.xxl + insets.bottom }]}>
                    <View style={styles.coursePill}>
                        <MaterialCommunityIcons
                            name={courseMeta.icon}
                            size={14}
                            color={colors.textSecondary}
                        />
                        <Text style={styles.coursePillText}>{courseMeta.label}</Text>
                    </View>
                    <Text style={styles.title}>{recipe.name}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaPill}>
                            <MaterialCommunityIcons name="account-group" size={18} color={colors.textSecondary} />
                            <Text style={styles.metaValue}>{recipe.servings}</Text>
                            <Text style={styles.metaLabel}>Porsiyon</Text>
                        </View>
                        <View style={styles.timeGroup}>
                            <View style={styles.timeBlock}>
                                <View style={styles.timeValueRow}>
                                    <MaterialCommunityIcons
                                        name="clock-outline"
                                        size={16}
                                        color={colors.textSecondary}
                                    />
                                    <Text style={styles.timeValue}>{formatTimeValue(recipe.prepTimeMinutes)}</Text>
                                </View>
                                <Text style={styles.timeLabel}>Hazırlık</Text>
                            </View>
                            {showCookTime && (
                                <View style={styles.timeBlock}>
                                    <View style={styles.timeValueRow}>
                                        <MaterialCommunityIcons
                                            name="clock-outline"
                                            size={16}
                                            color={colors.textSecondary}
                                        />
                                        <Text style={styles.timeValue}>
                                            {formatTimeValue(recipe.cookTimeMinutes)}
                                        </Text>
                                    </View>
                                    <Text style={styles.timeLabel}>Pişirme</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.briefCard}>
                        <Text style={styles.briefText}>{brief}</Text>
                    </View>

                    <View
                        style={styles.tabContainer}
                        onLayout={(event) => {
                            const { width, y } = event.nativeEvent.layout;
                            setTabContainerWidth(width);
                            setTabContainerY(y);
                        }}
                    >
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.tabIndicator,
                                {
                                    width: indicatorWidth,
                                    transform: [{ translateX: tabIndicatorX }],
                                },
                            ]}
                        />
                        {tabs.map((tab) => {
                            const isActive = tab.key === activeTab;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    onPress={() => handleTabPress(tab.key)}
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
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topBar: {
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    topBarContent: {
        height: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
    },
    brandText: {
        ...typography.h3,
        fontSize: 20,
        fontWeight: '600',
    },
    iconButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: {
        width: 44,
        height: 44,
    },
    scrollContent: {
        paddingTop: spacing.md,
        paddingBottom: 0,
    },
    details: {
        paddingTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
    },
    coursePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.full,
        paddingVertical: 4,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    coursePillText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
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
    timeGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        marginLeft: 'auto',
    },
    timeBlock: {
        alignItems: 'flex-start',
        gap: spacing.xs,
    },
    timeValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    timeValue: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 20,
        color: colors.textPrimary,
    },
    timeLabel: {
        ...typography.caption,
        color: colors.textMuted,
    },
    briefCard: {
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.lg,
        padding: spacing.lg,
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
        position: 'relative',
        overflow: 'hidden',
    },
    tabIndicator: {
        position: 'absolute',
        top: spacing.xs,
        bottom: spacing.xs,
        left: spacing.xs,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        ...shadows.sm,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        zIndex: 1,
    },
    tabButtonActive: {},
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
