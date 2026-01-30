import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Button, Input } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { useLanguage } from '../../contexts/language-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

const AVATARS = ['👤', '👩', '👨', '👧', '👦', '🧑‍🍳', '👩‍🍳', '🧓'];

export default function ProfileScreen() {
    const router = useRouter();
    const { dispatch } = useOnboarding();
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('👤');

    const handleContinue = () => {
        if (name.trim()) {
            dispatch({
                type: 'SET_PROFILE',
                payload: { name: name.trim(), avatarUrl: selectedAvatar }
            });
            dispatch({ type: 'SET_STEP', payload: 5 });
            router.push('/(onboarding)/routines');
        }
    };

    const isValid = name.trim().length > 0;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('onboarding.profile.title')}</Text>
                    <Text style={styles.subtitle}>{t('onboarding.profile.subtitle')}</Text>
                </View>

                {/* Avatar Selection */}
                <View style={styles.avatarSection}>
                    <View style={styles.selectedAvatarContainer}>
                        <Text style={styles.selectedAvatar}>{selectedAvatar}</Text>
                    </View>
                    <View style={styles.avatarGrid}>
                        {AVATARS.map((avatar) => (
                            <TouchableOpacity
                                key={avatar}
                                style={[
                                    styles.avatarOption,
                                    selectedAvatar === avatar && styles.avatarOptionSelected,
                                ]}
                                onPress={() => setSelectedAvatar(avatar)}
                            >
                                <Text style={styles.avatarEmoji}>{avatar}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Name Input */}
                <Input
                    label={t('onboarding.profile.nameLabel')}
                    placeholder={t('onboarding.profile.namePlaceholder')}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="done"
                />
            </View>

            <View style={styles.footer}>
                <Button
                    title={t('onboarding.common.continue')}
                    onPress={handleContinue}
                    fullWidth
                    size="large"
                    disabled={!isValid}
                />
            </View>
            <SafeAreaView edges={['bottom']} />
        </View>
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
        paddingTop: spacing.sm,
    },
    header: {
        marginBottom: spacing.xl,
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
    avatarSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    selectedAvatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primaryLight + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    selectedAvatar: {
        fontSize: 56,
    },
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    avatarOption: {
        width: 48,
        height: 48,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '20',
    },
    avatarEmoji: {
        fontSize: 24,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
});
