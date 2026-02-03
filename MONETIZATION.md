# 💰 TigerFax Monetization Strategy

> **Last Updated:** February 2, 2026  
> **Status:** Planning Phase  
> **Version:** 2.0.0

---

## 🎯 Executive Summary

TigerFax uses a **hybrid three-tier monetization model** combining freemium, pay-per-use, and subscription approaches to maximize user acquisition and revenue.

### Key Strategy Decisions:
- ✅ **No free trial** - 30-day money-back guarantee instead (prevents abuse)
- ✅ **Forever free tier** - 3 faxes/month builds trust and user base
- ✅ **Pay-per-use option** - Captures occasional users
- ✅ **RevenueCat** - Handles iOS subscriptions and payments
- ✅ **Firebase** - Authentication and user data storage
- ✅ **Sinch** - Incoming fax numbers for Pro subscribers

---

## 💵 Pricing Tiers

### **FREE TIER (Forever)**
**Target:** New users, very occasional users  
**Cost:** $0/month

**Included:**
- ✅ 3 faxes per month (resets monthly)
- ✅ All core features (scan, send, basic filters)
- ✅ Fax history (30 days)
- ✅ Email notifications
- ❌ **Watermark on cover page** ("Sent via TigerFax")
- ❌ No AI features
- ❌ No incoming fax number
- ❌ No priority support

**Limitations:**
- Fax count resets on the 1st of each month
- History auto-deleted after 30 days
- Cannot receive faxes

---

### **PRO TIER**
**Target:** Regular users, professionals, small businesses  
**Cost:** $14.99/month or $149.99/year (save 17%)

**Included:**
- ✅ **100 faxes/month included**
- ✅ **Dedicated incoming fax number** (can receive faxes)
- ✅ **All AI-powered features:**
  - Smart document OCR & text extraction
  - Auto-fill cover pages
  - Professional cover letter generation
  - Smart recipient suggestions
  - Document classification & tagging
- ✅ Unlimited fax history
- ✅ No watermarks
- ✅ Priority sending (sent within 5 minutes)
- ✅ Priority support (24/7)
- ✅ Dark mode
- ✅ Scheduled sending
- ✅ Address book (unlimited contacts)
- ✅ Export reports (CSV)
- ✅ $0.15 per additional page after 100 faxes

**Value Proposition:**
- At 100 faxes/month, cost per fax = $0.15 (vs $1.49 pay-per-use)
- **Save 90% per fax** compared to pay-per-use
- Incoming fax number alone worth $5-10/month

**Guarantee:**
- ✅ **30-day money-back guarantee** (no questions asked)
- No free trial (prevents abuse)

---

### **PAY-PER-USE (Credit Packs)**
**Target:** Infrequent users who don't want subscriptions  
**Cost:** Purchase credits anytime

**Pricing:**
| Pack Size | Price | Cost per Fax | Savings |
|-----------|-------|--------------|---------|
| 3 faxes | $1.49 | $0.50/fax | - |
| 10 faxes | $9.99 | $1.00/fax | 50% off |
| 25 faxes | $24.99 | $1.00/fax | 50% off |

**Features:**
- ✅ Credits never expire
- ✅ No watermark
- ✅ No monthly commitment
- ✅ Fax history (90 days)
- ✅ Priority sending
- ❌ No AI features (can add-on for $4.99/month)
- ❌ No incoming fax number

---

### **BUSINESS TIER (Coming Q3 2026)**
**Target:** Teams, healthcare practices, legal firms  
**Cost:** $49.99/month per team (5 users)  
**Additional Users:** $9.99/month each

**Included:**
- ✅ 500 faxes/month (shared pool)
- ✅ All Pro features for all users +
- ✅ Team management & permissions
- ✅ HIPAA compliance mode
- ✅ Centralized billing
- ✅ API access for integrations
- ✅ Custom branding
- ✅ Dedicated account manager
- ✅ SSO (Single Sign-On)

---

## 🏗️ Technical Architecture

### **Backend Stack**

```
┌─────────────────────────────────────────────────────────────────┐
│                      iOS App (React Native + Expo)              │
├─────────────────────────────────────────────────────────────────┤
│  • Firebase Auth (Apple Sign-In, Email/Password)               │
│  • RevenueCat SDK (Subscriptions & IAP)                         │
│  • Sinch Fax API (Send/Receive faxes)                          │
│  • Firestore SDK (User data sync)                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase (Google Cloud)                      │
├─────────────────────────────────────────────────────────────────┤
│  Authentication:                                                │
│    • Apple Sign-In (required for iOS)                           │
│    • Email/Password                                             │
│                                                                 │
│  Firestore Database:                                            │
│    • users/{userId} - profile, subscription, usage              │
│    • faxes/{faxId} - fax history (outgoing + incoming)          │
│    • usage/{userId} - monthly usage tracking                    │
│                                                                 │
│  Cloud Functions:                                               │
│    • onUserCreated - initialize free tier                       │
│    • onSubscriptionChanged - provision/revoke fax number        │
│    • sinchIncomingFaxWebhook - handle received faxes           │
│    • monthlyUsageReset - reset free fax counts                  │
│    • revenueCatWebhook - sync subscription status               │
└─────────────────────────────────────────────────────────────────┘
```

