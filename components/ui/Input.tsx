import { TextInput, View, Text, StyleSheet, TextInputProps, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    helperText?: string;
}

export default function Input({ label, error, helperText, style, ...props }: InputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;
    const shadowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(borderAnim, {
                toValue: isFocused ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
            Animated.timing(shadowAnim, {
                toValue: isFocused ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    }, [isFocused]);

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border, colors.primary],
    });

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <Animated.View
                style={[
                    styles.inputWrapper,
                    {
                        borderColor: error ? colors.error : borderColor,
                        shadowOpacity: shadowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.08],
                        }),
                    },
                ]}
            >
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={colors.textMuted}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    selectionColor={colors.primary}
                    {...props}
                />
            </Animated.View>
            {error && <Text style={styles.error}>{error}</Text>}
            {helperText && !error && <Text style={styles.helper}>{helperText}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    label: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    inputWrapper: {
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.lg,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
        height: 52,
        justifyContent: 'center',
    },
    input: {
        fontSize: 16,
        fontWeight: '400' as const,
        color: colors.textPrimary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    error: {
        ...typography.caption,
        color: colors.error,
        marginTop: spacing.xs,
    },
    helper: {
        ...typography.caption,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
});
