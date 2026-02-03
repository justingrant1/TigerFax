import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { applyFilter, getImageSize, FilterType } from '../utils/image-processing';

const { width: screenWidth } = Dimensions.get('window');

interface Filter {
  id: string;
  name: string;
  description: string;
  icon: string;
  preview: string;
}

interface ImageEnhancementModalProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onApplyFilter: (processedUri: string, filterId: string, fileSize: number) => void;
}

const filters: Filter[] = [
  {
    id: 'original',
    name: 'Original',
    description: 'No enhancement',
    icon: 'image-outline',
    preview: 'Original photo without any modifications'
  },
  {
    id: 'document',
    name: 'Document',
    description: 'High contrast B&W',
    icon: 'document-text',
    preview: 'Optimized for text documents with high contrast'
  },
  {
    id: 'grayscale',
    name: 'Grayscale',
    description: 'Black and white',
    icon: 'contrast',
    preview: 'Convert to black and white for clear text'
  },
  {
    id: 'sharpen',
    name: 'Sharpen',
    description: 'Enhanced clarity',
    icon: 'eye',
    preview: 'Sharpen edges and improve text clarity'
  },
  {
    id: 'brightness',
    name: 'Brighten',
    description: 'Increased brightness',
    icon: 'sunny',
    preview: 'Brighten dark documents for better readability'
  }
];

// Separate component for filter item to properly use hooks
interface FilterItemProps {
  filter: Filter;
  isSelected: boolean;
  scaleValue: SharedValue<number>;
  onSelect: () => void;
}

function FilterItem({ filter, isSelected, scaleValue, onSelect }: FilterItemProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onSelect}
        className={`p-4 rounded-xl border-2 ${
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 bg-gray-50'
        } active:opacity-70`}
      >
        <View className="flex-row items-center space-x-4">
          {/* Filter Icon */}
          <View className={`w-12 h-12 rounded-full items-center justify-center ${
            isSelected ? 'bg-blue-100' : 'bg-gray-200'
          }`}>
            <Ionicons
              name={filter.icon as any}
              size={24}
              color={isSelected ? '#2563EB' : '#6B7280'}
            />
          </View>

          {/* Filter Info */}
          <View className="flex-1">
            <Text className={`font-semibold text-base ${
              isSelected ? 'text-blue-900' : 'text-gray-900'
            }`}>
              {filter.name}
            </Text>
            <Text className={`text-sm ${
              isSelected ? 'text-blue-700' : 'text-gray-600'
            }`}>
              {filter.description}
            </Text>
            <Text className={`text-xs mt-1 ${
              isSelected ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {filter.preview}
            </Text>
          </View>

          {/* Selection Indicator */}
          {isSelected && (
            <View className="bg-blue-500 rounded-full w-6 h-6 items-center justify-center">
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ImageEnhancementModal({
  visible,
  imageUri,
  onClose,
  onApplyFilter
}: ImageEnhancementModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('original');
  const [processedUri, setProcessedUri] = useState<string>(imageUri);
  const [isProcessing, setIsProcessing] = useState(false);

  // Create shared values at the top level - one for each filter
  const scale0 = useSharedValue(1);
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const scale4 = useSharedValue(1);
  const scaleValues = [scale0, scale1, scale2, scale3, scale4];

  // Reset when modal opens with new image
  useEffect(() => {
    if (visible) {
      setSelectedFilter('original');
      setProcessedUri(imageUri);
      setIsProcessing(false);
    }
  }, [visible, imageUri]);

  const handleFilterSelect = async (filterId: FilterType, index: number) => {
    setSelectedFilter(filterId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate the selected filter
    scaleValues[index].value = withSpring(0.95, {}, () => {
      scaleValues[index].value = withSpring(1);
    });

    // Apply filter in real-time
    setIsProcessing(true);
    try {
      const result = await applyFilter(imageUri, filterId);
      setProcessedUri(result.uri);
    } catch (error) {
      console.error('Error applying filter:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const fileSize = await getImageSize(processedUri);
      onApplyFilter(processedUri, selectedFilter, fileSize);
      onClose();
    } catch (error) {
      console.error('Error getting file size:', error);
      // Fallback with estimated size
      onApplyFilter(processedUri, selectedFilter, 500000);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="border-b border-gray-200 pb-4 pt-4 px-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-gray-900">Enhance Document</Text>
            <Pressable
              onPress={onClose}
              className="bg-gray-100 rounded-full w-8 h-8 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#374151" />
            </Pressable>
          </View>
          <Text className="text-gray-600 mt-2">
            Choose a filter to optimize your document for faxing
          </Text>
        </View>

        <ScrollView className="flex-1">
          {/* Image Preview */}
          <View className="px-6 py-6">
            <View className="bg-gray-100 rounded-2xl overflow-hidden aspect-[4/3] items-center justify-center">
              {isProcessing ? (
                <View className="absolute z-10 bg-black/50 rounded-2xl" style={{
                  width: screenWidth - 48,
                  height: (screenWidth - 48) * 0.75,
                }}>
                  <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#fff" />
                    <Text className="text-white mt-2">Processing...</Text>
                  </View>
                </View>
              ) : null}

              <Image
                source={{ uri: processedUri }}
                style={{
                  width: screenWidth - 48,
                  height: (screenWidth - 48) * 0.75,
                }}
                contentFit="contain"
              />

              {/* Filter Overlay Indicator */}
              <View className="absolute top-4 left-4 bg-black/70 rounded-full px-3 py-1">
                <Text className="text-white text-sm font-medium">
                  {filters.find(f => f.id === selectedFilter)?.name}
                </Text>
              </View>
            </View>
          </View>

          {/* Filter Options */}
          <View className="px-6 pb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Enhancement Options</Text>

            <View className="space-y-3">
              {filters.map((filter, index) => (
                <FilterItem
                  key={filter.id}
                  filter={filter}
                  isSelected={selectedFilter === filter.id}
                  scaleValue={scaleValues[index]}
                  onSelect={() => handleFilterSelect(filter.id as FilterType, index)}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View className="px-6 pb-6 border-t border-gray-200 bg-white">
          <Pressable
            onPress={handleApply}
            disabled={isProcessing}
            className={`rounded-xl p-4 ${
              isProcessing ? 'bg-gray-300' : 'bg-blue-500 active:bg-blue-600'
            }`}
          >
            <Text className={`font-semibold text-base text-center ${
              isProcessing ? 'text-gray-500' : 'text-white'
            }`}>
              {isProcessing
                ? 'Processing...'
                : `Apply ${filters.find(f => f.id === selectedFilter)?.name} Filter`
              }
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
