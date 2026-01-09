import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ensure this is installed
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useOnboarding } from '../../contexts/onboarding-context';

const LOADING_MESSAGES = [
    "Rutinleriniz analiz ediliyor...",
    "Egzersiz günleriniz dengeleniyor...",
    "Mutfak tercihleri kontrol ediliyor...",
    "Size özel tarifler seçiliyor...",
    "Haftalık planınız oluşturuluyor..."
];

export default function ProcessingScreen() {
    const router = useRouter();
    const { dispatch } = useOnboarding();
    const [messageIndex, setMessageIndex] = useState(0);

    // Animations
    const spinAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Spin animation
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Message cycling
        const messageInterval = setInterval(() => {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();

            setTimeout(() => {
                setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
            }, 200);
        }, 1500);

        // Auto advance after 6 seconds (roughly 4 messages)
        const timeout = setTimeout(() => {
            clearInterval(messageInterval);
            dispatch({ type: 'SET_STEP', payload: 11 });
            router.push('/(onboarding)/analysis');
        }, 6000);

        return () => {
            clearInterval(messageInterval);
            clearTimeout(timeout);
        };
    }, []);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <MaterialCommunityIcons name="loading" size={64} color={colors.primary} />
                    </Animated.View>
                    <View style={styles.centerIcon}>
                        <MaterialCommunityIcons name="brain" size={32} color={colors.primary} />
                    </View>
                </View>

                <Animated.Text style={[styles.message, { opacity: fadeAnim }]}>
                    {LOADING_MESSAGES[messageIndex]}
                </Animated.Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        // Removed justifyContent: 'center' to allow consistent top spacing
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        marginTop: '40%', // Push down slightly but not vertically centered
    },
    iconContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    centerIcon: {
        position: 'absolute',
    },
    message: {
        ...typography.h3,
        color: colors.textPrimary,
        textAlign: 'center',
        minHeight: 60, // Prevent layout shift
    },
});
