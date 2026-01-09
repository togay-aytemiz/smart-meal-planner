import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager, Animated, Easing } from 'react-native';
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
    const [isOptionsVisible, setIsOptionsVisible] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const handAnim = useRef(new Animated.Value(0)).current;
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

    useEffect(() => {
        if (!hasInteracted) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(handAnim, {
                        toValue: 10,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    Animated.timing(handAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                ])
            ).start();
        }
    }, [hasInteracted]);

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
        animateLayout();
        const newRoutine = {
            ...currentRoutine,
            [selectedDay]: {
                ...currentRoutine[selectedDay],
                type,
                gymTime: type === 'gym' ? currentRoutine[selectedDay].gymTime ?? 'none' : currentRoutine[selectedDay].gymTime,
                officeMealToGo: type === 'office' ? currentRoutine[selectedDay].officeMealToGo : currentRoutine[selectedDay].officeMealToGo,
                officeBreakfastAtHome: type === 'office' ? currentRoutine[selectedDay].officeBreakfastAtHome : currentRoutine[selectedDay].officeBreakfastAtHome,
                schoolBreakfast: type === 'school' ? currentRoutine[selectedDay].schoolBreakfast : currentRoutine[selectedDay].schoolBreakfast,
            },
        };
        updateMemberRoutine(newRoutine);
    };

    const updateDayDetails = (details: Partial<RoutineDay>) => {
        animateLayout();
        const newRoutine = {
            ...currentRoutine,
            [selectedDay]: { ...currentRoutine[selectedDay], ...details },
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
                        ? `${activeMember.name} için değişiklik yapmak istediğiniz günlere tıklayın`
                        : 'Değişiklik yapmak istediğiniz günlere tıklayın'}
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
                                activeOpacity={1}
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
                <View style={styles.daySelectorWrapper}>
                    <View style={styles.daySelector}>
                        {DAYS.map((day) => (
                            <TouchableOpacity
                                key={day.key}
                                style={[
                                    styles.dayButton,
                                    selectedDay === day.key && styles.dayButtonSelected,
                                ]}
                                onPress={() => {
                                    if (!hasInteracted) setHasInteracted(true);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    animateLayout();
                                    if (selectedDay === day.key) {
                                        setIsOptionsVisible(!isOptionsVisible);
                                    } else {
                                        setSelectedDay(day.key);
                                        setIsOptionsVisible(true);
                                    }
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

                    {!hasInteracted && (
                        <Animated.View
                            style={[
                                styles.hintContainer,
                                { transform: [{ translateY: handAnim }] }
                            ]}
                            pointerEvents="none"
                        >
                            <Text style={styles.hintEmoji}>👆</Text>
                            <Text style={styles.hintText}>Değiştirmek için tıkla</Text>
                        </Animated.View>
                    )}
                </View>

                {/* Routine Type Grid - Accordion */}
                {isOptionsVisible && (
                    <View style={styles.routineSection}>
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
                        {currentRoutine[selectedDay].type === 'gym' && (
                            <View style={styles.detailSection}>
                                <Text style={styles.detailTitle}>Spor hangi saat?</Text>
                                <View style={styles.tagRow}>
                                    <SelectableTag
                                        label="Sabah"
                                        selected={currentRoutine[selectedDay].gymTime === 'morning'}
                                        onPress={() => updateDayDetails({ gymTime: 'morning' })}
                                    />
                                    <SelectableTag
                                        label="Öğleden sonra"
                                        selected={currentRoutine[selectedDay].gymTime === 'afternoon'}
                                        onPress={() => updateDayDetails({ gymTime: 'afternoon' })}
                                    />
                                    <SelectableTag
                                        label="Akşam"
                                        selected={currentRoutine[selectedDay].gymTime === 'evening'}
                                        onPress={() => updateDayDetails({ gymTime: 'evening' })}
                                    />
                                </View>
                            </View>
                        )}
                        {currentRoutine[selectedDay].type === 'office' && (
                            <View style={styles.detailSection}>
                                <Text style={styles.detailTitle}>Ofise yemek götürüyor musun?</Text>
                                <View style={styles.tagRow}>
                                    <SelectableTag
                                        label="Evet"
                                        selected={currentRoutine[selectedDay].officeMealToGo === 'yes'}
                                        onPress={() => updateDayDetails({ officeMealToGo: 'yes' })}
                                    />
                                    <SelectableTag
                                        label="Hayır"
                                        selected={currentRoutine[selectedDay].officeMealToGo === 'no'}
                                        onPress={() => updateDayDetails({ officeMealToGo: 'no' })}
                                    />
                                </View>
                                <Text style={styles.detailTitle}>Kahvaltı evde mi?</Text>
                                <View style={styles.tagRow}>
                                    <SelectableTag
                                        label="Evet"
                                        selected={currentRoutine[selectedDay].officeBreakfastAtHome === 'yes'}
                                        onPress={() => updateDayDetails({ officeBreakfastAtHome: 'yes' })}
                                    />
                                    <SelectableTag
                                        label="Hayır"
                                        selected={currentRoutine[selectedDay].officeBreakfastAtHome === 'no'}
                                        onPress={() => updateDayDetails({ officeBreakfastAtHome: 'no' })}
                                    />
                                </View>
                            </View>
                        )}
                        {currentRoutine[selectedDay].type === 'school' && (
                            <View style={styles.detailSection}>
                                <Text style={styles.detailTitle}>Sabah kahvaltısı var mı?</Text>
                                <View style={styles.tagRow}>
                                    <SelectableTag
                                        label="Evet"
                                        selected={currentRoutine[selectedDay].schoolBreakfast === 'yes'}
                                        onPress={() => updateDayDetails({ schoolBreakfast: 'yes' })}
                                    />
                                    <SelectableTag
                                        label="Hayır"
                                        selected={currentRoutine[selectedDay].schoolBreakfast === 'no'}
                                        onPress={() => updateDayDetails({ schoolBreakfast: 'no' })}
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                )}
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
        opacity: 1,
    },
    memberTabText: {
        ...typography.label,
        color: colors.textSecondary,
        opacity: 0.7,
    },
    memberTabTextActive: {
        color: colors.primary,
        fontWeight: '700',
        opacity: 1,
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
    detailSection: {
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    detailTitle: {
        ...typography.label,
        color: colors.textPrimary,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
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
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        paddingTop: spacing.sm,
        backgroundColor: colors.background,
    },
    // Adding container for visual separation if needed
    routineSection: {
        marginTop: spacing.sm,
    },
    daySelectorWrapper: {
        position: 'relative',
        marginBottom: spacing.lg,
    },
    hintContainer: {
        position: 'absolute',
        top: 60, // Position below the first day button
        left: 0,
        alignItems: 'flex-start', // Start from left to align with Monday
        paddingLeft: 12, // Align roughly with center of first button (44px/2 - emoji/2)
        zIndex: 10,
    },
    hintEmoji: {
        fontSize: 24,
        marginLeft: 2, // Fine tune alignment
    },
    hintText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
        marginTop: -4,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: radius.sm,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
});
