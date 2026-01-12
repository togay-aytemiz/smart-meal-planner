import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
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



    const handleSkip = async () => {
        await finishOnboarding();
        router.replace('/');
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.illustration}>
                    <Image
                        source={require('../../../assets/fridge.png')}
                        style={styles.illustrationImage}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Malzemelerini Ekle</Text>
                    <Text style={styles.subtitle}>
                        Evindeki ürünleri ekleyebilirsin. Omnoo, sana özel tarifler hazırlarken en verimli ve efektif şekilde çalışacak.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Eklemeye Başla"
                    onPress={() => {
                        nextStep();
                        router.push({ pathname: '/(onboarding)/inventory', params: { mode: 'manual' } });
                    }}
                    fullWidth
                    size="large"
                />
                <Button
                    title="Daha Sonra"
                    onPress={handleSkip}
                    variant="ghost"
                    fullWidth
                    size="medium"
                    style={{ marginTop: spacing.xs }}
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
        paddingTop: 100, // Push content down visually
        paddingBottom: 200, // Make room for footer
    },
    illustration: {
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    illustrationImage: {
        width: 280,
        height: 280,
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
