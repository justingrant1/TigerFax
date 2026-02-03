/**
 * Reusable Error Message Components
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatErrorForDisplay } from '../utils/error-handler';

interface ErrorMessageProps {
  error: any;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorMessage({ error, onRetry, onDismiss }: ErrorMessageProps) {
  const { title, message, retryable } = formatErrorForDisplay(error);

  return (
    <View className="bg-red-50 border border-red-200 rounded-xl p-4 mx-6 my-4">
      <View className="flex-row items-start space-x-3">
        <Ionicons name="alert-circle" size={24} color="#DC2626" />
        
        <View className="flex-1">
          <Text className="text-red-900 font-semibold mb-1">{title}</Text>
          <Text className="text-red-700 text-sm mb-3">{message}</Text>
          
          <View className="flex-row space-x-2">
            {retryable && onRetry && (
              <Pressable
                onPress={onRetry}
                className="bg-red-600 rounded-lg px-4 py-2 active:bg-red-700"
              >
                <Text className="text-white font-medium text-sm">Retry</Text>
              </Pressable>
            )}
            
            {onDismiss && (
              <Pressable
                onPress={onDismiss}
                className="bg-red-100 rounded-lg px-4 py-2 active:bg-red-200"
              >
                <Text className="text-red-700 font-medium text-sm">Dismiss</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

interface InlineErrorProps {
  message: string;
}

export function InlineError({ message }: InlineErrorProps) {
  return (
    <View className="flex-row items-center space-x-2 px-4 py-2">
      <Ionicons name="alert-circle" size={16} color="#DC2626" />
      <Text className="text-red-600 text-sm flex-1">{message}</Text>
    </View>
  );
}

export default ErrorMessage;
