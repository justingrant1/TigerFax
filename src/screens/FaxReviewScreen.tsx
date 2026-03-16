import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import Purchases from 'react-native-purchases';
import { useFaxStore } from '../state/fax-store';
import DocumentList from '../components/DocumentList';
import { formatErrorForDisplay } from '../utils/error-handler';
import { FAX_PRICE_PER_PAGE, FREE_PAGES_LIFETIME, PAGE_CREDIT_PRODUCT_ID } from '../utils/status-styles';
import { useAuth } from '../contexts/AuthContext';
import { addPageCredits } from '../services/firestore';
import { RootStackParamList } from '../navigation/AppNavigator';

type FaxReviewNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function FaxReviewScreen() {
  const navigation = useNavigation<FaxReviewNavProp>();
  const { user, userData } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { currentFax, sendFax, clearCurrentFax } = useFaxStore();

  const totalPages = currentFax.documents.length + (currentFax.coverPage ? 1 : 0);

  // ── Pricing logic ──────────────────────────────────────────────────────────
  const isPro = userData?.subscriptionTier === 'pro';
  const freePagesLeft = userData?.freePagesRemaining ?? 0;
  const paidCredits = userData?.creditsRemaining ?? 0;

  // How many of the totalPages are covered by free allowance
  const freePagesCovered = isPro ? 0 : Math.min(freePagesLeft, totalPages);
  // How many need to be paid (either from existing credits or new purchase)
  const paidPagesNeeded = isPro ? 0 : Math.max(0, totalPages - freePagesLeft);
  // Cost for the paid portion
  const paidCost = (paidPagesNeeded * FAX_PRICE_PER_PAGE).toFixed(2);
  // Total cost shown to user
  const estimatedCost = isPro ? '0.00' : paidCost;

  // Can the user send right now without buying more credits?
  const canSendNow =
    isPro ||
    freePagesLeft >= totalPages ||
    (freePagesLeft + paidCredits) >= totalPages;

  // ── Purchase a single page credit ─────────────────────────────────────────
  const handleBuyPageCredits = useCallback(async (quantity: number) => {
    if (!user) return;
    setIsPurchasing(true);
    try {
      // Fetch the consumable package from RevenueCat
      const offerings = await Purchases.getOfferings();
      const offering = offerings.all['pay_per_page'] ?? offerings.current;
      const pkg = offering?.availablePackages.find(
        (p) => p.product.identifier === PAGE_CREDIT_PRODUCT_ID
      );

      if (!pkg) {
        Alert.alert(
          'Not Available',
          'Page credits are not available right now. Please try again later or upgrade to Pro.'
        );
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      // Grant the credits in Firestore (consumable — RevenueCat doesn't track balance)
      await addPageCredits(user.uid, quantity);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPaywall(false);
      Alert.alert('Credits Added! ✅', `${quantity} page credit${quantity > 1 ? 's' : ''} added to your account.`);
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert('Purchase Failed', err?.message ?? 'Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [user]);

  // ── Send fax ───────────────────────────────────────────────────────────────
  const handleSendFax = async () => {
    // Gate: if user can't send, show paywall
    if (!canSendNow) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowPaywall(true);
      return;
    }

    try {
      setIsSending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      await sendFax();
      clearCurrentFax();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Fax Sent! 🎉',
        'Your fax has been queued for delivery. You can check the status in the History tab.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const { title, message } = formatErrorForDisplay(error);
      Alert.alert(title, message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 py-6">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Review & Send</Text>
          <Text className="text-gray-600">Please review your fax before sending</Text>
        </View>

        {/* Recipient Info */}
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <View className="flex-row items-center space-x-3 mb-2">
            <Ionicons name="call" size={20} color="#2563EB" />
            <Text className="text-lg font-semibold text-gray-900">Recipient</Text>
          </View>
          <Text className="text-gray-900 text-base ml-8">{currentFax.recipient}</Text>
        </View>

        {/* Cover Page Info */}
        {currentFax.coverPage && (
          <View className="mb-6">
            <View className="flex-row items-center space-x-3 mb-3">
              <Ionicons name="document-text" size={20} color="#059669" />
              <Text className="text-lg font-semibold text-gray-900">Cover Page</Text>
            </View>
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 ml-8">
              <Text className="text-gray-900 font-medium">To: {currentFax.coverPage.to}</Text>
              <Text className="text-gray-900 font-medium">From: {currentFax.coverPage.from}</Text>
              {currentFax.coverPage.subject && (
                <Text className="text-gray-900 font-medium">Subject: {currentFax.coverPage.subject}</Text>
              )}
              {currentFax.coverPage.message && (
                <Text className="text-gray-600 mt-2" numberOfLines={2}>
                  {currentFax.coverPage.message}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Documents */}
        <View className="mb-6">
          <View className="flex-row items-center space-x-3 mb-3">
            <Ionicons name="documents" size={20} color="#DC2626" />
            <Text className="text-lg font-semibold text-gray-900">
              Documents ({currentFax.documents.length})
            </Text>
          </View>
          <View className="ml-8">
            <DocumentList documents={currentFax.documents} readonly />
          </View>
        </View>

        {/* Cost Summary */}
        <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Fax Summary</Text>

          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Total Pages:</Text>
              <Text className="text-gray-900 font-medium">{totalPages}</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-600">Cover Page:</Text>
              <Text className="text-gray-900 font-medium">
                {currentFax.coverPage ? 'Included' : 'None'}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-600">Documents:</Text>
              <Text className="text-gray-900 font-medium">{currentFax.documents.length}</Text>
            </View>

            <View className="h-px bg-gray-200 my-1" />

            {/* Pricing breakdown */}
            {isPro ? (
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Cost:</Text>
                <Text className="text-green-600 font-semibold">Free (Pro)</Text>
              </View>
            ) : (
              <>
                {freePagesCovered > 0 && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">
                      Free pages ({freePagesCovered} of {FREE_PAGES_LIFETIME}):
                    </Text>
                    <Text className="text-green-600 font-medium">$0.00</Text>
                  </View>
                )}
                {paidPagesNeeded > 0 && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">
                      Paid pages ({paidPagesNeeded} × $0.99):
                    </Text>
                    <Text className="text-gray-900 font-medium">${paidCost}</Text>
                  </View>
                )}
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Total Cost:</Text>
                  <Text className="text-gray-900 font-semibold">
                    {paidPagesNeeded === 0 ? (
                      <Text className="text-green-600">$0.00</Text>
                    ) : (
                      `$${estimatedCost}`
                    )}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Free pages remaining banner (non-Pro only) */}
        {!isPro && (
          <View className={`rounded-xl p-3 mb-2 flex-row items-center ${
            freePagesLeft > 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
          }`}>
            <Ionicons
              name={freePagesLeft > 0 ? 'gift-outline' : 'information-circle-outline'}
              size={18}
              color={freePagesLeft > 0 ? '#059669' : '#D97706'}
            />
            <Text className={`ml-2 text-sm flex-1 ${freePagesLeft > 0 ? 'text-green-700' : 'text-amber-700'}`}>
              {freePagesLeft > 0
                ? `${freePagesLeft} free page${freePagesLeft !== 1 ? 's' : ''} remaining — then $0.99/page`
                : `Free pages used. Additional pages are $0.99 each.`}
            </Text>
          </View>
        )}

        {/* Page credits balance (non-Pro only) */}
        {!isPro && paidCredits > 0 && (
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2 flex-row items-center">
            <Ionicons name="wallet-outline" size={18} color="#2563EB" />
            <Text className="ml-2 text-sm text-blue-700 flex-1">
              {paidCredits} page credit{paidCredits !== 1 ? 's' : ''} in your wallet
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Send Button */}
      <View className="px-6 pb-6 pt-4 border-t border-gray-200 bg-white">
        <Pressable
          onPress={handleSendFax}
          disabled={isSending}
          className={`rounded-xl p-4 ${isSending ? 'bg-gray-300' : 'bg-blue-500 active:bg-blue-600'}`}
        >
          <View className="flex-row items-center justify-center space-x-3">
            {isSending ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Ionicons name={canSendNow ? 'send' : 'cart'} size={20} color="white" />
            )}
            <Text className={`font-semibold text-base ${isSending ? 'text-gray-500' : 'text-white'}`}>
              {isSending
                ? 'Sending Fax...'
                : canSendNow
                ? paidPagesNeeded > 0
                  ? `Send Fax — $${estimatedCost}`
                  : 'Send Fax Now'
                : 'Buy Credits & Send'}
            </Text>
          </View>
        </Pressable>

        <Text className="text-gray-500 text-xs text-center mt-3">
          {isPro
            ? 'Unlimited faxing included with your Pro plan.'
            : `First ${FREE_PAGES_LIFETIME} pages free, then $0.99/page.`}
        </Text>
      </View>

      {/* ── Page Credit Paywall Modal ── */}
      <Modal
        visible={showPaywall}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaywall(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            {/* Handle */}
            <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-6" />

            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="document-text" size={32} color="#D97706" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                Free Pages Used
              </Text>
              <Text className="text-gray-500 text-center text-base leading-6">
                You've used your {FREE_PAGES_LIFETIME} free pages. Choose an option to continue:
              </Text>
            </View>

            {/* Option 1: Buy page credits */}
            <TouchableOpacity
              onPress={() => handleBuyPageCredits(paidPagesNeeded || 1)}
              disabled={isPurchasing}
              className="bg-blue-500 rounded-2xl p-4 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-blue-400 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="wallet" size={20} color="white" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">
                    Buy {paidPagesNeeded || 1} Page Credit{(paidPagesNeeded || 1) > 1 ? 's' : ''}
                  </Text>
                  <Text className="text-blue-200 text-sm">
                    ${((paidPagesNeeded || 1) * FAX_PRICE_PER_PAGE).toFixed(2)} — one-time purchase
                  </Text>
                </View>
              </View>
              {isPurchasing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="white" />
              )}
            </TouchableOpacity>

            {/* Option 2: Upgrade to Pro */}
            <TouchableOpacity
              onPress={() => {
                setShowPaywall(false);
                navigation.navigate('Subscription');
              }}
              className="bg-gray-900 rounded-2xl p-4 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-gray-700 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="star" size={20} color="#FBBF24" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">Upgrade to Pro</Text>
                  <Text className="text-gray-400 text-sm">Unlimited faxes, no per-page fees</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={() => setShowPaywall(false)}
              className="py-3 items-center"
            >
              <Text className="text-gray-500 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
