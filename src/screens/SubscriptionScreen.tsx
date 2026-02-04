import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getOfferings, purchasePackage, restorePurchases } from '../services/purchases';
import { handlePurchaseSuccess, getTierFeatures } from '../utils/subscription-utils';
import { PurchasesPackage } from 'react-native-purchases';

type RootStackParamList = {
  Subscription: undefined;
  Profile: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;

export default function SubscriptionScreen({ navigation }: Props) {
  const { user, userData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [packages, setPackages] = useState<{
    monthly?: PurchasesPackage;
    yearly?: PurchasesPackage;
  }>({});

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      setOfferingsError(null);
      const offerings = await getOfferings();

      // Debug logging
      console.log('📦 Raw offerings:', JSON.stringify(offerings, null, 2));
      console.log('📦 Current offering:', offerings?.current);
      console.log('📦 All offering keys:', offerings ? Object.keys(offerings.all || {}) : 'none');

      if (!offerings?.current) {
        setPackages({});
        setOfferingsError('No subscription offerings available right now.');
        return;
      }

      const availablePackages = offerings.current.availablePackages ?? [];
      console.log('📦 Available packages:', availablePackages.length, availablePackages.map(p => p.identifier));
      const monthlyIdentifiers = ['$rc_monthly', 'monthly', 'pro_monthly'];
      const yearlyIdentifiers = ['$rc_annual', '$rc_yearly', 'annual', 'yearly', 'pro_yearly'];
      const monthlyProductIds = ['tigerfax_pro_monthly', 'tigerfax.pro.monthly'];
      const yearlyProductIds = ['tigerfax_pro_yearly', 'tigerfax.pro.yearly'];

      const findPackage = (
        identifiers: string[],
        productIds: string[],
        types: string[]
      ) =>
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
      
      // Sync with Firestore and show success
      const result = await handlePurchaseSuccess(user.uid, customerInfo);
      await refreshUserData();
      
      Alert.alert('Success!', result.message, [
        { text: 'OK', onPress: () => navigation.goBack() }
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
      
      Alert.alert(
        'Purchases Restored',
        'Your subscription has been restored successfully!'
      );
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

  const freeFeatures = getTierFeatures('free');
  const proFeatures = getTierFeatures('pro');
  const hasPaidPlans = Boolean(packages.monthly || packages.yearly);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        {/* Header */}
        <View className="px-6 py-6 bg-white">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mb-4"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Upgrade to Pro
          </Text>
          <Text className="text-base text-gray-600">
            Send unlimited faxes and unlock premium features
          </Text>
        </View>

        {/* Pricing Cards */}
        <View className="px-6 py-6 space-y-4">
          {/* Current Plan Badge */}
          {userData?.subscriptionTier !== 'free' && (
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-2">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text className="ml-2 text-green-700 font-semibold">
                  You're on the {userData?.subscriptionTier === 'pro' ? 'Pro' : 'Credits'} plan
                </Text>
              </View>
            </View>
          )}

          {!hasPaidPlans && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-2">
              <Text className="text-yellow-800 font-semibold">
                Subscription options unavailable
              </Text>
              <Text className="text-yellow-700 mt-1">
                {offeringsError || 'Please try again in a moment.'}
              </Text>
              <TouchableOpacity
                onPress={loadOfferings}
                className="mt-3 bg-yellow-600 py-2 rounded-lg"
              >
                <Text className="text-white text-center font-semibold">
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Yearly Plan - Best Value */}
          {packages.yearly && (
            <View className="bg-white rounded-2xl border-2 border-blue-600 overflow-hidden">
              <View className="bg-blue-600 px-4 py-2">
                <Text className="text-white font-bold text-center">
                  ⭐ BEST VALUE - Save 16%
                </Text>
              </View>
              
              <View className="p-6">
                <Text className="text-2xl font-bold text-gray-900 mb-1">
                  Pro Yearly
                </Text>
                <View className="flex-row items-baseline mb-4">
                  <Text className="text-4xl font-bold text-blue-600">
                    {packages.yearly.product.priceString}
                  </Text>
                  <Text className="text-gray-600 ml-2">/year</Text>
                </View>
                
                <TouchableOpacity
                  onPress={() => handlePurchase(packages.yearly!)}
                  disabled={purchasing || userData?.subscriptionTier === 'pro'}
                  className={`${
                    userData?.subscriptionTier === 'pro'
                      ? 'bg-gray-300'
                      : 'bg-blue-600'
                  } py-4 rounded-xl mb-4`}
                >
                  {purchasing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold text-center text-lg">
                      {userData?.subscriptionTier === 'pro' ? 'Current Plan' : 'Subscribe Yearly'}
                    </Text>
                  )}
                </TouchableOpacity>

                <Text className="text-sm text-gray-600 text-center mb-4">
                  Just $12.49/month when billed annually
                </Text>

                {proFeatures.map((feature, index) => (
                  <View key={index} className="flex-row items-center mb-2">
                    <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                    <Text className="ml-2 text-gray-700">{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Monthly Plan */}
          {packages.monthly && (
            <View className="bg-white rounded-2xl border border-gray-300">
              <View className="p-6">
                <Text className="text-2xl font-bold text-gray-900 mb-1">
                  Pro Monthly
                </Text>
                <View className="flex-row items-baseline mb-4">
                  <Text className="text-4xl font-bold text-gray-900">
                    {packages.monthly.product.priceString}
                  </Text>
                  <Text className="text-gray-600 ml-2">/month</Text>
                </View>
                
                <TouchableOpacity
                  onPress={() => handlePurchase(packages.monthly!)}
                  disabled={purchasing || userData?.subscriptionTier === 'pro'}
                  className={`${
                    userData?.subscriptionTier === 'pro'
                      ? 'bg-gray-300'
                      : 'bg-gray-900'
                  } py-4 rounded-xl mb-4`}
                >
                  {purchasing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold text-center text-lg">
                      {userData?.subscriptionTier === 'pro' ? 'Current Plan' : 'Subscribe Monthly'}
                    </Text>
                  )}
                </TouchableOpacity>

                <Text className="text-sm text-gray-600 mb-4">
                  All Pro features included
                </Text>
              </View>
            </View>
          )}

          {/* Free Plan */}
          <View className="bg-white rounded-2xl border border-gray-300">
            <View className="p-6">
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                Free Plan
              </Text>
              <View className="flex-row items-baseline mb-4">
                <Text className="text-4xl font-bold text-gray-900">
                  $0
                </Text>
                <Text className="text-gray-600 ml-2">/month</Text>
              </View>
              
              {userData?.subscriptionTier === 'free' && (
                <View className="bg-gray-100 py-4 rounded-xl mb-4">
                  <Text className="text-gray-700 font-semibold text-center">
                    Current Plan
                  </Text>
                </View>
              )}

              {freeFeatures.map((feature, index) => (
                <View key={index} className="flex-row items-center mb-2">
                  <Ionicons name="checkmark-circle" size={20} color="#6b7280" />
                  <Text className="ml-2 text-gray-700">{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Restore Purchases */}
        <View className="px-6 pb-6">
          <TouchableOpacity
            onPress={handleRestore}
            disabled={restoring}
            className="py-3"
          >
            {restoring ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text className="text-blue-600 text-center font-semibold">
                Restore Purchases
              </Text>
            )}
          </TouchableOpacity>

          {/* Legal */}
          <Text className="text-xs text-gray-500 text-center mt-4">
            Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. 
            Payment charged to App Store account at confirmation of purchase.
          </Text>
          
          <View className="flex-row justify-center mt-3 space-x-4">
            <TouchableOpacity>
              <Text className="text-xs text-blue-600">Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text className="text-xs text-blue-600">Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
