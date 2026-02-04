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

    // Debug logging
    console.log('🔧 [RC Init] Platform:', Platform.OS);
    console.log('🔧 [RC Init] API Key (first 10 chars):', apiKey?.substring(0, 10) + '...');
    console.log('🔧 [RC Init] API Key length:', apiKey?.length);

    // Configure SDK
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    await Purchases.configure({ apiKey });

    // Get app user ID after configure
    const appUserID = await Purchases.getAppUserID();
    console.log('🔧 [RC Init] App User ID:', appUserID);

    // Set user ID if provided (link to Firebase auth)
    if (userId) {
      console.log('🔧 [RC Init] Logging in with user ID:', userId);
      await Purchases.logIn(userId);
    }

    console.log('✅ RevenueCat initialized successfully');
  } catch (error: any) {
    console.error('❌ Failed to initialize RevenueCat:', error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error code:', error?.code);
    // Don't throw - app should work even if monetization fails
  }
};

/**
 * Get available offerings (subscription packages)
 */
export const getOfferings = async (): Promise<PurchasesOfferings | null> => {
  try {
    console.log('🔍 [RC Offerings] Starting fetch...');

    // Check if SDK is configured
    const isConfigured = await Purchases.isConfigured();
    console.log('🔍 [RC Offerings] SDK configured:', isConfigured);

    if (!isConfigured) {
      console.error('❌ [RC Offerings] SDK not configured! Call initializePurchases first.');
      return null;
    }

    const offerings = await Purchases.getOfferings();

    // Log raw offerings structure
    console.log('🔍 [RC Offerings] Raw offerings object keys:', Object.keys(offerings || {}));
    console.log('🔍 [RC Offerings] All offerings keys:', Object.keys(offerings?.all || {}));
    console.log('🔍 [RC Offerings] Current offering exists:', !!offerings?.current);

    if (offerings?.current) {
      console.log('🔍 [RC Offerings] Current offering identifier:', offerings.current.identifier);
      const packages = offerings.current.availablePackages || [];
      console.log('🔍 [RC Offerings] Available packages count:', packages.length);

      // Debug: Log all package details
      packages.forEach((pkg, index) => {
        console.log(`📦 [RC Package ${index}]:`, {
          identifier: pkg.identifier,
          packageType: pkg.packageType,
          productId: pkg.product?.identifier,
          price: pkg.product?.priceString,
          productTitle: pkg.product?.title,
        });
      });

      return offerings;
    }

    // Log what we got if no current offering
    console.warn('⚠️ [RC Offerings] No current offering!');
    console.log('🔍 [RC Offerings] All offerings detail:', JSON.stringify(offerings?.all, null, 2));

    // Check if there are any offerings at all
    const allOfferingIds = Object.keys(offerings?.all || {});
    if (allOfferingIds.length > 0) {
      console.log('🔍 [RC Offerings] Found offerings but none marked as current:', allOfferingIds);
      // Try to get the first one as fallback
      const firstOffering = offerings.all[allOfferingIds[0]];
      console.log('🔍 [RC Offerings] First offering packages:', firstOffering?.availablePackages?.length);
    }

    return offerings;
  } catch (error: any) {
    console.error('❌ [RC Offerings] Error fetching:', error);
    console.error('❌ [RC Offerings] Error name:', error?.name);
    console.error('❌ [RC Offerings] Error message:', error?.message);
    console.error('❌ [RC Offerings] Error code:', error?.code);
    console.error('❌ [RC Offerings] Error userInfo:', JSON.stringify(error?.userInfo, null, 2));
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

/**
 * Debug: Check products directly from StoreKit
 */
export const debugCheckProducts = async (): Promise<void> => {
  try {
    console.log('🔧 [RC Debug] Checking products directly...');

    const isConfigured = await Purchases.isConfigured();
    console.log('🔧 [RC Debug] Configured:', isConfigured);

    const appUserID = await Purchases.getAppUserID();
    console.log('🔧 [RC Debug] App User ID:', appUserID);

    // Try to get customer info
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('🔧 [RC Debug] Customer info received');
    console.log('🔧 [RC Debug] Active entitlements:', Object.keys(customerInfo.entitlements.active));
    console.log('🔧 [RC Debug] All purchased product IDs:', customerInfo.allPurchasedProductIdentifiers);

    // Try to get offerings
    console.log('🔧 [RC Debug] Fetching offerings...');
    const offerings = await Purchases.getOfferings();
    console.log('🔧 [RC Debug] Offerings fetched');
    console.log('🔧 [RC Debug] Has current:', !!offerings?.current);
    console.log('🔧 [RC Debug] All offering IDs:', Object.keys(offerings?.all || {}));

    if (offerings?.current) {
      console.log('🔧 [RC Debug] Current packages:', offerings.current.availablePackages.map(p => ({
        id: p.identifier,
        product: p.product?.identifier,
        price: p.product?.priceString
      })));
    }

  } catch (error: any) {
    console.error('🔧 [RC Debug] Error:', error?.message || error);
    console.error('🔧 [RC Debug] Full error:', JSON.stringify(error, null, 2));
  }
};

/**
 * Debug: Query StoreKit directly for specific product IDs
 * This bypasses RevenueCat offerings and checks if products exist in StoreKit
 */
export const checkStoreKitProducts = async (productIds: string[] = ['tigerfax_pro_monthly', 'tigerfax_pro_yearly']): Promise<void> => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏪 [StoreKit Check] Starting direct product validation...');
  console.log('🏪 [StoreKit Check] Product IDs to check:', productIds);
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const isConfigured = await Purchases.isConfigured();
    if (!isConfigured) {
      console.error('🏪 [StoreKit Check] ❌ RevenueCat not configured!');
      return;
    }

    // Use RevenueCat's getProducts to query StoreKit directly
    const products = await Purchases.getProducts(productIds);

    console.log('🏪 [StoreKit Check] ═══════════════════════════════════');
    console.log('🏪 [StoreKit Check] RESULTS:');
    console.log('🏪 [StoreKit Check] ═══════════════════════════════════');
    console.log('🏪 [StoreKit Check] Products requested:', productIds.length);
    console.log('🏪 [StoreKit Check] Products returned:', products.length);

    if (products.length === 0) {
      console.log('🏪 [StoreKit Check] ❌ NO PRODUCTS FOUND IN STOREKIT');
      console.log('🏪 [StoreKit Check] This means Apple servers have not propagated your products yet.');
      console.log('🏪 [StoreKit Check] Wait 2-24 hours after signing Paid Applications agreement.');
    } else {
      console.log('🏪 [StoreKit Check] ✅ PRODUCTS FOUND!');
      products.forEach((product, index) => {
        console.log(`🏪 [StoreKit Check] Product ${index + 1}:`, {
          identifier: product.identifier,
          title: product.title,
          description: product.description,
          price: product.priceString,
          currencyCode: product.currencyCode,
        });
      });
    }

    // Check which products are missing
    const foundIds = products.map(p => p.identifier);
    const missingIds = productIds.filter(id => !foundIds.includes(id));
    if (missingIds.length > 0) {
      console.log('🏪 [StoreKit Check] ⚠️ Missing products:', missingIds);
    }

    console.log('🏪 [StoreKit Check] ═══════════════════════════════════');

  } catch (error: any) {
    console.error('🏪 [StoreKit Check] ❌ Error querying StoreKit:', error?.message);
    console.error('🏪 [StoreKit Check] Error code:', error?.code);
  }
};
