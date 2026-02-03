import React, { useState } from 'react';
import { View, Text, Modal, Pressable, Dimensions, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  clamp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { FaxDocument } from '../state/fax-store';

interface DocumentPreviewModalProps {
  document: FaxDocument | null;
  visible: boolean;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function DocumentPreviewModal({ 
  document, 
  visible, 
  onClose 
}: DocumentPreviewModalProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clamp(event.scale, 0.5, 3);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        const maxTranslateX = (imageSize.width * scale.value - screenWidth) / 2;
        const maxTranslateY = (imageSize.height * scale.value - screenHeight) / 2;
        
        translateX.value = clamp(event.translationX, -maxTranslateX, maxTranslateX);
        translateY.value = clamp(event.translationY, -maxTranslateY, maxTranslateY);
      }
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (scale.value > 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        scale.value = withSpring(2);
      }
    });

  const composed = Gesture.Simultaneous(
    Gesture.Race(doubleTapGesture, pinchGesture),
    panGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleClose = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    onClose();
  };

  if (!document) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="absolute top-0 left-0 right-0 z-10 bg-black/80 pt-12 pb-4 px-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-white font-semibold text-lg" numberOfLines={1}>
                {document.name}
              </Text>
              <Text className="text-gray-300 text-sm">
                {document.type === 'image' ? 'Image' : 'Document'} • 
                {(document.size / 1024).toFixed(0)}KB
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              className="bg-white/20 rounded-full w-10 h-10 items-center justify-center ml-4"
            >
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
          </View>
        </View>

        {/* Document Content */}
        <View className="flex-1 items-center justify-center">
          {document.type === 'image' ? (
            <GestureDetector gesture={composed}>
              <Animated.View style={animatedStyle}>
                <Image
                  source={{ uri: document.uri }}
                  style={{
                    width: screenWidth,
                    height: screenHeight * 0.8,
                  }}
                  contentFit="contain"
                  onLoad={(event) => {
                    const { width, height } = event.source;
                    setImageSize({ width, height });
                  }}
                />
              </Animated.View>
            </GestureDetector>
          ) : (
            <View className="items-center justify-center flex-1 px-8">
              <View className="bg-red-100 rounded-3xl w-40 h-40 items-center justify-center mb-8">
                <Ionicons name="document-text" size={80} color="#DC2626" />
              </View>
              
              <Text className="text-white text-2xl font-bold mb-3 text-center">
                PDF Document
              </Text>
              
              <Text className="text-gray-300 text-center mb-2 text-base">
                {document.name}
              </Text>
              
              <Text className="text-gray-400 text-center mb-8 text-sm">
                {(document.size / 1024).toFixed(0)} KB
              </Text>

              <View className="w-full space-y-3">
                <Pressable
                  onPress={async () => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      const canShare = await Sharing.isAvailableAsync();
                      if (canShare) {
                        await Sharing.shareAsync(document.uri, {
                          mimeType: 'application/pdf',
                          dialogTitle: 'Open PDF with...',
                        });
                      } else {
                        Alert.alert('Not Available', 'Sharing is not available on this device');
                      }
                    } catch (error) {
                      console.error('Error opening PDF:', error);
                      Alert.alert('Error', 'Could not open PDF document');
                    }
                  }}
                  className="bg-blue-500 rounded-xl py-4 px-6 active:bg-blue-600"
                >
                  <View className="flex-row items-center justify-center space-x-2">
                    <Ionicons name="eye" size={24} color="white" />
                    <Text className="text-white font-semibold text-lg">
                      Open PDF
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={async () => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const supported = await Linking.canOpenURL(document.uri);
                      if (supported) {
                        await Linking.openURL(document.uri);
                      }
                    } catch (error) {
                      console.error('Error viewing PDF:', error);
                    }
                  }}
                  className="bg-gray-700 rounded-xl py-4 px-6 active:bg-gray-600"
                >
                  <View className="flex-row items-center justify-center space-x-2">
                    <Ionicons name="open-outline" size={24} color="white" />
                    <Text className="text-white font-semibold text-lg">
                      View in Browser
                    </Text>
                  </View>
                </Pressable>
              </View>

              <View className="mt-8 bg-yellow-900/30 rounded-xl p-4 border border-yellow-700">
                <View className="flex-row items-start space-x-3">
                  <Ionicons name="information-circle" size={20} color="#FCD34D" />
                  <Text className="text-yellow-200 text-sm flex-1">
                    This PDF will be included in your fax transmission. Tap "Open PDF" to preview it in another app.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View className="absolute bottom-0 left-0 right-0 bg-black/80 p-6">
          {document.type === 'image' ? (
            <Text className="text-gray-300 text-center text-sm">
              Double tap to zoom • Pinch to scale • Drag to pan
            </Text>
          ) : (
            <View className="flex-row items-center justify-center space-x-4">
              <View className="flex-row items-center space-x-2">
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text className="text-gray-300 text-xs">Ready to send</Text>
              </View>
              <View className="flex-row items-center space-x-2">
                <Ionicons name="document" size={16} color="#3B82F6" />
                <Text className="text-gray-300 text-xs">PDF format</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}