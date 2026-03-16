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
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
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
import { RootStackParamList } from '../navigation/AppNavigator';

type InboxNavProp = NativeStackNavigationProp<RootStackParamList>;

export const InboxScreen: React.FC = () => {
  const { user, userData, refreshUserData } = useAuth();
  const navigation = useNavigation<InboxNavProp>();
  const [faxes, setFaxes] = useState<ReceivedFax[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numberCopied, setNumberCopied] = useState(false);

  const handleCopyFaxNumber = async () => {
    if (!faxNumber) return;
    try {
      await Clipboard.setStringAsync(faxNumber);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNumberCopied(true);
      setTimeout(() => setNumberCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const isPro = userData?.subscriptionTier === 'pro';
  const faxNumber = userData?.faxNumber;

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUserData();
    await loadFaxes();
    setRefreshing(false);
  };

  const handleFaxTap = async (fax: ReceivedFax) => {
    if (!user) return;
    if (!fax.read) {
      try {
        await markFaxAsRead(user.uid, fax.faxId);
      } catch (err) {
        console.error('Error marking fax as read:', err);
      }
    }
    navigation.navigate('FaxViewer', {
      faxId: fax.faxId,
      documentUrl: fax.documentUrl,
      from: fax.from,
      receivedAt: new Date(fax.receivedAt).toISOString(),
      pages: fax.pages,
      isInbox: true,
    });
  };

  const handleShare = async (fax: ReceivedFax) => {
    try {
      await shareReceivedFax(fax);
    } catch {
      Alert.alert('Error', 'Failed to share fax');
    }
  };

  const handleDelete = (fax: ReceivedFax) => {
    Alert.alert('Delete Fax', 'Are you sure you want to delete this received fax?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          try {
            await deleteReceivedFax(user.uid, fax.faxId);
          } catch {
            Alert.alert('Error', 'Failed to delete fax');
          }
        },
      },
    ]);
  };

  const renderFaxItem = ({ item }: { item: ReceivedFax }) => {
    const date = new Date(item.receivedAt);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        className={`bg-white p-4 mb-3 rounded-xl border ${
          item.read ? 'border-gray-200' : 'border-blue-400'
        }`}
        style={!item.read ? { shadowColor: '#2563EB', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } } : undefined}
        onPress={() => handleFaxTap(item)}
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-row items-center flex-1">
            {/* Fax icon */}
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${item.read ? 'bg-gray-100' : 'bg-blue-100'}`}>
              <Ionicons
                name="document-text"
                size={20}
                color={item.read ? '#6B7280' : '#2563EB'}
              />
            </View>
            <View className="flex-1">
              <Text
                className={`text-base ${item.read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}
                numberOfLines={1}
              >
                From: {item.from}
              </Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                {formattedDate} at {formattedTime}
              </Text>
            </View>
          </View>
          {!item.read && (
            <View className="bg-blue-500 rounded-full w-2.5 h-2.5 mt-1.5 ml-2" />
          )}
        </View>

        <Text className="text-sm text-gray-500 mb-3 ml-13">
          {item.pages} page{item.pages !== 1 ? 's' : ''}
        </Text>

        {/* Action buttons — View is primary, Share is secondary, Delete is icon-only */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 bg-blue-500 py-2 rounded-lg flex-row items-center justify-center space-x-1"
            onPress={() => handleFaxTap(item)}
          >
            <Ionicons name="eye" size={16} color="white" />
            <Text className="text-white text-center font-semibold text-sm ml-1">View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-gray-100 py-2 rounded-lg flex-row items-center justify-center space-x-1"
            onPress={() => handleShare(item)}
          >
            <Ionicons name="share-outline" size={16} color="#374151" />
            <Text className="text-gray-700 text-center font-semibold text-sm ml-1">Share</Text>
          </TouchableOpacity>

          {/* Delete — icon only, de-emphasized */}
          <TouchableOpacity
            className="w-10 bg-red-50 rounded-lg items-center justify-center"
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Upgrade prompt for non-Pro users
  if (!isPro) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center p-8">
          <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center mb-6">
            <Ionicons name="mail" size={48} color="#2563EB" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-3">
            Receive Faxes
          </Text>
          <Text className="text-base text-gray-500 text-center mb-8 leading-6">
            Upgrade to Pro to get your own dedicated fax number and receive faxes directly in the app.
          </Text>
          <TouchableOpacity
            className="bg-blue-600 py-4 px-8 rounded-xl"
            onPress={() => navigation.navigate('Subscription' as never)}
          >
            <Text className="text-white font-semibold text-base">Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Provisioning state for Pro users without a fax number yet
  if (isPro && !faxNumber) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center p-8">
          <View className="w-24 h-24 bg-yellow-100 rounded-full items-center justify-center mb-6">
            <Ionicons name="time" size={48} color="#F59E0B" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-3">
            Setting Up Your Number
          </Text>
          <Text className="text-base text-gray-500 text-center mb-6 leading-6">
            We're provisioning your dedicated fax number. This usually takes just a few moments.
          </Text>
          <ActivityIndicator size="large" color="#2563EB" style={{ marginBottom: 24 }} />
          <TouchableOpacity
            className="bg-gray-200 py-3 px-6 rounded-xl"
            onPress={handleRefresh}
          >
            <Text className="text-gray-700 font-semibold">Refresh Status</Text>
          </TouchableOpacity>
          <Text className="text-sm text-gray-400 text-center mt-6 px-4">
            If this takes more than a few minutes, please contact support.
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <LoadingSpinner message="Loading inbox..." />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50 p-4">
        <ErrorMessage error={error} onRetry={loadFaxes} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Fax number banner — tap to copy */}
      {faxNumber && (
        <TouchableOpacity
          onPress={handleCopyFaxNumber}
          activeOpacity={0.85}
          className="bg-blue-600 px-6 py-4 flex-row items-center justify-center"
        >
          <View className="flex-1 items-center">
            <Text className="text-blue-200 text-xs font-medium text-center uppercase tracking-wide mb-1">
              Your Fax Number · Tap to Copy
            </Text>
            <Text className="text-white text-center text-xl font-bold tracking-wide">
              {faxNumber}
            </Text>
          </View>
          <View className="ml-3">
            <Ionicons
              name={numberCopied ? 'checkmark-circle' : 'copy-outline'}
              size={22}
              color={numberCopied ? '#86efac' : 'rgba(255,255,255,0.7)'}
            />
          </View>
        </TouchableOpacity>
      )}

      <FlatList
        data={faxes}
        renderItem={renderFaxItem}
        keyExtractor={(item) => item.faxId}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-4">
              <Ionicons name="mail-open-outline" size={40} color="#9CA3AF" />
            </View>
            <Text className="text-xl font-semibold text-gray-900 mb-2">No Faxes Yet</Text>
            <Text className="text-gray-500 text-center px-8 leading-5">
              Received faxes will appear here.
            </Text>
            {faxNumber && (
              <Text className="text-gray-400 text-center px-8 mt-3 text-sm">
                Share your number: {faxNumber}
              </Text>
            )}
          </View>
        }
      />

    </View>
  );
};
