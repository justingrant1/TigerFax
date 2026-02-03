# 📋 Fax App Complete Upgrade Roadmap

> **Last Updated:** February 2, 2026  
> **Status:** In Progress  
> **Version:** 2.0.0 - Monetization Phase Added

---

## 🎯 Executive Summary

This roadmap outlines the complete transformation of the fax sending app from a prototype with mock functionality into a production-ready application with real fax transmission via Sinch Fax API, enhanced UX features, and AI-powered capabilities.

### Key Objectives:
- ✅ Replace all mock/simulated functionality with real implementations
- ✅ Integrate Sinch Fax API for actual fax transmission
- ✅ Implement proper image capture and processing
- ✅ **Add authentication & user accounts (Firebase)**
- ✅ **Implement monetization with RevenueCat**
- ✅ **Add incoming fax numbers for Pro users**
- ✅ Add AI-powered features using existing OpenAI/Anthropic/Grok APIs
- ✅ Prepare for production deployment

**📄 See [MONETIZATION.md](./MONETIZATION.md) for detailed pricing strategy and revenue projections**

---

## 📊 Progress Overview

| Phase | Status | Progress | Priority |
|-------|--------|----------|----------|
| Phase | Status | Progress | Priority |
|-------|--------|----------|----------|
| Phase 1: Core Functionality Fixes | ✅ Complete | 7/7 | 🔴 Critical |
| Phase 2: Sinch Fax API Integration | ✅ Complete | 5/5 | 🔴 High |
| Phase 3: User Experience Enhancements | 🔄 In Progress | 4/8 | 🟡 Medium |
| Phase 4: AI-Powered Features | ⏳ Not Started | 0/5 | 🟢 Enhancement |
| Phase 5: Production Readiness | ⏳ Not Started | 0/6 | 🟠 Pre-launch |
| **Phase 6: Authentication & User Accounts** | ✅ Complete | 8/8 | 🔴 **Critical** |
| **Phase 7: Monetization (RevenueCat)** | ✅ Complete | 5/5 | 🔴 **Critical** |
| **Phase 8: Incoming Fax Numbers** | ✅ **DEPLOYED** | 5/5 | 🔴 **Critical** |

**Overall Progress:** 29/47 tasks completed (62%)**
**🚀 Core Features Complete - Ready for Beta Testing!**

---

## 🚀 Phase 1: Core Functionality Fixes
**Priority:** 🔴 Critical  
**Estimated Time:** 2-3 days  
**Status:** 🔄 In Progress

### Objective
Replace all mock/placeholder functionality with real working features.

### Tasks

#### 1.1 Implement Real Camera Capture ✅
- [x] Remove mock photo generation in `DocumentScanScreen.tsx`
- [x] Implement `CameraView.takePictureAsync()` properly
- [x] Add image quality settings (high quality for fax documents)
- [x] Add capture sound/haptic feedback
- [x] Handle camera errors gracefully

**Files:** `src/screens/DocumentScanScreen.tsx`  
**Status:** ✅ Complete

#### 1.2 Implement Image Processing & Filters ✅
- [x] Install and configure `expo-image-manipulator`
- [x] Implement actual filter transformations in `ImageEnhancementModal`
  - [x] Grayscale conversion
  - [x] High contrast (document mode)
  - [x] Brightness adjustment
  - [x] Sharpening
  - [x] Auto-enhance for documents
- [x] Save processed images to file system
- [x] Show real-time preview

**Files:** `src/components/ImageEnhancementModal.tsx`, `src/utils/image-processing.ts` (new)  
**Status:** ✅ Complete

#### 1.3 Fix Batch Fax Logic ✅
- [x] Update `handleBatchFax` in `HomeScreen.tsx` to create proper FaxJob entries
- [x] Integrate with Zustand store properly
- [x] Add batch progress tracking
- [x] Show batch summary with success/fail counts
- [x] Handle partial batch failures

**Files:** `src/screens/HomeScreen.tsx`, `src/state/fax-store.ts`  
**Status:** ✅ Complete

