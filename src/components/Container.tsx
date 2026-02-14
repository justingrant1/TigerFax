import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useDeviceType } from '../hooks/useDeviceType';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  maxWidth?: number; // Override default max-width if needed
  noPadding?: boolean; // Disable automatic horizontal padding
}

/**
 * Container component that automatically constrains content width on tablets
 * and applies appropriate padding. Use this to wrap screen content for iPad optimization.
 */
export const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  style,
  maxWidth,
  noPadding = false,
}) => {
  const { isTablet, contentMaxWidth, horizontalPadding } = useDeviceType();

  const containerStyle: ViewStyle = {
    width: '100%',
    maxWidth: maxWidth || contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: noPadding ? 0 : (isTablet ? horizontalPadding : undefined),
    ...style,
  };

  return (
    <View style={containerStyle} className={className}>
      {children}
    </View>
  );
};
