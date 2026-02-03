import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useFaxStore, FaxJob } from '../state/fax-store';
import { RootStackParamList } from '../navigation/AppNavigator';
import DocumentList from '../components/DocumentList';
import StatusIndicator from '../components/StatusIndicator';
import { shareFaxReceipt } from '../utils/export';
import * as Haptics from 'expo-haptics';

type FaxDetailRouteProp = RouteProp<RootStackParamList, 'FaxDetail'>;

export default function FaxDetailScreen() {
  const route = useRoute<FaxDetailRouteProp>();
  const navigation = useNavigation();
  const { faxHistory } = useFaxStore();
  const [isSharing, setIsSharing] = useState(false);
  
  const fax = faxHistory.find(f => f.id === route.params.jobId);

  const handleShareReceipt = async () => {
    if (!fax) return;
    
    try {
      setIsSharing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const success = await shareFaxReceipt(fax);
      
      if (!success) {
        Alert.alert('Error', 'Failed to share fax receipt');
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert('Error', 'An error occurred while sharing the receipt');
    } finally {
      setIsSharing(false);
    }
  };

  if (!fax) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-xl font-semibold text-gray-900 mb-2 mt-4">
          Fax Not Found
        </Text>
        <Text className="text-gray-600 text-center mb-8">
          The requested fax details could not be found.
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          className="bg-blue-500 rounded-xl px-6 py-3 active:bg-blue-600"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

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

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleResendFax = () => {
    Alert.alert(
      'Resend Fax',
      'Would you like to resend this fax?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resend', 
          onPress: () => {
            Alert.alert('Feature Coming Soon', 'Fax resend functionality will be available soon.');
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 py-6">
        {/* Header with Share Button */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-gray-900">Fax Details</Text>
          <Pressable
            onPress={handleShareReceipt}
            disabled={isSharing}
            className="bg-blue-100 rounded-full px-4 py-2 active:bg-blue-200"
          >
            <View className="flex-row items-center space-x-2">
              <Ionicons name="share-outline" size={18} color="#2563EB" />
              <Text className="text-blue-600 font-medium">Share</Text>
            </View>
          </Pressable>
        </View>

        {/* Status Header */}
        <View className="mb-8">
          <View className={`rounded-2xl p-6 ${
            fax.status === 'sent' ? 'bg-green-50 border border-green-200' :
            fax.status === 'sending' ? 'bg-blue-50 border border-blue-200' :
            fax.status === 'failed' ? 'bg-red-50 border border-red-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <View className="flex-row items-center space-x-3 mb-3">
              <View className={`rounded-full w-12 h-12 items-center justify-center ${getStatusColor(fax.status)}`}>
                <StatusIndicator status={fax.status} size={24} />
              </View>
              <View>
                <Text className="text-xl font-bold text-gray-900 capitalize">
                  {fax.status}
                </Text>
                <Text className="text-gray-600">
                  {formatDateTime(fax.timestamp)}
                </Text>
              </View>
            </View>

            {fax.status === 'sent' && (
              <Text className="text-green-700 text-sm">
                Your fax was successfully delivered
              </Text>
            )}
            {fax.status === 'sending' && (
              <Text className="text-blue-700 text-sm">
                Your fax is currently being transmitted
              </Text>
            )}
            {fax.status === 'failed' && (
              <Text className="text-red-700 text-sm">
                Fax transmission failed. Please try resending.
              </Text>
            )}
            {fax.status === 'pending' && (
              <Text className="text-yellow-700 text-sm">
                Your fax is queued for transmission
              </Text>
            )}
          </View>
        </View>

        {/* Fax Details */}
        <View className="space-y-6">
          {/* Recipient */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 mb-3">Recipient</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <Text className="text-gray-900 text-base">{fax.recipient}</Text>
            </View>
          </View>

          {/* Cover Page */}
          {fax.coverPage && (
            <View>
              <Text className="text-lg font-semibold text-gray-900 mb-3">Cover Page</Text>
              <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <View className="flex-row">
                  <Text className="font-medium text-gray-700 w-16">To:</Text>
                  <Text className="text-gray-900 flex-1">{fax.coverPage.to}</Text>
                </View>
                <View className="flex-row">
                  <Text className="font-medium text-gray-700 w-16">From:</Text>
                  <Text className="text-gray-900 flex-1">{fax.coverPage.from}</Text>
                </View>
                {fax.coverPage.subject && (
                  <View className="flex-row">
                    <Text className="font-medium text-gray-700 w-16">Subject:</Text>
                    <Text className="text-gray-900 flex-1">{fax.coverPage.subject}</Text>
                  </View>
                )}
                {fax.coverPage.message && (
                  <View className="mt-3">
                    <Text className="font-medium text-gray-700 mb-1">Message:</Text>
                    <Text className="text-gray-900">{fax.coverPage.message}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Documents */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Documents ({fax.documents.length})
            </Text>
            <DocumentList documents={fax.documents} readonly />
          </View>

          {/* Summary */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 mb-3">Summary</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Fax ID:</Text>
                <Text className="text-gray-900 font-medium">#{fax.id}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Total Pages:</Text>
                <Text className="text-gray-900 font-medium">{fax.totalPages}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Documents:</Text>
                <Text className="text-gray-900 font-medium">{fax.documents.length}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Cover Page:</Text>
                <Text className="text-gray-900 font-medium">
                  {fax.coverPage ? 'Included' : 'Not included'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Transmission Cost:</Text>
                <Text className="text-gray-900 font-medium">
                  ${(fax.totalPages * 0.10).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Button */}
      {fax.status === 'failed' && (
        <View className="px-6 pb-6 border-t border-gray-200 bg-white">
          <Pressable
            onPress={handleResendFax}
            className="bg-blue-500 rounded-xl p-4 active:bg-blue-600"
          >
            <View className="flex-row items-center justify-center space-x-2">
              <Ionicons name="refresh" size={20} color="white" />
              <Text className="text-white font-semibold text-base">
                Resend Fax
              </Text>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}