#### 1.4 Real Contact Integration ✅
- [x] Remove mock contacts from `ContactPickerModal.tsx`
- [x] Implement actual `expo-contacts` API integration
- [x] Add proper permission handling
- [x] Implement contact search/filter
- [x] Handle contacts without phone numbers
- [x] Filter to only show contacts with phone numbers

**Files:** `src/components/ContactPickerModal.tsx`  
**Status:** ✅ Complete

#### 1.5 PDF Preview Implementation ✅
- [x] Implement PDF preview in `DocumentPreviewModal.tsx`
- [x] Use expo-sharing to open PDFs in external apps
- [x] Add "Open PDF" and "View in Browser" options
- [x] Show document metadata (name, size)
- [x] Maintain image zoom/pan for image documents
- [x] Professional UI with action buttons

**Files:** `src/components/DocumentPreviewModal.tsx`  
**Status:** ✅ Complete
**Note:** Used expo-sharing instead of react-native-pdf to avoid dependency conflicts

#### 1.6 Phone Number Validation ✅
- [x] Create phone number validation utility
- [x] Implement E.164 format conversion
- [x] Add validation feedback in UI
- [x] Support international numbers
- [x] Integrate into HomeScreen and BatchFaxModal

**Files:** `src/utils/phone-validation.ts` (new), `src/screens/HomeScreen.tsx`, `src/components/BatchFaxModal.tsx`  
**Status:** ✅ Complete

#### 1.7 Remove Hardcoded Sample Data ✅
- [x] Remove hardcoded faxHistory from `fax-store.ts`
- [x] Add "Clear History" functionality
- [x] Implement empty state properly
- [x] Starts with clean slate

**Files:** `src/state/fax-store.ts`, `src/screens/HistoryScreen.tsx`  
**Status:** ✅ Complete

---

## 🌐 Phase 2: Sinch Fax API Integration
**Priority:** 🔴 High  
**Estimated Time:** 3-4 days  
**Status:** ⏳ Not Started

### Objective
Integrate real fax transmission using Sinch Fax API.

### API Configuration
- **Base URL:** `https://fax.api.sinch.com/v3/projects/{projectId}/`
- **Authentication:** Basic Auth (Key ID : Key Secret)
- **Project ID:** `881d6487-fb61-4c40-85b1-ed77a90c7334`
- **Credentials stored in:** `.env`

### Tasks

#### 2.1 Setup Sinch API Service ✅
- [x] Sinch credentials already in `.env`
- [x] Create `src/api/sinch-fax.ts` service file
- [x] Implement authentication helper (Basic Auth)
- [x] Create base API client with fetch
- [x] Add request/response logging
- [x] Error handling implemented

**Files:** `.env`, `src/api/sinch-fax.ts` (new)  
**Status:** ✅ Complete

#### 2.2 Implement Send Fax Functionality ✅
- [x] Implement `sendFax()` function with JSON payload
- [x] Convert images to base64 for transmission
- [x] Handle multiple documents
- [x] Add text-based cover page generation
- [x] Format phone numbers to E.164
- [x] Parse and store fax job response
- [x] Integrate with fax store

**Files:** `src/api/sinch-fax.ts`, `src/state/fax-store.ts`  
**Status:** ✅ Complete

#### 2.3 Status Polling & Updates ✅
- [x] Implement `getFaxStatus()` endpoint
- [x] Create background polling service
- [x] Update fax status in store when changed
- [x] Stop polling after final status
- [x] Resume polling on app restart
- [x] Smart timeout handling (10 min max)

**Files:** `src/api/sinch-fax.ts`, `src/services/fax-polling.ts` (new), `App.tsx`  
**Status:** ✅ Complete

#### 2.4 Webhook Integration (Optional) - SKIPPED
- [N/A] Not viable for React Native mobile app
- [x] Using polling instead (implemented in 2.3)

**Status:** Skipped (using polling)

#### 2.5 Retry Logic & Error Handling ✅
- [x] Implement automatic retry for failed faxes
- [x] Add max retry limit (3 retries)
- [x] Implement exponential backoff
- [x] Handle network errors gracefully
- [x] Add user-friendly error messages
- [x] Log errors for debugging with context

