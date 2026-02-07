# Push Notifications Setup Guide

## Problem Identified

Push notifications were not working because:
1. **No FCM token registration** - The app never got or saved the push token to Firestore
2. **Missing expo-notifications plugin** - app.json didn't include the notifications plugin
3. **No APNs configuration** - iOS push notifications require proper setup

## Solution Implemented

### 1. Added Push Token Registration

**File: `src/services/notifications.ts`**
- Added `getExpoPushToken()` - Gets Expo push token for remote notifications
- Added `getDevicePushToken()` - Gets device-specific token (FCM/APNs)

**File: `src/contexts/AuthContext.tsx`**
- Added `registerPushToken()` function that:
  - Requests notification permissions
  - Gets the Expo push token
  - Saves it to Firestore as `fcmToken`
- Calls `registerPushToken()` when user logs in (in `onAuthStateChanged`)

### 2. Updated app.json

Added `expo-notifications` plugin:
```json
"plugins": [
  "expo-apple-authentication",
  [
    "expo-notifications",
    {
      "icon": "./assets/icon.png",
      "color": "#3B82F6",
      "sounds": ["./assets/notification-sound.wav"]
    }
  ]
]
```

### 3. How It Works

```
User logs in
    ↓
AuthContext.onAuthStateChanged fires
    ↓
registerPushToken() called
    ↓
Request notification permissions
    ↓
Get Expo push token
    ↓
Save to Firestore: users/{uid}/fcmToken
    ↓
Cloud Function can now send notifications!
```

## Cloud Function (Already Working)

The Cloud Function in `functions/src/notifications.ts` already:
- Listens for new faxes in `users/{uid}/inbox/{faxId}`
- Gets the user's `fcmToken` from Firestore
- Sends push notification via Firebase Cloud Messaging

**For incoming faxes:**
```typescript
await admin.messaging().send({
  token: fcmToken,
  notification: {
    title: '📠 New Fax Received',
    body: `From: ${faxData.from} • ${faxData.pages} pages`,
  },
  data: {
    type: 'fax_received',
    faxId,
    screen: 'Inbox',
  },
});
```

## Testing

### Prerequisites
1. **iOS**: Must be a published build (TestFlight or App Store)
   - Push notifications don't work in Expo Go or development builds
   - Need APNs key uploaded to Firebase Console

2. **Android**: Works in development builds
   - FCM is configured automatically

### Steps to Test

1. **Build new iOS app:**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Install via TestFlight**

3. **Log in to the app**
   - Check console logs for: "Push token registered successfully"
   - Verify in Firestore that `users/{uid}/fcmToken` is set

4. **Send a test fax to your number**
   - Should receive push notification
   - Notification should show sender and page count

5. **Send a fax from the app**
   - Should receive notification when delivered (if implemented)

## Firebase Console Setup (iOS)

### Upload APNs Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select TigerFax project
3. Go to Project Settings → Cloud Messaging
4. Under "Apple app configuration":
   - Click "Upload" under APNs Authentication Key
   - Upload your .p8 key file from Apple Developer
   - Enter Key ID and Team ID

### Get APNs Key from Apple

1. Go to [Apple Developer](https://developer.apple.com/account/resources/authkeys/list)
2. Create new key with "Apple Push Notifications service (APNs)" enabled
3. Download the .p8 file
4. Note the Key ID
5. Upload to Firebase Console

## Notification Types

### 1. Incoming Fax (Implemented)
- **Trigger**: New document in `users/{uid}/inbox/{faxId}`
- **Title**: "📠 New Fax Received"
- **Body**: "From: {number} • {pages} pages"
- **Data**: `{ type: 'fax_received', faxId, screen: 'Inbox' }`

### 2. Fax Sent Successfully (Local Only)
- **Trigger**: Manual call in app after fax sent
- **Title**: "✅ Fax Sent Successfully"
- **Body**: "Your fax to {recipient} was delivered"
- **Type**: Local notification (not push)

### 3. Fax Send Failed (Local Only)
- **Trigger**: Manual call in app after fax fails
- **Title**: "❌ Fax Send Failed"
- **Body**: "Failed to send fax to {recipient}"
- **Type**: Local notification (not push)

## Troubleshooting

### No notifications received

1. **Check permissions:**
   ```typescript
   const { status } = await Notifications.getPermissionsAsync();
   console.log('Permission status:', status);
   ```

2. **Check token in Firestore:**
   - Go to Firebase Console → Firestore
   - Navigate to `users/{your-uid}`
   - Verify `fcmToken` field exists and has a value like `ExponentPushToken[...]`

3. **Check Cloud Function logs:**
   ```bash
   firebase functions:log --only sendFaxReceivedNotification
   ```
   - Look for "Sent notification to user" or error messages

4. **Verify APNs key (iOS):**
   - Firebase Console → Project Settings → Cloud Messaging
   - Ensure APNs key is uploaded and valid

### Token not saving

1. **Check console logs:**
   - Should see "Push token registered successfully"
   - If not, check for errors in `registerPushToken()`

2. **Verify Firebase config:**
   - Ensure `db` is properly initialized in `src/config/firebase.ts`

3. **Check Firestore rules:**
   - Ensure users can update their own document

### Notifications work on Android but not iOS

- **iOS requires published build** - Won't work in Expo Go or development
- **APNs key must be uploaded** to Firebase Console
- **Bundle ID must match** in app.json and Apple Developer

## Next Steps

### Add More Notification Types

1. **Fax Delivery Status (Push)**
   - Listen to fax status updates in Firestore
   - Send notification when fax is delivered/failed

2. **Low Credits Warning (Push)**
   - Cloud Function triggered when credits < 5
   - Remind user to purchase more

3. **Monthly Reset Reminder (Push)**
   - Scheduled Cloud Function
   - Notify users when monthly faxes reset

### Improve Notification Handling

1. **Handle notification taps:**
   ```typescript
   addNotificationResponseListener((response) => {
     const { screen, faxId } = response.notification.request.content.data;
     // Navigate to appropriate screen
   });
   ```

2. **Update badge count:**
   - Show unread fax count on app icon
   - Clear when user views inbox

3. **Notification categories:**
   - Add action buttons (View, Delete, etc.)

## Files Modified

- ✅ `src/services/notifications.ts` - Added token registration functions
- ✅ `src/contexts/AuthContext.tsx` - Added `registerPushToken()` and call on login
- ✅ `app.json` - Added expo-notifications plugin
- ✅ `functions/src/notifications.ts` - Already had Cloud Function (no changes needed)

## Build Requirements

**IMPORTANT**: After these changes, you MUST rebuild the iOS app:

```bash
# Update build number in app.json first
# Then build
eas build --platform ios --profile production

# Or for both platforms
eas build --platform all --profile production
```

Push notifications require native code changes, so OTA updates won't work.

## Summary

✅ **What's Fixed:**
- Push token registration on login
- Token saved to Firestore
- expo-notifications plugin added
- Cloud Function already working

❌ **What's Still Needed:**
- Upload APNs key to Firebase Console (iOS)
- Rebuild iOS app with new build number
- Test on physical device via TestFlight

🎯 **Expected Result:**
After rebuilding and uploading APNs key, users will receive push notifications when:
- A fax is received in their inbox
- (Future) A fax they sent is delivered
- (Future) Other important events
