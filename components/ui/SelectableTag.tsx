import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

interface SelectableTagProps {
    label: string;
    selected: boolean;
    onPress: () => void;
    icon?: React.ReactNode;
}

export default function SelectableTag({ label, selected, onPress, icon }: SelectableTagProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[styles.container, selected && styles.selected]}
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
            >
                {icon && <>{icon}</>}
                <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        gap: spacing.xs,
    },
    selected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '20',
    },
    label: {
        ...typography.label,
        color: colors.textSecondary,
    },
    selectedLabel: {
        color: colors.primary,
        fontWeight: '600',
    },
});
