import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ReasoningBubbleProps {
    text: string;
}

export function ReasoningBubble({ text }: ReasoningBubbleProps) {
    // Always render to prevent layout jump, use placeholder space if empty
    const displayText = text || " ";

    return (
        <View style={styles.container}>
            <Image
                source={require('../../../assets/why-omnoo.png')}
                style={styles.avatar}
                resizeMode="contain"
            />
            <View style={styles.bubble}>
                <Text style={styles.title}>Neden bu menü?</Text>
                <Text style={styles.text}>{displayText}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        marginTop: 4,
    },
    bubble: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderTopLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        ...shadows.sm,
    },
    title: {
        ...typography.label,
        color: colors.primary,
        marginBottom: 4,
    },
    text: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        lineHeight: 20,
        minHeight: 40, // 2 lines
    },
});
