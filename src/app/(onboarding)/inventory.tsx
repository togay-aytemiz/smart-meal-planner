import { View, Text, StyleSheet, ScrollView, Animated, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Button, Input } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';

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

    // START with empty if manual, else detected
    const [items, setItems] = useState<{ id: string, name: string }[]>(
        isManualMode ? [] : DETECTED_ITEMS
    );

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Ref to manage focus
    const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        // If manual mode is active and we have no items initially, add one automatically
        if (isManualMode && items.length === 0) {
            handleManualAdd();
        }
    }, []);

    const handleFinish = async () => {
        // Filter out empty items
        const validItems = items.filter(i => i.name.trim().length > 0);
        // Here we would save validItems to backend
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

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Navigation Header */}
            <View style={styles.navHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

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
                <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit>
                    {isManualMode
                        ? "Buzdolabındaki malzemeleri ekleyerek başlayalım."
                        : `Buzdolabında ${items.length} farklı malzeme tespit ettik.`
                    }
                </Text>
            </View>

            <View style={styles.actionButtons}>
                <Button
                    title="+ Manuel Ekle"
                    variant="ghost"
                    onPress={handleManualAdd}
                    size="medium"
                />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {items.map((item) => (
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
                        ))}
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
                <Button
                    title="Planımı Oluştur"
                    onPress={handleFinish}
                    fullWidth
                    size="large"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
    verticalDivider: {
        width: 1,
        height: 20,
        backgroundColor: colors.border,
        marginHorizontal: spacing.xs,
    },
});
