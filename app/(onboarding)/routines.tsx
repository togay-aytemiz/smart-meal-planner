import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Button, SelectableTag } from '../../components/ui';
import { useOnboarding, WeeklyRoutine, RoutineDay, HouseholdMember } from '../../contexts/onboarding-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

const DAYS = [
    { key: 'monday', label: 'Pzt' },
    { key: 'tuesday', label: 'Sal' },
    { key: 'wednesday', label: 'Çar' },
    { key: 'thursday', label: 'Per' },
    { key: 'friday', label: 'Cum' },
    { key: 'saturday', label: 'Cmt' },
    { key: 'sunday', label: 'Paz' },
] as const;

const ROUTINE_TYPES = [
    { key: 'office', label: 'Ofis', emoji: '🏢' },
    { key: 'remote', label: 'Evden', emoji: '🏠' },
    { key: 'gym', label: 'Spor', emoji: '💪' },
    { key: 'school', label: 'Okul', emoji: '📚' },
    { key: 'home', label: 'Ev', emoji: '🏡' },
    { key: 'off', label: 'Tatil', emoji: '🌴' },
] as const;

type DayKey = typeof DAYS[number]['key'];

const DEFAULT_ROUTINE: WeeklyRoutine = {
    monday: { type: 'office', gymTime: 'none' },
    tuesday: { type: 'office', gymTime: 'none' },
    wednesday: { type: 'office', gymTime: 'none' },
    thursday: { type: 'office', gymTime: 'none' },
    friday: { type: 'office', gymTime: 'none' },
    saturday: { type: 'home', gymTime: 'none' },
    sunday: { type: 'home', gymTime: 'none' },
};

export default function RoutinesScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const [activeMemberIndex, setActiveMemberIndex] = useState(0);
    const [selectedDay, setSelectedDay] = useState<DayKey>('monday');
    const scrollViewRef = useRef<ScrollView>(null);

    // Get members from state
    const members = state.data.members || [];
    const activeMember = members[activeMemberIndex];

    // Initialize routines for current member if not exist
    const currentRoutine = activeMember?.routines || DEFAULT_ROUTINE;

    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    const animateLayout = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    };

    const updateMemberRoutine = (newRoutine: WeeklyRoutine) => {
        const updatedMembers = [...members];
        updatedMembers[activeMemberIndex] = {
            ...activeMember,
            routines: newRoutine,
        };
        dispatch({ type: 'SET_MEMBERS', payload: updatedMembers });
    };

    const updateDayRoutine = (type: RoutineDay['type']) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newRoutine = {
            ...currentRoutine,
            [selectedDay]: { ...currentRoutine[selectedDay], type },
        };
        updateMemberRoutine(newRoutine);
    };

    const handleContinue = () => {
        if (activeMemberIndex < members.length - 1) {
            // Go to next member
            animateLayout();
            setActiveMemberIndex(prev => prev + 1);
            setSelectedDay('monday');
            // Scroll to top
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } else {
            // Finish
            dispatch({ type: 'SET_STEP', payload: 6 });
            router.push('/(onboarding)/dietary');
        }
    };

    if (!activeMember) return null;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <Text style={styles.title}>Haftalık Rutinler</Text>
                <Text style={styles.subtitle}>
                    {members.length > 1
                        ? `${activeMember.name} için haftalık rutini belirleyin`
                        : 'Haftalık rutininizi belirleyin'}
                </Text>
            </View>

            {/* Member Tabs */}
            {members.length > 1 && (
                <View style={styles.memberTabs}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.memberTabsContent}
                    >
                        {members.map((member, index) => (
                            <TouchableOpacity
                                key={member.id}
                                style={[
                                    styles.memberTab,
                                    activeMemberIndex === index && styles.memberTabActive
                                ]}
                                onPress={() => {
                                    animateLayout();
                                    setActiveMemberIndex(index);
                                }}
                            >
                                <Text style={[
                                    styles.memberTabText,
                                    activeMemberIndex === index && styles.memberTabTextActive
                                ]}>
                                    {member.name}
                                </Text>
                                {activeMemberIndex === index && <View style={styles.activeIndicator} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Day Selector */}
                <View style={styles.daySelector}>
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day.key}
                            style={[
                                styles.dayButton,
                                selectedDay === day.key && styles.dayButtonSelected,
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedDay(day.key);
                            }}
                        >
                            <Text style={[
                                styles.dayLabel,
                                selectedDay === day.key && styles.dayLabelSelected,
                            ]}>
                                {day.label}
                            </Text>
                            <Text style={styles.dayEmoji}>
                                {ROUTINE_TYPES.find(r => r.key === currentRoutine[day.key].type)?.emoji}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Routine Type Grid */}
                <Text style={styles.sectionLabel}>
                    {DAYS.find(d => d.key === selectedDay)?.label} günü için seçin:
                </Text>
                <View style={styles.routineGrid}>
                    {ROUTINE_TYPES.map((routine) => (
                        <TouchableOpacity
                            key={routine.key}
                            style={[
                                styles.routineOption,
                                currentRoutine[selectedDay].type === routine.key && styles.routineOptionSelected,
                            ]}
                            onPress={() => updateDayRoutine(routine.key)}
                        >
                            <Text style={styles.routineEmoji}>{routine.emoji}</Text>
                            <Text style={[
                                styles.routineLabel,
                                currentRoutine[selectedDay].type === routine.key && styles.routineLabelSelected,
                            ]}>
                                {routine.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Haftalık Özet - {activeMember.name}</Text>
                    <View style={styles.summaryGrid}>
                        {DAYS.map((day) => (
                            <View key={day.key} style={styles.summaryItem}>
                                <Text style={styles.summaryDay}>{day.label}</Text>
                                <Text style={styles.summaryEmoji}>
                                    {ROUTINE_TYPES.find(r => r.key === currentRoutine[day.key].type)?.emoji}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title={activeMemberIndex < members.length - 1 ? "Sonraki Kişi" : "Devam"}
                    onPress={handleContinue}
                    fullWidth
                    size="large"
                />
            </View>
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
        paddingTop: spacing.xs,
        paddingBottom: spacing.md,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
    },
    memberTabs: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
        marginBottom: spacing.sm,
    },
    memberTabsContent: {
        paddingHorizontal: spacing.lg,
    },
    memberTab: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        marginRight: spacing.sm,
        position: 'relative',
    },
    memberTabActive: {
        // Active state style if needed
    },
    memberTabText: {
        ...typography.label,
        color: colors.textSecondary,
    },
    memberTabTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        left: spacing.md,
        right: spacing.md,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.primary,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    daySelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    dayButton: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        minWidth: 44,
    },
    dayButtonSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '20',
    },
    dayLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    dayLabelSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    dayEmoji: {
        fontSize: 16,
    },
    sectionLabel: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    routineGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    routineOption: {
        width: '31%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    routineOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '20',
    },
    routineEmoji: {
        fontSize: 32,
        marginBottom: spacing.xs,
    },
    routineLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    routineLabelSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    summaryCard: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.lg,
    },
    summaryTitle: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryDay: {
        ...typography.caption,
        color: colors.textMuted,
        marginBottom: 4,
    },
    summaryEmoji: {
        fontSize: 20,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        paddingTop: spacing.sm,
        backgroundColor: colors.background,
    },
});
