import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { deleteDoc, doc } from 'firebase/firestore';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Application from 'expo-application';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SETTINGS_KEY = '@tigerfax:settings';

interface AppSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  faxQuality: 'standard' | 'high' | 'fine';
  defaultFilter: 'color' | 'bw' | 'document' | 'photo';
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  soundEnabled: true,
  faxQuality: 'high',
  defaultFilter: 'document',
};

export default function SettingsScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        if (stored) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Persist settings whenever they change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch((e) =>
      console.error('Failed to save settings:', e)
    );
  }, [settings, loaded]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // For email/password users, re-authenticate first
            if (user?.providerData?.[0]?.providerId === 'password') {
              Alert.prompt(
                'Confirm Password',
                'Please enter your password to confirm account deletion.',
                async (password) => {
                  if (!password) return;
                  try {
                    const credential = EmailAuthProvider.credential(user.email!, password);
                    await reauthenticateWithCredential(user, credential);
                    await performAccountDeletion();
                  } catch (err: any) {
                    Alert.alert('Error', err.message || 'Incorrect password. Please try again.');
                  }
                },
                'secure-text'
              );
            } else {
              // Apple/OAuth users — no re-auth needed for recent sign-in
              Alert.alert(
                'Final Confirmation',
                'Are you absolutely sure? All your fax history, credits, and subscription data will be deleted.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete Forever', style: 'destructive', onPress: performAccountDeletion },
                ]
              );
            }
          },
        },
      ]
    );
  };

  const performAccountDeletion = async () => {
    if (!user || !auth || !db) return;
    try {
      // Delete Firestore user document
      await deleteDoc(doc(db, 'users', user.uid));
      // Delete Firebase Auth account
      await deleteUser(user);
      // signOut is implicit after deleteUser — navigation handled by AuthContext
    } catch (err: any) {
      Alert.alert(
        'Deletion Failed',
        err.message || 'Could not delete account. If this persists, contact support@tigerfax.com'
      );
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@tigerfax.com?subject=TigerFax Support Request');
  };

  const faxQualityLabel = {
    standard: 'Standard',
    high: 'High (recommended)',
    fine: 'Fine (best quality)',
  }[settings.faxQuality];

  const defaultFilterLabel = {
    color: 'Color',
    bw: 'Black & White',
    document: 'Document (recommended)',
    photo: 'Photo',
  }[settings.defaultFilter];

  const themeLabel = {
    auto: 'Auto (System)',
    dark: 'Dark',
    light: 'Light',
  }[theme];

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

        {/* Notifications */}
        <View className="bg-white mt-4">
          <SectionHeader title="Notifications" />

          <SettingRow
            icon="notifications"
            title="Push Notifications"
            subtitle="Receive notifications when faxes complete"
          >
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(v) => updateSetting('notificationsEnabled', v)}
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
              value={settings.soundEnabled}
              onValueChange={(v) => updateSetting('soundEnabled', v)}
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
            subtitle={themeLabel}
            onPress={() => {
              Alert.alert('Choose Theme', 'Select your preferred theme', [
                { text: 'Light', onPress: () => setTheme('light') },
                { text: 'Dark', onPress: () => setTheme('dark') },
                { text: 'Auto (System)', onPress: () => setTheme('auto') },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          />
        </View>

        {/* Fax Settings */}
        <View className="bg-white mt-4">
          <SectionHeader title="Fax Settings" />

          <SettingButton
            icon="document-text"
            title="Fax Quality"
            subtitle={faxQualityLabel}
            onPress={() => {
              Alert.alert('Fax Quality', 'Select the quality for outgoing faxes', [
                { text: 'Standard', onPress: () => updateSetting('faxQuality', 'standard') },
                {
                  text: 'High (recommended)',
                  onPress: () => updateSetting('faxQuality', 'high'),
                },
                {
                  text: 'Fine (best quality)',
                  onPress: () => updateSetting('faxQuality', 'fine'),
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          />

          <SettingButton
            icon="color-palette"
            title="Default Scan Filter"
            subtitle={defaultFilterLabel}
            onPress={() => {
              Alert.alert(
                'Default Filter',
                'Select the default filter for scanned documents',
                [
                  { text: 'Color', onPress: () => updateSetting('defaultFilter', 'color') },
                  {
                    text: 'Black & White',
                    onPress: () => updateSetting('defaultFilter', 'bw'),
                  },
                  {
                    text: 'Document (recommended)',
                    onPress: () => updateSetting('defaultFilter', 'document'),
                  },
                  { text: 'Photo', onPress: () => updateSetting('defaultFilter', 'photo') },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          />
        </View>

        {/* Account */}
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
            subtitle={user?.email ? 'Send reset link to your email' : undefined}
            onPress={() => {
              if (!user?.email) return;
              Alert.alert(
                'Change Password',
                `We'll send a password reset link to:\n${user.email}`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Send Reset Link',
                    onPress: async () => {
                      try {
                        const { sendPasswordResetEmail } = await import('firebase/auth');
                        await sendPasswordResetEmail(auth!, user.email!);
                        Alert.alert(
                          'Email Sent ✅',
                          'Check your inbox for a password reset link.'
                        );
                      } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to send reset email.');
                      }
                    },
                  },
                ]
              );
            }}
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
            onPress={() => Linking.openURL('https://tigerfax.com/privacy')}
          />

          <SettingButton
            icon="document"
            title="Terms of Service"
            onPress={() => Linking.openURL('https://tigerfax.com/terms')}
          />
        </View>

        {/* About */}
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
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
        {subtitle && <Text className="text-sm text-gray-500 mt-0.5">{subtitle}</Text>}
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
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View
        className={`w-10 h-10 ${danger ? 'bg-red-100' : 'bg-gray-100'} rounded-full items-center justify-center mr-3`}
      >
        <Ionicons name={icon} size={20} color={danger ? '#dc2626' : '#6b7280'} />
      </View>
      <View className="flex-1">
        <Text className={`text-base font-medium ${danger ? 'text-red-600' : 'text-gray-900'}`}>
          {title}
        </Text>
        {subtitle && <Text className="text-sm text-gray-500 mt-0.5">{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}
