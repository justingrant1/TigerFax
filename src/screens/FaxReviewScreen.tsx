import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useFaxStore } from '../state/fax-store';
import DocumentList from '../components/DocumentList';

export default function FaxReviewScreen() {
  const navigation = useNavigation();
  const [isSending, setIsSending] = useState(false);
  const { currentFax, sendFax, clearCurrentFax } = useFaxStore();

  const totalPages = currentFax.documents.length + (currentFax.coverPage ? 1 : 0);

  const handleSendFax = async () => {
    try {
      setIsSending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      const jobId = await sendFax();
      clearCurrentFax();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Fax Sent!',
        'Your fax has been queued for delivery. You can check the status in the History tab.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to send fax. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 py-6">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Review & Send</Text>
          <Text className="text-gray-600">
            Please review your fax before sending
          </Text>
        </View>

        {/* Recipient Info */}
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <View className="flex-row items-center space-x-3 mb-2">
            <Ionicons name="call" size={20} color="#2563EB" />
            <Text className="text-lg font-semibold text-gray-900">Recipient</Text>
          </View>
          <Text className="text-gray-900 text-base ml-8">{currentFax.recipient}</Text>
        </View>

        {/* Cover Page Info */}
        {currentFax.coverPage && (
          <View className="mb-6">
            <View className="flex-row items-center space-x-3 mb-3">
              <Ionicons name="document-text" size={20} color="#059669" />
              <Text className="text-lg font-semibold text-gray-900">Cover Page</Text>
            </View>
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 ml-8">
              <Text className="text-gray-900 font-medium">
                To: {currentFax.coverPage.to}
              </Text>
              <Text className="text-gray-900 font-medium">
                From: {currentFax.coverPage.from}
              </Text>
              {currentFax.coverPage.subject && (
                <Text className="text-gray-900 font-medium">
                  Subject: {currentFax.coverPage.subject}
                </Text>
              )}
              {currentFax.coverPage.message && (
                <Text className="text-gray-600 mt-2" numberOfLines={2}>
                  {currentFax.coverPage.message}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Documents */}
        <View className="mb-6">
          <View className="flex-row items-center space-x-3 mb-3">
            <Ionicons name="documents" size={20} color="#DC2626" />
            <Text className="text-lg font-semibold text-gray-900">
              Documents ({currentFax.documents.length})
            </Text>
          </View>
          <View className="ml-8">
            <DocumentList documents={currentFax.documents} readonly />
          </View>
        </View>

        {/* Summary */}
        <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Fax Summary</Text>
          
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Total Pages:</Text>
              <Text className="text-gray-900 font-medium">{totalPages}</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Cover Page:</Text>
              <Text className="text-gray-900 font-medium">
                {currentFax.coverPage ? 'Included' : 'None'}
              </Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Documents:</Text>
              <Text className="text-gray-900 font-medium">{currentFax.documents.length}</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Estimated Cost:</Text>
              <Text className="text-gray-900 font-medium">
                ${(totalPages * 0.50).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Send Button */}
      <View className="px-6 pb-6 border-t border-gray-200 bg-white">
        <Pressable
          onPress={handleSendFax}
          disabled={isSending}
          className={`rounded-xl p-4 ${
            isSending 
              ? 'bg-gray-300' 
              : 'bg-blue-500 active:bg-blue-600'
          }`}
        >
          <View className="flex-row items-center justify-center space-x-3">
            {isSending && (
              <View className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <Text className={`font-semibold text-base ${
              isSending ? 'text-gray-500' : 'text-white'
            }`}>
              {isSending ? 'Sending Fax...' : 'Send Fax Now'}
            </Text>
          </View>
        </Pressable>
        
        <Text className="text-gray-500 text-xs text-center mt-3">
          By sending this fax, you agree to our terms of service and will be charged for transmission.
        </Text>
      </View>
    </View>
  );
}