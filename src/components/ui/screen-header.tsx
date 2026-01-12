import { type ReactNode } from 'react';
import { View, Text, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    rightSlot?: ReactNode;
    size?: 'default' | 'compact';
    style?: StyleProp<ViewStyle>;
    titleStyle?: StyleProp<TextStyle>;
    subtitleStyle?: StyleProp<TextStyle>;
}

export default function ScreenHeader({
    title,
    subtitle,
    rightSlot,
    size = 'default',
    style,
    titleStyle,
    subtitleStyle,
}: ScreenHeaderProps) {
    const paddingBottom = size === 'compact' ? spacing.sm : spacing.lg;

    return (
        <View style={[styles.container, { paddingBottom }, style]}>
            <View style={styles.titleRow}>
                <Text style={[styles.title, titleStyle]}>{title}</Text>
                {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
            </View>
            {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.lg,
        gap: spacing.xs,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        flexShrink: 1,
    },
    subtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    rightSlot: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
});
