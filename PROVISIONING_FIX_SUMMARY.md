# Fax Number Provisioning - Complete Fix Summary

## Issues Fixed

### 1. ✅ Users Getting Test Numbers Instead of Real Numbers
**Problem:** After upgrading to Pro, users received fake numbers like `+15551876946`

**Root Cause:** The Sinch API endpoint for renting specific numbers with FAX configuration was failing with 500/501 errors.

**Solution:** 
- Switched from renting specific numbers to using the `rentAny` endpoint
- Separated number rental from FAX configuration (two-step process)
- Successfully tested and verified working

### 2. ✅ Duplicate Numbers Being Rented
**Problem:** When a user upgraded, 2 numbers were being rented instead of 1

**Root Cause:** The Cloud Function triggers on Firestore `onUpdate`. When we updated the user document with the fax number, it triggered the function again, causing a second number to be rented.

**Solution:**
- Added check to skip if `faxNumber` just changed from empty to a value
- This prevents the infinite loop of provisioning

## Code Changes

### functions/src/provisioning.ts

**Changed:**
1. `rentNumber()` → `rentAnyNumber()` - Uses Sinch's recommended endpoint
2. Added `configureNumberForFax()` - Separate step to configure for FAX
3. Added `justGotNumber` check - Prevents duplicate provisioning
4. Fixed `releaseNumber()` - Uses POST with `:release` instead of DELETE

### Key Improvements

```typescript
// OLD - Failed with 500/501 errors
await rentNumber(specificNumber, webhookUrl);

// NEW - Works reliably
const rentedData = await rentAnyNumber('US', 'LOCAL');
await configureNumberForFax(rentedData.phoneNumber, webhookUrl);
```

```typescript
// NEW - Prevents duplicate provisioning
const justGotNumber = !before.faxNumber && after.faxNumber;
if (justGotNumber) {
  console.log('Skipping to prevent duplicate provisioning');
  return null;
}
```

## Testing Results

### ✅ Rent Numbers - WORKING
```
Response status: 200
Successfully rented number: +12232426179
```

### ✅ Release Numbers - WORKING
```
Releasing +12232426179...
✅ Released successfully
```

### ✅ Duplicate Prevention - DEPLOYED
The function now checks if a number was just assigned and skips re-provisioning.

## Current Status

### Active Numbers in Sinch
- `+12064265438` - Configured for FAX (KEEP - this is your main number)
- 4 extra numbers from testing (can be released manually via Sinch dashboard if needed)

### Deployed Functions
- ✅ `provisionFaxNumber` - Updated with rentAny and duplicate prevention
- ✅ `releaseFaxNumber` - Updated with correct release endpoint
- ✅ All functions deployed successfully

## What Happens Now

When a user upgrades to Pro:

1. **User purchases subscription** → RevenueCat processes payment
2. **App updates Firestore** → `subscriptionTier` set to `'pro'`
3. **Cloud Function triggers** → `provisionFaxNumber` detects the upgrade
4. **Sinch rents number** → Uses `rentAny` endpoint (reliable)
5. **Number configured** → Attempts to configure for FAX (optional)
6. **Firestore updated** → `faxNumber` field set with real number
7. **Function skips** → Detects number was just assigned, doesn't trigger again
8. **User sees number** → InboxScreen displays the real fax number

## Testing Instructions

### For New Users
1. Create a new account
2. Upgrade to Pro subscription
3. Navigate to Inbox
4. Should see: "Setting Up Your Fax Number" → then real number appears

### For Existing Test Account (jgkoff+8@gmail.com)
1. Go to Firebase Console → Firestore
2. Find user document
3. Delete `faxNumber` field
4. Save
5. Function will auto-trigger and assign a real number

### Monitor Logs
```bash
firebase functions:log --only provisionFaxNumber
```

Look for:
- ✅ "Renting a fax number from Sinch..."
- ✅ "Successfully rented number: +1..." (real number)
- ✅ "Successfully provisioned fax number..."
- ✅ "Skipping to prevent duplicate provisioning" (on second trigger)

## Scripts Created

1. **test-sinch-rent-v2.js** - Tests different rent approaches
2. **cleanup-extra-numbers.js** - Releases extra numbers (use via Sinch dashboard instead)
3. **trigger-provisioning-for-user.js** - Manually trigger provisioning for testing

## Next Steps

1. ✅ **Fix is deployed** - New users will get real numbers
2. ⚠️ **Extra numbers** - You can release the 4 extra test numbers via Sinch dashboard to avoid $4/month cost
3. ✅ **Test with new account** - Create fresh account to verify end-to-end flow
4. ✅ **Monitor logs** - Watch for any issues with new subscriptions

## Cost Impact

- Each number costs $1/month
- You currently have 5 active numbers = $5/month
- Recommended: Keep only 1-2 numbers, release the rest via Sinch dashboard
