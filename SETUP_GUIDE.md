# 🚀 Phase 6 Setup Complete - Testing Guide

## ✅ What's Been Done

### 1. Native Projects Generated
- iOS project created in `/ios`
- Android project created in `/android`
- Firebase configuration files copied to native projects

### 2. Firebase Configuration
- ✅ `GoogleService-Info.plist` → `ios/GoogleService-Info.plist`
- ✅ `google-services.json` → `android/app/google-services.json`

### 3. Authentication Infrastructure Complete
- ✅ Email/Password authentication
- ✅ Apple Sign-In (code ready, needs device testing)
- ✅ Profile & Settings screens
- ✅ Firestore user management
- ✅ Protected routes

---

## 📱 Testing on Physical Device

### iOS Testing (Requires Mac)

1. **Open iOS project in Xcode:**
   ```bash
   cd ios
   open TigerFax.xcworkspace
   ```

2. **Configure Signing & Capabilities:**
   - Select your team in Signing & Capabilities
   - Enable "Sign in with Apple" capability
   - Ensure bundle ID matches Firebase config

3. **Install dependencies:**
   ```bash
   cd ios
   pod install
   ```

4. **Run on device:**
   ```bash
   npx expo run:ios --device
   ```

### Android Testing

1. **Open Android project in Android Studio:**
   ```bash
   cd android
   studio .
   ```

2. **Build and run:**
   ```bash
   npx expo run:android --device
   ```

---

## 🧪 Authentication Flow Test Checklist

### Email/Password Flow
- [ ] Sign up with new email
- [ ] Verify user document created in Firestore
- [ ] Log out
- [ ] Log in with credentials
- [ ] Test "Forgot Password" flow
- [ ] Verify password reset email received

### Apple Sign-In (iOS only, requires device)
- [ ] Tap "Sign in with Apple"
- [ ] Complete Apple authentication
- [ ] Verify user created in Firebase Auth
- [ ] Verify user document in Firestore
- [ ] Check free tier initialized (3 faxes remaining)

### Protected Routes
- [ ] Verify redirect to auth screens when logged out
- [ ] Verify access to main app when logged in
- [ ] Test logout functionality
- [ ] Verify re-login persistence

### Profile & Settings
- [ ] View profile information
- [ ] Check subscription badge (Free tier)
- [ ] Verify usage stats display
- [ ] Navigate to Settings
- [ ] Test all settings options

---

## 🔧 Troubleshooting

### Firebase Connection Issues
```bash
# iOS - Check Firebase configuration
cat ios/GoogleService-Info.plist

# Android - Check Firebase configuration  
cat android/app/google-services.json
```

### Apple Sign-In Not Working
- Ensure capability is enabled in Xcode
- Verify App ID has "Sign in with Apple" enabled in Apple Developer Portal
- Test only on physical device (simulator not supported)

### Build Errors
```bash
# Clean and rebuild iOS
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npx expo run:ios --device

# Clean and rebuild Android
cd android
./gradlew clean
cd ..
npx expo run:android --device
```

---

## 📊 Firestore Data Structure

After successful signup, verify this structure in Firebase Console:

```
users/{uid}/
  ├── email: string
  ├── displayName: string | null
  ├── subscriptionTier: "free"
  ├── faxesRemaining: 3
  ├── creditsRemaining: 0
  ├── monthlyResetDate: ISO timestamp
  ├── createdAt: ISO timestamp
  └── settings: {
      notifications: true,
      faxQuality: "high",
      autoSave: true
  }
```

---

## ✅ Phase 6 Sign-Off

Once testing is complete and authentication works:
- [ ] Email/Password auth tested ✓
- [ ] Apple Sign-In tested (iOS) ✓
- [ ] Firestore documents verified ✓
- [ ] Profile screens functional ✓
- [ ] Protected routes working ✓

**Then proceed to Phase 7: RevenueCat Monetization!**

---

## 🎯 Next: Phase 7 - RevenueCat Integration

### Prerequisites
1. RevenueCat account created
2. App Store Connect app listing ready
3. Subscription products configured
4. SDK installed and initialized

See ROADMAP.md Phase 7 for detailed implementation plan.
