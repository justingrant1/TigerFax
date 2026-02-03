/**
 * Error Boundary Component
 * Catches React errors and provides fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log to error reporting service (e.g., Sentry)
    // logErrorToService(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.resetError);
      }

      return (
        <View className="flex-1 bg-white items-center justify-center px-6">
          <View className="bg-red-100 rounded-full w-24 h-24 items-center justify-center mb-6">
            <Ionicons name="warning" size={48} color="#DC2626" />
          </View>

          <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
            Something Went Wrong
          </Text>

          <Text className="text-gray-600 text-center mb-6 leading-6">
            We encountered an unexpected error. Please try again.
          </Text>

          {__DEV__ && this.state.error && (
            <ScrollView className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 max-h-48 w-full">
              <Text className="text-red-600 font-mono text-xs mb-2">
                {this.state.error.toString()}
              </Text>
              {this.state.errorInfo && (
                <Text className="text-gray-600 font-mono text-xs">
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </ScrollView>
          )}

          <Pressable
            onPress={this.resetError}
            className="bg-blue-500 rounded-xl px-8 py-4 active:bg-blue-600"
          >
            <Text className="text-white font-semibold text-base">
              Try Again
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
