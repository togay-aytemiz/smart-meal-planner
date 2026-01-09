import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useOnboarding } from '../../contexts/onboarding-context';

export default function KickstartScreen() {
    const router = useRouter();
    const { nextStep, finishOnboarding, dispatch } = useOnboarding();

    useFocusEffect(
        useCallback(() => {
            dispatch({ type: 'SET_STEP', payload: 14 });
        }, [])
    );

    const handleCamera = () => {
        nextStep();
        router.push('/(onboarding)/scan');
    };

    const handleSkip = async () => {
        await finishOnboarding();
        router.replace('/');
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.illustration}>
                    <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name="fridge-outline" size={64} color={colors.primary} />
                        <View style={styles.aiBadge}>
                            <Text style={styles.aiText}>AI</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Yapay Zeka ile Görsel Analiz</Text>
                    <Text style={styles.subtitle}>
                        Gelişmiş görüntü işleme teknolojisi ile dolabınızı saniyeler içinde tarayın. AI asistanınız malzemeleri otomatik tanısın ve size özel tarifler hazırlasın.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="AI Taramayı Başlat"
                    onPress={handleCamera}
                    fullWidth
                    size="large"
                />
                <Button
                    title="Daha Sonra"
                    onPress={handleSkip}
                    variant="ghost"
                    fullWidth
                    size="medium"
                    style={{ marginTop: spacing.sm }}
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
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.xl,
        paddingBottom: 200, // Make room for footer
    },
    illustration: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    iconCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 32,
        elevation: 10,
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        paddingTop: spacing.lg,
        backgroundColor: colors.background,
    },
    aiBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    aiText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
