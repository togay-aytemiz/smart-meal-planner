import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Animated } from 'react-native';
import { useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    fullWidth?: boolean;
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export default function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    fullWidth = false,
    disabled = false,
    loading = false,
    style,
    textStyle,
}: ButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
        }).start();
    };

    const handlePress = () => {
        if (!disabled && !loading) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPress();
        }
    };

    const buttonStyles = [
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
    ];

    const textStyles = [
        styles.text,
        styles[`${variant}Text`],
        styles[`${size}Text`],
        disabled && styles.disabledText,
        textStyle,
    ];

    return (
        <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                style={buttonStyles}
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                activeOpacity={0.95}
            >
                {loading ? (
                    <ActivityIndicator color={variant === 'primary' ? colors.textInverse : colors.primary} />
                ) : (
                    <Text style={textStyles}>{title}</Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
    },

    // Variants
    primary: {
        backgroundColor: colors.primary,
    },
    secondary: {
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    ghost: {
        backgroundColor: 'transparent',
    },

    // Sizes
    small: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        minHeight: 36,
    },
    medium: {
        paddingVertical: spacing.sm + 4,
        paddingHorizontal: spacing.lg,
        minHeight: 48,
    },
    large: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        minHeight: 56,
    },

    // Full width
    fullWidth: {
        width: '100%',
    },

    // Disabled
    disabled: {
        opacity: 0.5,
    },

    // Text base
    text: {
        ...typography.button,
    },

    // Text variants
    primaryText: {
        color: colors.textInverse,
    },
    secondaryText: {
        color: colors.textPrimary,
    },
    ghostText: {
        color: colors.primary,
    },

    // Text sizes
    smallText: {
        ...typography.buttonSmall,
    },
    mediumText: {
        ...typography.button,
    },
    largeText: {
        ...typography.button,
        fontSize: 18,
    },

    // Disabled text
    disabledText: {
        opacity: 0.7,
    },
});
