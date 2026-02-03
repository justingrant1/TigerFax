/**
 * InboxScreen - View received faxes (Pro users only)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  ReceivedFax,
  getReceivedFaxes,
  subscribeToInbox,
  markFaxAsRead,
  deleteReceivedFax,
  shareReceivedFax,
} from '../services/inbox';
import { LoadingSpinner } from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import DocumentPreviewModal from '../components/DocumentPreviewModal';

export const InboxScreen: React.FC = () => {
  const { user, userData } = useAuth();
  const navigation = useNavigation();
  const [faxes, setFaxes] = useState<ReceivedFax[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFax, setPreviewFax] = useState<ReceivedFax | null>(null);

  // Check if user has Pro subscription
  const isPro = userData?.subscriptionTier === 'pro';
  const faxNumber = userData?.faxNumber;

  // Load faxes
  const loadFaxes = useCallback(async () => {
    if (!user || !isPro) return;

    try {
      setError(null);
      const receivedFaxes = await getReceivedFaxes(user.uid);
      setFaxes(receivedFaxes);
    } catch (err) {
      console.error('Error loading inbox:', err);
      setError('Failed to load inbox');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isPro]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user || !isPro) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToInbox(user.uid, (receivedFaxes) => {
      setFaxes(receivedFaxes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isPro]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadFaxes();
  };

  // Handle fax tap
  const handleFaxTap = async (fax: ReceivedFax) => {
    if (!user) return;

    // Mark as read
    if (!fax.read) {
      try {
        await markFaxAsRead(user.uid, fax.faxId);
      } catch (err) {
        console.error('Error marking fax as read:', err);
      }
    }

    // Show preview
    setPreviewFax(fax);
  };

  // Handle share
  const handleShare = async (fax: ReceivedFax) => {
    try {
      await shareReceivedFax(fax);
    } catch (err) {
      Alert.alert('Error', 'Failed to share fax');
    }
  };

  // Handle delete
  const handleDelete = (fax: ReceivedFax) => {
    Alert.alert(
      'Delete Fax',
      'Are you sure you want to delete this received fax?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await deleteReceivedFax(user.uid, fax.faxId);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete fax');
            }
          },
        },
      ]
    );
  };

  // Render fax item
  const renderFaxItem = ({ item }: { item: ReceivedFax }) => {
    const date = new Date(item.receivedAt);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        className={`bg-white dark:bg-gray-800 p-4 mb-2 rounded-lg border ${
          item.read
            ? 'border-gray-200 dark:border-gray-700'
            : 'border-blue-500 dark:border-blue-400'
        }`}
        onPress={() => handleFaxTap(item)}
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text
              className={`text-base ${
                item.read
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-900 dark:text-white font-bold'
              }`}
            >
              From: {item.from}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formattedDate} at {formattedTime}
            </Text>
          </View>
          {!item.read && (
            <View className="bg-blue-500 rounded-full w-2 h-2 mt-2" />
          )}
        </View>

        <Text className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {item.pages} page{item.pages !== 1 ? 's' : ''}
        </Text>

        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 bg-blue-500 py-2 rounded-lg"
            onPress={() => handleFaxTap(item)}
          >
            <Text className="text-white text-center font-semibold">
              View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-gray-200 dark:bg-gray-700 py-2 rounded-lg"
            onPress={() => handleShare(item)}
          >
            <Text className="text-gray-900 dark:text-white text-center font-semibold">
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-red-500 py-2 rounded-lg"
            onPress={() => handleDelete(item)}
          >
            <Text className="text-white text-center font-semibold">
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Show upgrade prompt for non-Pro users
  if (!isPro) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-6xl mb-4">📠</Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Receive Faxes
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-300 text-center mb-6">
            Upgrade to Pro to get your own dedicated fax number and receive faxes
          </Text>
          <TouchableOpacity
            className="bg-blue-500 py-3 px-6 rounded-lg"
            onPress={() => navigation.navigate('Subscription' as never)}
          >
            <Text className="text-white font-semibold text-lg">
              Upgrade to Pro
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner message="Loading inbox..." />
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-4">
        <ErrorMessage
          error={error}
          onRetry={loadFaxes}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header with fax number */}
      {faxNumber && (
        <View className="bg-blue-500 p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1" />
            <View className="flex-1 items-center">
              <Text className="text-white text-center text-sm">
                Your Fax Number
              </Text>
            </View>
            <View className="flex-1 items-end">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Profile' as never);
                }}
                className="bg-white/20 rounded-full w-8 h-8 items-center justify-center active:bg-white/30"
              >
                <Ionicons name="person" size={18} color="white" />
              </Pressable>
            </View>
          </View>
          <Text className="text-white text-center text-xl font-bold">
            {faxNumber}
          </Text>
        </View>
      )}

      {/* Fax list */}
      <FlatList
        data={faxes}
        renderItem={renderFaxItem}
        keyExtractor={(item) => item.faxId}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Text className="text-6xl mb-4">📭</Text>
            <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Faxes Yet
            </Text>
            <Text className="text-gray-600 dark:text-gray-300 text-center px-6">
              Received faxes will appear here
            </Text>
            {faxNumber && (
              <Text className="text-gray-500 dark:text-gray-400 text-center px-6 mt-4">
                Share your fax number: {faxNumber}
              </Text>
            )}
          </View>
        }
      />

      {/* Preview modal */}
      {previewFax && (
        <DocumentPreviewModal
          visible={true}
          document={{
            uri: previewFax.documentUrl,
            name: `Fax from ${previewFax.from}`,
            type: 'document',
          }}
          onClose={() => setPreviewFax(null)}
        />
      )}
    </View>
  );
};
