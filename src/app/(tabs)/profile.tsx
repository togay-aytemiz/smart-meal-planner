import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

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
                        await AsyncStorage.removeItem('@smart_meal_planner:onboarding');
                        router.replace('/');
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Profil</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatar}>👤</Text>
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
        paddingHorizontal: spacing.lg,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    avatar: {
        fontSize: 64,
        width: 100,
        height: 100,
        textAlign: 'center',
        lineHeight: 100,
        backgroundColor: colors.primaryLight + '20',
        borderRadius: 50,
        overflow: 'hidden',
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
