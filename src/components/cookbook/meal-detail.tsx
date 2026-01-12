import { useMemo, useState, useRef, useEffect } from 'react';
import {
    Animated,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
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
    onBack?: () => void;
    onFavorite?: () => void;
    isFavorited?: boolean;
}

const HERO_HEIGHT = 360;
const HEADER_HEIGHT = 56;
const PLACEHOLDER_IMAGE = require('../../../assets/splash-icon.png');

// Stronger smooth gradient (Black -> Transparent)
const GRADIENT_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAACVGAYAAADc5P5VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABVSURBVHgB7c6xDYAwDABBE2ZkFqZgL/ZmL2ZgJ0pCQ8VH+cv3yWfMzBfZ7/f7/f7+9X1/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3+/v38/p/d7f1Y5+xIAAAAASUVORK5CYII=';
const BRIEF_FALLBACK =
    'Taze sebzelerle zenginleştirilmiş hafif bulgur pilavı; pratik, dengeli ve güne iyi gelen bir lezzet.';

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
    imageUrl,
    onBack,
    onFavorite,
    isFavorited = false,
}: MealDetailProps) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<TabKey>('ingredients');
    const [tabContainerWidth, setTabContainerWidth] = useState(0);
    const [tabContainerY, setTabContainerY] = useState(0);
    const scrollY = useRef(new Animated.Value(0)).current;
    const tabIndicatorX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<Animated.ScrollView | null>(null);

    const brief = recipe.brief?.trim() || BRIEF_FALLBACK;
    const resolvedImageUrl = imageUrl?.trim();
    const imageSource = resolvedImageUrl ? { uri: resolvedImageUrl } : PLACEHOLDER_IMAGE;

    // Animation thresholds
    const scrollThreshold = HERO_HEIGHT - HEADER_HEIGHT - insets.top - 40;

    // Header background opacity based on scroll
    const headerBgOpacity = scrollY.interpolate({
        inputRange: [0, scrollThreshold],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    // Text/Icon color interpolation (white to black)
    const headerTextColor = scrollY.interpolate({
        inputRange: [0, scrollThreshold],
        outputRange: [colors.textInverse, colors.textPrimary],
        extrapolate: 'clamp',
    });
    const headerShadowColor = scrollY.interpolate({
        inputRange: [0, 40],
        outputRange: ['rgba(0, 0, 0, 0.35)', 'rgba(0, 0, 0, 0)'],
        extrapolate: 'clamp',
    });
    const headerShadowStyle = {
        textShadowColor: headerShadowColor,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    };

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
            {/* Fixed Hero Image */}
            <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
                <Image source={imageSource} style={styles.heroImage} />

                {/* Smooth Gradient Overlay */}
                <View style={styles.gradientContainer}>
                    <Image
                        source={{ uri: GRADIENT_BASE64 }}
                        style={styles.gradientImage}
                        resizeMode="stretch"
                    />
                </View>
            </View>

            {/* Fixed Header */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top,
                        height: HEADER_HEIGHT + insets.top,
                    },
                ]}
            >
                {/* Animated background that fades in on scroll */}
                <Animated.View
                    style={[
                        styles.headerBackground,
                        {
                            opacity: headerBgOpacity,
                        },
                    ]}
                />

                <View style={styles.headerContent}>
                    {onBack ? (
                        <TouchableOpacity
                            onPress={onBack}
                            activeOpacity={0.7}
                            style={styles.iconButton}
                        >
                            <Animated.Text style={[{ color: headerTextColor }, headerShadowStyle]}>
                                <MaterialCommunityIcons name="arrow-left" size={28} />
                            </Animated.Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerSpacer} />
                    )}

                    <Animated.Text
                        style={[styles.brandText, { color: headerTextColor }, headerShadowStyle]}
                    >
                        {appName}
                    </Animated.Text>

                    {onFavorite ? (
                        <TouchableOpacity
                            onPress={onFavorite}
                            activeOpacity={0.7}
                            style={styles.iconButton}
                        >
                            <Animated.Text style={[{ color: headerTextColor }, headerShadowStyle]}>
                                <MaterialCommunityIcons
                                    name={isFavorited ? 'heart' : 'heart-outline'}
                                    size={28}
                                />
                            </Animated.Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerSpacer} />
                    )}
                </View>
            </Animated.View>

            {/* Scrollable Content */}
            <Animated.ScrollView
                ref={scrollViewRef}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: HERO_HEIGHT },
                ]}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
            >
                <View style={styles.details}>
                    <Image
                        source={{ uri: GRADIENT_BASE64 }}
                        style={styles.detailsGradient}
                        resizeMode="stretch"
                        pointerEvents="none"
                    />
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
    heroContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradientContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 180, // Increased height for smoother transition
    },
    gradientImage: {
        width: '100%',
        height: '100%',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
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
        paddingBottom: spacing.xxl,
    },
    details: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        marginTop: -radius.xl,
        paddingTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 6,
    },
    detailsGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        tintColor: colors.surface,
        opacity: 0.85,
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
