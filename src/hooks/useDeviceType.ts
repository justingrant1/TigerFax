import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

interface DeviceType {
  isTablet: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  contentMaxWidth: number;
  horizontalPadding: number;
}

export const useDeviceType = (): DeviceType => {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isLandscape = width > height;
  
  // Detect tablet: iPad or large Android tablets
  // iPad Mini: 768px, iPad: 810px, iPad Pro: 1024px+
  const isTablet = (Platform.OS === 'ios' && width >= 768) || width >= 768;

  // Content max-width: constrain content on tablets
  // In portrait: 600px, in landscape: 700px
  const contentMaxWidth = isTablet ? (isLandscape ? 700 : 600) : width;

  // Horizontal padding: more generous on tablets
  const horizontalPadding = isTablet ? 32 : 24;

  return {
    isTablet,
    isLandscape,
    screenWidth: width,
    screenHeight: height,
    contentMaxWidth,
    horizontalPadding,
  };
};
