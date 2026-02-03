# 🚨 SUBSCRIPTION FIX - Missing Metadata in App Store Connect

## ❌ The Problem (From Your Screenshots)

Your App Store Connect shows:
- ✅ Pro Monthly (`tigerfax_pro_monthly`) - **⚠️ Missing Metadata**
- ✅ Pro Yearly (`tigerfax_pro_yearly`) - **⚠️ Missing Metadata**

**Apple will NOT return products to RevenueCat until the metadata is complete!**

## ✅ The Fix - Complete Subscription Metadata

### Step 1: Go to App Store Connect
Navigate to: **App Store Connect → TigerFax → Subscriptions → TigerFax Pro group**

Click on **"Pro Monthly"** (the subscription itself, not the group):

**Scroll down to the "Localization" section and click "English (U.S.)" or "+ Add Localization":**

Fill in these fields:
- **Display Name:** `TigerFax Pro (Monthly)`
- **Description:** `Unlimited fax sending premium features, billed monthly.`

This is what shows in the App Store purchase sheet and payment confirmation.

**Click "Save"**

### Step 3: Complete "Pro Yearly" Metadata

Click on **"Pro Yearly"** and repeat the same process:

#### A. Subscription Localization
- **Display Name:** `TigerFax Pro Yearly`
- **Description:** `Send unlimited faxes and receive faxes with your own dedicated fax number. Billed annually. Save 16%!`

#### B. App Store Localization
- **Subscription Name:** `Pro Yearly`
- **Description:** `Unlimited faxing + dedicated fax number. Best value!`

### Step 4: Save and Wait

1. Click **"Save"** on both subscriptions
2. **Wait 15-30 minutes** for Apple's servers to propagate
3. Status should change from "Missing Metadata" to "Ready to Submit"

### Step 5: Sync in RevenueCat

After metadata is complete:

1. Go to **RevenueCat Dashboard → Project Settings → Apple App Store**
2. Click **"Sync Products"** or **"Add Products"**
3. RevenueCat will re-fetch the products from Apple
4. Products should now have complete info

### Step 6: Test the App

```bash
# Restart your dev app completely
# Kill the app and relaunch
```

Check console logs - you should now see:
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

## 📝 Quick Template for Copy/Paste

### Pro Monthly
**Display Name:** TigerFax Pro Monthly
**Description:** Send unlimited faxes and receive faxes with your own dedicated fax number. Billed monthly.
**App Store Name:** Pro Monthly  
**App Store Description:** Unlimited faxing + dedicated fax number

### Pro Yearly
**Display Name:** TigerFax Pro Yearly
**Description:** Send unlimited faxes and receive faxes with your own dedicated fax number. Billed annually. Save 16%!
**App Store Name:** Pro Yearly
**App Store Description:** Unlimited faxing + dedicated fax number. Best value!

## 🎯 Why This Happens

- Apple requires complete metadata before products are available via StoreKit
- RevenueCat can only fetch products that Apple's StoreKit returns
- "Missing Metadata" = Apple won't serve the product to any API calls
- Once metadata is complete, products become available immediately

## ✅ After Fix

Once complete, your subscription screen will show:
- ✅ Pro Yearly plan card with pricing
- ✅ Pro Monthly plan card with pricing
- ✅ Free plan card
- ✅ Purchase buttons working
- ✅ No more "Subscription options unavailable" error

## 🚀 Then You Can Submit to TestFlight

After subscriptions are working:
```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios
```

---

**This is the only thing blocking your subscriptions!** Complete the metadata in App Store Connect and you're good to go! 🎉
