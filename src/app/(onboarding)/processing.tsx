import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore, { doc, getDoc } from '@react-native-firebase/firestore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useOnboarding, type WeeklyRoutine } from '../../contexts/onboarding-context';
import { useSampleMenu } from '../../contexts/sample-menu-context';
import { useUser } from '../../contexts/user-context';

const STORAGE_KEY = '@onboarding_data';

const LOADING_MESSAGES = [
    "Rutinleriniz analiz ediliyor...",
    "Egzersiz günleriniz dengeleniyor...",
    "Mutfak tercihleri kontrol ediliyor...",
    "Size özel tarifler seçiliyor...",
    "Haftalık planınız oluşturuluyor..."
];

type OnboardingSnapshot = {
    profile?: { name?: string };
    householdSize?: number;
    dietary?: { restrictions?: string[]; allergies?: string[] };
    cuisine?: { selected?: string[] };
    cooking?: {
        timePreference?: 'quick' | 'balanced' | 'elaborate';
        skillLevel?: 'beginner' | 'intermediate' | 'expert';
        equipment?: string[];
    };
    routines?: WeeklyRoutine;
};

export default function ProcessingScreen() {
    const router = useRouter();
    const { state, dispatch } = useOnboarding();
    const { state: userState } = useUser();
    const { startLoading, waitForFirstMeal, hasStarted } = useSampleMenu();
    const [messageIndex, setMessageIndex] = useState(0);
    const hasNavigatedRef = useRef(false);

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
        }, 3000);

        return () => {
            clearInterval(messageInterval);
        };
    }, []);

    // Start API loading and wait for first meal
    useEffect(() => {
        if (userState.isLoading || hasStarted || hasNavigatedRef.current) {
            return;
        }

        const loadAndNavigate = async () => {
            // Load onboarding snapshot
            const userId = userState.user?.uid ?? 'anonymous';
            let snapshot: OnboardingSnapshot | null = (state.data ?? {}) as OnboardingSnapshot;

            if (userId !== 'anonymous') {
                try {
                    const userDoc = await getDoc(doc(firestore(), 'Users', userId));
                    const data = userDoc.data();
                    const remoteSnapshot = data?.onboarding as OnboardingSnapshot | undefined;
                    snapshot = remoteSnapshot ?? snapshot;
                } catch (readError) {
                    console.warn('Failed to load onboarding data:', readError);
                }
            }

            // Start loading meals in parallel
            startLoading(userId, snapshot);

            // Wait for first meal to be ready
            const success = await waitForFirstMeal();

            // Navigate to analysis
            if (!hasNavigatedRef.current) {
                hasNavigatedRef.current = true;
                dispatch({ type: 'SET_STEP', payload: 11 });
                router.replace('/(onboarding)/analysis');
            }
        };

        loadAndNavigate();
    }, [userState.isLoading, hasStarted]);

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
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        marginTop: '40%',
    },
    iconContainer: {
        width: 150,
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
        minHeight: 60,
    },
});
