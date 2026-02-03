/**
 * Reusable Loading State Components
 * Provides consistent loading indicators and skeleton screens
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingSpinner({ message, size = 'large' }: LoadingStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator size={size} color="#3B82F6" />
      {message && (
        <Text className="text-gray-600 mt-4 text-center">{message}</Text>
      )}
    </View>
  );
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <View className="absolute inset-0 bg-black/50 items-center justify-center z-50">
      <View className="bg-white rounded-2xl p-8 items-center min-w-[200px]">
        <ActivityIndicator size="large" color="#3B82F6" />
        {message && (
          <Text className="text-gray-900 mt-4 text-center font-medium">
            {message}
          </Text>
        )}
      </View>
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
      <View className="flex-row items-start space-x-3">
        {/* Avatar skeleton */}
        <View className="bg-gray-300 rounded-full w-10 h-10 animate-pulse" />
        
        {/* Content skeleton */}
        <View className="flex-1 space-y-2">
          <View className="bg-gray-300 h-4 rounded w-3/4 animate-pulse" />
          <View className="bg-gray-300 h-3 rounded w-1/2 animate-pulse" />
          <View className="bg-gray-300 h-3 rounded w-2/3 animate-pulse" />
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View className="px-6 py-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View className="bg-gray-100 rounded-full w-24 h-24 items-center justify-center mb-6">
        <Ionicons name={icon} size={48} color="#9CA3AF" />
      </View>
      
      <Text className="text-xl font-bold text-gray-900 mb-3 text-center">
        {title}
      </Text>
      
      <Text className="text-gray-600 text-center mb-8 leading-6">
        {message}
      </Text>
      
      {action && (
        <button
          onClick={action.onPress}
          className="bg-blue-500 rounded-xl px-6 py-3"
        >
          <Text className="text-white font-semibold">{action.label}</Text>
        </button>
      )}
    </View>
  );
}
