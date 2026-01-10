/**
 * Firebase Functions Configuration (React Native Firebase)
 */

import functions from '@react-native-firebase/functions';
import { Platform } from 'react-native';

const functionsInstance = functions();

const useFunctionsEmulator = process.env.EXPO_PUBLIC_USE_FUNCTIONS_EMULATOR === 'true';

// Connect to local emulator only when explicitly enabled
if (__DEV__ && useFunctionsEmulator) {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  console.log('🔧 Connecting to Firebase Functions Emulator...');
  functionsInstance.useEmulator(host, 5001);
}

export { functionsInstance as functions };
