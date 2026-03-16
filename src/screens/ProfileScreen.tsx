import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingState';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, userData, signOut, loading } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleCopyFaxNumber = async () => {
    if (!userData?.faxNumber) return;
    try {
      await Clipboard.setStringAsync(userData.faxNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Error', 'Could not copy to clipboard');
    }
  };

  if (loading || !userData) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  const getSubscriptionBadge = () => {
    switch (userData.subscriptionTier) {
      case 'pro':
        return { text: 'Pro', color: 'bg-blue-600', icon: 'star' as const };
      case 'credits':
        return { text: 'Credits', color: 'bg-purple-600', icon: 'wallet' as const };
      default:
        return { text: 'Free', color: 'bg-gray-500', icon: 'gift' as const };
    }
  };

  const badge = getSubscriptionBadge();
  // For free users show lifetime free pages left; for credits show credit balance; Pro = unlimited
  const remainingDisplay =
    userData.subscriptionTier === 'pro'
      ? '∞'
      : userData.subscriptionTier === 'credits'
      ? userData.creditsRemaining ?? 0
      : userData.freePagesRemaining ?? 0;

  const remainingLabel =
    userData.subscriptionTier === 'pro'
      ? 'Unlimited'
      : userData.subscriptionTier === 'credits'
      ? 'Page Credits'
      : 'Free Pages Left';

  const initials =
    userData.displayName?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    'U';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white px-6 py-8 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-2xl font-bold text-gray-900">Profile</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              className="w-10 h-10 items-center justify-center bg-gray-100 rounded-full"
            >
              <Ionicons name="settings-outline" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Avatar + User Info */}
          <View className="items-center">
            <View className="w-24 h-24 bg-blue-600 rounded-full items-center justify-center mb-4 shadow-sm">
              <Text className="text-4xl font-bold text-white">{initials}</Text>
            </View>
            <Text className="text-xl font-semibold text-gray-900 mb-1">
              {userData.displayName || 'User'}
            </Text>
            <Text className="text-base text-gray-500 mb-4">{user?.email}</Text>

            {/* Subscription Badge */}
            <View className={`${badge.color} px-4 py-2 rounded-full flex-row items-center`}>
              <Ionicons name={badge.icon} size={15} color="white" />
              <Text className="text-white font-semibold ml-2 text-sm">
                {badge.text} Plan
              </Text>
            </View>
          </View>
        </View>

        {/* Usage Stats */}
        <View className="bg-white px-6 py-6 mt-4 border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Usage Overview
          </Text>

          <View className="flex-row space-x-4">
            {/* Pages / Credits Remaining */}
            <View className="flex-1 bg-blue-50 rounded-xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="send" size={22} color="#2563eb" />
                <Text className="text-2xl font-bold text-blue-600">{remainingDisplay}</Text>
              </View>
              <Text className="text-sm text-gray-600">{remainingLabel}</Text>
            </View>

            {/* Faxes Sent — read from Firestore field if available */}
            <View className="flex-1 bg-green-50 rounded-xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                <Text className="text-2xl font-bold text-green-600">
                  {userData.faxesSent ?? 0}
                </Text>
              </View>
              <Text className="text-sm text-gray-600">Sent</Text>
            </View>
          </View>

          {/* Upgrade CTA for Free Users */}
          {userData.subscriptionTier === 'free' && (
            <TouchableOpacity
              className="bg-blue-600 rounded-xl py-3 mt-4 items-center"
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text className="text-white font-semibold">Upgrade to Pro</Text>
            </TouchableOpacity>
          )}

          {/* Manage Subscription for Pro Users */}
          {userData.subscriptionTier === 'pro' && (
            <TouchableOpacity
              className="bg-gray-100 rounded-xl py-3 mt-4 items-center"
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text className="text-gray-700 font-semibold">Manage Subscription</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Fax Number for Pro Users */}
        {userData.subscriptionTier === 'pro' && (
          <View className="bg-white px-6 py-6 mt-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Your Fax Number
            </Text>

            {userData.faxNumber ? (
              <View className="bg-blue-50 rounded-xl p-4 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="call" size={24} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-500 mb-1">Dedicated Number</Text>
                    <Text className="text-xl font-bold text-blue-600">
                      {userData.faxNumber}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  className={`rounded-lg px-4 py-2 ${copied ? 'bg-green-500' : 'bg-blue-600'}`}
                  onPress={handleCopyFaxNumber}
                >
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="bg-yellow-50 rounded-xl p-4 flex-row items-center">
                <Ionicons name="time-outline" size={24} color="#f59e0b" />
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-semibold text-yellow-800 mb-1">
                    Number Being Provisioned
                  </Text>
                  <Text className="text-xs text-yellow-700">
                    Your dedicated fax number is being set up. This usually takes just a few
                    moments.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Account Info */}
        <View className="bg-white px-6 py-6 mt-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Account Information
          </Text>

          <InfoRow
            icon="calendar-outline"
            label="Member Since"
            value={new Date(userData.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          />
          <InfoRow icon="mail-outline" label="Email" value={user?.email || 'Not set'} />
          <InfoRow
            icon="person-outline"
            label="Display Name"
            value={userData.displayName || 'Not set'}
          />
        </View>

        {/* Sign Out */}
        <View className="px-6 py-6">
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-red-50 border border-red-200 rounded-xl py-4 flex-row items-center justify-center"
          >
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text className="text-red-600 font-semibold ml-2">Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View className="flex-row items-center py-3 border-b border-gray-100">
      <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color="#6b7280" />
      </View>
      <View className="flex-1">
        <Text className="text-sm text-gray-500">{label}</Text>
        <Text className="text-base text-gray-900 font-medium">{value}</Text>
      </View>
    </View>
  );
}
