import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
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
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const entranceFade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        dispatch({ type: 'SET_STEP', payload: 10 });

        // Fade in on mount
        Animated.timing(entranceFade, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

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
            router.replace('/(onboarding)/analysis');
        }, 6000);

        return () => {
            clearInterval(messageInterval);
            clearTimeout(timeout);
        };
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: entranceFade }]}>
                <View style={styles.iconContainer}>
                    <Image
                        source={require('../../../assets/processing-loader.gif')}
                        style={styles.loaderImage}
                        resizeMode="contain"
                    />
                </View>

                <Animated.Text style={[styles.message, { opacity: fadeAnim }]}>
                    {LOADING_MESSAGES[messageIndex]}
                </Animated.Text>
            </Animated.View>
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
        width: 150, // Increased slightly for the gif
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    loaderImage: {
        width: '100%',
        height: '100%',
    },
    message: {
        ...typography.h3,
        color: colors.textPrimary,
        textAlign: 'center',
        minHeight: 60, // Prevent layout shift
    },
});
