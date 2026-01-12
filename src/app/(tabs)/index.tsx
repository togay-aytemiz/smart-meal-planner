import { useState, type ComponentProps } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows, hitSlop } from '../../theme/spacing';
import { formatLongDateTr, getGreeting } from '../../utils/dates';
import type { MenuRecipeCourse } from '../../types/menu-recipes';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type CalendarDay = {
    key: string;
    label: string;
    dayNumber: number;
    date: Date;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
};

type MealItem = {
    id: string;
    title: string;
    timeMinutes: number;
    calories: number;
    category: string;
    categoryIcon: IconName;
    context: string;
    contextIcon: IconName;
    icon: IconName;
    mediaTone: string;
    course: MenuRecipeCourse;
};

type MealSection = {
    id: string;
    title: string;
    icon: IconName;
    tint: string;
    iconColor: string;
    items: MealItem[];
};

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const MEAL_SECTIONS: MealSection[] = [
    {
        id: 'breakfast',
        title: 'Kahvaltı',
        icon: 'coffee-outline',
        tint: colors.accentSoft,
        iconColor: colors.primaryDark,
        items: [
            {
                id: 'breakfast-1',
                title: 'Yumurtalı Avokado Tost',
                timeMinutes: 15,
                calories: 340,
                category: 'Kahvaltı',
                categoryIcon: 'coffee-outline',
                context: 'Pratik',
                contextIcon: 'lightning-bolt-outline',
                icon: 'food-apple-outline',
                mediaTone: colors.accentLight,
                course: 'main',
            },
        ],
    },
    {
        id: 'lunch',
        title: 'Öğle',
        icon: 'weather-sunny',
        tint: colors.warningLight,
        iconColor: colors.warning,
        items: [
            {
                id: 'lunch-1',
                title: 'Akdeniz Nohut Salatası',
                timeMinutes: 12,
                calories: 280,
                category: 'Salata',
                categoryIcon: 'leaf',
                context: 'Ofise Uygun',
                contextIcon: 'briefcase-outline',
                icon: 'leaf',
                mediaTone: colors.successLight,
                course: 'salad',
            },
        ],
    },
    {
        id: 'dinner',
        title: 'Akşam',
        icon: 'silverware-fork-knife',
        tint: colors.surfaceMuted,
        iconColor: colors.textPrimary,
        items: [
            {
                id: 'dinner-main',
                title: 'Izgara Tavuk Şiş',
                timeMinutes: 35,
                calories: 420,
                category: 'Ana Yemek',
                categoryIcon: 'silverware-fork-knife',
                context: 'Aile',
                contextIcon: 'account-group-outline',
                icon: 'food-steak',
                mediaTone: colors.surfaceAlt,
                course: 'main',
            },
            {
                id: 'dinner-side',
                title: 'Tereyağlı Bulgur Pilavı',
                timeMinutes: 25,
                calories: 260,
                category: 'Yan Yemek',
                categoryIcon: 'pot-steam-outline',
                context: 'Pratik',
                contextIcon: 'timer-sand',
                icon: 'food-variant',
                mediaTone: colors.borderLight,
                course: 'side',
            },
            {
                id: 'dinner-salad',
                title: 'Mevsim Salata',
                timeMinutes: 10,
                calories: 120,
                category: 'Salata',
                categoryIcon: 'leaf',
                context: 'Hafif',
                contextIcon: 'leaf',
                icon: 'leaf',
                mediaTone: colors.successLight,
                course: 'salad',
            },
        ],
    },
];

const buildDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const buildWeekDays = (baseDate: Date): CalendarDay[] => {
    const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    const dayOfWeekIndex = (today.getDay() + 6) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeekIndex);

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        const isToday = date.getTime() === today.getTime();
        const isPast = date.getTime() < today.getTime();
        const isFuture = date.getTime() > today.getTime();

        return {
            key: buildDateKey(date),
            label: DAY_LABELS[index],
            dayNumber: date.getDate(),
            date,
            isToday,
            isPast,
            isFuture,
        };
    });
};

