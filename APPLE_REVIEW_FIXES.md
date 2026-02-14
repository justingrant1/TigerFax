# Apple App Review Fixes - Complete

## Summary
All code-related issues from the Apple App Review rejection have been fixed. This document outlines what was done and what remains for you to complete manually.

---

## ✅ COMPLETED CODE FIXES

### 1. Guideline 5.1.1 - Camera Permission Button (FIXED)
**Issue:** Button said "Grant Permission" which Apple doesn't allow.  
**Fix:** Changed button text to "Continue" in `DocumentScanScreen.tsx`

### 2. Guideline 3.1.2 & 2.1 - Subscription Information (FIXED)
**Issue:** Missing required subscription information and broken ToS/Privacy links.  
**Fixes:**
- **SubscriptionScreen.tsx:**
  - Added "TigerFax Pro" title to subscription plans
  - Added subscription duration ("1 month subscription" / "12 months subscription")
  - Fixed Terms of Service and Privacy Policy links to open `https://tigerfax.com/terms` and `https://tigerfax.com/privacy`

### 3. Guideline 2.1 - Broken ToS/Privacy Links (FIXED)
**Issue:** Terms and Privacy links were not clickable or led to blank pages.  
**Fixes:**
- **WelcomeScreen.tsx:** Made ToS/Privacy text tappable with `Linking.openURL()`
- **LoginScreen.tsx:** Added tappable ToS/Privacy agreement text
- **SignupScreen.tsx:** Added tappable ToS/Privacy agreement text
- All links now open `https://tigerfax.com/terms` and `https://tigerfax.com/privacy`

### 4. Guideline 2.2 - Unimplemented Features (FIXED)
**Issue:** Several features showed "Coming Soon" alerts instead of working.  
**Fixes:**
- **SettingsScreen.tsx:**
  - ✅ **Fax Quality:** Now functional with 3 options (Standard, High, Fine)
  - ✅ **Default Filter:** Now functional with 4 options (Color, B&W, Document, Photo)
  - ✅ **Subscription:** Now navigates to SubscriptionScreen
  - ✅ **Help Center:** Now navigates to new HelpCenterScreen
- **HelpCenterScreen.tsx:** Created new in-app FAQ screen with 10 common questions
- **AppNavigator.tsx:** Registered HelpCenter screen in navigation

---

## ⚠️ MANUAL TASKS REQUIRED

### 1. Guideline 2.3.3 - iPad Screenshots (MANUAL)
**What you need to do:**
1. Open your app in an iPad simulator (13-inch iPad Air or similar)
2. Take proper screenshots at the correct iPad resolution
3. Go to App Store Connect → Your App → Screenshots
4. Click "View All Sizes in Media Manager"
5. Upload the new iPad screenshots (do NOT use stretched iPhone screenshots)

### 2. Guideline 2.1 - Demo Video (MANUAL)
**What you need to do:**
1. Use a **physical iPhone** (not simulator)
2. Enable screen recording: Settings → Control Center → Screen Recording
3. Record yourself:
   - Creating a fax (scan/upload document)
   - Sending the fax
   - Receiving a fax (if you have Pro with inbox)
4. Upload the video to YouTube, Vimeo, or Dropbox
5. In App Store Connect → Your App → App Review Information → Notes
6. Add the video link in the "Notes" field

### 3. Verify ToS/Privacy Pages (MANUAL)
**What you need to do:**
1. Ensure `https://tigerfax.com/terms` has actual Terms of Service content (not blank)
2. Ensure `https://tigerfax.com/privacy` has actual Privacy Policy content (not blank)
3. If these pages don't exist yet, create them with proper legal content

---

## 📋 FILES MODIFIED

1. `src/screens/DocumentScanScreen.tsx` - Camera permission button text
2. `src/screens/WelcomeScreen.tsx` - Tappable ToS/Privacy links
3. `src/screens/LoginScreen.tsx` - Added ToS/Privacy agreement
4. `src/screens/SignupScreen.tsx` - Added ToS/Privacy agreement
5. `src/screens/SubscriptionScreen.tsx` - Added subscription details and working links
6. `src/screens/SettingsScreen.tsx` - Implemented all "Coming Soon" features
7. `src/screens/HelpCenterScreen.tsx` - NEW: In-app FAQ screen
8. `src/navigation/AppNavigator.tsx` - Registered HelpCenter screen

---

## 🚀 NEXT STEPS

1. **Test the app** to ensure all features work correctly
2. **Take iPad screenshots** on a real iPad or iPad simulator
3. **Record demo video** on a physical iPhone
4. **Verify ToS/Privacy pages** are live and have content
5. **Upload screenshots and video link** to App Store Connect
6. **Resubmit for review**

---

## 📝 NOTES FOR APP REVIEW

When you resubmit, you can reply to Apple's message in App Store Connect with:

> "Thank you for the feedback. We have addressed all the issues:
> 
> 1. ✅ Camera permission button changed to "Continue"
> 2. ✅ Subscription information now includes title, duration, and working ToS/Privacy links
> 3. ✅ All auth screens now have functional ToS/Privacy links
> 4. ✅ All "Coming Soon" features have been implemented (Fax Quality, Default Filter, Subscription management, Help Center)
> 5. ✅ New iPad screenshots uploaded (proper resolution, not stretched)
> 6. ✅ Demo video link added to Notes field
> 
> All features are now fully functional and ready for review."

---

## ✨ SUMMARY

**Code Fixes:** ✅ Complete (8 files modified)  
**Manual Tasks:** ⚠️ 3 remaining (screenshots, video, verify ToS/Privacy pages)

Once you complete the manual tasks and resubmit, your app should pass Apple's review!
