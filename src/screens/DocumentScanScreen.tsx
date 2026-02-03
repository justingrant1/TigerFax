import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useFaxStore, FaxDocument } from '../state/fax-store';
import ImageEnhancementModal from '../components/ImageEnhancementModal';

export default function DocumentScanScreen() {
  const navigation = useNavigation();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showEnhancement, setShowEnhancement] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const { addDocument } = useFaxStore();

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Ionicons name="camera" size={64} color="#9CA3AF" />
        <Text className="text-xl font-semibold text-gray-900 mb-2 mt-4">
          Camera Access Required
        </Text>
        <Text className="text-gray-600 text-center mb-8">
          Please allow camera access to scan documents
        </Text>
        <Pressable
          onPress={requestPermission}
          className="bg-blue-500 rounded-xl px-6 py-3 active:bg-blue-600"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => !current);
  };

  const takePicture = async () => {
    if (isCapturing || !cameraRef.current) return;

    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Capture high-quality photo for document scanning
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1, // Maximum quality
        exif: false,
        skipProcessing: false,
      });

      if (photo && photo.uri) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCapturedImage(photo.uri);
        setShowEnhancement(true);
      } else {
        throw new Error('Failed to capture image');
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleApplyFilter = (processedUri: string, filterId: string, fileSize: number) => {
    if (!processedUri) return;

    const document: FaxDocument = {
      id: Date.now().toString(),
      name: `Scan_${filterId}_${Date.now()}.jpg`,
      uri: processedUri,
      type: 'image',
      size: fileSize,
      timestamp: Date.now(),
    };

    addDocument(document);
    setCapturedImage(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        enableTorch={flash}
      />
      
      {/* Overlay UI */}
      <View className="absolute top-0 left-0 right-0 bottom-0 z-10">
        {/* Top Controls */}
        <View className="flex-row justify-between items-center p-6 pt-16">
          <Pressable
            onPress={() => navigation.goBack()}
            className="bg-black/50 rounded-full w-12 h-12 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="white" />
          </Pressable>

          <Pressable
            onPress={toggleFlash}
            className={`rounded-full w-12 h-12 items-center justify-center ${
              flash ? 'bg-yellow-500' : 'bg-black/50'
            }`}
          >
            <Ionicons 
              name={flash ? 'flash' : 'flash-off'} 
              size={24} 
              color="white" 
            />
          </Pressable>
        </View>

        {/* Document Frame Guide */}
        <View className="flex-1 items-center justify-center px-8">
          <View className="border-2 border-white/50 rounded-2xl aspect-[8.5/11] w-full max-w-80 relative">
            <View className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-white" />
            <View className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-white" />
            <View className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-white" />
            <View className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-white" />
          </View>
          <Text className="text-white text-center mt-4 text-sm opacity-80">
            Position document within the frame
          </Text>
        </View>

        {/* Bottom Controls */}
        <View className="flex-row justify-between items-center p-6 pb-12">
          <View className="w-12" />

          {/* Capture Button */}
          <Pressable
            onPress={takePicture}
            disabled={isCapturing}
            className="bg-white rounded-full w-20 h-20 items-center justify-center border-4 border-gray-300 active:scale-95"
          >
            <View className={`rounded-full w-16 h-16 ${isCapturing ? 'bg-gray-400' : 'bg-white'}`} />
          </Pressable>

          {/* Flip Camera */}
          <Pressable
            onPress={toggleCameraFacing}
            className="bg-black/50 rounded-full w-12 h-12 items-center justify-center"
          >
            <Ionicons name="camera-reverse" size={24} color="white" />
          </Pressable>
        </View>
      </View>

      <ImageEnhancementModal
        visible={showEnhancement}
        imageUri={capturedImage || ''}
        onClose={() => {
          setShowEnhancement(false);
          setCapturedImage(null);
        }}
        onApplyFilter={handleApplyFilter}
      />
    </View>
  );
}