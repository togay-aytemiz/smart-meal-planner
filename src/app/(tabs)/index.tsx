import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export default function TodayScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Günaydın! 👋</Text>
                <Text style={styles.date}>9 Ocak 2026, Cuma</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderEmoji}>🍽️</Text>
                    <Text style={styles.placeholderTitle}>Bugünkü Planınız</Text>
                    <Text style={styles.placeholderText}>
                        Yemek planlaması yakında burada görünecek
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
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    greeting: {
        ...typography.h2,
        color: colors.textPrimary,
    },
    date: {
        ...typography.body,
        color: colors.textSecondary,
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
    placeholderEmoji: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    placeholderTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    placeholderText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
