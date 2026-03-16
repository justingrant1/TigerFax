import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
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

// Safe haptics wrapper
const safeHaptics = {
  impact: async (style: Haptics.ImpactFeedbackStyle) => {
    try { await Haptics.impactAsync(style); } catch {}
  },
  notification: async (type: Haptics.NotificationFeedbackType) => {
    try { await Haptics.notificationAsync(type); } catch {}
  },
};

export default function FaxReviewScreen() {
  const navigation = useNavigation<FaxReviewNavProp>();
  const { user, userData } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { currentFax, sendFax, clearCurrentFax } = useFaxStore();

  const totalPages = currentFax.documents.length + (currentFax.coverPage ? 1 : 0);

  // ── Pricing logic ──────────────────────────────────────────────────────────
  const isPro = userData?.subscriptionTier === 'pro';
  const freePagesLeft = userData?.freePagesRemaining ?? 0;
  const paidCredits = userData?.creditsRemaining ?? 0;

  // Pages covered by free allowance
  const freePagesCovered = isPro ? 0 : Math.min(freePagesLeft, totalPages);
  // Pages that need payment (either from existing credits or new purchase)
  const paidPagesNeeded = isPro ? 0 : Math.max(0, totalPages - freePagesLeft);
  // Cost for the paid portion
  const paidCost = (paidPagesNeeded * FAX_PRICE_PER_PAGE).toFixed(2);

  // Can the user send right now without buying more credits?
  const canSendWithCredits =
    isPro ||
    freePagesLeft >= totalPages ||
    (freePagesLeft + paidCredits) >= totalPages;

  // Needs to purchase before sending
  const needsPurchase = !isPro && paidPagesNeeded > 0 && paidCredits < paidPagesNeeded;

  // ── Purchase credits then immediately send ─────────────────────────────────
  const handlePurchaseAndSend = useCallback(async () => {
    if (!user) return;
    setIsPurchasing(true);
    try {
      safeHaptics.impact(Haptics.ImpactFeedbackStyle.Medium);

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

      // Trigger Apple IAP sheet — this is the only "paywall" the user sees
      await Purchases.purchasePackage(pkg);

      // Grant the credits in Firestore
      await addPageCredits(user.uid, paidPagesNeeded);

      safeHaptics.notification(Haptics.NotificationFeedbackType.Success);

      // Immediately send the fax — no extra tap required
      setIsPurchasing(false);
      setIsSending(true);
      await sendFax();
      clearCurrentFax();

      safeHaptics.notification(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Fax Sent! 🎉',
        'Payment confirmed and your fax has been queued for delivery. Check the History tab for status.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert('Purchase Failed', err?.message ?? 'Please try again.');
      }
    } finally {
      setIsPurchasing(false);
      setIsSending(false);
    }
  }, [user, paidPagesNeeded, sendFax, clearCurrentFax, navigation]);

  // ── Send fax (user already has enough credits/free pages) ──────────────────
  const handleSendFax = async () => {
    try {
      setIsSending(true);
      safeHaptics.impact(Haptics.ImpactFeedbackStyle.Heavy);

      await sendFax();
      clearCurrentFax();

      safeHaptics.notification(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Fax Sent! 🎉',
        'Your fax has been queued for delivery. You can check the status in the History tab.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      safeHaptics.notification(Haptics.NotificationFeedbackType.Error);
      const { title, message } = formatErrorForDisplay(error);
      Alert.alert(title, message);
    } finally {
      setIsSending(false);
    }
  };

  // ── Main CTA handler ───────────────────────────────────────────────────────
  const handleMainAction = () => {
    if (needsPurchase) {
      handlePurchaseAndSend();
    } else {
      handleSendFax();
    }
  };

  const isLoading = isSending || isPurchasing;

  // ── Button label & style ───────────────────────────────────────────────────
  let buttonLabel = 'Send Fax Now';
  let buttonIcon: keyof typeof Ionicons.glyphMap = 'send';
  let buttonBg = 'bg-blue-500 active:bg-blue-600';

  if (isLoading) {
    buttonLabel = isPurchasing ? 'Processing Payment…' : 'Sending Fax…';
    buttonBg = 'bg-gray-300';
  } else if (isPro) {
    buttonLabel = 'Send Fax — Free (Pro)';
    buttonIcon = 'send';
    buttonBg = 'bg-green-500 active:bg-green-600';
  } else if (needsPurchase) {
    buttonLabel = `Send Fax — $${paidCost}`;
    buttonIcon = 'card';
    buttonBg = 'bg-blue-500 active:bg-blue-600';
  } else if (paidPagesNeeded > 0) {
    // Has enough credits to cover
    buttonLabel = `Send Fax — uses ${paidPagesNeeded} credit${paidPagesNeeded > 1 ? 's' : ''}`;
    buttonIcon = 'wallet';
    buttonBg = 'bg-blue-500 active:bg-blue-600';
  } else {
    // Fully covered by free pages
    buttonLabel = freePagesCovered > 0 ? 'Send Fax — Free' : 'Send Fax Now';
    buttonIcon = 'send';
    buttonBg = 'bg-blue-500 active:bg-blue-600';
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 py-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-1">Review & Send</Text>
          <Text className="text-gray-500">Double-check everything before sending</Text>
        </View>

        {/* Recipient Info */}
        <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center space-x-3">
            <View className="w-9 h-9 bg-blue-100 rounded-xl items-center justify-center">
              <Ionicons name="call" size={18} color="#2563EB" />
            </View>
            <View>
              <Text className="text-xs text-blue-500 font-medium uppercase tracking-wide">Sending To</Text>
              <Text className="text-gray-900 text-base font-semibold">{currentFax.recipient}</Text>
            </View>
          </View>
        </View>

        {/* Cover Page Info */}
        {currentFax.coverPage && (
          <View className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center space-x-3 mb-3">
              <View className="w-9 h-9 bg-green-100 rounded-xl items-center justify-center">
                <Ionicons name="document-text" size={18} color="#059669" />
              </View>
              <Text className="text-gray-900 font-semibold">Cover Page</Text>
            </View>
            <View className="ml-12 space-y-1">
              <Text className="text-gray-700 text-sm">To: {currentFax.coverPage.to}</Text>
              <Text className="text-gray-700 text-sm">From: {currentFax.coverPage.from}</Text>
              {currentFax.coverPage.subject ? (
                <Text className="text-gray-700 text-sm">Subject: {currentFax.coverPage.subject}</Text>
              ) : null}
              {currentFax.coverPage.message ? (
                <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>
                  {currentFax.coverPage.message}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Documents */}
        <View className="mb-4">
          <View className="flex-row items-center space-x-3 mb-3">
            <View className="w-9 h-9 bg-red-100 rounded-xl items-center justify-center">
              <Ionicons name="documents" size={18} color="#DC2626" />
            </View>
            <Text className="text-gray-900 font-semibold">
              Documents ({currentFax.documents.length})
            </Text>
          </View>
          <View className="ml-12">
            <DocumentList documents={currentFax.documents} readonly />
          </View>
        </View>

        {/* ── Cost Summary Card ── */}
        <View className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-4">
          <Text className="text-base font-semibold text-gray-900 mb-4">Fax Summary</Text>

          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-500">Total pages</Text>
              <Text className="text-gray-900 font-medium">{totalPages}</Text>
            </View>

            {currentFax.coverPage ? (
              <View className="flex-row justify-between">
                <Text className="text-gray-500">  • Cover page</Text>
                <Text className="text-gray-700">1</Text>
              </View>
            ) : null}

            <View className="flex-row justify-between">
              <Text className="text-gray-500">  • Documents</Text>
              <Text className="text-gray-700">{currentFax.documents.length}</Text>
            </View>

            <View className="h-px bg-gray-200 my-2" />

            {/* Pricing breakdown */}
            {isPro ? (
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-500">Cost</Text>
                <View className="flex-row items-center space-x-1">
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text className="text-green-600 font-semibold">Free (Pro plan)</Text>
                </View>
              </View>
            ) : (
              <>
                {freePagesCovered > 0 && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500">
                      Free pages ({freePagesCovered}/{FREE_PAGES_LIFETIME})
                    </Text>
                    <Text className="text-green-600 font-medium">$0.00</Text>
                  </View>
                )}
                {paidPagesNeeded > 0 && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500">
                      Paid pages ({paidPagesNeeded} × $0.99)
                    </Text>
                    <Text className="text-gray-900 font-medium">${paidCost}</Text>
                  </View>
                )}
                <View className="flex-row justify-between pt-1">
                  <Text className="text-gray-900 font-semibold">Total</Text>
                  <Text className={`font-bold text-base ${paidPagesNeeded === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {paidPagesNeeded === 0 ? '$0.00' : `$${paidCost}`}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Credits wallet balance (non-Pro, has credits) */}
        {!isPro && paidCredits > 0 && (
          <View className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-4 flex-row items-center space-x-3">
            <Ionicons name="wallet" size={18} color="#2563EB" />
            <Text className="text-blue-700 text-sm flex-1">
              You have <Text className="font-semibold">{paidCredits} page credit{paidCredits !== 1 ? 's' : ''}</Text> in your wallet
            </Text>
          </View>
        )}

        {/* Trust signal when purchase is needed */}
        {needsPurchase && (
          <View className="flex-row items-center justify-center space-x-2 mb-2">
            <Ionicons name="lock-closed" size={13} color="#9CA3AF" />
            <Text className="text-gray-400 text-xs">Secure payment via Apple — charged only on confirm</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Action Area ── */}
      <View className="px-6 pb-6 pt-4 border-t border-gray-100 bg-white">
        {/* Main CTA */}
        <Pressable
          onPress={handleMainAction}
          disabled={isLoading}
          className={`rounded-2xl p-4 mb-3 ${isLoading ? 'bg-gray-200' : buttonBg}`}
        >
          <View className="flex-row items-center justify-center space-x-2">
            {isLoading ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Ionicons name={buttonIcon} size={20} color="white" />
            )}
            <Text className={`font-bold text-base ${isLoading ? 'text-gray-400' : 'text-white'}`}>
              {buttonLabel}
            </Text>
          </View>
        </Pressable>

        {/* Subtle Pro upsell — only shown to non-Pro users */}
        {!isPro && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Subscription')}
            className="flex-row items-center justify-center space-x-1 py-2"
            activeOpacity={0.6}
          >
            <Ionicons name="star" size={13} color="#FBBF24" />
            <Text className="text-gray-400 text-xs">
              Upgrade to <Text className="text-blue-500 font-semibold">Pro</Text> for unlimited faxes — no per-page fees
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* Fine print */}
        <Text className="text-gray-400 text-xs text-center mt-1">
          {isPro
            ? 'Unlimited faxing included with your Pro plan.'
            : `First ${FREE_PAGES_LIFETIME} pages free, then $0.99/page.`}
        </Text>
      </View>
    </View>
  );
}
