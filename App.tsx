import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from "./src/navigation/AppNavigator";
import { resumePolling } from "./src/services/fax-polling";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { initializeNotifications, addNotificationResponseListener } from "./src/services/notifications";
import { initializePurchases, debugCheckProducts, checkStoreKitProducts } from "./src/services/purchases";
import { AuthProvider } from "./src/contexts/AuthContext";
import { ThemeProvider } from "./src/contexts/ThemeContext";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

export default function App() {
  // Initialize app services on start
  useEffect(() => {
    // Wrap all initialization in defensive try-catch blocks
    // This prevents any single service from freezing the entire app
    
    // Resume polling for incomplete faxes
    try {
      resumePolling();
    } catch (error) {
      console.error('Failed to resume polling:', error);
    }

    // Initialize notifications
    const initNotifications = async () => {
      try {
        await initializeNotifications();
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };
    initNotifications();

    // Initialize RevenueCat for subscriptions with timeout
    const initRC = async () => {
      try {
        // Add timeout wrapper to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('RevenueCat initialization timeout')), 8000)
        );
        
        await Promise.race([
          initializePurchases(),
          timeoutPromise
        ]);
        
        // Run debug checks after initialization (non-blocking)
        setTimeout(async () => {
          try {
            await checkStoreKitProducts(); // Direct StoreKit check
            await debugCheckProducts();     // Full debug check
          } catch (error) {
            console.error('Debug checks failed:', error);
          }
        }, 2000);
      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error);
        // App continues to work without subscriptions
      }
    };
    initRC();
    
    // Handle notification taps
    let subscription: any = null;
    try {
      subscription = addNotificationResponseListener((response) => {
        console.log('Notification tapped:', response.notification.request.content.data);
        // TODO: Navigate to relevant screen based on notification data
      });
    } catch (error) {
      console.error('Failed to add notification listener:', error);
    }
    
    return () => {
      try {
        subscription?.remove();
      } catch (error) {
        console.error('Failed to remove notification listener:', error);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <StatusBar style="auto" />
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </GestureHandlerRootView>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
