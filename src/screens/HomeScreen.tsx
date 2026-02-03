import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useFaxStore } from '../state/fax-store';
import { RootStackParamList } from '../navigation/AppNavigator';
import DocumentList from '../components/DocumentList';
import ContactPickerModal from '../components/ContactPickerModal';
import BatchFaxModal from '../components/BatchFaxModal';
import { validatePhoneNumber, formatPhoneNumber } from '../utils/phone-validation';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { currentFax, setRecipient, sendFax, clearCurrentFax } = useFaxStore();
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showBatchFax, setShowBatchFax] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');

  const canProceed = currentFax.recipient.trim() && currentFax.documents.length > 0 && !phoneError;

  const handlePhoneChange = (text: string) => {
    setRecipient(text);
    
    // Validate phone number if not empty
    if (text.trim()) {
      const validation = validatePhoneNumber(text);
      setPhoneError(validation.valid ? '' : (validation.error || ''));
    } else {
      setPhoneError('');
    }
  };

  const handleBatchFax = async (recipients: any[]) => {
    try {
      let successCount = 0;
      let failCount = 0;

      // Send individual fax for each recipient
      for (const recipient of recipients) {
        try {
          // Temporarily set recipient for this batch item
          const originalRecipient = currentFax.recipient;
          setRecipient(recipient.number);
          
          await sendFax();
          successCount++;
          
          // Restore original recipient
          setRecipient(originalRecipient);
        } catch (error) {
          console.error(`Failed to send fax to ${recipient.number}:`, error);
          failCount++;
        }
      }
      
      clearCurrentFax();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Batch Fax Complete',
        `Successfully sent: ${successCount}\nFailed: ${failCount}\n\nCheck the History tab for details.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to send batch fax. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View style={{ paddingTop: insets.top }} className="bg-white border-b border-gray-200 pb-4">
        <View className="px-6 pt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-3xl font-bold text-gray-900">Send Fax</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Profile');
              }}
              className="bg-blue-100 rounded-full w-10 h-10 items-center justify-center active:bg-blue-200"
            >
              <Ionicons name="person" size={20} color="#2563EB" />
            </Pressable>
          </View>
          <Text className="text-gray-600">Scan, upload and send documents securely</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        {/* Recipient Input */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900">Recipient Fax Number</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowContactPicker(true);
              }}
              className="bg-blue-100 rounded-full px-3 py-1 flex-row items-center space-x-2"
            >
              <Ionicons name="people" size={16} color="#2563EB" />
              <Text className="text-blue-600 text-sm font-medium">Contacts</Text>
            </Pressable>
          </View>
          
          <View className="relative">
            <TextInput
              className={`bg-gray-50 border rounded-xl px-4 py-3 pr-12 text-base ${
                phoneError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter fax number (e.g., +1-555-123-4567)"
              value={currentFax.recipient}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              returnKeyType="done"
              placeholderTextColor="#9CA3AF"
            />
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowContactPicker(true);
              }}
              className="absolute right-3 top-3 bottom-3 w-8 items-center justify-center"
            >
              <Ionicons name="person-add" size={20} color="#6B7280" />
            </Pressable>
          </View>
          
          {phoneError ? (
            <Text className="text-red-500 text-sm mt-2 ml-1">{phoneError}</Text>
          ) : null}
        </View>

        {/* Document Actions */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Add Documents</Text>
          
          <View className="space-y-3">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('DocumentScan');
              }}
              className="bg-blue-500 rounded-xl p-4 flex-row items-center justify-center space-x-3 active:bg-blue-600"
            >
              <Ionicons name="camera" size={24} color="white" />
              <Text className="text-white font-semibold text-base">Scan Document</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('FileUpload');
              }}
              className="bg-gray-100 border border-gray-300 rounded-xl p-4 flex-row items-center justify-center space-x-3 active:bg-gray-200"
            >
              <Ionicons name="document" size={24} color="#374151" />
              <Text className="text-gray-700 font-semibold text-base">Upload File</Text>
            </Pressable>
          </View>
        </View>

        {/* Document List */}
        {currentFax.documents.length > 0 && (
          <View className="mb-8">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Documents ({currentFax.documents.length})
            </Text>
            <DocumentList documents={currentFax.documents} />
          </View>
        )}

        {/* Cover Page Option */}
        <View className="mb-8">
          <Pressable
            onPress={() => navigation.navigate('CoverPage')}
            className="bg-gray-50 border border-gray-300 rounded-xl p-4 flex-row items-center justify-between active:bg-gray-100"
          >
            <View className="flex-row items-center space-x-3">
              <Ionicons name="document-text" size={24} color="#6B7280" />
              <View>
                <Text className="text-gray-900 font-semibold">Add Cover Page</Text>
                <Text className="text-gray-600 text-sm">
                  {currentFax.coverPage ? 'Cover page added' : 'Optional'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center space-x-2">
              {currentFax.coverPage && (
                <View className="bg-green-100 rounded-full w-6 h-6 items-center justify-center">
                  <Ionicons name="checkmark" size={16} color="#059669" />
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="px-6 pb-6 border-t border-gray-200 bg-white">
        <View className="space-y-3">
          {/* Batch Fax Button */}
          {currentFax.documents.length > 0 && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowBatchFax(true);
              }}
              className="bg-purple-100 border border-purple-300 rounded-xl p-4 flex-row items-center justify-center space-x-2 active:bg-purple-200"
            >
              <Ionicons name="people" size={20} color="#7C3AED" />
              <Text className="text-purple-700 font-semibold text-base">
                Send to Multiple Recipients
              </Text>
            </Pressable>
          )}
          
          {/* Regular Send Button */}
          <Pressable
            onPress={() => {
              if (canProceed) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('FaxReview');
              }
            }}
            disabled={!canProceed}
            className={`rounded-xl p-4 ${
              canProceed 
                ? 'bg-blue-500 active:bg-blue-600' 
                : 'bg-gray-300'
            }`}
          >
            <Text className={`text-center font-semibold text-base ${
              canProceed ? 'text-white' : 'text-gray-500'
            }`}>
              Review & Send Fax
            </Text>
          </Pressable>
        </View>
      </View>

      <ContactPickerModal
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSelectContact={(phone) => {
          handlePhoneChange(phone);
          setShowContactPicker(false);
        }}
      />

      <BatchFaxModal
        visible={showBatchFax}
        onClose={() => setShowBatchFax(false)}
        onSendBatch={handleBatchFax}
        documentCount={currentFax.documents.length}
      />
    </View>
  );
}