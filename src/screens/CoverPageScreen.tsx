import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFaxStore, CoverPage } from '../state/fax-store';

export default function CoverPageScreen() {
  const navigation = useNavigation();
  const { currentFax, setCoverPage, removeCoverPage } = useFaxStore();
  
  const [formData, setFormData] = useState<CoverPage>({
    to: currentFax.coverPage?.to || '',
    from: currentFax.coverPage?.from || '',
    subject: currentFax.coverPage?.subject || '',
    message: currentFax.coverPage?.message || '',
  });

  const handleSave = () => {
    if (!formData.to.trim() || !formData.from.trim()) {
      Alert.alert('Missing Information', 'Please fill in both To and From fields');
      return;
    }

    setCoverPage(formData);
    navigation.goBack();
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Cover Page',
      'Are you sure you want to remove the cover page?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            removeCoverPage();
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 py-6">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Cover Page</Text>
          <Text className="text-gray-600">
            Add a professional cover page to your fax
          </Text>
        </View>

        {/* Form Fields */}
        <View className="space-y-6">
          {/* To Field */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 mb-3">To *</Text>
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              placeholder="Recipient name or company"
              value={formData.to}
              onChangeText={(text) => setFormData(prev => ({ ...prev, to: text }))}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* From Field */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 mb-3">From *</Text>
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              placeholder="Your name or company"
              value={formData.from}
              onChangeText={(text) => setFormData(prev => ({ ...prev, from: text }))}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Subject Field */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 mb-3">Subject</Text>
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              placeholder="Subject line (optional)"
              value={formData.subject}
              onChangeText={(text) => setFormData(prev => ({ ...prev, subject: text }))}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Message Field */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 mb-3">Message</Text>
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              placeholder="Optional message..."
              value={formData.message}
              onChangeText={(text) => setFormData(prev => ({ ...prev, message: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
              style={{ minHeight: 100 }}
            />
          </View>
        </View>

        {/* Preview */}
        <View className="mt-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Preview</Text>
          <View className="bg-gray-50 border border-gray-300 rounded-xl p-6">
            <View className="border-b border-gray-300 pb-4 mb-4">
              <Text className="text-center text-xl font-bold text-gray-900 mb-4">
                FAX COVER SHEET
              </Text>
              
              <View className="space-y-2">
                <View className="flex-row">
                  <Text className="font-semibold text-gray-900 w-16">To:</Text>
                  <Text className="text-gray-900 flex-1">
                    {formData.to || '_______________'}
                  </Text>
                </View>
                
                <View className="flex-row">
                  <Text className="font-semibold text-gray-900 w-16">From:</Text>
                  <Text className="text-gray-900 flex-1">
                    {formData.from || '_______________'}
                  </Text>
                </View>
                
                {formData.subject && (
                  <View className="flex-row">
                    <Text className="font-semibold text-gray-900 w-16">Re:</Text>
                    <Text className="text-gray-900 flex-1">{formData.subject}</Text>
                  </View>
                )}
                
                <View className="flex-row">
                  <Text className="font-semibold text-gray-900 w-16">Date:</Text>
                  <Text className="text-gray-900 flex-1">
                    {new Date().toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
            
            {formData.message && (
              <View>
                <Text className="font-semibold text-gray-900 mb-2">Message:</Text>
                <Text className="text-gray-900">{formData.message}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="px-6 pb-6 border-t border-gray-200 bg-white">
        <View className="flex-row space-x-3">
          {currentFax.coverPage && (
            <Pressable
              onPress={handleRemove}
              className="flex-1 bg-red-500 rounded-xl p-4 active:bg-red-600"
            >
              <Text className="text-white font-semibold text-center">Remove</Text>
            </Pressable>
          )}
          
          <Pressable
            onPress={handleSave}
            className="flex-1 bg-blue-500 rounded-xl p-4 active:bg-blue-600"
          >
            <Text className="text-white font-semibold text-center">
              {currentFax.coverPage ? 'Update' : 'Add'} Cover Page
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}