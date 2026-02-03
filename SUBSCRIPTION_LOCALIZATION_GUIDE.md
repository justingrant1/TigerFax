# 📱 App Store Connect Localization - The Two Places Explained

## 🎯 The Confusion: There Are TWO Different Localization Sections!

### 1️⃣ Individual Subscription Localization (What You Need!)
**Location:** Each subscription (Pro Monthly, Pro Yearly) has its own localization
**What it's for:** Shows in the purchase dialog when users buy the subscription

### 2️⃣ Subscription Group Localization (Optional)
**Location:** On the TigerFax Pro group page
**What it's for:** Shows when users manage subscriptions in iPhone Settings

---

## ✅ What You MUST Fill In (To Fix "Missing Metadata")

### Step 1: Fill Individual Subscription Localization

#### For "Pro Monthly" Subscription:
1. Click **"Pro Monthly"** link (from the TigerFax Pro group page)
2. Scroll down to **"Localization"** section (bottom of page)
3. You'll see a table - click **"English (U.S.)"** or click **"Create"** button
4. Fill in:
   ```
   Display Name: TigerFax Pro (Monthly)
   Description: Unlimited fax sending premium features, billed monthly.
   ```
5. Click **"Save"**

#### For "Pro Yearly" Subscription:
1. Go back and click **"Pro Yearly"** link
2. Scroll down to **"Localization"** section
3. Click **"English (U.S.)"** or **"Create"**
4. Fill in:
   ```
   Display Name: TigerFax Pro (Yearly)
   Description: Unlimited fax sending premium features, billed annually. Save 16%!
   ```
5. Click **"Save"**

**This is what fixes the "Missing Metadata" warning! ✅**

---

### Step 2: Fill Subscription Group Localization (Optional but Recommended)

#### For the "TigerFax Pro" Group:
1. From Subscriptions page, click **"TigerFax Pro"** (the group name)
2. Scroll down to **"Localization"** section (at the very bottom)
3. Click **"Create"** button
4. Select **"English (U.S.)"**
5. Fill in:
   ```
   Subscription Group Display Name: TigerFax Pro
   App Name: TigerFax
   ```
6. Click **"Save"**

**This just makes it look nicer in Settings - not required for StoreKit!**

---

## 📊 Visual Guide

```
App Store Connect Structure:

📁 Subscriptions
  └─ 📁 TigerFax Pro (GROUP) ← Has its own localization (optional)
      ├─ 📄 Pro Monthly (SUBSCRIPTION) ← Has its own localization (REQUIRED) ⚠️
      └─ 📄 Pro Yearly (SUBSCRIPTION) ← Has its own localization (REQUIRED) ⚠️
```

---

## 🎯 Quick Summary

**What you see in your screenshots:**

1. **Screenshot 1** (Pro Monthly page): Shows the **Individual Subscription Localization**
   - This is what you need to fill to fix "Missing Metadata" ✅
   - Shows as "Prepare for Submission" status

2. **Screenshot 2** (TigerFax Pro group page): Shows the **Subscription Group Localization**
   - This is optional (for iPhone Settings display)
   - Has a "Create" button

**The one you NEED to fix is #1 - Individual Subscription Localization for both Pro Monthly and Pro Yearly!**

---

## ✅ After You Fill Them

**You should see:**
- Pro Monthly status: "Missing Metadata" → "Prepare for Submission" ✅
- Pro Yearly status: "Missing Metadata" → "Prepare for Submission" ✅

Then wait 15-30 minutes and sync in RevenueCat!

---

## 🚀 Copy/Paste Values

### Pro Monthly Localization:
```
Display Name: TigerFax Pro (Monthly)
Description: Unlimited fax sending premium features, billed monthly.
```

### Pro Yearly Localization:
```
Display Name: TigerFax Pro (Yearly)
Description: Unlimited fax sending premium features, billed annually. Save 16%!
```

### Group Localization (Optional):
```
Subscription Group Display Name: TigerFax Pro
App Name: TigerFax
```

---

**Focus on filling the Individual Subscription Localization for both Pro Monthly and Pro Yearly - that's what fixes the error!** 🎉
