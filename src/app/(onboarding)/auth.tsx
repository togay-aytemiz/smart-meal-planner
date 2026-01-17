import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useOnboarding } from '../../contexts/onboarding-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback } from 'react';

export default function AuthScreen() {
    const router = useRouter();
    const { dispatch } = useOnboarding();

    useFocusEffect(
        useCallback(() => {
            dispatch({ type: 'SET_STEP', payload: 13 });
        }, [dispatch])
    );

    const handleContinue = () => {
        dispatch({ type: 'SET_STEP', payload: 14 });
        router.push('/(onboarding)/kickstart');
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Profilinizi Oluşturun</Text>
                    <Text style={styles.subtitle}>
                        Planlarınızı kaydetmek ve tüm cihazlardan erişmek için hesap oluşturun.
                    </Text>
                </View>

                <View style={styles.form}>
                    <Input
                        label="E-posta"
                        placeholder="ornek@email.com"
                        value=""
                        onChangeText={() => { }}
                    />
                    <Button
                        title="E-posta ile Devam Et"
                        onPress={handleContinue}
                        fullWidth
                        size="large"
                    />
                </View>

                <View style={styles.divider}>
                    <View style={styles.line} />
                    <Text style={styles.dividerText}>veya</Text>
                    <View style={styles.line} />
                </View>

                <View style={styles.socialButtons}>
                    <SocialButton icon="apple" label="Apple ile Devam Et" onPress={handleContinue} />
                    <SocialButton icon="google" label="Google ile Devam Et" onPress={handleContinue} />
                </View>

                <Text style={styles.terms}>
                    Devam ederek, <Text style={styles.link}>Kullanım Koşulları</Text> ve <Text style={styles.link}>Gizlilik Politikası</Text>'nı kabul etmiş olursunuz.
                </Text>

            </ScrollView>
        </SafeAreaView>
    );
}

function SocialButton({ icon, label, onPress }: { icon: any, label: string, onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.socialButton} onPress={onPress}>
            <MaterialCommunityIcons name={icon} size={24} color={colors.textPrimary} />
            <Text style={styles.socialLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },
    header: {
        marginBottom: spacing.xl,
        marginTop: spacing.sm,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
    },
    form: {
        gap: spacing.lg,
        marginBottom: spacing.xl,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        ...typography.caption,
        color: colors.textSecondary,
        marginHorizontal: spacing.md,
    },
    socialButtons: {
        gap: spacing.md,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    socialLabel: {
        ...typography.button,
        color: colors.textPrimary,
    },
    terms: {
        ...typography.caption,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: spacing.xxl,
        lineHeight: 20,
    },
    link: {
        color: colors.primary,
        fontWeight: '600',
    },
});
