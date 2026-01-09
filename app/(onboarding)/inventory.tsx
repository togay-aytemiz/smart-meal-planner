import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Button } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';

// Mock detected items
const DETECTED_ITEMS = [
    { id: '1', name: 'Yumurta', category: 'Dairy', quantity: '6 adet' },
    { id: '2', name: 'Süt', category: 'Dairy', quantity: '1 litre' },
    { id: '3', name: 'Beyaz Peynir', category: 'Dairy', quantity: '250g' },
    { id: '4', name: 'Domates', category: 'Produce', quantity: '4 adet' },
    { id: '5', name: 'Salatalık', category: 'Produce', quantity: '3 adet' },
    { id: '6', name: 'Tavuk Göğsü', category: 'Meat', quantity: '500g' },
];

export default function InventoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { nextStep, finishOnboarding } = useOnboarding();
    const [items, setItems] = useState(DETECTED_ITEMS);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleFinish = async () => {
        // Here we would save the inventory to backend
        await finishOnboarding();
        router.replace('/');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={[styles.header, { marginTop: spacing.sm }]}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="check-circle" size={48} color={colors.success} />
                </View>
                <Text style={styles.title}>İşte Bulduklarımız!</Text>
                <Text style={styles.subtitle}>
                    Buzdolabında {items.length} farklı malzeme tespit ettik.
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Animated.View style={{ opacity: fadeAnim }}>
                    <Button
                        title="+ Manuel Ekle"
                        variant="ghost"
                        onPress={() => { }}
                        style={{ marginBottom: spacing.sm }}
                    />

                    {items.map((item, index) => (
                        <View key={item.id} style={styles.itemRow}>
                            <View style={styles.itemIcon}>
                                <MaterialCommunityIcons
                                    name={item.category === 'Dairy' ? 'bottle-tonic' : item.category === 'Produce' ? 'leaf' : 'food-drumstick'}
                                    size={20}
                                    color={colors.primary}
                                />
                            </View>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemQty}>{item.quantity}</Text>
                            </View>
                            <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textMuted} />
                        </View>
                    ))}
                </Animated.View>
            </ScrollView>

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
    header: {
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.xl,
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
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    itemQty: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
});
