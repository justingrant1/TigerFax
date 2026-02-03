import React, { useState } from 'react';
import { View, Text, Pressable, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useFaxStore, FaxDocument } from '../state/fax-store';
import DocumentPreviewModal from './DocumentPreviewModal';

const { width: screenWidth } = Dimensions.get('window');

interface DocumentListProps {
  documents: FaxDocument[];
  readonly?: boolean;
}

interface DocumentItemProps {
  document: FaxDocument;
  readonly: boolean;
  onRemove: (id: string) => void;
  onPreview: (document: FaxDocument) => void;
}

function DocumentItem({ document, readonly, onRemove, onPreview }: DocumentItemProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!readonly && event.translationX < -50) {
        translateX.value = Math.max(event.translationX, -120);
      } else if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, 0);
      }
    })
    .onEnd((event) => {
      if (!readonly && event.translationX < -80) {
        translateX.value = withSpring(-120);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const handleRemove = () => {
    if (readonly) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Remove Document',
      `Are you sure you want to remove "${document.name}"?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {
            translateX.value = withSpring(0);
          }
        },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            opacity.value = withSpring(0, {}, () => {
              runOnJS(onRemove)(document.id);
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View className="relative">
      {/* Delete Action Background */}
      {!readonly && (
        <View className="absolute right-0 top-0 bottom-0 w-24 bg-red-500 rounded-r-xl items-center justify-center">
          <Ionicons name="trash" size={24} color="white" />
        </View>
      )}
      
      {/* Main Content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View 
          style={animatedStyle}
          className="bg-gray-50 rounded-xl p-4 border border-gray-200"
        >
          <Pressable
            onPress={() => onPreview(document)}
            className="active:opacity-70"
          >
            <View className="flex-row items-center space-x-3">
              {/* Document Preview/Icon */}
              <View className="w-12 h-12 rounded-lg bg-gray-200 items-center justify-center overflow-hidden">
                {document.type === 'image' ? (
                  <Image 
                    source={{ uri: document.uri }} 
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="document" size={24} color="#6B7280" />
                )}
              </View>

              {/* Document Info */}
              <View className="flex-1">
                <Text className="text-gray-900 font-medium text-base" numberOfLines={1}>
                  {document.name}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {document.type === 'image' ? 'Image' : 'Document'} • {formatFileSize(document.size)}
                </Text>
              </View>

              {/* Preview Icon */}
              <Ionicons name="eye" size={20} color="#9CA3AF" />
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>

      {/* Manual Remove Button for Easy Access */}
      {!readonly && (
        <Pressable
          onPress={handleRemove}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 items-center justify-center shadow-sm"
        >
          <Ionicons name="close" size={16} color="white" />
        </Pressable>
      )}
    </View>
  );
}

export default function DocumentList({ documents, readonly = false }: DocumentListProps) {
  const { removeDocument } = useFaxStore();
  const [previewDocument, setPreviewDocument] = useState<FaxDocument | null>(null);

  return (
    <>
      <View className="space-y-3">
        {documents.map((document) => (
          <DocumentItem
            key={document.id}
            document={document}
            readonly={readonly}
            onRemove={removeDocument}
            onPreview={setPreviewDocument}
          />
        ))}
      </View>

      <DocumentPreviewModal
        document={previewDocument}
        visible={previewDocument !== null}
        onClose={() => setPreviewDocument(null)}
      />
    </>
  );
}