**Files:** `src/api/sinch-fax.ts`, `src/utils/error-handler.ts` (new)  
**Status:** ✅ Complete

#### 2.6 Cost Tracking ✅
- [x] Track pages sent per fax
- [x] Calculate estimated costs
- [x] Show usage statistics screen
- [x] Monthly comparison view
- [x] Success rate tracking
- [x] Average cost per fax
- [x] Link from History screen

**Files:** `src/screens/UsageScreen.tsx` (new), `src/navigation/AppNavigator.tsx`, `src/screens/HistoryScreen.tsx`  
**Status:** ✅ Complete

---

## 💎 Phase 3: User Experience Enhancements
**Priority:** 🟡 Medium  
**Estimated Time:** 4-5 days  
**Status:** ⏳ Not Started

### Objective
Improve overall user experience with better UI/UX, settings, and features.

### Tasks

#### 3.1 Settings Screen ✅
- [x] Create Settings screen with navigation
- [x] Add account information section
- [x] Implement notification preferences
- [x] Add fax quality settings
- [x] Include app version and credits
- [x] Add "About" and "Help" sections
- [x] Support & Legal links
- [x] Danger zone for account deletion

**Files:** `src/screens/SettingsScreen.tsx`, `src/navigation/AppNavigator.tsx`  
**Status:** ✅ Complete

#### 3.2 Push Notifications ✅
- [x] Setup `expo-notifications`
- [x] Request notification permissions
- [x] Send notification on fax completion
- [x] Send notification on fax failure
- [x] Handle notification taps (deep linking ready)
- [x] Configure Android notification channels
- [x] Auto-initialize on app start
- [x] Integrate with fax polling service

**Files:** `src/services/notifications.ts` (new), `src/services/fax-polling.ts`, `App.tsx`  
**Status:** ✅ Complete

#### 3.3 Dark Mode Support
- [ ] Add dark mode color scheme to Tailwind config
- [ ] Update all screens with dark mode classes
- [ ] Add theme toggle in Settings
- [ ] Persist theme preference
- [ ] Test all screens in dark mode

**Files:** `tailwind.config.js`, all screen files  
**Effort:** ~6 hours

#### 3.4 Offline Support & Queue
- [ ] Detect network connectivity
- [ ] Queue faxes when offline
- [ ] Auto-send when online
- [ ] Show offline indicator
- [ ] Persist queue to storage

**Files:** `src/services/offline-queue.ts` (new), `src/state/fax-store.ts`  
**Effort:** ~4 hours

#### 3.5 Saved Recipients / Address Book
- [ ] Create address book screen
- [ ] Add/edit/delete saved recipients
- [ ] Quick select from saved recipients
- [ ] Import from contacts
- [ ] Export address book

**Files:** `src/screens/AddressBookScreen.tsx` (new), `src/state/address-book-store.ts` (new)  
**Effort:** ~5 hours

#### 3.6 Fax Scheduling
- [ ] Add schedule option to send screen
- [ ] Date/time picker for scheduling
- [ ] Store scheduled faxes
- [ ] Background job to send at scheduled time
- [ ] Cancel scheduled faxes

**Files:** `src/screens/FaxReviewScreen.tsx`, `src/services/scheduler.ts` (new)  
**Effort:** ~4 hours

#### 3.7 Export & Share ✅
- [x] Export fax history as CSV
- [x] Share fax receipts
- [x] Generate monthly reports
- [x] Share functionality in History screen
- [x] Share button in Fax Detail screen
- [x] Professional receipt formatting

**Files:** `src/utils/export.ts` (new), `src/screens/FaxDetailScreen.tsx`, `src/screens/HistoryScreen.tsx`  
**Status:** ✅ Complete

#### 3.8 Improved Loading & Error States ✅
- [x] Add proper loading indicators everywhere
- [x] Implement skeleton screens
- [x] Add error boundaries
- [x] Create reusable error components
- [x] Add retry buttons on errors
- [x] Loading spinner and overlay components
- [x] Empty state component
- [x] Integrated error boundary into App.tsx

