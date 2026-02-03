# 🚀 Phase 7: RevenueCat Monetization - Implementation Plan

> **Status:** In Progress  
> **Start Date:** February 2, 2026  
> **Estimated Duration:** 2-3 days

---

## 🎯 Objective

Implement a complete subscription and in-app purchase system using RevenueCat to monetize the TigerFax app with three tiers: Free, Pro, and Pay-per-use.

---

## 📋 Implementation Checklist

### Task 7.1: RevenueCat & App Store Connect Setup ⏳
**Estimated Time:** 30 minutes (manual setup in dashboards)

**Prerequisites:**
- Apple Developer Account ($99/year)
- RevenueCat account (free tier available)

**Steps:**
1. Create RevenueCat account at https://www.revenuecat.com/
2. Create new app in RevenueCat dashboard
3. Get RevenueCat API keys (iOS, Android)
4. Create App Store Connect app listing
5. Set up In-App Purchases in App Store Connect:
   - **Subscriptions:**
     - `tigerfax_pro_monthly` - $14.99/month - "Pro Monthly"
     - `tigerfax_pro_yearly` - $149.99/year - "Pro Yearly" (save $29/year)
   - **Consumables:**
     - `tigerfax_credits_3` - $4.99 - "3 Fax Credits"
     - `tigerfax_credits_10` - $14.99 - "10 Fax Credits"
     - `tigerfax_credits_25` - $34.99 - "25 Fax Credits"
6. Configure products in RevenueCat
7. Set up entitlements: `pro_features`

**Deliverables:**
- RevenueCat API keys added to .env
- Products configured and ready for testing

---

### Task 7.2: Install & Configure RevenueCat SDK ✅
**Estimated Time:** 1 hour

**Steps:**
1. ✅ Install `react-native-purchases` package
2. ✅ Add RevenueCat API key to environment variables
3. ✅ Create `src/services/purchases.ts` service
4. ✅ Initialize SDK in App.tsx
5. ✅ Set up user identification (link to Firebase auth)
6. ✅ Add error handling and logging
7. ✅ Test basic SDK initialization

**Files to Create:**
- `src/services/purchases.ts` - RevenueCat service wrapper
- Update `.env` with `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

**Key Functions:**
```typescript
- initializePurchases(): Promise<void>
- getOfferings(): Promise<Offerings>
- purchasePackage(packageToPurchase: Package): Promise<CustomerInfo>
- restorePurchases(): Promise<CustomerInfo>
- getCustomerInfo(): Promise<CustomerInfo>
- checkEntitlement(entitlementId: string): boolean
```

---

### Task 7.3: Create Subscription Paywall Screen ✅
**Estimated Time:** 4-5 hours

**Steps:**
1. ✅ Design 3-tier comparison UI
2. ✅ Create SubscriptionScreen component
3. ✅ Fetch offerings from RevenueCat
4. ✅ Display pricing dynamically
5. ✅ Implement purchase flow
6. ✅ Add loading states
7. ✅ Handle purchase success/failure
8. ✅ Implement "Restore Purchases" button
9. ✅ Add legal links (Terms & Privacy)
10. ✅ Navigate from Profile screen

**Files to Create:**
- `src/screens/SubscriptionScreen.tsx`
- `src/components/PricingCard.tsx` (optional component)

**Features:**
- Free tier: 3 faxes/month
- Pro tier: Unlimited faxes + AI features + incoming fax
- Credits tier: Pay-per-use pricing

**UI Elements:**
- Feature comparison table
- Highlighted "Best Value" badge on yearly
- Monthly savings callout on yearly plan
- Purchase buttons with loading states
- Success/error modals

---

### Task 7.4: Feature Gating & Enforcement ✅
**Estimated Time:** 3-4 hours

**Steps:**
1. ✅ Create subscription utility functions
2. ✅ Check entitlements before fax send
3. ✅ Enforce free tier limit (3 faxes/month)
4. ✅ Show upgrade prompts when limit reached
5. ✅ Lock AI features for non-Pro users
6. ✅ Update ProfileScreen to show limits
7. ✅ Add "Upgrade" CTAs throughout app
8. ✅ Integrate with Firestore usage tracking

**Files to Create/Update:**
- `src/utils/subscription-utils.ts` - Helper functions
- Update `src/screens/HomeScreen.tsx` - Check before send
- Update `src/screens/ProfileScreen.tsx` - Show upgrade CTA
- Update `src/services/firestore.ts` - Sync with RevenueCat

**Key Functions:**
```typescript
- canSendFax(userData: UserData, customerInfo: CustomerInfo): boolean
- getUpgradeMessage(reason: string): string
- syncSubscriptionStatus(customerInfo: CustomerInfo): Promise<void>
- handlePurchaseSuccess(customerInfo: CustomerInfo): Promise<void>
```

**Upgrade Prompts:**
- "You've used all 3 free faxes this month"
- "Upgrade to Pro for unlimited faxes"
- "This feature requires Pro subscription"

---

### Task 7.5: Usage Tracking & Sync ✅
**Estimated Time:** 2-3 hours

**Steps:**
1. ✅ Update Firestore on fax send
2. ✅ Decrement faxesRemaining or creditsRemaining
3. ✅ Sync RevenueCat status to Firestore
4. ✅ Handle subscription changes
5. ✅ Update UI in real-time
6. ✅ Add webhook listener (optional, for backend)
7. ✅ Test monthly reset logic

**Files to Update:**
- `src/services/firestore.ts` - Update usage functions
- `src/state/fax-store.ts` - Check limits before send
- `src/contexts/AuthContext.tsx` - Refresh on app start

**Firestore Updates:**
```typescript
// When fax is sent
await decrementFaxCount(uid, pages);

