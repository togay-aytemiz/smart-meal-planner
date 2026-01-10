/**
 * Firebase Configuration
 * Web SDK for Firebase Functions (Cloud Functions)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase project configuration
// TODO: Replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (singleton pattern)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Functions
const functions = getFunctions(app);

// Connect to local emulator in development
if (__DEV__) {
  console.log('🔧 Connecting to Firebase Functions Emulator...');
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { app, functions };