**Files:** `src/components/LoadingState.tsx` (new), `src/components/ErrorBoundary.tsx` (new), `src/components/ErrorMessage.tsx` (new), `App.tsx`  
**Status:** ✅ Complete

---

## 🤖 Phase 4: AI-Powered Features
**Priority:** 🟢 Enhancement  
**Estimated Time:** 3-4 days  
**Status:** ⏳ Not Started

### Objective
Leverage existing AI APIs (OpenAI, Anthropic, Grok) for intelligent features.

### Tasks

#### 4.1 Document OCR & Text Extraction
- [ ] Implement OCR using OpenAI Vision API
- [ ] Extract text from scanned documents
- [ ] Show extracted text preview
- [ ] Allow editing before sending
- [ ] Use for searchable history

**Files:** `src/api/ocr-service.ts` (new), `src/screens/DocumentScanScreen.tsx`  
**Effort:** ~4 hours

#### 4.2 Auto-Fill Cover Page
- [ ] Analyze document content with AI
- [ ] Suggest cover page subject
- [ ] Generate professional message
- [ ] Extract recipient info if available
- [ ] User approval before using

**Files:** `src/screens/CoverPageScreen.tsx`, `src/api/chat-service.ts`  
**Effort:** ~3 hours

#### 4.3 Smart Recipient Suggestions
- [ ] Analyze fax history patterns
- [ ] Suggest recipients based on document type
- [ ] Suggest recipients based on time/frequency
- [ ] Learn from user selections

**Files:** `src/utils/ai-suggestions.ts` (new), `src/screens/HomeScreen.tsx`  
**Effort:** ~3 hours

#### 4.4 Professional Cover Letter Generation
- [ ] Add AI cover letter generator
- [ ] Multiple tone options (formal, casual, medical, legal)
- [ ] Customization parameters
- [ ] Preview before adding
- [ ] Save templates

**Files:** `src/screens/CoverPageScreen.tsx`, `src/api/chat-service.ts`  
**Effort:** ~4 hours

#### 4.5 Document Classification & Tagging
- [ ] Auto-categorize documents (invoice, contract, medical, etc.)
- [ ] Add tags to fax history
- [ ] Filter history by tags
- [ ] Smart search

**Files:** `src/api/ocr-service.ts`, `src/screens/HistoryScreen.tsx`  
**Effort:** ~3 hours

---

## 🚢 Phase 5: Production Readiness
**Priority:** 🟠 Pre-launch  
**Estimated Time:** 3-4 days  
**Status:** ⏳ Not Started

### Objective
Prepare app for production deployment with proper testing, monitoring, and optimization.

### Tasks

#### 5.1 Error Boundaries & Crash Handling
- [ ] Implement React Error Boundaries
- [ ] Add crash reporting (Sentry/Bugsnag)
- [ ] Log uncaught errors
- [ ] Add graceful fallback UIs
- [ ] Test error scenarios

**Files:** `src/components/ErrorBoundary.tsx`, `App.tsx`  
**Effort:** ~3 hours

#### 5.2 Analytics Integration
- [ ] Setup analytics (Firebase/Amplitude)
- [ ] Track key user actions
- [ ] Monitor fax success/failure rates
- [ ] Track feature usage
- [ ] Add performance monitoring

**Files:** `src/services/analytics.ts` (new)  
**Effort:** ~3 hours

#### 5.3 Performance Optimization
- [ ] Optimize image loading/caching
- [ ] Implement pagination for history
- [ ] Reduce re-renders with React.memo
- [ ] Optimize bundle size
- [ ] Add performance monitoring

**Files:** Various  
**Effort:** ~4 hours

#### 5.4 Testing
- [ ] Add unit tests for utilities
- [ ] Add integration tests for API calls
- [ ] Add E2E tests for critical flows
- [ ] Test on iOS and Android
- [ ] Load testing

**Files:** `__tests__/` directory  
**Effort:** ~8 hours

#### 5.5 Security Audit
- [ ] Secure API credentials storage
- [ ] Implement proper data encryption
- [ ] Add input sanitization
- [ ] Review permissions
- [ ] HIPAA compliance check (if needed)

