# Fax Number Provisioning Fix

## Problem Summary
After a user successfully upgraded to a Pro subscription, they were redirected to the Inbox screen which showed "No faxes yet" but **did not display their fax number**. The fax number provisioning system was not working properly.

## Root Cause Analysis

### The Main Issue
The `getUserDocument()` function in `src/services/firestore.ts` was **not returning the fax number fields** from Firestore, even though the Cloud Function may have been provisioning them correctly.

```typescript
// BEFORE - Missing fax number fields
return {
  uid,
  email: data.email || null,
  // ... other fields
  // ❌ MISSING: faxNumber, faxNumberAssignedAt
};
```

### The Flow (How It Should Work)
1. User purchases Pro subscription via RevenueCat
2. `SubscriptionScreen` → `handlePurchaseSuccess()` → `syncSubscriptionStatus()`
3. `syncSubscriptionStatus()` updates Firestore: `subscriptionTier: 'pro'`
4. **Cloud Function** `provisionFaxNumber` (in `functions/src/provisioning.ts`) triggers on Firestore update
5. Cloud Function provisions a number from Sinch API and stores it in Firestore
6. App reads the fax number from Firestore and displays it to the user

### Why It Wasn't Working
Even if the Cloud Function successfully provisioned the number and stored it in Firestore, the app never displayed it because:
- `getUserDocument()` didn't include `faxNumber` in the returned object
- The UI had no way to show provisioning status or errors

## Changes Made

### 1. Fixed `src/services/firestore.ts`
✅ Updated `getUserDocument()` to return fax number fields:

```typescript
return {
  uid,
  email: data.email || null,
  displayName: data.displayName || null,
  photoURL: data.photoURL || null,
  subscriptionTier: data.subscriptionTier || 'free',
  faxesRemaining: data.faxesRemaining || 0,
  creditsRemaining: data.creditsRemaining || 0,
  monthlyResetDate: data.monthlyResetDate,
  createdAt: data.createdAt,
  lastLogin: data.lastLogin,
  faxNumber: data.faxNumber || undefined,           // ✅ ADDED
  faxNumberAssignedAt: data.faxNumberAssignedAt || undefined,  // ✅ ADDED
  unreadFaxCount: data.unreadFaxCount || 0,         // ✅ ADDED
};
```

### 2. Updated `src/screens/InboxScreen.tsx`
✅ Added provisioning status screen for Pro users without a fax number yet:

```typescript
// Show provisioning status for Pro users without a fax number yet
if (isPro && !faxNumber) {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-1 justify-center items-center p-6">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2 mt-4">
          Setting Up Your Fax Number
        </Text>
        <Text className="text-base text-gray-600 dark:text-gray-300 text-center mb-6">
          We're provisioning your dedicated fax number. This usually takes just a few moments...
        </Text>
        <TouchableOpacity
          className="bg-gray-200 dark:bg-gray-700 py-3 px-6 rounded-lg mt-4"
          onPress={handleRefresh}
        >
          <Text className="text-gray-900 dark:text-white font-semibold">
            Refresh Status
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

### 3. Updated `src/screens/ProfileScreen.tsx`
✅ Added fax number display section for Pro users:

```typescript
{/* Fax Number for Pro Users */}
{userData.subscriptionTier === 'pro' && (
  <View className="bg-white px-6 py-6 mt-4 border-b border-gray-200">
    <Text className="text-lg font-semibold text-gray-900 mb-4">
      Your Fax Number
    </Text>
    
    {userData.faxNumber ? (
      // Show the fax number with copy button
      <View className="bg-blue-50 rounded-xl p-4 flex-row items-center justify-between">
        {/* ... displays fax number ... */}
      </View>
    ) : (
      // Show provisioning status
      <View className="bg-yellow-50 rounded-xl p-4 flex-row items-center">
        <Text className="text-sm font-semibold text-yellow-800 mb-1">
          Number Being Provisioned
        </Text>
        {/* ... */}
      </View>
    )}
  </View>
)}
```

## What Still Needs to Be Done

### 1. Verify Cloud Functions Are Deployed ⚠️
The Cloud Function `provisionFaxNumber` needs to be deployed to Firebase:

```bash
cd functions
npm install
firebase deploy --only functions:provisionFaxNumber
```

Check deployment status:
```bash
firebase functions:list
```

### 2. Verify Sinch API Credentials ⚠️
The provisioning function has hardcoded credentials in `functions/src/provisioning.ts`:

```typescript
function getSinchConfig() {
  return {
    projectId: process.env.SINCH_PROJECT_ID || '881d6487-fb61-4c40-85b1-ed77a90c7334',
    keyId: process.env.SINCH_KEY_ID || '945ba97f-aa5b-4ce1-a899-61a399da99b1',
    keySecret: process.env.SINCH_KEY_SECRET || '5o76bjtWk3RK47NodVmS5fRbCK',
  };
}
```

**Action Required:**
- Verify these credentials are valid
- Set them as environment variables in Firebase Functions config:
  ```bash
  firebase functions:config:set sinch.project_id="YOUR_PROJECT_ID"
  firebase functions:config:set sinch.key_id="YOUR_KEY_ID"
  firebase functions:config:set sinch.key_secret="YOUR_KEY_SECRET"
  ```

### 3. Test the Complete Flow
1. Create a test user account
2. Upgrade to Pro subscription
3. Verify the Cloud Function triggers (check Firebase Functions logs)
4. Verify the fax number appears in:
   - InboxScreen (header)
   - ProfileScreen (dedicated section)
5. Test the "Refresh Status" button if provisioning is slow

### 4. Add Error Handling (Optional Enhancement)
Consider adding a `faxNumberError` field to handle provisioning failures:
- Display error message to user
- Provide "Contact Support" button
- Add retry mechanism

## Testing Checklist

- [ ] Deploy Cloud Functions to Firebase
- [ ] Verify Sinch API credentials are valid
- [ ] Test subscription upgrade flow
- [ ] Verify fax number appears in Inbox after provisioning
- [ ] Verify fax number appears in Profile screen
- [ ] Test "Refresh Status" button functionality
- [ ] Check Firebase Functions logs for errors
- [ ] Test with a real subscription purchase (sandbox mode)

## Monitoring

Check Firebase Functions logs to see if provisioning is working:
```bash
firebase functions:log --only provisionFaxNumber
```

Look for:
- ✅ "User {uid} upgraded to Pro. Provisioning fax number..."
- ✅ "Successfully provisioned fax number {number} for user {uid}"
- ❌ Any error messages

## Summary

The fix ensures that:
1. ✅ Fax numbers are properly read from Firestore
2. ✅ Users see a "provisioning in progress" message while waiting
3. ✅ Users can refresh to check if their number is ready
4. ✅ The fax number is prominently displayed once provisioned
5. ✅ Better user experience with clear status indicators

The main issue was a simple oversight - the app wasn't reading the fax number field from Firestore, even though the backend may have been working correctly.
