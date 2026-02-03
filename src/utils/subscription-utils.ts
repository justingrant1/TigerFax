/**
 * Subscription Utilities
 * Helper functions for subscription management and feature gating
 */

import { CustomerInfo } from 'react-native-purchases';
import { UserData } from '../contexts/AuthContext';
import { updateSubscriptionTier } from '../services/firestore';
import { hasProSubscription } from '../services/purchases';

/**
 * Check if user can send a fax based on their subscription and usage
 */
export const canSendFax = (userData: UserData, customerInfo?: CustomerInfo): {
  canSend: boolean;
  reason?: string;
} => {
  // Pro users have unlimited faxes
  if (userData.subscriptionTier === 'pro' || (customerInfo && hasProSubscription(customerInfo))) {
    return { canSend: true };
  }

  // Credits users - check credits remaining
  if (userData.subscriptionTier === 'credits') {
    if (userData.creditsRemaining > 0) {
      return { canSend: true };
    }
    return {
      canSend: false,
      reason: 'no_credits',
    };
  }

  // Free tier - check monthly limit
  if (userData.faxesRemaining > 0) {
    return { canSend: true };
  }

  return {
    canSend: false,
    reason: 'free_limit_reached',
  };
};

/**
 * Get user-friendly upgrade message based on reason
 */
export const getUpgradeMessage = (reason: string): {
  title: string;
  message: string;
} => {
  switch (reason) {
    case 'free_limit_reached':
      return {
        title: 'Monthly Limit Reached',
        message: "You've used all 3 free faxes this month. Upgrade to Pro for unlimited faxes or buy credits to continue.",
      };
    case 'no_credits':
      return {
        title: 'No Credits Remaining',
        message: 'Purchase more fax credits to continue sending, or upgrade to Pro for unlimited faxes.',
      };
    case 'pro_feature':
      return {
        title: 'Pro Feature',
        message: 'This feature is only available with a Pro subscription. Upgrade now to unlock all features!',
      };
    default:
      return {
        title: 'Upgrade Required',
        message: 'Please upgrade your subscription to continue using this feature.',
      };
  }
};

/**
 * Sync RevenueCat subscription status to Firestore
 * Call this after purchases or on app start
 */
export const syncSubscriptionStatus = async (
  uid: string,
  customerInfo: CustomerInfo
): Promise<void> => {
  try {
    // Determine tier from RevenueCat
    const hasPro = hasProSubscription(customerInfo);
    
    if (hasPro) {
      await updateSubscriptionTier(uid, 'pro');
      console.log('✅ Synced Pro subscription to Firestore');
    } else {
      // Check if they had Pro but it expired
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      if (activeEntitlements.length === 0) {
        // No active subscriptions, revert to free
        await updateSubscriptionTier(uid, 'free');
        console.log('✅ Reverted to Free tier in Firestore');
      }
    }
  } catch (error) {
    console.error('Error syncing subscription status:', error);
  }
};

/**
 * Handle successful purchase
 * Update Firestore and provide feedback
 */
export const handlePurchaseSuccess = async (
  uid: string,
  customerInfo: CustomerInfo
): Promise<{ tier: 'free' | 'pro' | 'credits'; message: string }> => {
  try {
    await syncSubscriptionStatus(uid, customerInfo);
    
    if (hasProSubscription(customerInfo)) {
      return {
        tier: 'pro',
        message: '🎉 Welcome to Pro! You now have unlimited faxes and access to all premium features.',
      };
    }
    
    // Check for credit purchases
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);
    if (activeEntitlements.some(id => id.includes('credits'))) {
      return {
        tier: 'credits',
        message: '✅ Credits added successfully! You can now send more faxes.',
      };
    }
    
    return {
      tier: 'free',
      message: '✅ Purchase completed successfully!',
    };
  } catch (error) {
    console.error('Error handling purchase success:', error);
    return {
      tier: 'free',
      message: '⚠️ Purchase completed but there was an error syncing. Please restart the app.',
    };
  }
};

/**
 * Format price for display
 */
export const formatPrice = (price: number, currencyCode: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(price);
};

/**
 * Calculate savings for yearly subscription
 */
export const calculateYearlySavings = (monthlyPrice: number, yearlyPrice: number): {
  amount: number;
  percentage: number;
} => {
  const monthlyTotal = monthlyPrice * 12;
  const savings = monthlyTotal - yearlyPrice;
  const percentage = Math.round((savings / monthlyTotal) * 100);
  
  return {
    amount: savings,
    percentage,
  };
};

/**
 * Get feature list for each tier
 */
export const getTierFeatures = (tier: 'free' | 'pro' | 'credits'): string[] => {
  switch (tier) {
    case 'free':
      return [
        '3 faxes per month',
        'Basic document scanning',
        'Send to any fax number',
        'Fax history (30 days)',
      ];
    case 'pro':
      return [
        'Unlimited faxes',
        'AI-powered enhancements',
        'Priority support',
        'Advanced scanning features',
        'Unlimited history',
        'Incoming fax number',
        'Cover page templates',
      ];
    case 'credits':
      return [
        'Pay only for what you use',
        'No monthly commitment',
        'Credits never expire',
        'All free tier features',
      ];
    default:
      return [];
  }
};

/**
 * Check if feature requires Pro subscription
 */
export const requiresProSubscription = (featureId: string): boolean => {
  const proFeatures = [
    'ai_enhancement',
    'cover_templates',
    'priority_support',
    'incoming_fax',
    'advanced_filters',
  ];
  
  return proFeatures.includes(featureId);
};