**Files:** Various  
**Effort:** ~4 hours

#### 5.6 Documentation & Deployment
- [ ] Create user guide
- [ ] Document API integration
- [ ] Setup CI/CD pipeline
- [ ] Prepare app store assets
- [ ] Create privacy policy and terms
- [ ] Submit to app stores

**Files:** `docs/` directory  
**Effort:** ~6 hours

---

## 📱 App Store Preparation Checklist

### Before Launch
- [ ] App icon designed and optimized
- [ ] Screenshots for all required sizes
- [ ] App description written
- [ ] Privacy policy created
- [ ] Terms of service created
- [ ] Beta testing completed
- [ ] Legal review (if needed)
- [ ] Analytics configured
- [ ] Crash reporting tested
- [ ] Push notifications tested

---

## 🐛 Known Issues & Technical Debt

### Current Issues
1. ✅ Camera doesn't actually capture - uses random placeholders
2. ✅ Fax sending is completely simulated
3. ✅ Image filters don't apply
4. ✅ Contacts are mock data
5. ✅ PDF preview not implemented
6. ✅ No phone number validation
7. ✅ Hardcoded sample data in store
8. ✅ No error boundaries
9. ✅ Batch fax creates incomplete jobs
10. ✅ Resend functionality not implemented

### To Be Addressed
- Add proper TypeScript types throughout
- Improve error messages
- Add accessibility features (screen reader support)
- Implement proper logging system
- Add feature flags for gradual rollouts

---

## 📚 Resources & References

