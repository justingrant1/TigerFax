import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as Application from 'expo-application';

type RootStackParamList = {
  Settings: undefined;
  Profile: undefined;
  Subscription: undefined;
  HelpCenter: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [faxQuality, setFaxQuality] = useState<'standard' | 'high' | 'fine'>('high');
  const [defaultFilter, setDefaultFilter] = useState<'color' | 'bw' | 'document' | 'photo'>('document');

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement account deletion
            Alert.alert('Coming Soon', 'Account deletion will be implemented soon');
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@tigerfax.com?subject=TigerFax Support Request');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://tigerfax.com/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://tigerfax.com/terms');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white px-6 py-6 border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900">Settings</Text>
          </View>
        </View>

        {/* Notifications Section */}
        <View className="bg-white mt-4">
          <SectionHeader title="Notifications" />
          
          <SettingRow
            icon="notifications"
            title="Push Notifications"
            subtitle="Receive notifications when faxes complete"
          >
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor="white"
            />
          </SettingRow>

          <SettingRow
            icon="volume-high"
            title="Sound"
            subtitle="Play sound for notifications"
          >
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor="white"
            />
          </SettingRow>
        </View>

        {/* Appearance */}
        <View className="bg-white mt-4">
          <SectionHeader title="Appearance" />
          
          <SettingButton
            icon="contrast"
            title="Theme"
            subtitle={theme === 'auto' ? 'Auto (System)' : theme === 'dark' ? 'Dark' : 'Light'}
            onPress={() => {
              Alert.alert(
                'Choose Theme',
                'Select your preferred theme',
                [
                  {
                    text: 'Light',
                    onPress: () => setTheme('light'),
                  },
                  {
                    text: 'Dark',
                    onPress: () => setTheme('dark'),
                  },
                  {
                    text: 'Auto (System)',
                    onPress: () => setTheme('auto'),
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                ]
              );
            }}
          />
        </View>

        {/* Fax Settings */}
        <View className="bg-white mt-4">
          <SectionHeader title="Fax Settings" />
          
          <SettingButton
            icon="document-text"
            title="Fax Quality"
            subtitle={faxQuality === 'standard' ? 'Standard' : faxQuality === 'high' ? 'High (recommended)' : 'Fine (best quality)'}
            onPress={() => {
              Alert.alert(
                'Fax Quality',
                'Select the quality for outgoing faxes',
                [
                  {
                    text: 'Standard',
                    onPress: () => setFaxQuality('standard'),
                  },
                  {
                    text: 'High (recommended)',
                    onPress: () => setFaxQuality('high'),
                  },
                  {
                    text: 'Fine (best quality)',
                    onPress: () => setFaxQuality('fine'),
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                ]
              );
            }}
          />

          <SettingButton
            icon="color-palette"
            title="Default Filter"
            subtitle={
              defaultFilter === 'color' ? 'Color' :
              defaultFilter === 'bw' ? 'Black & White' :
              defaultFilter === 'document' ? 'Document (Black & White)' :
              'Photo'
            }
            onPress={() => {
              Alert.alert(
                'Default Filter',
                'Select the default filter for scanned documents',
                [
                  {
                    text: 'Color',
                    onPress: () => setDefaultFilter('color'),
                  },
                  {
                    text: 'Black & White',
                    onPress: () => setDefaultFilter('bw'),
                  },
                  {
                    text: 'Document (recommended)',
                    onPress: () => setDefaultFilter('document'),
                  },
                  {
                    text: 'Photo',
                    onPress: () => setDefaultFilter('photo'),
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                ]
              );
            }}
          />
        </View>

        {/* Account Section */}
        <View className="bg-white mt-4">
          <SectionHeader title="Account" />
          
          <SettingButton
            icon="person"
            title="Profile"
            onPress={() => navigation.navigate('Profile')}
          />

          <SettingButton
            icon="card"
            title="Subscription"
            subtitle="Manage your plan"
            onPress={() => navigation.navigate('Subscription')}
          />

          <SettingButton
            icon="key"
            title="Change Password"
            onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon')}
            disabled={!user?.email}
          />
        </View>

        {/* Support & Legal */}
        <View className="bg-white mt-4">
          <SectionHeader title="Support & Legal" />
          
          <SettingButton
            icon="help-circle"
            title="Help Center"
            onPress={() => navigation.navigate('HelpCenter')}
          />

          <SettingButton
            icon="mail"
            title="Contact Support"
            onPress={handleContactSupport}
          />

          <SettingButton
            icon="shield-checkmark"
            title="Privacy Policy"
            onPress={handlePrivacyPolicy}
          />

          <SettingButton
            icon="document"
            title="Terms of Service"
            onPress={handleTermsOfService}
          />
        </View>

        {/* App Info */}
        <View className="bg-white mt-4">
          <SectionHeader title="About" />
          
          <SettingRow
            icon="information-circle"
            title="Version"
            subtitle={Application.nativeApplicationVersion || '1.0.0'}
          />

          <SettingRow
            icon="code"
            title="Build"
            subtitle={Application.nativeBuildVersion || '1'}
          />
        </View>

        {/* Danger Zone */}
        <View className="bg-white mt-4 mb-4">
          <SectionHeader title="Danger Zone" />
          
          <SettingButton
            icon="trash"
            title="Delete Account"
            subtitle="Permanently delete your account and data"
            onPress={handleDeleteAccount}
            danger
          />
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="px-6 py-3 border-b border-gray-100">
      <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        {title}
      </Text>
    </View>
  );
}

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

function SettingRow({ icon, title, subtitle, children }: SettingRowProps) {
  return (
    <View className="flex-row items-center px-6 py-4 border-b border-gray-100">
      <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color="#6b7280" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium text-gray-900">{title}</Text>
        {subtitle && (
          <Text className="text-sm text-gray-600 mt-0.5">{subtitle}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

interface SettingButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function SettingButton({ icon, title, subtitle, onPress, danger, disabled }: SettingButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center px-6 py-4 border-b border-gray-100"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View className={`w-10 h-10 ${danger ? 'bg-red-100' : 'bg-gray-100'} rounded-full items-center justify-center mr-3`}>
        <Ionicons name={icon} size={20} color={danger ? '#dc2626' : '#6b7280'} />
      </View>
      <View className="flex-1">
        <Text className={`text-base font-medium ${danger ? 'text-red-600' : 'text-gray-900'}`}>
          {title}
        </Text>
        {subtitle && (
          <Text className="text-sm text-gray-600 mt-0.5">{subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}
