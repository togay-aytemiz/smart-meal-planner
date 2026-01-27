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
    align?: 'center' | 'start';
    gap?: number;
    style?: StyleProp<ViewStyle>;
    titleStyle?: StyleProp<TextStyle>;
    subtitleStyle?: StyleProp<TextStyle>;
}

export default function ScreenHeader({
    title,
    subtitle,
    rightSlot,
    size = 'default',
    align = 'center',
    gap,
    style,
    titleStyle,
    subtitleStyle,
}: ScreenHeaderProps) {
    const paddingBottom = size === 'compact' ? spacing.sm : spacing.lg;
    const paddingTop = size === 'compact' ? spacing.md : spacing.lg;
    const alignItems = align === 'start' ? 'flex-start' : 'center';

    return (
        <View style={[styles.container, { paddingBottom, paddingTop }, gap !== undefined ? { gap } : null, style]}>
            <View style={[styles.titleRow, { alignItems }, Boolean(rightSlot) && styles.titleRowWithRight]}>
                <Text style={[styles.title, titleStyle]}>{title}</Text>
            </View>
            {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
            {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.lg,
        gap: spacing.xs,
        position: 'relative',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: spacing.md,
    },
    titleRowWithRight: {
        paddingRight: 72,
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
        position: 'absolute',
        top: spacing.lg,
        right: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
