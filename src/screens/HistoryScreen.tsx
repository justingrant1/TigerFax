import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFaxStore, FaxJob } from '../state/fax-store';
import { RootStackParamList } from '../navigation/AppNavigator';
import StatusIndicator from '../components/StatusIndicator';
import { shareFaxHistory } from '../utils/export';
import { getStatusStyle } from '../utils/status-styles';
import * as Haptics from 'expo-haptics';
import { Container } from '../components/Container';
import { useAuth } from '../contexts/AuthContext';
import { TouchableOpacity } from 'react-native';

type HistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const { faxHistory, clearHistory } = useFaxStore();
  const { userData, user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const isPro = userData?.subscriptionTier === 'pro';
  const profileInitial = (userData?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all fax history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            clearHistory();
          },
        },
      ]
    );
  };

  const handleExportHistory = async () => {
    try {
      setIsExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const success = await shareFaxHistory(faxHistory);
      if (!success) {
        Alert.alert('Error', 'Failed to export fax history');
      }
    } catch (error) {
      console.error('Error exporting history:', error);
      Alert.alert('Error', 'An error occurred while exporting');
    } finally {
      setIsExporting(false);
    }
  };

  const showOverflowMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Export History', 'View Usage', 'Clear History'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleExportHistory();
          else if (buttonIndex === 2) navigation.navigate('Usage' as any);
          else if (buttonIndex === 3) handleClearHistory();
        }
      );
    } else {
      // Android fallback — simple Alert menu
      Alert.alert('Options', undefined, [
        { text: 'Export History', onPress: handleExportHistory },
        { text: 'View Usage', onPress: () => navigation.navigate('Usage' as any) },
        { text: 'Clear History', style: 'destructive', onPress: handleClearHistory },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="bg-white border-b border-gray-200 pb-4"
      >
        <View className="px-6 pt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-3xl font-bold text-gray-900">Fax History</Text>
            <View className="flex-row items-center space-x-2">
              {faxHistory.length > 0 && (
                <Pressable
                  onPress={showOverflowMenu}
                  disabled={isExporting}
                  className="bg-gray-100 rounded-full w-10 h-10 items-center justify-center active:bg-gray-200"
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="#374151" />
                </Pressable>
              )}
              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
                className={`w-10 h-10 rounded-full items-center justify-center ${isPro ? 'bg-blue-600' : 'bg-gray-400'}`}
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-base">{profileInitial}</Text>
                {isPro && (
                  <View className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-yellow-400 rounded-full items-center justify-center border border-white">
                    <Text style={{ fontSize: 8, lineHeight: 10 }}>⭐</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Text className="text-gray-600">Track your sent and pending faxes</Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        <Container>
          {faxHistory.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="document-text-outline" size={40} color="#9CA3AF" />
              </View>
              <Text className="text-xl font-semibold text-gray-900 mb-2">No Faxes Yet</Text>
              <Text className="text-gray-500 text-center px-8">
                Your sent faxes will appear here once you send your first one.
              </Text>
            </View>
          ) : (
            <View className="py-4">
              {faxHistory.map((fax) => {
                const style = getStatusStyle(fax.status);
                return (
                  <Pressable
                    key={fax.id}
                    onPress={() => navigation.navigate('FaxDetail', { jobId: fax.id })}
                    className="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm active:bg-gray-50"
                  >
                    <View className="flex-row items-start space-x-3">
                      {/* Status Icon */}
                      <View
                        className={`rounded-full w-10 h-10 items-center justify-center ${style.bgClass}`}
                      >
                        <StatusIndicator status={fax.status} size={20} />
                      </View>

                      {/* Fax Info */}
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text
                            className="text-gray-900 font-semibold text-base flex-1 mr-2"
                            numberOfLines={1}
                          >
                            {fax.recipient}
                          </Text>
                          <Text className="text-gray-500 text-sm">
                            {formatDate(fax.timestamp)}
                          </Text>
                        </View>

                        <Text className="text-gray-500 text-sm mb-2">
                          {fax.totalPages} page{fax.totalPages !== 1 ? 's' : ''} •{' '}
                          {fax.documents.length} doc{fax.documents.length !== 1 ? 's' : ''}
                          {fax.coverPage ? ' • Cover page' : ''}
                        </Text>

                        <View className="flex-row items-center justify-between">
                          <View className={`px-3 py-1 rounded-full ${style.badgeClass}`}>
                            <Text className={`text-xs font-semibold ${style.textClass}`}>
                              {style.label}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Container>
      </ScrollView>
    </View>
  );
}
