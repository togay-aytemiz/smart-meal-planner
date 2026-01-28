// Silence RNFirebase v22+ deprecation warnings (we intentionally use web SDK fallback)
(globalThis as Record<string, unknown>).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UserProvider } from '../contexts/user-context';
import { PremiumProvider } from '../contexts/premium-context';
import { colors } from '../theme/colors';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <PremiumProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}
            />
          </SafeAreaProvider>
        </PremiumProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
