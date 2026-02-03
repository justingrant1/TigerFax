import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFaxStore, FaxDocument } from '../state/fax-store';

export default function FileUploadScreen() {
  const navigation = useNavigation();
  const [isUploading, setIsUploading] = useState(false);
  const { addDocument } = useFaxStore();

  const pickFromGallery = async () => {
    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const document: FaxDocument = {
          id: Date.now().toString(),
          name: asset.fileName || `Image_${Date.now()}.jpg`,
          uri: asset.uri,
          type: 'image',
          size: asset.fileSize || 0,
          timestamp: Date.now(),
        };

        addDocument(document);
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from gallery');
    } finally {
      setIsUploading(false);
    }
  };

  const pickDocument = async () => {
    try {
      setIsUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const document: FaxDocument = {
          id: Date.now().toString(),
          name: asset.name,
          uri: asset.uri,
          type: asset.mimeType?.startsWith('image/') ? 'image' : 'document',
          size: asset.size || 0,
          timestamp: Date.now(),
        };

        addDocument(document);
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-200">
        <Text className="text-xl font-semibold text-gray-900">Choose Upload Method</Text>
        <Text className="text-gray-600 mt-1">Select how you'd like to add your document</Text>
      </View>

      {/* Upload Options */}
      <View className="flex-1 px-6 py-8">
        <View className="space-y-4">
          {/* Photo Gallery */}
          <Pressable
            onPress={pickFromGallery}
            disabled={isUploading}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-6 active:bg-blue-100"
          >
            <View className="items-center">
              <View className="bg-blue-500 rounded-full w-16 h-16 items-center justify-center mb-4">
                <Ionicons name="images" size={32} color="white" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">Photo Gallery</Text>
              <Text className="text-gray-600 text-center text-sm">
                Choose an existing photo from your gallery
              </Text>
            </View>
          </Pressable>

          {/* Document Files */}
          <Pressable
            onPress={pickDocument}
            disabled={isUploading}
            className="bg-green-50 border border-green-200 rounded-2xl p-6 active:bg-green-100"
          >
            <View className="items-center">
              <View className="bg-green-500 rounded-full w-16 h-16 items-center justify-center mb-4">
                <Ionicons name="document-text" size={32} color="white" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">Files</Text>
              <Text className="text-gray-600 text-center text-sm">
                Upload PDF documents or image files
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Supported Formats */}
        <View className="mt-12">
          <Text className="text-sm font-medium text-gray-900 mb-3">Supported Formats</Text>
          <View className="bg-gray-50 rounded-xl p-4">
            <Text className="text-sm text-gray-600">
              • Images: JPG, PNG, HEIC{'\n'}
              • Documents: PDF{'\n'}
              • Maximum file size: 10MB per file
            </Text>
          </View>
        </View>
      </View>

      {/* Loading State */}
      {isUploading && (
        <View className="absolute inset-0 bg-black/20 items-center justify-center">
          <View className="bg-white rounded-xl p-6 items-center">
            <Text className="text-gray-900 font-medium">Processing file...</Text>
          </View>
        </View>
      )}
    </View>
  );
}