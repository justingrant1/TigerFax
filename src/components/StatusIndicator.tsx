import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface StatusIndicatorProps {
  status: 'pending' | 'sending' | 'sent' | 'failed';
  size?: number;
}

export default function StatusIndicator({ status, size = 24 }: StatusIndicatorProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (status === 'sending' || status === 'pending') {
      rotation.value = withRepeat(
        withTiming(360, { duration: 2000 }),
        -1,
        false
      );
    } else {
      rotation.value = withTiming(0, { duration: 300 });
    }
  }, [status, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return '#059669';
      case 'sending':
        return '#2563EB';
      case 'failed':
        return '#DC2626';
      default:
        return '#D97706';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return 'checkmark-circle';
      case 'sending':
        return 'refresh';
      case 'failed':
        return 'alert-circle';
      default:
        return 'hourglass';
    }
  };

  if (status === 'sending' || status === 'pending') {
    return (
      <Animated.View style={animatedStyle}>
        <Ionicons 
          name={getStatusIcon(status) as any} 
          size={size} 
          color={getStatusColor(status)} 
        />
      </Animated.View>
    );
  }

  return (
    <Ionicons 
      name={getStatusIcon(status) as any} 
      size={size} 
      color={getStatusColor(status)} 
    />
  );
}