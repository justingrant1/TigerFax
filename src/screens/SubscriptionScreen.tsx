import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getOfferings, purchasePackage, restorePurchases } from '../services/purchases';
import { handlePurchaseSuccess, getTierFeatures } from '../utils/subscription-utils';
import { PurchasesPackage } from 'react-native-purchases';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;

export default function SubscriptionScreen({ navigation }: Props) {
  const { user, userData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [packages, setPackages] = useState<{
    monthly?: PurchasesPackage;
    yearly?: PurchasesPackage;
  }>({});

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      setOfferingsError(null);
      const offerings = await getOfferings();

      if (!offerings?.current) {
        setPackages({});
        setOfferingsError('No subscription offerings available right now.');
        return;
      }

      const availablePackages = offerings.current.availablePackages ?? [];
      const monthlyIdentifiers = ['$rc_monthly', 'monthly', 'pro_monthly'];
      const yearlyIdentifiers = ['$rc_annual', '$rc_yearly', 'annual', 'yearly', 'pro_yearly'];
      const monthlyProductIds = ['tigerfax_pro_monthly', 'tigerfax.pro.monthly'];
      const yearlyProductIds = ['tigerfax_pro_yearly', 'tigerfax.pro.yearly'];

      const findPackage = (identifiers: string[], productIds: string[], types: string[]) =>
        availablePackages.find((pkg) => {
          const packageType = String(pkg.packageType ?? '').toLowerCase();
          return (
            identifiers.includes(pkg.identifier) ||
            productIds.includes(pkg.product.identifier) ||
            types.includes(packageType)
          );
        });

      const monthly = findPackage(monthlyIdentifiers, monthlyProductIds, ['monthly']);
      const yearly = findPackage(yearlyIdentifiers, yearlyProductIds, ['annual', 'yearly']);

      setPackages({ monthly, yearly });
      if (!monthly && !yearly) {
        setOfferingsError('Subscription options are unavailable. Please try again.');
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
      setPackages({});
      setOfferingsError('Failed to load subscription options.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (!user) return;
    try {
      setPurchasing(true);
      const customerInfo = await purchasePackage(pkg);
      const result = await handlePurchaseSuccess(user.uid, customerInfo);
      await refreshUserData();
      Alert.alert('Welcome to Pro! 🎉', result.message, [
        { text: 'Get Started', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      if (error.message !== 'Purchase was cancelled') {
        Alert.alert('Purchase Failed', error.message || 'Please try again');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
      await restorePurchases();
      await refreshUserData();
      Alert.alert('Purchases Restored', 'Your subscription has been restored successfully!');
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message || 'No purchases to restore');
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-gray-600">Loading subscription options...</Text>
      </SafeAreaView>
    );
  }

  const proFeatures = getTierFeatures('pro');
  const hasPaidPlans = Boolean(packages.monthly || packages.yearly);
  const isPro = userData?.subscriptionTier === 'pro';
  const activePackage = selectedPlan === 'yearly' ? packages.yearly : packages.monthly;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Animated.ScrollView style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-5">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          {isPro ? (
            <View className="items-center py-4">
              <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="star" size={40} color="#2563EB" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">You're on Pro!</Text>
              <Text className="text-gray-500 text-center">
                You have access to all premium features.
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-3xl font-bold text-gray-900 mb-2">Upgrade to Pro</Text>
              <Text className="text-base text-gray-500">
                Unlimited faxes, dedicated number, and more. First 3 pages free, then $0.99/page without Pro.
              </Text>
            </>
          )}
        </View>

        {/* Error Banner */}
        {!hasPaidPlans && (
          <View className="mx-6 mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <Text className="text-yellow-800 font-semibold mb-1">
              Subscription options unavailable
            </Text>
            <Text className="text-yellow-700 text-sm">
              {offeringsError || 'Please try again in a moment.'}
            </Text>
            <TouchableOpacity
              onPress={loadOfferings}
              className="mt-3 bg-yellow-600 py-2 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Plan Toggle */}
        {hasPaidPlans && !isPro && (
          <View className="mx-6 mt-6">
            <View className="bg-gray-100 rounded-xl p-1 flex-row">
              <TouchableOpacity
                className={`flex-1 py-3 rounded-lg items-center ${
                  selectedPlan === 'monthly' ? 'bg-white shadow-sm' : ''
                }`}
                onPress={() => setSelectedPlan('monthly')}
              >
                <Text
                  className={`font-semibold text-sm ${
                    selectedPlan === 'monthly' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-lg items-center ${
                  selectedPlan === 'yearly' ? 'bg-white shadow-sm' : ''
                }`}
                onPress={() => setSelectedPlan('yearly')}
              >
                <Text
                  className={`font-semibold text-sm ${
                    selectedPlan === 'yearly' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  Yearly
                </Text>
                {packages.yearly && (
                  <View className="bg-green-500 rounded-full px-2 py-0.5 mt-1">
                    <Text className="text-white text-xs font-bold">Save 16%</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Pricing Card */}
        {hasPaidPlans && !isPro && activePackage && (
          <View className="mx-6 mt-4 bg-white rounded-2xl border-2 border-blue-600 overflow-hidden shadow-sm">
            {selectedPlan === 'yearly' && (
              <View className="bg-blue-600 py-2">
                <Text className="text-white font-bold text-center text-sm">
                  ⭐ BEST VALUE
                </Text>
              </View>
            )}

            <View className="p-6">
              {/* Price */}
              <View className="items-center mb-6">
                <Text className="text-5xl font-bold text-gray-900">
                  {activePackage.product.priceString}
                </Text>
                <Text className="text-gray-500 mt-1">
                  per {selectedPlan === 'yearly' ? 'year' : 'month'}
                </Text>
                {selectedPlan === 'yearly' && (
                  <Text className="text-green-600 text-sm font-medium mt-1">
                    ≈ {packages.monthly?.product.priceString
                      ? `${packages.monthly.product.priceString}/mo if billed monthly`
                      : 'Save vs monthly'}
                  </Text>
                )}
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                onPress={() => handlePurchase(activePackage)}
                disabled={purchasing}
                className="bg-blue-600 py-4 rounded-xl mb-6"
                style={{ opacity: purchasing ? 0.7 : 1 }}
              >
                {purchasing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-center text-lg">
                    {selectedPlan === 'yearly' ? 'Subscribe Yearly' : 'Subscribe Monthly'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Features */}
              <View className="space-y-3">
                {proFeatures.map((feature, index) => (
                  <View key={index} className="flex-row items-center">
                    <View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="checkmark" size={14} color="#2563EB" />
                    </View>
                    <Text className="text-gray-700 flex-1">{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Free Plan Comparison */}
        {!isPro && (
          <View className="mx-6 mt-4 bg-white rounded-2xl border border-gray-200 p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">Free Plan</Text>
              {userData?.subscriptionTier === 'free' && (
                <View className="bg-gray-100 px-3 py-1 rounded-full">
                  <Text className="text-gray-600 text-xs font-semibold">Current</Text>
                </View>
              )}
            </View>
            {getTierFeatures('free').map((feature, index) => (
              <View key={index} className="flex-row items-center mb-2">
                <View className="w-6 h-6 bg-gray-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="checkmark" size={14} color="#6B7280" />
                </View>
                <Text className="text-gray-600 flex-1">{feature}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Restore + Legal */}
        <View className="px-6 py-6">
          <TouchableOpacity
            onPress={handleRestore}
            disabled={restoring}
            className="py-3 mb-4"
          >
            {restoring ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text className="text-blue-600 text-center font-semibold">
                Restore Purchases
              </Text>
            )}
          </TouchableOpacity>

          <Text className="text-xs text-gray-400 text-center leading-5">
            Subscription automatically renews unless cancelled at least 24 hours before the end of
            the current period. Payment charged to your App Store account at confirmation of
            purchase.
          </Text>

          <View className="flex-row justify-center mt-4 space-x-4">
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
                )
              }
            >
              <Text className="text-xs text-blue-600">EULA</Text>
            </TouchableOpacity>
            <Text className="text-xs text-gray-300">•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://tigerfax.com/terms')}>
              <Text className="text-xs text-blue-600">Terms</Text>
            </TouchableOpacity>
            <Text className="text-xs text-gray-300">•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://tigerfax.com/privacy')}>
              <Text className="text-xs text-blue-600">Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-8" />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
