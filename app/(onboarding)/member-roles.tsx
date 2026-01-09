import { View, Text, StyleSheet, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Button, Input, SelectableTag } from '../../components/ui';
import { useOnboarding, HouseholdMember } from '../../contexts/onboarding-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

const ROLES = [
    { key: 'self', label: 'Ben', emoji: '👤' },
    { key: 'spouse', label: 'Eş', emoji: '💑' },
    { key: 'child', label: 'Çocuk', emoji: '👶' },
    { key: 'parent', label: 'Ebeveyn', emoji: '👴' },
    { key: 'nanny', label: 'Bakıcı', emoji: '👩‍👧' },
    { key: 'other', label: 'Diğer', emoji: '👥' },
] as const;

const AGE_RANGES = [
    { key: 'infant', label: '0-2' },
    { key: 'toddler', label: '2-5' },
    { key: 'child', label: '6-12' },
    { key: 'teen', label: '13-17' },
] as const;

export default function MemberRolesScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
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
                    <Text style={styles.title}>Hane halkı</Text>
                    <Text style={styles.subtitle}>
                        Her bir kişi için isim ve rol belirleyin
                    </Text>
                </View>

                {members.map((member, index) => (
                    <View key={member.id} style={styles.memberCard}>
                        <Text style={styles.memberNumber}>Kişi {index + 1}</Text>

                        <Input
                            placeholder="İsim girin"
                            value={member.name || ''}
                            onChangeText={(text) => updateMember(index, { name: text })}
                            autoCapitalize="words"
                        />

                        <Text style={styles.roleLabel}>Rol</Text>
                        <View style={styles.roleGrid}>
                            {ROLES.map((role) => (
                                <SelectableTag
                                    key={role.key}
                                    label={role.label}
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
                                <Text style={styles.roleLabel}>Yaş Aralığı</Text>
                                <View style={styles.ageGrid}>
                                    {AGE_RANGES.map((age) => (
                                        <SelectableTag
                                            key={age.key}
                                            label={age.label}
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
                    title="Devam"
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