### **Firestore Database Schema**

```typescript
// Collection: users/{userId}
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  
  // Subscription
  subscription: {
    plan: 'free' | 'pro' | 'payPerUse' | 'business';
    status: 'active' | 'expired' | 'cancelled' | 'trial_ended';
    expiresAt: Timestamp | null;
    revenuecatId: string;
    cancelAtPeriodEnd: boolean;
  };
  
  // Usage tracking
  usage: {
    freeFaxesUsed: number;      // 0-3 for free tier
    proFaxesUsed: number;        // 0-100 for pro tier
    creditBalance: number;       // Pay-per-use credits
    lastResetDate: Timestamp;    // Monthly reset tracker
  };
  
  // Pro features
  faxNumber: string | null;      // Sinch number (Pro only)
  sinchNumberId: string | null;  // Sinch number ID
  
  // Preferences
  preferences: {
    notifications: boolean;
    darkMode: boolean;
    defaultCoverPage: object | null;
  };
}

// Collection: faxes/{faxId}
interface Fax {
  id: string;
  userId: string;
  direction: 'outgoing' | 'incoming';
  
  // Common fields
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'received';
  timestamp: Timestamp;
  totalPages: number;
  
  // Outgoing specific
  recipient?: string;
  documents?: FaxDocument[];
  coverPage?: CoverPage;
  sinchFaxId?: string;
  
  // Incoming specific
  sender?: string;
  receivedDocuments?: string[];  // Storage URLs
  
  // Metadata
  cost?: number;  // Cost in credits/dollars
  tier?: 'free' | 'pro' | 'payPerUse';
}
```

---

## 🔐 RevenueCat Integration

### **Products Configuration**

**App Store Connect Products:**

```
Subscriptions:
├── tigerfax.pro.monthly
│   ├── Price: $14.99/month
│   ├── Trial: None
│   └── Renewal: Auto-renew monthly
│
└── tigerfax.pro.yearly
    ├── Price: $149.99/year
    ├── Trial: None
    └── Renewal: Auto-renew yearly

Consumables (Non-Renewing):
├── tigerfax.credits.3
│   ├── Price: $1.49
│   └── Quantity: 3 fax credits
│
├── tigerfax.credits.10
│   ├── Price: $9.99
│   └── Quantity: 10 fax credits
│
└── tigerfax.credits.25
    ├── Price: $24.99
    └── Quantity: 25 fax credits
```

### **Entitlements**

```typescript
// RevenueCat Entitlements
const ENTITLEMENTS = {
  PRO_FEATURES: 'pro',        // Unlock all Pro features
  AI_FEATURES: 'ai',          // AI features only (add-on)
  INCOMING_FAX: 'incoming',   // Dedicated fax number
};

// Feature gating logic
const hasProFeatures = customerInfo.entitlements.active[ENTITLEMENTS.PRO_FEATURES];
const hasAIFeatures = customerInfo.entitlements.active[ENTITLEMENTS.AI_FEATURES];
```

---

## 📞 Incoming Fax Numbers (Sinch)

### **Number Provisioning Flow**

```
User upgrades to Pro
       ↓
Firebase Cloud Function triggered (onSubscriptionChanged)
       ↓
Call Sinch API to provision virtual fax number
       ↓
Store number in Firestore (users/{userId}/faxNumber)
       ↓
Configure webhook URL for incoming faxes
       ↓
User can now receive faxes at their dedicated number
```

### **Incoming Fax Webhook**

```typescript
// Firebase Cloud Function
export const sinchIncomingFaxWebhook = functions.https.onRequest(async (req, res) => {
  const { faxId, from, to, pages, status, documentUrl } = req.body;
  
  // 1. Find user by fax number
  const userDoc = await getUserByFaxNumber(to);
  
  // 2. Download fax document from Sinch
  const document = await downloadDocument(documentUrl);
  
  // 3. Upload to Firebase Storage
  const storageUrl = await uploadToStorage(document, userDoc.uid);
  
  // 4. Create fax record in Firestore
  await createIncomingFax({
    userId: userDoc.uid,
    sender: from,
    pages,
    documentUrl: storageUrl,
    status: 'received',
  });
  
  // 5. Send push notification
  await sendPushNotification(userDoc.uid, {
    title: 'New Fax Received',
    body: `You received a ${pages}-page fax from ${from}`,
  });
  
  res.status(200).send('OK');
});
```

### **Pricing for Numbers**

