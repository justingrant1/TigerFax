import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence is available in the RN bundle
import { getReactNativePersistence } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration
// IMPORTANT: Add your Firebase config values in the ENV tab on Vibecode
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// Check if Firebase is configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

// Initialize Firebase only if configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  // Initialize Firebase app (only once)
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  // Initialize Auth with AsyncStorage persistence for React Native
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    // Use AsyncStorage for persistence on native platforms
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (error) {
      // If initializeAuth fails (e.g., already initialized), fall back to getAuth
      auth = getAuth(app);
    }
  }

  // Initialize Firestore
  db = getFirestore(app);
} else {
  console.warn(
    'Firebase is not configured. Please add your Firebase credentials in the ENV tab:\n' +
    '- EXPO_PUBLIC_FIREBASE_API_KEY\n' +
    '- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN\n' +
    '- EXPO_PUBLIC_FIREBASE_PROJECT_ID\n' +
    '- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET\n' +
    '- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID\n' +
    '- EXPO_PUBLIC_FIREBASE_APP_ID'
  );
}

export { app, auth, db };
