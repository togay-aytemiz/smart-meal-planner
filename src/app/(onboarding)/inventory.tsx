import { View, Text, StyleSheet, ScrollView, Animated, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { Button, Input } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { useUser } from '../../contexts/user-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import firestore, { doc, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { functions } from '../../config/firebase';

// Mock detected items (simplified)
const DETECTED_ITEMS = [
    { id: '1', name: 'Yumurta' },
    { id: '2', name: 'Süt' },
    { id: '3', name: 'Beyaz Peynir' },
    { id: '4', name: 'Domates' },
    { id: '5', name: 'Salatalık' },
    { id: '6', name: 'Tavuk Göğsü' },
];

export default function InventoryScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isManualMode = params.mode === 'manual';

    const insets = useSafeAreaInsets();
    const { finishOnboarding } = useOnboarding();
    const { state: userState } = useUser();

    const initialItems = isManualMode ? [] : DETECTED_ITEMS;
    const [items, setItems] = useState<{ id: string; name: string }[]>(initialItems);
    const [rawInput, setRawInput] = useState('');
    const [step, setStep] = useState<'input' | 'loading' | 'review'>(isManualMode ? 'input' : 'review');
    const [inputError, setInputError] = useState<string | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Ref to manage focus
    const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const tokenizeInput = (value: string) =>
        value
            .split(/[\n,;•]+/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);

    const normalizeToken = (value: string) =>
        value
            .trim()
            .replace(/\s+/g, ' ')
            .toLocaleLowerCase('tr-TR');

    const formatDisplayName = (value: string) => {
        const normalized = normalizeToken(value);
        if (!normalized) return '';
        return normalized.charAt(0).toLocaleUpperCase('tr-TR') + normalized.slice(1);
    };

    const buildItemsFromInput = (value: string) => {
        const tokens = tokenizeInput(value);
        const seen = new Set<string>();
        return tokens.reduce<{ id: string; name: string }[]>((acc, token, index) => {
            const normalized = normalizeToken(token);
            if (!normalized || seen.has(normalized)) {
                return acc;
            }
            seen.add(normalized);
            acc.push({
                id: `${Date.now()}-${index}`,
                name: formatDisplayName(token),
            });
            return acc;
        }, []);
    };

    const handleFinish = async () => {
        const validItems = items.filter(i => i.name.trim().length > 0);
        if (!validItems.length) {
            setInputError('En az bir malzeme eklemelisin.');
            return;
        }
        const userId = userState.user?.uid;
        if (!userId) {
            setInputError('Kullanıcı doğrulanamadı. Lütfen tekrar dene.');
            return;
        }

        const pantryItems = validItems.map((item) => ({
            name: item.name.trim(),
            normalizedName: normalizeToken(item.name),
            source: 'onboarding',
        }));

        await setDoc(
            doc(firestore(), 'Users', userId),
            {
                pantry: {
                    items: pantryItems,
                    updatedAt: serverTimestamp(),
                },
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        await finishOnboarding();
        router.replace('/');
    };

    const handleManualAdd = () => {
        const newId = Date.now().toString();
        const newItem = { id: newId, name: '' };

        // Add to TOP of list
        setItems(prev => [newItem, ...prev]);

        // Focus this new input after render
        setTimeout(() => {
            inputRefs.current[newId]?.focus();
        }, 100);
    };

    const handleDelete = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleUpdate = (id: string, text: string) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, name: text } : item
        ));
    };

    const handleContinue = async () => {
        if (step === 'review') {
            await handleFinish();
            return;
        }

        const parsedItems = buildItemsFromInput(rawInput);
        if (!parsedItems.length) {
            setInputError('Lütfen en az bir malzeme yaz.');
            return;
        }

        setInputError(null);
        setStep('loading');

        try {
            const normalizePantry = functions.httpsCallable<
                { items: string[] },
                { success: boolean; items: Array<{ input: string; canonical: string; normalized: string }> }
            >('normalizePantryItems');
            const response = await normalizePantry({
                items: parsedItems.map((item) => item.name),
            });
            const normalizedItems = response.data?.items?.length
                ? response.data.items
                : parsedItems.map((item) => ({ canonical: item.name }));

            setItems(
                normalizedItems.map((item, index) => ({
                    id: `${Date.now()}-${index}`,
                    name: item.canonical.trim() || parsedItems[index]?.name || '',
                }))
            );
            setStep('review');
        } catch (error) {
            console.warn('Pantry normalization failed, using local fallback', error);
            setItems(parsedItems);
            setStep('review');
        }
    };

    const handleBackToInput = () => {
        setRawInput(items.map((item) => item.name).join('\n'));
        setStep('input');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Navigation Header */}
            <View style={styles.navHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>
            {/* Header Content */}
            <View style={[styles.header, { marginTop: spacing.sm }]}>
                <View style={styles.iconContainer}>
                    {isManualMode ? (
                        <Image
                            source={require('../../../assets/fridge.png')}
                            style={{ width: 60, height: 60 }}
                            resizeMode="contain"
                        />
                    ) : (
                        <MaterialCommunityIcons
                            name="check-circle"
                            size={48}
                            color={colors.success}
                        />
                    )}
                </View>
                <Text style={styles.title}>
                    {isManualMode ? "Dolabını Oluştur" : "İşte Bulduklarımız!"}
                </Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                    {isManualMode
                        ? "Malzemeleri alt alta veya virgülle yaz. Biz düzenleyip sana sunacağız."
                        : `Buzdolabında ${items.length} farklı malzeme tespit ettik.`
                    }
                </Text>
            </View>

            {step === 'review' ? (
                <View style={styles.actionButtons}>
                    <Button
                        title="Satır Ekle"
                        variant="ghost"
                        onPress={handleManualAdd}
                        size="medium"
                    />
                </View>
            ) : null}

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardWrap}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {step === 'input' ? (
                            <View style={styles.textAreaCard}>
                                <Text style={styles.textAreaLabel}>Malzemelerin</Text>
                                <TextInput
                                    value={rawInput}
                                    onChangeText={setRawInput}
                                    placeholder="Örn: mercimek, roka, tavuk göğsü"
                                    placeholderTextColor={colors.textMuted}
                                    multiline
                                    textAlignVertical="top"
                                    style={styles.textArea}
                                />
                                {inputError ? (
                                    <Text style={styles.errorText}>{inputError}</Text>
                                ) : (
                                    <Text style={styles.helperText}>Virgül veya satır ile ayırabilirsin.</Text>
                                )}
                            </View>
                        ) : null}

                        {step === 'loading' ? (
                            <View style={styles.loadingState}>
                                <ActivityIndicator size="small" color={colors.textMuted} />
                                <Text style={styles.loadingTitle}>Malzemeleri düzenliyoruz</Text>
                                <Text style={styles.loadingSubtitle}>Yazım hatalarını düzeltiyor, tekrarları ayıklıyoruz.</Text>
                            </View>
                        ) : null}

                        {step === 'review' ? (
                            items.map((item) => (
                                <View key={item.id} style={styles.itemRow}>
                                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                                        <Input
                                            ref={(ref: TextInput | null) => { inputRefs.current[item.id] = ref; }}
                                            value={item.name}
                                            onChangeText={(text: string) => handleUpdate(item.id, text)}
                                            placeholder="Malzeme adı..."
                                            blurOnSubmit={false}
                                            onSubmitEditing={handleManualAdd}
                                            returnKeyType="next"
                                        />
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(item.id)}
                                        style={styles.deleteButton}
                                    >
                                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : null}
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
                <Button
                    title={step === 'review' ? 'Planımı Oluştur' : 'Devam'}
                    onPress={handleContinue}
                    fullWidth
                    size="large"
                    loading={step === 'loading'}
                    disabled={step === 'loading'}
                />
                {step === 'review' && isManualMode ? (
                    <Button
                        title="Metni Düzenle"
                        variant="ghost"
                        onPress={handleBackToInput}
                        fullWidth
                        size="medium"
                        style={{ marginTop: spacing.xs }}
                    />
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardWrap: {
        flex: 1,
    },
    navHeader: {
        paddingHorizontal: spacing.lg,
        height: 44,
        justifyContent: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        marginLeft: -8, // align visual
    },

    header: {
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    iconContainer: {
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 100,
    },
    textAreaCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
    },
    textAreaLabel: {
        ...typography.label,
        color: colors.textPrimary,
    },
    textArea: {
        minHeight: 140,
        fontSize: 16,
        lineHeight: 22,
        color: colors.textPrimary,
    },
    helperText: {
        ...typography.caption,
        color: colors.textMuted,
    },
    errorText: {
        ...typography.caption,
        color: colors.error,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm, // Reduced vertical padding
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    deleteButton: {
        padding: spacing.sm,
    },
    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
        gap: spacing.xs,
    },
    loadingState: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.sm,
    },
    loadingTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    loadingSubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 260,
    },
    verticalDivider: {
        width: 1,
        height: 20,
        backgroundColor: colors.border,
        marginHorizontal: spacing.xs,
    },
});
