/**
 * RevenueCat Purchases Service
 * Handles all subscription and in-app purchase logic
 */

import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API Keys from environment
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'YOUR_IOS_KEY_HERE';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'YOUR_ANDROID_KEY_HERE';

/**
 * Initialize RevenueCat SDK
 * Should be called early in app lifecycle
 */
export const initializePurchases = async (userId?: string): Promise<void> => {
  try {
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    
    // Configure SDK
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    await Purchases.configure({ apiKey });

    // Set user ID if provided (link to Firebase auth)
    if (userId) {
      await Purchases.logIn(userId);
    }

    console.log('✅ RevenueCat initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize RevenueCat:', error);
    // Don't throw - app should work even if monetization fails
  }
};

/**
 * Get available offerings (subscription packages)
 */
export const getOfferings = async (): Promise<PurchasesOfferings | null> => {
  try {
    console.log('🔍 Fetching RevenueCat offerings...');
    const offerings = await Purchases.getOfferings();
    
    if (offerings.current !== null) {
      const packages = offerings.current.availablePackages;
      console.log('✅ Available offerings:', packages.length);
      
      // Debug: Log all package details
      packages.forEach(pkg => {
        console.log('📦 Package:', {
          identifier: pkg.identifier,
          packageType: pkg.packageType,
          productId: pkg.product.identifier,
          price: pkg.product.priceString,
        });
      });
      
      return offerings;
    }
    
    console.warn('⚠️ No current offering configured in RevenueCat');
    console.log('All offerings:', JSON.stringify(offerings, null, 2));
    return null;
  } catch (error) {
    console.error('❌ Error fetching offerings:', error);
    return null;
  }
};

/**
 * Purchase a subscription or consumable package
 */
export const purchasePackage = async (
  packageToPurchase: PurchasesPackage
): Promise<CustomerInfo> => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    console.log('✅ Purchase successful!', customerInfo.entitlements.active);
    return customerInfo;
  } catch (error: any) {
    // Handle user cancellation separately
    if (error.userCancelled) {
      throw new Error('Purchase was cancelled');
    }
    
    console.error('Purchase error:', error);
    throw new Error(error.message || 'Purchase failed. Please try again.');
  }
};

/**
 * Restore previous purchases
 * Important for users who reinstall the app
 */
export const restorePurchases = async (): Promise<CustomerInfo> => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log('✅ Purchases restored:', customerInfo.entitlements.active);
    return customerInfo;
  } catch (error) {
    console.error('Error restoring purchases:', error);
    throw new Error('Failed to restore purchases. Please try again.');
  }
};

/**
 * Get current customer info
 * Includes active subscriptions and entitlements
 */
export const getCustomerInfo = async (): Promise<CustomerInfo> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Error getting customer info:', error);
    throw error;
  }
};

/**
 * Check if user has a specific entitlement
 */
export const checkEntitlement = (
  customerInfo: CustomerInfo,
  entitlementId: string
): boolean => {
  return typeof customerInfo.entitlements.active[entitlementId] !== 'undefined';
};

/**
 * Check if user has Pro subscription
 */
export const hasProSubscription = (customerInfo: CustomerInfo): boolean => {
  return checkEntitlement(customerInfo, 'pro_features');
};

/**
 * Get subscription tier from customer info
 */
export const getSubscriptionTier = (
  customerInfo: CustomerInfo
): 'free' | 'pro' | 'credits' => {
  if (hasProSubscription(customerInfo)) {
    return 'pro';
  }
  
  // Check if user has any active non-subscription entitlements (credits)
  const activeEntitlements = Object.keys(customerInfo.entitlements.active);
  if (activeEntitlements.some(id => id.includes('credits'))) {
    return 'credits';
  }
  
  return 'free';
};

/**
 * Log out current user (when signing out of app)
 */
export const logoutPurchases = async (): Promise<void> => {
  try {
    await Purchases.logOut();
    console.log('✅ RevenueCat user logged out');
  } catch (error) {
    console.error('Error logging out of RevenueCat:', error);
  }
};

/**
 * Switch user (when switching Firebase accounts)
 */
export const switchUser = async (newUserId: string): Promise<void> => {
  try {
    await Purchases.logIn(newUserId);
    console.log('✅ RevenueCat user switched to:', newUserId);
  } catch (error) {
    console.error('Error switching RevenueCat user:', error);
  }
};