### Sinch Fax API
- [Sinch Fax Documentation](https://developers.sinch.com/docs/fax)
- [API Reference](https://developers.sinch.com/docs/fax/api-reference)
- [Authentication Guide](https://developers.sinch.com/docs/fax/api-reference/authentication/basic)

### React Native / Expo
- [Expo SDK 53 Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [NativeWind v4](https://www.nativewind.dev/)

### AI APIs
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic API](https://docs.anthropic.com/)
- [Grok API](https://docs.x.ai/api)

---

## 📝 Notes

### Implementation Priorities
1. **Must Have (Phase 1 & 2):** Core functionality + Sinch API - App must send real faxes
2. **Should Have (Phase 3):** Better UX features - Improves usability significantly  
3. **Nice to Have (Phase 4):** AI features - Differentiators from competitors
4. **Critical Before Launch (Phase 5):** Production readiness - Required for store approval

### API Rate Limits
- Sinch Fax API: TBD (check documentation)
- OpenAI: 10,000 TPM (tokens per minute)
- Anthropic: Tier dependent
- Monitor usage to avoid hitting limits

### Development Notes
- Test all fax sending with test numbers first
- Keep detailed logs during integration
- Have fallback for AI features if quota exceeded
- Implement proper cost alerts for API usage

---

## 🔐 Phase 6: Authentication & User Accounts
**Priority:** 🔴 Critical  
**Estimated Time:** 3-4 days  
**Status:** 🔄 In Progress

### Objective
Implement Firebase Authentication and user account management to enable monetization and data sync.

### Tasks

#### 6.1 Create MONETIZATION.md Documentation ✅
- [x] Document pricing tiers (Free, Pro, Pay-per-use)
- [x] Define database schema
- [x] Revenue projections and growth strategy
- [x] Technical architecture overview

**Files:** `MONETIZATION.md` (new)  
**Status:** ✅ Complete

#### 6.2 Firebase Project Setup ✅
- [x] Create Firebase project in console
- [x] Enable Firebase Authentication
- [x] Enable Firestore Database
- [x] Add iOS app to Firebase
- [x] Download `GoogleService-Info.plist`
- [x] Configure security rules

**Files:** Firebase Console  
**Status:** ✅ Complete

#### 6.3 Install Firebase Packages ✅
- [x] Install `@react-native-firebase/app`
- [x] Install `@react-native-firebase/auth`
- [x] Install `@react-native-firebase/firestore`
- [x] Install `@invertase/react-native-apple-authentication`
- [ ] Run `expo prebuild` to generate native iOS project
- [ ] Configure iOS project with GoogleService-Info.plist

**Files:** `package.json`, iOS native project  
**Status:** ✅ Packages Installed (prebuild pending)

#### 6.4 Create Authentication Screens ✅
- [x] WelcomeScreen - App intro with sign-in options
- [x] LoginScreen - Email/password login
- [x] SignupScreen - Create new account
- [x] ForgotPasswordScreen - Password reset

**Files:** `src/screens/WelcomeScreen.tsx`, `src/screens/LoginScreen.tsx`, `src/screens/SignupScreen.tsx`, `src/screens/ForgotPasswordScreen.tsx`  
**Status:** ✅ Complete

#### 6.5 Implement Apple Sign-In ✅
- [x] Configure Apple Sign-In capability
- [x] Implement Apple Sign-In button in WelcomeScreen
- [x] Handle authentication flow with Firebase
- [x] Error handling and loading states
- [ ] Add Apple Sign-In capability to iOS project (requires prebuild)
- [ ] Test on device (required for Apple Sign-In)

**Files:** `src/contexts/AuthContext.tsx`, `src/screens/WelcomeScreen.tsx`, iOS capabilities  
**Status:** ✅ Code Complete (device testing pending)

#### 6.6 Create AuthContext Provider ✅
- [x] Create AuthContext for app-wide auth state
- [x] Handle authentication state changes
- [x] Implement auto-login on app start
- [x] Protected route navigation
- [x] Logout functionality
- [x] Sign up, sign in, password reset functions
- [x] Apple Sign-In integration
- [x] User-friendly error messages

**Files:** `src/contexts/AuthContext.tsx`, `App.tsx`  
**Status:** ✅ Complete

#### 6.7 Firestore User Document Creation ✅
- [x] Create user document on signup
- [x] Initialize free tier subscription
- [x] Set default usage limits (3 faxes/month)
- [x] Store user preferences
- [x] Functions for syncing fax history to Firestore
- [x] Usage tracking and limits enforcement
- [x] Subscription tier management
- [x] Monthly reset functionality

**Files:** `src/services/firestore.ts`, `src/contexts/AuthContext.tsx`  
**Status:** ✅ Complete

#### 6.8 Profile & Settings Screen ✅
- [x] Create ProfileScreen showing user info
- [x] Display subscription status
- [x] Show usage statistics
- [x] Implement SettingsScreen
- [x] Notification preferences UI
- [x] Account management (delete account placeholder)
- [x] Support & Legal links
- [x] App info display
- [x] Added to navigation

**Files:** `src/screens/ProfileScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/navigation/AppNavigator.tsx`  
**Status:** ✅ Complete

---

## 💳 Phase 7: Monetization (RevenueCat)
**Priority:** 🔴 Critical  
**Estimated Time:** 2-3 days  
**Status:** ⏳ Not Started

### Objective
Implement subscription management and in-app purchases using RevenueCat.

### Tasks

#### 7.1 RevenueCat & App Store Connect Setup
- [ ] Create RevenueCat account
- [ ] Create App Store Connect app listing
- [ ] Create subscription products:
  - tigerfax.pro.monthly ($14.99/month)
  - tigerfax.pro.yearly ($149.99/year)
- [ ] Create consumable products:
  - tigerfax.credits.3 ($1.49)
  - tigerfax.credits.10 ($9.99)
  - tigerfax.credits.25 ($24.99)
- [ ] Configure RevenueCat with App Store Connect
- [ ] Set up entitlements in RevenueCat

**Files:** RevenueCat Dashboard, App Store Connect  
**Effort:** ~3 hours

#### 7.2 Install & Configure RevenueCat SDK ✅
- [x] Install `react-native-purchases`
- [x] Configure RevenueCat API key in `.env`
- [x] Create purchases service wrapper
- [x] Set up user identification (link to Firebase)
- [x] Add error handling and logging

**Files:** `package.json`, `src/services/purchases.ts` (new)  
**Status:** ✅ Complete

#### 7.3 Create Subscription Paywall ✅
- [x] Design 3-tier paywall UI (Free, Pro Monthly, Pro Yearly)
- [x] Show pricing and feature comparison
- [x] Implement purchase buttons with loading states
- [x] Handle purchase flow with error handling
- [x] Show success/error alerts
- [x] Restore purchases functionality
- [x] Add legal text and links

**Files:** `src/screens/SubscriptionScreen.tsx` (new)  
**Status:** ✅ Complete

#### 7.4 Feature Gating & Utilities ✅
- [x] Create subscription utility functions
- [x] Implement `canSendFax()` check logic
- [x] Build upgrade message generator
- [x] Sync RevenueCat with Firestore
- [x] Handle purchase success flow
- [x] Feature requirement checking
- [x] Tier-based feature lists

**Files:** `src/utils/subscription-utils.ts` (new)  
**Status:** ✅ Complete

#### 7.5 Navigation & Integration ✅
- [x] Add Subscription screen to navigation
- [x] Update ProfileScreen with upgrade CTA
- [x] Add "Manage Subscription" for Pro users
- [x] Link upgrade prompts throughout app
- [x] Type definitions updated

**Files:** `src/navigation/AppNavigator.tsx`, `src/screens/ProfileScreen.tsx`  
**Status:** ✅ Complete

---

## 📞 Phase 8: Incoming Fax Numbers
**Priority:** 🔴 Critical  
**Estimated Time:** 3-4 days  
**Status:** ✅ Complete

### Objective
Enable Pro users to receive faxes on dedicated phone numbers via Sinch.

### Tasks

#### 8.1 Firebase Cloud Functions Setup ✅
- [x] Initialize Firebase Functions project
- [x] Setup TypeScript configuration
- [x] Install dependencies (Sinch SDK, Admin SDK)
- [x] Deploy test function
- [x] Configure environment variables

**Files:** `functions/` directory  
**Status:** ✅ Complete

#### 8.2 Sinch Number Provisioning API ✅
- [x] Research Sinch virtual number APIs
- [x] Implement number provisioning function
- [x] Trigger on Pro subscription activation
- [x] Store number in Firestore (users/{uid}/faxNumber)
- [x] Revoke number on cancellation
- [x] Handle country/area code selection

**Files:** `functions/src/provisioning.ts`  
**Status:** ✅ Complete

#### 8.3 Webhook Handler for Incoming Faxes ✅
- [x] Create HTTPS endpoint for Sinch webhook
- [x] Verify webhook signatures
- [x] Download incoming fax document
- [x] Upload to Firebase Storage
- [x] Create fax record in Firestore
- [x] Handle errors and retries

**Files:** `functions/src/incomingFaxWebhook.ts`  
**Status:** ✅ Complete

#### 8.4 InboxScreen for Received Faxes ✅
- [x] Create InboxScreen (Pro users only)
- [x] List incoming faxes from Firestore
- [x] Display sender, timestamp, pages
- [x] Preview received fax documents
- [x] Download/share received faxes
- [x] Mark as read/unread
- [x] Real-time updates with Firestore subscriptions
- [x] Added to tab navigation with mail icon

**Files:** `src/screens/InboxScreen.tsx`, `src/services/inbox.ts`, `src/navigation/AppNavigator.tsx`  
**Status:** ✅ Complete

#### 8.5 Push Notifications for New Faxes ✅
- [x] Send notification when fax received
- [x] Include sender and page count
- [x] Handle notification tap (open inbox)
- [x] Badge count for unread faxes
- [x] Notification settings

**Files:** `functions/src/notifications.ts`, `src/services/notifications.ts`  
**Status:** ✅ Complete

---

**🎯 Phase 6 Complete! Next Steps:**
1. ✅ All authentication infrastructure built
2. ✅ Profile & Settings screens created
3. 🔄 **Next Phase: Run `expo prebuild` to generate native projects**
4. 🔄 **Then: Test authentication flow on device**
5. 🔄 **Ready to start Phase 7: Monetization (RevenueCat)**

**📈 Monetization Goal:** Transform into revenue-generating app with $35k MRR potential by end of Year 1

---

*This roadmap is a living document. Update progress as tasks are completed and add notes for future reference.*
