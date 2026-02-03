import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { createUserDocument, getUserDocument } from '../services/firestore';

// Apple auth is only available in published iOS builds, not in Expo Go or Vibecode preview
// We'll check availability at runtime before attempting to use it
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
let isAppleAuthAvailable = false;

if (Platform.OS === 'ios') {
  try {
    AppleAuthentication = require('expo-apple-authentication');
    // Check if the native module is actually available
    isAppleAuthAvailable = AppleAuthentication?.isAvailableAsync !== undefined;
  } catch {
    // Module not available
    isAppleAuthAvailable = false;
  }
}

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  subscriptionTier: 'free' | 'pro' | 'credits';
  faxesRemaining: number;
  creditsRemaining: number;
  monthlyResetDate: string;
  createdAt: string;
  lastLogin: string;
  faxNumber?: string; // Pro users get a dedicated fax number
  faxNumberAssignedAt?: string;
  unreadFaxCount?: number;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const NONCE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
const NONCE_CHARSET_LENGTH = NONCE_CHARSET.length;

const generateRandomNonce = async (length: number = 32): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(length);
  return Array.from(randomBytes)
    .map((byte) => NONCE_CHARSET[byte % NONCE_CHARSET_LENGTH] ?? '')
    .join('');
};

const sha256 = async (input: string): Promise<string> =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Firestore
  const fetchUserData = async (uid: string) => {
    if (!isFirebaseConfigured) return;
    try {
      const data = await getUserDocument(uid);
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData(null);
    }
  };

  // Listen to authentication state changes
  useEffect(() => {
    // If Firebase is not configured, just set loading to false
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // User is signed in, fetch their data
        await fetchUserData(firebaseUser.uid);
      } else {
        // User is signed out
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up with email and password
  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured. Please add your credentials in the ENV tab.');
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update profile with display name if provided
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }

      // Create user document in Firestore
      if (userCredential.user) {
        await createUserDocument(userCredential.user.uid, {
          email: userCredential.user.email,
          displayName: displayName || null,
          photoURL: null,
        });

        // Fetch the newly created user data
        await fetchUserData(userCredential.user.uid);
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured. Please add your credentials in the ENV tab.');
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User data will be fetched automatically by onAuthStateChanged
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  // Sign in with Apple (iOS only - requires published build, not available in Expo Go/Vibecode preview)
  const signInWithApple = async () => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured. Please add your credentials in the ENV tab.');
    }
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }
    if (!AppleAuthentication) {
      throw new Error('Apple Sign-In is only available in published iOS builds. It cannot be tested in the Vibecode preview.');
    }

    try {
      // Check if Apple auth is available on this device
      // This will be false in Expo Go and Vibecode preview
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In is only available in published iOS builds. It cannot be tested in the Vibecode preview.');
      }

      const rawNonce = await generateRandomNonce();
      const hashedNonce = await sha256(rawNonce);

      // Start the sign-in request (Expo)
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('Apple Sign-In failed - no identity token returned');
      }

      // Create a Firebase credential from the response
      const provider = new OAuthProvider('apple.com');
      const oauthCredential = provider.credential({
        idToken: credential.identityToken,
        rawNonce,
      });

      const userCredential = await signInWithCredential(auth, oauthCredential);

      // If new user, create Firestore doc
      // Check if this is a new user by seeing if their creation time equals last sign in time
      const isNewUser = userCredential.user.metadata.creationTime === userCredential.user.metadata.lastSignInTime;

      if (isNewUser && userCredential.user) {
        const displayName =
          credential.fullName
            ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
            : null;

        await createUserDocument(userCredential.user.uid, {
          email: userCredential.user.email,
          displayName: displayName || null,
          photoURL: null,
        });

        await fetchUserData(userCredential.user.uid);
      }
    } catch (error: any) {
      console.error('Apple Sign-In error:', error);

      // Expo cancellation check
      if (error?.code === 'ERR_CANCELED' || String(error?.message || '').toLowerCase().includes('canceled')) {
        throw new Error('Apple Sign-In was canceled');
      }

      const detailedMessage = error?.message || 'Please try again.';
      throw new Error(`Apple Sign-In failed. ${detailedMessage}`);
    }
  };

  // Sign out
  const signOut = async () => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured. Please add your credentials in the ENV tab.');
    }
    try {
      await firebaseSignOut(auth);
      setUserData(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out. Please try again.');
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured. Please add your credentials in the ENV tab.');
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: { displayName?: string; photoURL?: string }) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured. Please add your credentials in the ENV tab.');
    }
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user is currently signed in');
      }

      await updateProfile(currentUser, updates);

      // Update user data in state
      setUser({ ...currentUser });

      // Refresh user data from Firestore
      await fetchUserData(currentUser.uid);
    } catch (error) {
      console.error('Update profile error:', error);
      throw new Error('Failed to update profile. Please try again.');
    }
  };

  // Manually refresh user data
  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.uid);
    }
  };

  const value: AuthContextType = {
    user,
    userData,
    loading,
    isConfigured: isFirebaseConfigured,
    signUp,
    signIn,
    signInWithApple,
    signOut,
    resetPassword,
    updateUserProfile,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Helper function to convert Firebase error codes to user-friendly messages
function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email address is already in use. Please sign in or use a different email.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please check your email and password.';
    default:
      return 'An error occurred. Please try again.';
  }
}
