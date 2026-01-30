import { View, Text, StyleSheet, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Button, Input, SelectableTag } from '../../components/ui';
import { useOnboarding, HouseholdMember } from '../../contexts/onboarding-context';
import { useLanguage } from '../../contexts/language-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

const ROLES = [
    { key: 'self', labelKey: 'onboarding.memberRoles.roles.self', emoji: '👤' },
    { key: 'spouse', labelKey: 'onboarding.memberRoles.roles.spouse', emoji: '💑' },
    { key: 'child', labelKey: 'onboarding.memberRoles.roles.child', emoji: '👶' },
    { key: 'parent', labelKey: 'onboarding.memberRoles.roles.parent', emoji: '👴' },
    { key: 'nanny', labelKey: 'onboarding.memberRoles.roles.nanny', emoji: '👩‍👧' },
    { key: 'other', labelKey: 'onboarding.memberRoles.roles.other', emoji: '👥' },
] as const;

const AGE_RANGES = [
    { key: 'infant', labelKey: 'onboarding.memberRoles.ages.infant' },
    { key: 'toddler', labelKey: 'onboarding.memberRoles.ages.toddler' },
    { key: 'child', labelKey: 'onboarding.memberRoles.ages.child' },
    { key: 'teen', labelKey: 'onboarding.memberRoles.ages.teen' },
] as const;

export default function MemberRolesScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const { t } = useLanguage();
    const householdSize = state.data.householdSize || 2;

    const [members, setMembers] = useState<Partial<HouseholdMember>[]>(() => {
        if (state.data.members && state.data.members.length > 0) {
            const existing: Partial<HouseholdMember>[] = [...state.data.members];
            if (householdSize > existing.length) {
                for (let i = existing.length; i < householdSize; i++) {
                    existing.push({ id: String(i + 1), name: '' });
                }
            } else if (householdSize < existing.length) {
                return existing.slice(0, householdSize);
            }
            return existing;
        }

        const initial: Partial<HouseholdMember>[] = [
            { id: '1', name: state.data.profile?.name || '', role: 'self' },
        ];
        for (let i = 1; i < householdSize; i++) {
            initial.push({ id: String(i + 1), name: '' });
        }
        return initial;
    });

    // Enable LayoutAnimation on Android
    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    const animateLayout = () => {
        LayoutAnimation.configureNext({
            duration: 300,
            create: { type: 'easeInEaseOut', property: 'opacity' },
            update: { type: 'easeInEaseOut' },
            delete: { type: 'easeInEaseOut', property: 'opacity' },
        });
    };

    const updateMember = (index: number, updates: Partial<HouseholdMember>) => {
        const newMembers = [...members];
        newMembers[index] = { ...newMembers[index], ...updates };
        setMembers(newMembers);
    };

    const handleContinue = () => {
        const validMembers = members.filter(m => m.name && m.role) as HouseholdMember[];
        dispatch({ type: 'SET_MEMBERS', payload: validMembers });
        dispatch({ type: 'SET_STEP', payload: 5 });
        router.push('/(onboarding)/routines');
    };

    const isValid = members.every(m => m.name?.trim() && m.role);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>{t('onboarding.memberRoles.title')}</Text>
                    <Text style={styles.subtitle}>
                        {t('onboarding.memberRoles.subtitle')}
                    </Text>
                </View>

                {members.map((member, index) => (
                    <View key={member.id} style={styles.memberCard}>
                        <Text style={styles.memberNumber}>
                            {t('onboarding.memberRoles.memberLabel', { index: index + 1 })}
                        </Text>

                        <Input
                            placeholder={t('onboarding.memberRoles.namePlaceholder')}
                            value={member.name || ''}
                            onChangeText={(text) => updateMember(index, { name: text })}
                            autoCapitalize="words"
                        />

                        <Text style={styles.roleLabel}>{t('onboarding.memberRoles.roleLabel')}</Text>
                        <View style={styles.roleGrid}>
                            {ROLES.map((role) => (
                                <SelectableTag
                                    key={role.key}
                                    label={t(role.labelKey)}
                                    selected={member.role === role.key}
                                    icon={<Text style={styles.roleEmoji}>{role.emoji}</Text>}
                                    onPress={() => {
                                        if (role.key === 'child' || member.role === 'child') {
                                            animateLayout();
                                        }
                                        updateMember(index, { role: role.key });
                                    }}
                                />
                            ))}
                        </View>

                        {member.role === 'child' && (
                            <>
                                <Text style={styles.roleLabel}>{t('onboarding.memberRoles.ageLabel')}</Text>
                                <View style={styles.ageGrid}>
                                    {AGE_RANGES.map((age) => (
                                        <SelectableTag
                                            key={age.key}
                                            label={t(age.labelKey)}
                                            selected={member.ageRange === age.key}
                                            onPress={() => updateMember(index, { ageRange: age.key })}
                                        />
                                    ))}
                                </View>
                            </>
                        )}
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title={t('onboarding.common.continue')}
                    onPress={handleContinue}
                    fullWidth
                    size="large"
                    disabled={!isValid}
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
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    header: {
        marginBottom: spacing.lg,
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
    memberCard: {
        marginBottom: spacing.xl,
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    memberNumber: {
        ...typography.eyebrow,
        color: colors.primary,
        marginBottom: spacing.md,
    },
    roleLabel: {
        ...typography.label,
        color: colors.textPrimary,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    roleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    roleEmoji: {
        fontSize: 16,
    },
    ageGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        paddingTop: spacing.sm,
        backgroundColor: colors.background,
    },
});
