import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingState';

// Auth Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// App Screens
import HomeScreen from '../screens/HomeScreen';
import DocumentScanScreen from '../screens/DocumentScanScreen';
import FileUploadScreen from '../screens/FileUploadScreen';
import CoverPageScreen from '../screens/CoverPageScreen';
import FaxReviewScreen from '../screens/FaxReviewScreen';
import HistoryScreen from '../screens/HistoryScreen';
import FaxDetailScreen from '../screens/FaxDetailScreen';
import UsageScreen from '../screens/UsageScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import { InboxScreen } from '../screens/InboxScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  DocumentScan: undefined;
  FileUpload: undefined;
  CoverPage: undefined;
  FaxReview: undefined;
  FaxDetail: { jobId: string };
  Usage: undefined;
  Profile: undefined;
  Settings: undefined;
  Subscription: undefined;
};

export type TabParamList = {
  Home: undefined;
  Inbox: undefined;
  History: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Inbox') {
            iconName = focused ? 'mail' : 'mail-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else {
            iconName = 'document-text-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#F8F9FA',
          borderTopColor: '#E5E5E7',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Send Fax' }}
      />
      <Tab.Screen 
        name="Inbox" 
        component={InboxScreen}
        options={{ tabBarLabel: 'Inbox' }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{ tabBarLabel: 'History' }}
      />
    </Tab.Navigator>
  );
}

function MainAppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#F8F9FA',
        },
        headerTintColor: '#007AFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="Main" 
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="DocumentScan" 
        component={DocumentScanScreen}
        options={{ 
          title: 'Scan Document',
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="FileUpload" 
        component={FileUploadScreen}
        options={{ 
          title: 'Upload File',
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="CoverPage" 
        component={CoverPageScreen}
        options={{ title: 'Cover Page' }}
      />
      <Stack.Screen 
        name="FaxReview" 
        component={FaxReviewScreen}
        options={{ title: 'Review & Send' }}
      />
      <Stack.Screen 
        name="FaxDetail" 
        component={FaxDetailScreen}
        options={{ title: 'Fax Details' }}
      />
      <Stack.Screen 
        name="Usage" 
        component={UsageScreen}
        options={{ title: 'Usage & Costs', headerShown: false }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Subscription" 
        component={SubscriptionScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication state
  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  // Show auth screens if user is not logged in
  if (!user) {
    return <AuthNavigator />;
  }

  // Show main app if user is authenticated
  return <MainAppNavigator />;
}