// When subscription purchased
await updateSubscriptionTier(uid, 'pro');

// Periodic sync (on app open)
const customerInfo = await Purchases.getCustomerInfo();
await syncSubscriptionStatus(customerInfo);
```

---

## 🧪 Testing Checklist

### Sandbox Testing
- [ ] Test free tier limits (3 faxes)
- [ ] Test subscription purchase flow
- [ ] Test yearly subscription purchase
- [ ] Test credit purchase (3, 10, 25 packs)
- [ ] Test restore purchases
- [ ] Test subscription expiration
- [ ] Test upgrade from free to pro
- [ ] Test downgrade handling
- [ ] Test purchase cancellation

### UI/UX Testing
- [ ] Subscription screen displays correctly
- [ ] Pricing shows properly
- [ ] Purchase buttons work
- [ ] Loading states show
- [ ] Success messages display
- [ ] Error handling works
- [ ] Restore purchases works
- [ ] Profile shows correct tier
- [ ] Usage stats update correctly

### Integration Testing
- [ ] RevenueCat syncs with Firestore
- [ ] Feature gating enforces limits
- [ ] Upgrade prompts show correctly
- [ ] Pro features unlock after purchase
- [ ] Credits deduct properly
- [ ] Monthly reset works (simulate)

---

## 📱 User Flows

### Flow 1: Free User Hits Limit
1. User tries to send 4th fax
2. Alert: "You've used all 3 free faxes this month"
3. Show upgrade modal with options
4. User selects Pro Monthly
5. RevenueCat purchase flow
6. Success → faxesRemaining = -1 (unlimited)
7. Fax sends successfully

### Flow 2: User Purchases Credits
1. Free user at limit
2. Chooses "Buy Credits" instead of subscription
3. Selects 10 credits pack ($14.99)
4. Purchase completes
5. creditsRemaining = 10
6. Can send 10 faxes
7. Each fax decrements credits

### Flow 3: Restore Purchases
1. User reinstalls app
2. Signs in with same account
3. Goes to subscription screen
4. Taps "Restore Purchases"
5. RevenueCat checks receipts
6. Active subscription restored
7. Firestore updated with Pro status

---

## 🔧 Environment Variables

Add to `.env`:
```bash
# RevenueCat API Keys
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key_here
```

---

## 📊 Success Metrics

After Phase 7 completion:
- ✅ Users can purchase subscriptions
- ✅ Free tier enforced (3 faxes/month)
- ✅ Pro tier unlocked (unlimited)
- ✅ Credits system working
- ✅ Revenue tracking in RevenueCat
- ✅ Firestore synced with subscriptions
- ✅ Upgrade prompts contextual
- ✅ Restore purchases functional

---

## 🚨 Important Notes

1. **Sandbox Testing:** Use Apple's sandbox accounts for testing purchases
2. **StoreKit:** Real purchases only work on physical devices, not simulators
3. **Review Process:** App Store requires actual subscription implementation for approval
4. **Webhooks:** Optional for mobile-only, but recommended for server validation
5. **Analytics:** Track conversion rates, popular tiers, churn

---

## 🔗 Resources

- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [React Native Purchases SDK](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- [Apple StoreKit](https://developer.apple.com/documentation/storekit)
- [App Store Connect](https://appstoreconnect.apple.com/)

---

## ✅ Definition of Done

Phase 7 is complete when:
- [x] RevenueCat SDK installed and initialized
- [x] Subscription screen built and functional
- [x] Feature gating implemented
- [x] Usage tracking synced
- [x] All user flows tested
- [x] ROADMAP.md updated
- [ ] Sandbox purchases tested successfully
- [ ] Ready for TestFlight beta

---

*Let's build a sustainable revenue stream! 💰*
