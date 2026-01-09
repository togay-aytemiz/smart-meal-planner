import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/spacing';

interface ProgressBarProps {
    current: number;
    total: number;
    height?: number;
}

export default function ProgressBar({ current, total, height = 4 }: ProgressBarProps) {
    const animatedWidth = useRef(new Animated.Value(0)).current;
    const progress = Math.min(current / total, 1);

    useEffect(() => {
        Animated.timing(animatedWidth, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    return (
        <View style={[styles.container, { height }]}>
            <Animated.View
                style={[
                    styles.fill,
                    {
                        height,
                        width: animatedWidth.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                        }),
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: colors.borderLight,
        borderRadius: radius.full,
        overflow: 'hidden',
    },
    fill: {
        backgroundColor: colors.primary,
        borderRadius: radius.full,
    },
});
