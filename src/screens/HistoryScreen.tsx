import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFaxStore, FaxJob } from '../state/fax-store';
import { RootStackParamList } from '../navigation/AppNavigator';
import StatusIndicator from '../components/StatusIndicator';
import { shareFaxHistory } from '../utils/export';
import * as Haptics from 'expo-haptics';
import { Container } from '../components/Container';

type HistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const { faxHistory, clearHistory } = useFaxStore();
  const [isExporting, setIsExporting] = useState(false);

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

  const getStatusColor = (status: FaxJob['status']) => {
    switch (status) {
      case 'sent':
        return 'text-green-600 bg-green-100';
      case 'sending':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status: FaxJob['status']) => {
    switch (status) {
      case 'sent':
        return 'checkmark-circle';
      case 'sending':
        return 'time';
      case 'failed':
        return 'alert-circle';
      default:
        return 'hourglass';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View style={{ paddingTop: insets.top }} className="bg-white border-b border-gray-200 pb-4">
        <View className="px-6 pt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-3xl font-bold text-gray-900">Fax History</Text>
            <View className="flex-row items-center space-x-2">
              <Pressable
                onPress={() => navigation.navigate('Usage' as any)}
                className="bg-purple-100 rounded-full px-3 py-1"
              >
                <Text className="text-purple-600 text-sm font-medium">Usage</Text>
              </Pressable>
              {faxHistory.length > 0 && (
                <>
                  <Pressable
                    onPress={handleExportHistory}
                    disabled={isExporting}
                    className="bg-green-100 rounded-full px-3 py-1"
                  >
                    <Text className="text-green-600 text-sm font-medium">Export</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleClearHistory}
                    className="bg-red-100 rounded-full px-3 py-1"
                  >
                    <Text className="text-red-600 text-sm font-medium">Clear</Text>
                  </Pressable>
                </>
              )}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Profile' as any);
                }}
                className="bg-blue-100 rounded-full w-8 h-8 items-center justify-center active:bg-blue-200"
              >
                <Ionicons name="person" size={18} color="#2563EB" />
              </Pressable>
            </View>
          </View>
          <Text className="text-gray-600">Track your sent and pending faxes</Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        <Container>
        {faxHistory.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text className="text-xl font-semibold text-gray-900 mb-2 mt-4">
              No Faxes Yet
            </Text>
            <Text className="text-gray-600 text-center">
              Your sent faxes will appear here once you send your first one.
            </Text>
          </View>
        ) : (
          <View className="py-4">
            {faxHistory.map((fax) => (
              <Pressable
                key={fax.id}
                onPress={() => navigation.navigate('FaxDetail', { jobId: fax.id })}
                className="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm active:bg-gray-50"
              >
                <View className="flex-row items-start space-x-3">
                  {/* Status Icon */}
                  <View className={`rounded-full w-10 h-10 items-center justify-center ${getStatusColor(fax.status)}`}>
                    <StatusIndicator status={fax.status} size={20} />
                  </View>

                  {/* Fax Info */}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-gray-900 font-semibold text-base" numberOfLines={1}>
                        {fax.recipient}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {formatDate(fax.timestamp)}
                      </Text>
                    </View>

                    <Text className="text-gray-600 text-sm mb-2">
                      {fax.totalPages} page{fax.totalPages !== 1 ? 's' : ''} • {fax.documents.length} document{fax.documents.length !== 1 ? 's' : ''}
                      {fax.coverPage && ' • Cover page'}
                    </Text>

                    <View className="flex-row items-center justify-between">
                      <View className={`px-3 py-1 rounded-full ${getStatusColor(fax.status)}`}>
                        <Text className={`text-xs font-medium capitalize ${
                          getStatusColor(fax.status).includes('green') ? 'text-green-700' :
                          getStatusColor(fax.status).includes('blue') ? 'text-blue-700' :
                          getStatusColor(fax.status).includes('red') ? 'text-red-700' : 'text-yellow-700'
                        }`}>
                          {fax.status}
                        </Text>
                      </View>

                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
        </Container>
      </ScrollView>
    </View>
  );
}