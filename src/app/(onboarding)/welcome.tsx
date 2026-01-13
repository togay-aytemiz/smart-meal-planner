import { View, Text, StyleSheet, Animated, Easing, Dimensions, ScrollView, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { useOnboarding } from '../../contexts/onboarding-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();
    const { dispatch } = useOnboarding();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Staggered entry for list items
    const item1Anim = useRef(new Animated.Value(0)).current;
    const item2Anim = useRef(new Animated.Value(0)).current;
    const item3Anim = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => {
            // Ensure step is 1 so header hides
            dispatch({ type: 'SET_STEP', payload: 1 });

            // Reset values
            fadeAnim.setValue(0);
            slideAnim.setValue(30);
            item1Anim.setValue(0);
            item2Anim.setValue(0);
            item3Anim.setValue(0);

            // Main content entry
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
            ]).start();

            // Staggered items
            Animated.stagger(200, [
                Animated.timing(item1Anim, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(item2Anim, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(item3Anim, { toValue: 1, duration: 600, useNativeDriver: true }),
            ]).start();
        }, [])
    );

    const handleStart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Exit animation similar to reference "transitional" feel
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -20, // Slide up slightly on exit
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            dispatch({ type: 'SET_STEP', payload: 2 });
            router.push('/(onboarding)/profile');
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    {/* Hero Image */}
                    <Image
                        source={require('../../../assets/welcome.png')}
                        style={styles.heroImage}
                        resizeMode="contain"
                    />

                    <Text style={styles.title}>Akıllı Yemek Planlama</Text>
                    <Text style={styles.subtitle}>
                        Haftalık menünü akıllıca planla, "ne pişirsem" derdinden kurtul
                    </Text>
                </Animated.View>

                {/* Feature List */}
                <View style={styles.featuresList}>
                    <FeatureRow
                        anim={item1Anim}
                        imageSource={require('../../../assets/cal.png')}
                        title="Rutinlerinize Göre Plan"
                        desc="Ofis, ev veya tatil günlerinize göre otomatik ayarlanan dinamik listeler."
                    />
                    <FeatureRow
                        anim={item2Anim}
                        imageSource={require('../../../assets/fam.png')}
                        title="Tüm Aile İçin Uyumlu"
                        desc="Eşiniz, çocuklarınız ve evdeki herkes için ortak, sevilen tarifler."
                    />
                    <FeatureRow
                        anim={item3Anim}
                        imageSource={require('../../../assets/ai.png')}
                        title="Yapay Zeka Destekli"
                        desc="Damak tadınıza ve tercihlerinize göre sürekli öğrenen kişisel asistan."
                    />
                </View>
            </ScrollView>


            {/* Footer */}
            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
                <Button
                    title="Yolculuğa Başla"
                    onPress={handleStart}
                    fullWidth
                    size="large"
                    style={styles.startButton}
                />
            </Animated.View>
        </SafeAreaView>
    );
}

import { ImageSourcePropType } from 'react-native';

function FeatureRow({ imageSource, title, desc, anim }: { imageSource: ImageSourcePropType; title: string; desc: string; anim: Animated.Value }) {
    return (
        <Animated.View
            style={[
                styles.featureRow,
                {
                    opacity: anim,
                    transform: [{
                        translateX: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0]
                        })
                    }]
                }
            ]}
        >
            <View style={styles.featureIcon}>
                <Image source={imageSource} style={styles.featureImage} resizeMode="contain" />
            </View>
            <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDesc}>{desc}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    mainContent: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: 100,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    heroImage: {
        width: 280,
        height: 280,
        marginBottom: spacing.sm,
    },
    title: {
        ...typography.h1,
        fontSize: 28,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
        fontWeight: '500',
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    featuresList: {
        gap: spacing.lg,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    featureIcon: {
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    featureImage: {
        width: 60,
        height: 60,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        ...typography.label,
        fontSize: 16,
        color: colors.textPrimary,
        marginBottom: 4,
        display: 'flex',
    },
    featureDesc: {
        ...typography.caption,
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        paddingTop: spacing.md,
        backgroundColor: colors.background, // To cover scroll content
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    startButton: {
        height: 56,
        borderRadius: radius.full,
    },
});
