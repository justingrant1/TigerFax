import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Platform, Alert, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingState';
import { InlineError } from '../components/ErrorMessage';
import { Container } from '../components/Container';

// Check if Apple Auth is available (only in published iOS builds)
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
if (Platform.OS === 'ios') {
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch {
    AppleAuthentication = null;
  }
}

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  Home: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { signInWithApple, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [appleLoading, setAppleLoading] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  // Check if Apple Sign-In is available (only in published iOS builds)
  useEffect(() => {
    const checkAppleAuth = async () => {
      if (Platform.OS === 'ios' && AppleAuthentication) {
        try {
          const available = await AppleAuthentication.isAvailableAsync();
          setIsAppleAuthAvailable(available);
        } catch {
          setIsAppleAuthAvailable(false);
        }
      }
    };
    checkAppleAuth();
  }, []);

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      setError('Apple Sign-In is only available on iOS');
      return;
    }

    // Show friendly message if not available (Vibecode preview)
    if (!isAppleAuthAvailable) {
      Alert.alert(
        'Apple Sign-In Not Available',
        'Apple Sign-In can only be tested in a published iOS build (TestFlight or App Store). Please use email sign-in to test in the preview.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setError(null);
      setAppleLoading(true);
      await signInWithApple();
      // Navigation will happen automatically via AuthContext
    } catch (err: any) {
      // Don't show error for cancellation
      if (err.message?.includes('canceled')) {
        return;
      }
      setError(err.message || 'Apple Sign-In failed');
    } finally {
      setAppleLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Container maxWidth={500} className="flex-1 justify-center">
        {/* Logo/App Name */}
        <View className="items-center mb-12">
          <View className="w-24 h-24 bg-blue-600 rounded-3xl items-center justify-center mb-4">
            <Ionicons name="document-text" size={48} color="white" />
          </View>
          <Text className="text-4xl font-bold text-gray-900 mb-2">TigerFax</Text>
          <Text className="text-lg text-gray-600 text-center">
            Send faxes instantly from your phone
          </Text>
        </View>

        {/* Features */}
        <View className="mb-8">
          <FeatureItem icon="camera" text="Scan documents with your camera" />
          <FeatureItem icon="send" text="Send faxes in seconds" />
          <FeatureItem icon="shield-checkmark" text="Secure & reliable transmission" />
          <FeatureItem icon="sparkles" text="AI-powered enhancements" />
        </View>

        {/* Error Message */}
        {error && (
          <View className="mb-4">
            <InlineError message={error} />
          </View>
        )}

        {/* Sign In Buttons */}
        <View className="space-y-3">
          {/* Apple Sign In (iOS only) */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={handleAppleSignIn}
              disabled={appleLoading}
              className="bg-black py-4 rounded-xl flex-row items-center justify-center"
            >
              {appleLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={24} color="white" />
                  <Text className="text-white font-semibold text-lg ml-2">
                    Sign in with Apple
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Email Sign In */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            className="bg-blue-600 py-4 rounded-xl flex-row items-center justify-center"
          >
            <Ionicons name="mail" size={20} color="white" />
            <Text className="text-white font-semibold text-lg ml-2">
              Sign in with Email
            </Text>
          </TouchableOpacity>

          {/* Create Account */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            className="bg-white border-2 border-blue-600 py-4 rounded-xl items-center justify-center"
          >
            <Text className="text-blue-600 font-semibold text-lg">
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View className="mt-8">
          <Text className="text-xs text-gray-500 text-center">
            By continuing, you agree to our{' '}
            <Text 
              className="text-blue-600"
              onPress={() => Linking.openURL('https://tigerfax.com/terms')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text 
              className="text-blue-600"
              onPress={() => Linking.openURL('https://tigerfax.com/privacy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </Container>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

function FeatureItem({ icon, text }: FeatureItemProps) {
  return (
    <View className="flex-row items-center mb-3">
      <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color="#2563eb" />
      </View>
      <Text className="text-gray-700 text-base flex-1">{text}</Text>
    </View>
  );
}
