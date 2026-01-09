import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { colors } from '../theme/colors';
import { useUser } from '../contexts/user-context';

export default function Index() {
    const { state } = useUser();

    if (state.isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!state.onboardingCompleted) {
        return <Redirect href="/(onboarding)/welcome" />;
    }

    // TODO: Replace with main app tabs after onboarding
    return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
});
