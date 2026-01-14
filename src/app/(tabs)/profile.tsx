import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

const STORAGE_KEY = '@smart_meal_planner:onboarding';
const MENU_RECIPES_STORAGE_KEY = '@smart_meal_planner:menu_recipes';
const MENU_CACHE_STORAGE_KEY = '@smart_meal_planner:menu_cache';
const WEEKLY_MENU_CACHE_KEY = '@smart_meal_planner:weekly_menu_generation';
const LEGACY_ONBOARDING_KEY = '@onboarding_data';

export default function ProfileScreen() {
    const router = useRouter();

    const handleResetOnboarding = async () => {
        Alert.alert(
            'Onboarding Sıfırla',
            'Onboarding verileriniz silinecek. Devam etmek istiyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sıfırla',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const keys = await AsyncStorage.getAllKeys();
                            const keysToRemove = keys.filter(
                                (key) =>
                                    key === STORAGE_KEY ||
                                    key === LEGACY_ONBOARDING_KEY ||
                                    key.startsWith(MENU_RECIPES_STORAGE_KEY) ||
                                    key.startsWith(MENU_CACHE_STORAGE_KEY) ||
                                    key.startsWith(WEEKLY_MENU_CACHE_KEY)
                            );
                            if (keysToRemove.length) {
                                await AsyncStorage.multiRemove(keysToRemove);
                            }
                            await auth().signOut();
                        } catch (error) {
                            console.warn('Onboarding reset failed:', error);
                        }
                        router.replace('/(onboarding)/welcome');
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScreenHeader title="Profil" />

            <View style={styles.content}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <MaterialCommunityIcons name="account" size={40} color={colors.primary} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ayarlar</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handleResetOnboarding}>
                        <Text style={styles.menuItemText}>Onboarding'i Sıfırla</Text>
                        <Text style={styles.menuItemArrow}>→</Text>
                    </TouchableOpacity>
                </View>
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
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    avatar: {
        width: 100,
        height: 100,
        backgroundColor: colors.primaryLight + '20',
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.label,
        color: colors.textMuted,
        marginBottom: spacing.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
    },
    menuItemText: {
        ...typography.body,
        color: colors.textPrimary,
    },
    menuItemArrow: {
        ...typography.body,
        color: colors.textMuted,
    },
});