export default function TodayScreen() {
    const now = new Date();
    const router = useRouter();
    const userName = 'Togay';
    const greeting = getGreeting(now);
    const weekDays = buildWeekDays(now);
    const todayKey = weekDays.find((day) => day.isToday)?.key ?? weekDays[0].key;
    const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
    const selectedDay = weekDays.find((day) => day.key === selectedDayKey) ?? weekDays[0];
    const selectedDayName = selectedDay.date.toLocaleDateString('tr-TR', { weekday: 'long' });
    const selectedDayLabel = selectedDay.isToday ? 'Bugün' : selectedDayName;
    const selectedDaySubtitle = selectedDay.isToday
        ? formatLongDateTr(selectedDay.date)
        : selectedDay.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const mealCount = MEAL_SECTIONS.length;
    const handleOpenMeal = (course: MenuRecipeCourse) => {
        router.push({ pathname: '/cookbook/[course]', params: { course } });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                <ScreenHeader title={`${greeting} ${userName}`} size="compact" style={styles.header} />

                <View style={styles.calendarRow}>
                    {weekDays.map((day) => {
                        const isSelected = day.key === selectedDayKey;
                        const isSelectedToday = isSelected && day.isToday;
                        const isSelectedOther = isSelected && !day.isToday;

                        return (
                            <View key={day.key} style={styles.daySlot}>
                                <TouchableOpacity
                                    style={[
                                        styles.dayCard,
                                        day.isPast && styles.dayCardPast,
                                        day.isFuture && styles.dayCardFuture,
                                        isSelectedToday && styles.dayCardSelectedToday,
                                        isSelectedOther && styles.dayCardSelectedOther,
                                    ]}
                                    onPress={() => setSelectedDayKey(day.key)}
                                    disabled={day.isPast}
                                    hitSlop={hitSlop}
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        style={[
                                            styles.dayLabel,
                                            isSelectedToday && styles.dayLabelToday,
                                            isSelectedOther && styles.dayLabelSelectedOther,
                                            day.isPast && styles.dayLabelPast,
                                        ]}
                                    >
                                        {day.label}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.dayNumber,
                                            isSelectedToday && styles.dayNumberToday,
                                            isSelectedOther && styles.dayNumberSelectedOther,
                                            day.isPast && styles.dayNumberPast,
                                        ]}
                                    >
                                        {day.dayNumber}
                                    </Text>
                                </TouchableOpacity>
                                <Text style={[styles.dayStatus, !day.isToday && styles.dayStatusHidden]}>
                                    Bugün
                                </Text>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.dayHeader}>
                    <View>
                        <Text style={styles.dayTitle}>{selectedDayLabel}</Text>
                        <Text style={styles.daySubtitle}>{selectedDaySubtitle}</Text>
                    </View>
                    <View style={styles.mealCountPill}>
                        <Text style={styles.mealCountText}>{mealCount} öğün</Text>
                    </View>
                </View>

                <View style={styles.reasoningCard}>
                    <View style={styles.reasoningHeader}>
                        <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.primary} />
                        <Text style={styles.reasoningTitle}>Neden bu menü?</Text>
                    </View>
                    <Text style={styles.reasoningText}>
                        Ofis gününde pratik ve taşınabilir seçenekleri öne çıkardım. Akşam için yüksek proteinli ana yemek ve
                        dengeli yanlarla 35 dakikayı aşmayan bir menü seçtim.
                    </Text>
                </View>

                {MEAL_SECTIONS.map((section) => (
                    <View key={section.id} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIcon, { backgroundColor: section.tint }]}>
                                <MaterialCommunityIcons name={section.icon} size={18} color={section.iconColor} />
                            </View>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                        </View>

                        <View style={styles.sectionCards}>
                            {section.items.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    activeOpacity={0.85}
                                    style={styles.mealCard}
                                    onPress={() => handleOpenMeal(item.course)}
                                >
                                    <View style={[styles.mealMedia, { backgroundColor: item.mediaTone }]}>
                                        <MaterialCommunityIcons name={item.icon} size={24} color={colors.textPrimary} />
                                    </View>
                                    <View style={styles.mealContent}>
                                        <View style={styles.mealMetaRow}>
                                            <View style={styles.metaItem}>
                                                <MaterialCommunityIcons
                                                    name={item.categoryIcon}
                                                    size={12}
                                                    color={colors.textMuted}
                                                />
                                                <Text style={styles.metaText}>{item.category}</Text>
                                            </View>
                                            <View style={styles.metaItem}>
                                                <MaterialCommunityIcons
                                                    name="clock-outline"
                                                    size={12}
                                                    color={colors.textMuted}
                                                />
                                                <Text style={styles.metaText}>{item.timeMinutes} dk</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.mealTitle} numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                        <View style={styles.mealFooterRow}>
                                            <View style={styles.calorieRow}>
                                                <MaterialCommunityIcons name="fire" size={12} color={colors.accent} />
                                                <Text style={styles.calorieText}>{item.calories} kcal</Text>
                                            </View>
                                            <View style={styles.chipRow}>
                                                <View style={styles.contextChip}>
                                                    <MaterialCommunityIcons
                                                        name={item.contextIcon}
                                                        size={12}
                                                        color={colors.textSecondary}
                                                    />
                                                    <Text style={styles.contextChipText}>{item.context}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={18}
                                        color={colors.iconMuted}
                                        style={styles.chevron}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
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
        paddingHorizontal: 0,
    },
    contentContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxxl,
        gap: spacing.md,
    },
    calendarRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    daySlot: {
        flex: 1,
        alignItems: 'center',
        gap: spacing.xs,
    },
    dayCard: {
        width: '100%',
        minHeight: 72,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        gap: 2,
        ...shadows.sm,
    },
    dayCardPast: {
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.borderLight,
        opacity: 0.5,
    },
    dayCardFuture: {
        backgroundColor: colors.surface,
    },
    dayCardSelectedToday: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        shadowOpacity: 0.16,
        shadowRadius: 10,
        elevation: 4,
    },
    dayCardSelectedOther: {
        backgroundColor: colors.accentSoft,
        borderColor: colors.accentLight,
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
    },
    dayLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    dayLabelToday: {
        color: colors.textOnPrimary,
    },
    dayLabelSelectedOther: {
        color: colors.primaryDark,
    },
    dayLabelPast: {
        color: colors.textMuted,
    },
    dayNumber: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    dayNumberToday: {
        color: colors.textOnPrimary,
    },
    dayNumberSelectedOther: {
        color: colors.primaryDark,
    },
    dayNumberPast: {
        color: colors.textMuted,
    },
    dayStatus: {
        ...typography.caption,
        color: colors.textMuted,
        fontSize: 11,
        lineHeight: 14,
    },
    dayStatusHidden: {
        opacity: 0,
    },
    reasoningCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm,
        ...shadows.sm,
    },
    reasoningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    reasoningTitle: {
        ...typography.label,
        color: colors.textPrimary,
    },
    reasoningText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dayTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    daySubtitle: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    mealCountPill: {
        backgroundColor: colors.surface,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    mealCountText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    section: {
        gap: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    sectionCards: {
        gap: spacing.md,
    },
    mealCard: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        minHeight: 80,
        ...shadows.md,
    },
    mealMedia: {
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    mealContent: {
        flex: 1,
        paddingVertical: spacing.sm + 4,
        paddingHorizontal: spacing.sm + 4,
        gap: spacing.xs,
        justifyContent: 'center',
    },
    mealMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    metaText: {
        ...typography.caption,
        fontSize: 11,
        lineHeight: 14,
        color: colors.textMuted,
    },
    mealTitle: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        color: colors.textPrimary,
    },
    mealFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    calorieRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    calorieText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    chipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    contextChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        gap: spacing.xs,
    },
    contextChipText: {
        ...typography.caption,
        fontSize: 11,
        lineHeight: 14,
        color: colors.textSecondary,
    },
    chevron: {
        alignSelf: 'center',
        marginLeft: spacing.sm,
        marginRight: spacing.sm + 4,
    },
});
