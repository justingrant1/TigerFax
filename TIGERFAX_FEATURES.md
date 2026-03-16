# 🐯 TigerFax — Complete Feature List

> A modern iOS fax app built with React Native (Expo), Firebase, Sinch Fax API, and RevenueCat.

---

## 📤 Sending Faxes

### Document Input
- **Camera Scan** — Scan physical documents using the device camera with real-time edge detection
- **File Upload** — Import PDFs, images, and documents from Files, Photos, iCloud, and other apps
- **Multi-document support** — Attach multiple documents to a single fax transmission
- **Document preview** — View each attached document before sending
- **Image enhancement** — Adjust brightness, contrast, and sharpness on scanned documents
- **Cover page** — Optional custom cover page with To, From, Subject, and Message fields

### Recipient Management
- **Manual number entry** — Type any fax number with real-time format validation
- **Contacts integration** — Pick recipients directly from the device address book
- **Batch fax** — Send the same document set to multiple recipients in one action
- **Phone number validation** — Instant feedback on invalid or unsupported number formats

### Review & Send Flow
- **Fax review screen** — Full summary of recipient, documents, cover page, and cost before sending
- **Transparent pricing** — Cost shown on the send button before any tap (e.g. "Review & Send — $0.99")
- **One-tap purchase + send** — When credits are needed, a single tap triggers Apple IAP and auto-sends on confirmation — no extra steps
- **Inline validation** — The send button is always blue; missing fields surface as inline error messages with auto-scroll to the problem field
- **Haptic feedback** — Tactile confirmation on send, errors, and warnings

---

## 📥 Receiving Faxes (Pro)

- **Dedicated fax number** — Pro subscribers receive a real, dedicated US fax number provisioned via Sinch
- **Fax inbox** — All incoming faxes appear in a dedicated Inbox tab with unread badge count
- **PDF viewer** — View received fax PDFs inline within the app
- **Unread count badge** — Real-time unread fax counter on the Inbox tab icon
- **Push notifications** — Instant push notification when a new fax arrives (via Expo Push / Firebase Cloud Messaging)
- **Fax detail view** — Full metadata for each received fax: sender number, pages, timestamp, status

---

## 💳 Subscription & Monetization

### Tiers
| Tier | Pages | Cost |
|------|-------|------|
| **Free** | 3 lifetime free pages | $0 |
| **Credits** | Pay-per-page | $0.99/page |
| **Pro** | Unlimited sending + dedicated fax number + inbox | Monthly/Annual subscription |

### Payment
- **Apple In-App Purchase** — All payments processed natively via Apple IAP (RevenueCat)
- **Consumable page credits** — Buy individual page credits ($0.99 each) for pay-as-you-go use
- **Pro subscription** — Monthly and annual options via RevenueCat offerings
- **Free page tracking** — Lifetime free page counter (3 pages, never resets)
- **Credit wallet** — Purchased page credits stored and displayed in real time
- **Subscription screen** — Full plan comparison with upgrade/downgrade options
- **Subtle Pro upsell** — Non-intrusive "Upgrade to Pro" link on the review screen
- **Trust signals** — "Secure payment via Apple — charged only on confirm" shown before purchase

---

## 📊 Usage & History

### Fax History
- **Sent fax history** — Chronological list of all sent faxes with status, recipient, pages, and timestamp
- **Status tracking** — Real-time fax delivery status: queued → sending → sent / failed
- **Fax detail** — Tap any history item for full details including cost and delivery confirmation
- **Firestore sync** — History synced to cloud so it persists across reinstalls and devices

### Usage & Cost Screen
- **Lifetime totals** — Total faxes sent and total pages sent (sourced from Firestore, accurate across devices)
- **Monthly breakdown** — Current month and previous month fax/page/cost summaries
- **Success rate** — Visual progress bar showing successful vs. failed fax percentage
- **Cost estimates** — Running total cost based on pay-per-page rate
- **Average stats** — Average cost per fax and average pages per fax

---

## 🔐 Authentication

- **Email & password sign-up / sign-in** — Standard Firebase Auth
- **Apple Sign-In** — Native Apple authentication (iOS published builds)
- **Forgot password** — Email-based password reset flow
- **Persistent sessions** — Stay signed in across app restarts
- **Real-time user data** — Firestore `onSnapshot` listener keeps subscription tier, credits, and fax number in sync instantly
- **Push token registration** — Expo push token saved to Firestore on login for targeted notifications

---

## 👤 Profile & Account

- **Profile screen** — View and edit display name and account details
- **Subscription status** — Current plan, fax number (Pro), and credits displayed
- **Account deletion** — Full GDPR-compliant account and data deletion
- **Sign out** — Secure sign-out with session cleanup

---

## ⚙️ Settings

- **Notification preferences** — Toggle push notifications on/off
- **Fax quality** — Choose Standard, High, or Superfine transmission quality
- **Auto-save** — Toggle automatic saving of sent fax documents
- **Theme** — Light/dark mode support via ThemeContext

---

## 🆘 Help & Support

- **Help Center screen** — In-app FAQ and support articles
- **Common topics** — How to send a fax, billing questions, troubleshooting, fax number setup
- **Contact support** — Direct link to support email/channel

---

## 🏗️ Technical Architecture

### Frontend
- **React Native + Expo** (SDK 52+)
- **NativeWind / Tailwind CSS** — Utility-first styling
- **React Navigation** — Stack + Tab navigation
- **Zustand** — Lightweight global state for current fax composition
- **AsyncStorage** — Local fax history persistence
- **expo-haptics** — Tactile feedback throughout the app
- **expo-camera / expo-document-picker** — Document capture and import
- **react-native-purchases (RevenueCat)** — IAP and subscription management

### Backend
- **Firebase Auth** — Authentication
- **Cloud Firestore** — User profiles, fax history, usage counters, inbox
- **Firebase Cloud Functions** — Webhook handler for incoming faxes, provisioning, push notifications
- **Firebase Cloud Storage** — PDF storage for sent and received faxes
- **Expo Push Notifications / FCM** — Push notification delivery

### Fax Infrastructure
- **Sinch Fax API** — Outbound fax transmission and inbound fax number provisioning
- **Webhook** — Sinch posts incoming fax events to a Cloud Function which stores the PDF and notifies the user

### Platform Support
- **iPhone** — Full support, all screen sizes
- **iPad** — Optimized layout with `useDeviceType` hook for tablet-specific UI
- **iOS 15+** — Minimum deployment target

---

## 🔒 Security & Privacy

- **Firestore security rules** — Users can only read/write their own data
- **Firebase Storage rules** — PDFs scoped to authenticated user UID
- **No server-side credential storage** — All IAP handled by Apple/RevenueCat
- **Nonce-based Apple Sign-In** — SHA-256 hashed nonce for secure OAuth flow
- **Error boundaries** — React error boundary prevents full app crashes

---

## 📱 UX Highlights

- **Always-actionable CTA** — Send button is always blue; validation errors appear inline, never blocking
- **Price transparency** — Cost shown on button label before any commitment
- **One-tap checkout** — Purchase + send in a single tap via native Apple IAP sheet
- **Real-time credit balance** — Credits and free pages update instantly via Firestore listener
- **Safety timeout** — Auth initialization has a 10-second timeout to prevent frozen loading screens on iPad
- **Graceful error handling** — All errors surface with user-friendly messages, never raw Firebase codes
