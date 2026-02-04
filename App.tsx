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
    // Resume polling for incomplete faxes
    resumePolling();

    // Initialize notifications
    initializeNotifications();

    // Initialize RevenueCat for subscriptions
    const initRC = async () => {
      await initializePurchases();
      // Run debug checks after initialization
      setTimeout(async () => {
        await checkStoreKitProducts(); // Direct StoreKit check
        await debugCheckProducts();     // Full debug check
      }, 2000);
    };
    initRC();
    
    // Handle notification taps
    const subscription = addNotificationResponseListener((response) => {
      console.log('Notification tapped:', response.notification.request.content.data);
      // TODO: Navigate to relevant screen based on notification data
    });
    
    return () => {
      subscription.remove();
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
