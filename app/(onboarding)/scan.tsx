import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useOnboarding } from '../../contexts/onboarding-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function ScanScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { nextStep } = useOnboarding();

    // State
    const [capturedCount, setCapturedCount] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Animations
    const flashAnim = useRef(new Animated.Value(0)).current;

    const handleCapture = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Flash animation
        Animated.sequence([
            Animated.timing(flashAnim, {
                toValue: 1,
                duration: 100,
                // useNativeDriver: true, // backgroundColor doesn't support native driver
                useNativeDriver: false,
            }),
            Animated.timing(flashAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            })
        ]).start();

        setCapturedCount(prev => prev + 1);
    };

    const handleDone = () => {
        if (capturedCount === 0) return;

        setIsAnalyzing(true);

        // Mock analysis delay then navigate
        setTimeout(() => {
            nextStep();
            router.push('/(onboarding)/inventory');
        }, 2000);
    };

    return (
        <View style={styles.container}>
            {/* Mock Camera View (Full Screen) */}
            <View style={styles.cameraPreview}>
                <MaterialCommunityIcons name="fridge" size={120} color="rgba(255,255,255,0.1)" />
            </View>

            {/* Flash Overlay */}
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: 'white', opacity: flashAnim }
                ]}
                pointerEvents="none"
            />

            {/* Analysis Overlay */}
            {isAnalyzing && (
                <View style={[StyleSheet.absoluteFill, styles.analysisOverlay]}>
                    <MaterialCommunityIcons name="brain" size={64} color="#FFF" style={styles.breathingIcon} />
                    <Text style={styles.analyzingText}>Fotoğraflar İnceleniyor...</Text>
                </View>
            )}

            {/* UI Overlay */}
            <View style={[styles.uiContainer, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>

                {/* Header */}
                <View style={styles.header}>
                    {/* Left: Counter */}
                    <View style={styles.headerLeft}>
                        {capturedCount > 0 ? (
                            <View style={styles.counterBadge}>
                                <Text style={styles.counterText}>{capturedCount}</Text>
                            </View>
                        ) : (
                            <View style={styles.emptySpace} />
                        )}
                    </View>

                    {/* Right: Close (X) */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => router.back()}
                    >
                        <MaterialCommunityIcons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Center Guide (Optional) */}
                {!isAnalyzing && (
                    <View style={styles.guideFrame}>
                        <View style={styles.cornerTL} />
                        <View style={styles.cornerTR} />
                        <View style={styles.cornerBL} />
                        <View style={styles.cornerBR} />
                    </View>
                )}

                {/* Footer Controls */}
                {!isAnalyzing && (
                    <View style={styles.controls}>
                        {/* Left Placeholder (Could be gallery) */}
                        <View style={styles.sideControl} />

                        {/* Capture Button */}
                        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
                            <View style={styles.captureInner} />
                        </TouchableOpacity>

                        {/* Done Button (Right) */}
                        <View style={styles.sideControl}>
                            {capturedCount > 0 && (
                                <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                                    <MaterialCommunityIcons name="arrow-right" size={24} color="#000" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    cameraPreview: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1a1a1a', // Mock camera dark grey
        justifyContent: 'center',
        alignItems: 'center',
    },
    uiContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', // Changed from flex-start to center
        paddingHorizontal: spacing.lg,
        height: 50, // Fixed height specifically for header alignment
    },
    headerLeft: {
        minWidth: 44, // Match close button width for balance if needed
    },
    emptySpace: {
        width: 44,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterText: {
        color: '#FFF',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    guideFrame: {
        width: width * 0.8,
        height: width * 1.2, // Portrait aspect ratio
        alignSelf: 'center',
        position: 'absolute',
        // Removed top: '15%' so it centers via justify-content of parent if possible or top: undefined
        top: (height - (width * 1.2)) / 2 - 50, // Manual centering adjustment considering header/footer
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
    },
    sideControl: {
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF',
    },
    doneButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    analysisOverlay: {
        backgroundColor: 'rgba(0,0,0,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    analyzingText: {
        ...typography.h3,
        color: '#FFF',
        marginTop: spacing.lg,
    },
    breathingIcon: {
        opacity: 0.9,
    },
    // Corners
    cornerTL: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
});
