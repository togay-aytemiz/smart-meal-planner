import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatLongDateTr, getGreeting } from '../../utils/dates';

export default function TodayScreen() {
    const now = new Date();
    const greeting = getGreeting(now);
    const todayLabel = formatLongDateTr(now);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.date}>{todayLabel}</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.placeholder}>
                    <MaterialCommunityIcons name="silverware-fork-knife" size={56} color={colors.iconMuted} />
                    <Text style={styles.placeholderTitle}>Bugünkü Menünüz</Text>
                    <Text style={styles.placeholderText}>
                        Haftalık menünüz burada görünecek
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
    placeholderTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        marginTop: spacing.md,
    },
    placeholderText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
