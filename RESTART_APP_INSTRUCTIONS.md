# How to Apply the PDF Download Fix

## The Problem

The code changes have been made, but your running app hasn't picked them up yet. You need to restart the development server and reload the app.

## Solution: Restart the App

### Option 1: Quick Reload (Try This First)

1. **In the Expo Go app or your development build:**
   - Shake your device (or press Cmd+D on iOS simulator / Cmd+M on Android emulator)
   - Tap "Reload"

2. **Or in the terminal where Expo is running:**
   - Press `r` to reload the app

### Option 2: Full Restart (If Quick Reload Doesn't Work)

1. **Stop the Expo server:**
   - In the terminal where `npm start` or `expo start` is running
   - Press `Ctrl+C` to stop it

2. **Clear the cache and restart:**
   ```bash
   npm start -- --clear
   ```
   
   Or:
   ```bash
   expo start --clear
   ```

3. **Reload the app on your device**

### Option 3: Complete Clean Restart

If the above don't work:

```bash
# Stop the server (Ctrl+C)

# Clear all caches
npx expo start --clear

# Or if using npm:
npm start -- --clear
```

## What Changed

The following files were modified to fix the PDF download issue:

1. **`src/config/firebase.ts`** - Added Firebase Storage initialization
2. **`src/services/inbox.ts`** - Added logic to generate download URLs from storagePath

These changes allow the app to dynamically generate signed URLs from the `storagePath` field when `documentUrl` is empty.

## After Restarting

1. Open the TigerFax app
2. Go to Inbox
3. Tap on a received fax
4. The PDF should now display/download correctly!

## If It Still Doesn't Work

If after restarting the app it still doesn't work, check the console for errors. The most common issues would be:

1. **Firebase Storage not initialized** - Check that the `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` environment variable is set
2. **Storage rules blocking access** - We already deployed the correct rules, so this shouldn't be an issue
3. **Network error** - Check your internet connection

## Verification

To verify the fix is working, check the console logs. You should see:
- No errors about "Firebase Storage is not configured"
- Successfully generated download URLs for faxes

If you see errors like "Failed to get download URL for fax...", that indicates a problem with Storage permissions or configuration.
