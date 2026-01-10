import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useState } from 'react';
import { functions } from '../../config/firebase';

type TestGeminiResponse = {
    response: string;
    success: boolean;
    model: string;
    timestamp: string;
};

export default function CookbookScreen() {
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const testGemini = async () => {
        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            const testFunction = functions.httpsCallable<
                { prompt: string },
                TestGeminiResponse
            >('testGemini');

            const result = await testFunction({
                prompt: 'Merhaba! Türk mutfağından basit ve lezzetli bir tarif öner.'
            });

            const data = result.data;
            setResponse(data.response);
        } catch (err: unknown) {
            console.error('Gemini test hatası:', err);
            const message = err instanceof Error ? err.message : 'Bir hata oluştu';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Tariflerim</Text>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {!response && !loading && !error && (
                    <View style={styles.placeholder}>
                        <MaterialCommunityIcons name="book-outline" size={56} color={colors.iconMuted} />
                        <Text style={styles.placeholderTitle}>Kaydedilen Tarifler</Text>
                        <Text style={styles.placeholderText}>
                            Beğendiğiniz AI tarifleri burada birikir
                        </Text>

                        {/* Test Button */}
                        <TouchableOpacity
                            style={styles.testButton}
                            onPress={testGemini}
                        >
                            <MaterialCommunityIcons name="robot" size={24} color="#FFFFFF" />
                            <Text style={styles.testButtonText}>LLM'yi Test Et</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Gemini'den yanıt bekleniyor...</Text>
                    </View>
                )}

                {error && (
                    <View style={styles.errorContainer}>
                        <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
                        <Text style={styles.errorTitle}>Hata</Text>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={testGemini}
                        >
                            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {response && (
                    <View style={styles.responseContainer}>
                        <View style={styles.responseHeader}>
                            <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                            <Text style={styles.responseTitle}>LLM Yanıtı</Text>
                        </View>
                        <Text style={styles.responseText}>{response}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={testGemini}
                        >
                            <Text style={styles.retryButtonText}>Yeni Test</Text>
                        </TouchableOpacity>
                    </View>
                )}
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    placeholderTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    placeholderText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 12,
        marginTop: spacing.lg,
        gap: spacing.xs,
    },
    testButtonText: {
        ...typography.button,
        color: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    errorTitle: {
        ...typography.h3,
        color: colors.error,
        marginTop: spacing.md,
    },
    errorText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.xs,
        marginBottom: spacing.lg,
    },
    retryButton: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    retryButtonText: {
        ...typography.button,
        color: colors.primary,
    },
    responseContainer: {
        flex: 1,
        paddingVertical: spacing.lg,
    },
    responseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    responseTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    responseText: {
        ...typography.body,
        color: colors.textPrimary,
        lineHeight: 24,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: 12,
        marginBottom: spacing.lg,
    },
});
