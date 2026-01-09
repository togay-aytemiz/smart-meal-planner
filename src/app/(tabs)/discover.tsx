import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export default function DiscoverScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Keşfet</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderEmoji}>🔍</Text>
                    <Text style={styles.placeholderTitle}>Tarifleri Keşfet</Text>
                    <Text style={styles.placeholderText}>
                        Yeni tarifler ve öneriler yakında burada
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
    title: {
        ...typography.h2,
        color: colors.textPrimary,
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
