# RevenueCat Subscription Issue - Troubleshooting Guide

## 🔍 Issue
"Subscription options unavailable. No subscription offerings available right now."

## ✅ Fixes Applied
1. ✅ Fixed product ID matching in `SubscriptionScreen.tsx` 
   - Added support for both `tigerfax_pro_monthly` and `tigerfax.pro.monthly`
   - Added support for both `tigerfax_pro_yearly` and `tigerfax.pro.yearly`

2. ✅ Added detailed debug logging in `purchases.ts`
   - Will now show all available packages in console
   - Shows product IDs, identifiers, and package types

## 🎯 Next Steps to Fix

### Step 1: Check Your Console Logs
After restarting the app, check the Metro/Expo console for these logs:
```
🔍 Fetching RevenueCat offerings...
✅ Available offerings: X
📦 Package: { identifier: '...', packageType: '...', productId: '...', price: '...' }
```

This will tell us what RevenueCat is actually returning.

### Step 2: Verify RevenueCat Dashboard Configuration

**Go to RevenueCat Dashboard → Your Project → Offerings**

#### A. Check Products are Created
1. Navigate to **Products** section
2. Verify these products exist:
   - `tigerfax_pro_monthly` (iOS product)
   - `tigerfax_pro_yearly` (iOS product)
3. Each product should be:
   - **Type:** Subscription (Auto-renewable)
   - **Platform:** iOS
   - **Product ID:** Exactly matching App Store Connect

#### B. Check Offering Configuration
1. Navigate to **Offerings** section
2. You should have an offering called **"default"**
3. The "default" offering should be marked as **Current**
4. Inside the "default" offering, you should see packages:
   - **Monthly package** → Attached to `tigerfax_pro_monthly`
   - **Annual/Yearly package** → Attached to `tigerfax_pro_yearly`

#### C. Check Entitlements
1. Navigate to **Entitlements** section
2. Verify `pro_features` entitlement exists
3. Both products should be attached to this entitlement

### Step 3: Verify App Store Connect Configuration

**Go to App Store Connect → Your App → In-App Purchases**

1. Create subscriptions if they don't exist:
   - Product ID: `tigerfax_pro_monthly`
   - Product ID: `tigerfax_pro_yearly`

2. For each subscription:
   - **Type:** Auto-Renewable Subscription
   - **Subscription Group:** Create one called "TigerFax Pro"
   - **Pricing:** Set your prices
   - **Status:** Ready to Submit (or Approved)

3. **IMPORTANT:** Add a Sandbox Tester
   - Go to App Store Connect → Users and Access → Sandbox Testers
   - Add a test Apple ID
   - Use this account on your device for testing

### Step 4: Link Products in RevenueCat

After creating products in App Store Connect:

1. Go to RevenueCat Dashboard → **Project Settings** → **Apple App Store**
2. Click **Add Products**
3. RevenueCat will fetch products from App Store Connect
4. You should see `tigerfax_pro_monthly` and `tigerfax_pro_yearly` appear
5. If not, verify your **Bundle ID** matches: `com.tigerfax.app`

### Step 5: Rebuild and Test

After configuring everything:

```bash
# Clear Metro cache and restart
rm -rf node_modules/.cache
npx expo start --clear

# Or rebuild the app
npx expo run:ios
```

## 🐛 Common Issues

### Issue 1: "No current offering"
**Solution:** Set "default" offering as Current in RevenueCat dashboard

### Issue 2: "Products not found"
**Solution:** 
- Verify Bundle ID matches exactly: `com.tigerfax.app`
- Wait 15-30 minutes after creating products in App Store Connect
- Sync products in RevenueCat dashboard

### Issue 3: "Offerings empty array"
**Solution:**
- Ensure products are attached to packages in the "default" offering
- Check that packages are not archived or deleted

### Issue 4: "Cannot connect to iTunes Store" (in sandbox)
**Solution:**
- Sign out of App Store on device
- Sign in with Sandbox Tester account when prompted
- Must use physical device (simulator doesn't support purchases)

## 📱 Testing in Development

### For Development Testing (Before TestFlight)
The app needs to be running on a **physical device** for IAP testing:

```bash
# Build and run on physical device
npx expo run:ios --device
```

- Simulator will NOT work for subscription testing
- Must use Sandbox Tester account
- Purchases are free in sandbox mode

### For TestFlight Testing
Once you submit to TestFlight:
- Subscriptions will work with sandbox mode
- Testers can use their real Apple IDs
- Purchases are still free for internal testing

## 🔧 Quick Fix Checklist

- [ ] Products created in App Store Connect with correct IDs
- [ ] Products synced in RevenueCat dashboard
- [ ] "default" offering exists and is set as Current
- [ ] Monthly and Yearly packages added to "default" offering
- [ ] Packages attached to correct product IDs
- [ ] `pro_features` entitlement created
- [ ] Both products attached to `pro_features` entitlement
- [ ] Bundle ID matches: `com.tigerfax.app`
- [ ] App restarted after configuration changes
- [ ] Testing on physical device (not simulator)
- [ ] Signed in with Sandbox Tester account

## 📊 Expected Debug Output (After Fix)

When working correctly, you should see:
```
🔍 Fetching RevenueCat offerings...
✅ Available offerings: 2
📦 Package: {
  identifier: '$rc_monthly',
  packageType: 'MONTHLY',
  productId: 'tigerfax_pro_monthly',
  price: '$14.99'
}
📦 Package: {
  identifier: '$rc_annual',
  packageType: 'ANNUAL',
  productId: 'tigerfax_pro_yearly',
  price: '$149.99'
}
```

## 🚀 After Fixing

Once subscriptions load:
1. Test purchasing (will be free in sandbox)
2. Test restore purchases
3. Verify Pro features unlock
4. Proceed with TestFlight build

## 📝 Important Notes

- RevenueCat configuration can take 5-15 minutes to propagate
- Always restart app after dashboard changes
- Sandbox testing requires physical device
- Products must be "Ready to Submit" in App Store Connect (don't need to be approved)

---

**Most Likely Issue:** The "default" offering in RevenueCat is not properly configured with packages, or products haven't been synced from App Store Connect.

**Check RevenueCat Dashboard First!**
