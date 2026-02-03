import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingState';
import { InlineError } from '../components/ErrorMessage';

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  ForgotPassword: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    // Validate input
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await resetPassword(email.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 justify-center">
          {/* Success Icon */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Check your email
            </Text>
            <Text className="text-base text-gray-600 text-center">
              We've sent password reset instructions to
            </Text>
            <Text className="text-base font-semibold text-gray-900 mt-1">
              {email}
            </Text>
          </View>

          {/* Instructions */}
          <View className="bg-blue-50 p-4 rounded-xl mb-6">
            <Text className="text-sm text-gray-700 mb-2">
              • Check your inbox and spam folder
            </Text>
            <Text className="text-sm text-gray-700 mb-2">
              • Click the reset link in the email
            </Text>
            <Text className="text-sm text-gray-700">
              • Create a new password
            </Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            className="bg-blue-600 py-4 rounded-xl items-center justify-center mb-3"
          >
            <Text className="text-white font-semibold text-lg">
              Back to Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setSuccess(false);
              setEmail('');
            }}
            className="bg-white border border-gray-300 py-4 rounded-xl items-center justify-center"
          >
            <Text className="text-gray-700 font-semibold text-lg">
              Try Another Email
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6">
            {/* Header */}
            <View className="mt-8 mb-8">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="w-10 h-10 items-center justify-center mb-6"
              >
                <Ionicons name="arrow-back" size={24} color="#1f2937" />
              </TouchableOpacity>
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                Reset password
              </Text>
              <Text className="text-base text-gray-600">
                Enter your email address and we'll send you instructions to reset your password
              </Text>
            </View>

            {/* Error Message */}
            {error && (
              <View className="mb-4">
                <InlineError message={error} />
              </View>
            )}

            {/* Email Input */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Email
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-4">
                <Ionicons name="mail-outline" size={20} color="#6b7280" />
                <TextInput
                  className="flex-1 py-4 px-3 text-base text-gray-900"
                  placeholder="your.email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Send Reset Link Button */}
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={loading}
              className="bg-blue-600 py-4 rounded-xl items-center justify-center mb-6"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <LoadingSpinner size="small" />
              ) : (
                <Text className="text-white font-semibold text-lg">
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to Sign In */}
            <View className="flex-row items-center justify-center">
              <Text className="text-gray-600">Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text className="text-blue-600 font-semibold">Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
