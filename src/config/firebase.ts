/**
 * Firebase Functions Configuration (React Native Firebase)
 */

import functions from '@react-native-firebase/functions';
import { Platform } from 'react-native';

const functionsInstance = functions();

// Connect to local emulator in development
if (__DEV__) {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  console.log('🔧 Connecting to Firebase Functions Emulator...');
  functionsInstance.useEmulator(host, 5001);
}

export { functionsInstance as functions };
