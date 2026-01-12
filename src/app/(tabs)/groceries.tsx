import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export default function GroceriesScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="Alışveriş Listem" />

            <View style={styles.content}>
                <View style={styles.placeholder}>
                    <MaterialCommunityIcons name="cart-outline" size={56} color={colors.iconMuted} />
                    <Text style={styles.placeholderTitle}>Alışveriş Listeniz</Text>
                    <Text style={styles.placeholderText}>
                        Menü ve dolap durumuna göre liste burada olacak
                    </Text>
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
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
    },
});
