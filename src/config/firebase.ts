/**
 * Firebase Functions Configuration (React Native Firebase)
 */

import { getApp } from '@react-native-firebase/app';
import type { FirebaseFunctionsTypes } from '@react-native-firebase/functions';
import { NativeModules, Platform } from 'react-native';
import {
  getApps,
  initializeApp,
  type FirebaseApp as WebFirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable as httpsCallableWeb,
  type Functions,
  type HttpsCallableOptions as WebCallableOptions,
} from 'firebase/functions';

type FunctionsClient = Pick<FirebaseFunctionsTypes.Module, 'httpsCallable' | 'useEmulator'>;

const FUNCTIONS_REGION = 'us-central1';
const WEB_APP_NAME = 'smart-meal-planner-web';
const useFunctionsEmulator = process.env.EXPO_PUBLIC_USE_FUNCTIONS_EMULATOR === 'true';

const getWebApp = (): WebFirebaseApp => {
  const existing = getApps().find((app) => app.name === WEB_APP_NAME);
  if (existing) return existing;

  const nativeOptions = getApp().options as FirebaseOptions;
  if (!nativeOptions?.apiKey || !nativeOptions?.projectId || !nativeOptions?.appId) {
    throw new Error('Missing Firebase options needed for web functions.');
  }
  return initializeApp(nativeOptions, WEB_APP_NAME);
};

const createWebFunctionsClient = (): FunctionsClient => {
  const webApp = getWebApp();
  const webFunctions: Functions = getFunctions(webApp, FUNCTIONS_REGION);

  return {
    httpsCallable: <RequestData = unknown, ResponseData = unknown>(
      name: string,
      options?: FirebaseFunctionsTypes.HttpsCallableOptions
    ) => {
      const callable = httpsCallableWeb<RequestData, ResponseData>(
        webFunctions,
        name,
        options as WebCallableOptions | undefined
      );
      return callable as FirebaseFunctionsTypes.HttpsCallable<RequestData, ResponseData>;
    },
    useEmulator: (host: string, port: number) => {
      connectFunctionsEmulator(webFunctions, host, port);
    },
  };
};

const createRnFunctionsClient = (): FunctionsClient => {
  const nativeModuleNames = ['NativeRNFBTurboFunctions', 'RNFBFunctionsModule'];
  const hasNativeModule = nativeModuleNames.some((name) => Boolean(NativeModules[name]));
  if (!hasNativeModule) {
    throw new Error('Native Firebase Functions module not found.');
  }

  const functionsModule = require('@react-native-firebase/functions') as {
    default: (app: ReturnType<typeof getApp>) => FirebaseFunctionsTypes.Module;
  };
  const functionsInstance = functionsModule.default(getApp());
  return functionsInstance;
};

const createFunctionsClient = (): FunctionsClient => {
  try {
    return createRnFunctionsClient();
  } catch (error) {
    console.warn('[Firebase] Functions native module unavailable, using web SDK.', error);
    return createWebFunctionsClient();
  }
};

const functions = createFunctionsClient();

// Connect to local emulator only when explicitly enabled
if (__DEV__ && useFunctionsEmulator) {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  console.log('🔧 Connecting to Firebase Functions Emulator...');
  functions.useEmulator(host, 5001);
}

export { functions };