- Sinch Cost: ~$2-5/month per number
- TigerFax Revenue: $14.99/month Pro subscription
- **Profit Margin:** $10-13/month per Pro user

---

## 📊 Revenue Projections

### **Conservative Scenario** (Year 1)

**Assumptions:**
- 10,000 active users
- 60% free tier (6,000 users)
- 25% pay-per-use (2,500 users)
- 15% Pro subscribers (1,500 users)

**Monthly Revenue:**
```
Free Tier:           $0 (user acquisition)
Pay-Per-Use:         2,500 users × $5/month avg = $12,500
Pro Subscriptions:   1,500 users × $14.99 = $22,485
─────────────────────────────────────────────────────
Total Monthly:       $34,985
Annual Revenue:      $419,820
```

**Costs:**
```
Sinch Fax (outgoing): ~$5,000/month (estimated)
Sinch Numbers:        1,500 × $3 = $4,500/month
Firebase:             ~$500/month
RevenueCat:           Free (under $2.5k MRR limit broken, so $300/mo)
AI APIs:              ~$1,000/month
─────────────────────────────────────────────────────
Total Costs:          ~$11,300/month
Net Profit:           $23,685/month ($284,220/year)
Profit Margin:        68%
```

### **Aggressive Scenario** (Year 2)

**Assumptions:**
- 50,000 active users
- 50% free tier (25,000 users)
- 30% pay-per-use (15,000 users)
- 20% Pro subscribers (10,000 users)

**Monthly Revenue:**
```
Pay-Per-Use:         15,000 × $6/month avg = $90,000
Pro Subscriptions:   10,000 × $14.99 = $149,900
─────────────────────────────────────────────────────
Total Monthly:       $239,900
Annual Revenue:      $2,878,800
```

**Costs:**
```
Sinch Fax:           ~$25,000/month
Sinch Numbers:       10,000 × $3 = $30,000/month
Firebase:            ~$2,000/month
RevenueCat:          ~$1,000/month
AI APIs:             ~$5,000/month
Support Team:        ~$15,000/month (3 people)
─────────────────────────────────────────────────────
Total Costs:         ~$78,000/month
Net Profit:          $161,900/month ($1,942,800/year)
Profit Margin:       67%
```

---

## 🎯 Growth Strategy

### **Month 1-3: Launch & Learn**
- Focus on user acquisition (free tier)
- Track conversion rates (free → paid)
- A/B test paywall placement
- **Target:** 1,000 users, 10% paid

### **Month 4-6: Optimize**
- Test price points
- Add referral program (5 free faxes per referral)
- Launch AI feature showcase
- **Target:** 5,000 users, 15% paid

### **Month 7-12: Scale**
- Partner with healthcare/legal platforms
- Add HIPAA certification
- Launch Business tier
- **Target:** 20,000 users, 20% paid

---

## 🎁 Retention Tactics

### **1. Referral Program**
```
Invite a friend → Both get 5 free faxes
Share: "Get 5 free faxes on TigerFax!"
```

### **2. Volume Discounts**
```
Buy 10 credits: $1.29 each (save 14%)
Buy 25 credits: $0.99 each (save 34%)
```

### **3. Seasonal Promotions**
```
Tax Season (Feb-Apr): "Send tax docs - 20% off Pro"
Healthcare Enrollment: "HIPAA faxing - First month free"
Back to School: "Student discount - 25% off"
```

### **4. Win-Back Campaigns**
```
Cancelled users: "We miss you! 50% off for 3 months"
Inactive free users: "Your 3 free faxes are waiting!"
```

---

## 🔒 30-Day Money-Back Guarantee

### **Policy:**
- Users can request full refund within 30 days
- No questions asked
- Processed within 5-7 business days
- Builds trust and reduces purchase anxiety

### **Expected Refund Rate:**
- Industry average: 5-10%
- With good UX: 3-5%
- Budget for 5% refunds in projections

---

## 📈 Key Metrics to Track

### **User Metrics:**
- Total active users
- Free → Pro conversion rate (target: 15-20%)
- Free → Pay-per-use conversion rate
- Churn rate (target: <5% monthly)
- LTV (Lifetime Value per user)

### **Revenue Metrics:**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- ARPU (Average Revenue Per User)
- CAC (Customer Acquisition Cost)
- LTV:CAC ratio (target: >3:1)

### **Usage Metrics:**
- Faxes sent per user per month
- Average pages per fax
- AI feature usage rate
- Incoming fax volume (Pro users)

---

## 🚀 Next Steps

1. **Phase 6:** Implement Firebase Auth + Database (3-4 days)
2. **Phase 7:** Integrate RevenueCat + Paywall (2-3 days)
3. **Phase 8:** Incoming Fax Numbers (3-4 days)
4. **Beta Testing:** Invite 100 users for feedback
5. **App Store Launch:** Submit for review

---

*This document is a living strategy guide and will be updated as we learn from users and market data.*
