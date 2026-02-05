# Sinch Number Provisioning Fix

## Problem Identified

When users upgrade to Pro subscription, they receive a **test number** (e.g., `+15551876946`) instead of a real Sinch number.

### Root Cause

The logs show:
```
Found available number: +12064791761
Attempting to rent number +12064791761...
Error: Failed to rent number: 500 - {"error":{"code":500,"message":"Application error processing RPC"}}
Sinch API error, assigning temporary test number: +15551876946
```

The issue was that we were trying to rent a **specific number** with **FAX configuration** in the same request, which Sinch doesn't support.

## Solution Implemented

### What Changed

1. **Switched from `rentNumber()` to `rentAnyNumber()`**
   - Old approach: Search for numbers, then try to rent a specific one
   - New approach: Use Sinch's `rentAny` endpoint to let them pick an available number
   - This is more reliable and is the recommended approach

2. **Separated number rental from FAX configuration**
   - First: Rent the number with VOICE capability
   - Then: Configure it for FAX (as a separate PATCH request)

3. **Test Results**
   - ✅ `rentAny` endpoint works perfectly (tested successfully)
   - ✅ Successfully rented number: `+12232426179`
   - ✅ The function has been updated and deployed

### Code Changes

**Before:**
```typescript
// Search for specific number
const availableNumbers = await searchAvailableNumbers('US', 'LOCAL');
selectedNumber = availableNumbers[0].phoneNumber;

// Try to rent with FAX config (FAILS with 500/501 error)
await rentNumber(selectedNumber, webhookUrl);
```

**After:**
```typescript
// Rent any available number (WORKS!)
const rentedNumberData = await rentAnyNumber('US', 'LOCAL');
selectedNumber = rentedNumberData.phoneNumber;

// Configure for FAX separately (optional)
await configureNumberForFax(selectedNumber, webhookUrl);
```

## Testing the Fix

### Option 1: Test with New User

1. Create a new test account in the app
2. Purchase a Pro subscription
3. Navigate to Inbox screen
4. You should see:
   - Loading state: "Setting Up Your Fax Number"
   - Then: A real Sinch number displayed (e.g., `+1206...`)

### Option 2: Test with Existing User (jgkoff+8@gmail.com)

Since the user already has a test number, you need to:

1. **Go to Firebase Console** → Firestore Database
2. **Find the user document** for `jgkoff+8@gmail.com`
3. **Delete the `faxNumber` field** from the document
4. **Save the document**
5. The Cloud Function will automatically trigger and assign a real number

### Option 3: Monitor Logs

Watch the Cloud Function logs in real-time:
```bash
firebase functions:log --only provisionFaxNumber
```

Look for:
- ✅ "Successfully rented number: +1..." (real number, not +1555...)
- ✅ "Successfully configured number for FAX"
- ✅ "Successfully provisioned fax number..."

## What Happens Now

When a user upgrades to Pro:

1. **SubscriptionScreen** → User purchases → `handlePurchaseSuccess()` called
2. **Firestore** → `subscriptionTier` updated to `'pro'`
3. **Cloud Function** → `provisionFaxNumber` triggers automatically
4. **Sinch API** → Rents a real number using `rentAny` endpoint
5. **Sinch API** → Configures number for FAX (PATCH request)
6. **Firestore** → Stores real number in user document
7. **InboxScreen** → Shows the real number to the user

## Verification

After the fix is deployed and a new user upgrades:

- ❌ Old behavior: User gets `+1555xxxxxxx` (test number)
- ✅ New behavior: User gets `+1206xxxxxxx` or similar (real Sinch number)

## Already Deployed

The fix has been deployed to Firebase Cloud Functions as of **Feb 4, 2026 4:52 PM**.

The next Pro subscription purchase should receive a real number automatically.

## Note About Existing Test Number

The test script successfully rented a real number: `+12232426179`

This number is now active in your Sinch account and will cost $1/month. You may want to release it if not needed:

```bash
# Check active numbers
node test-sinch-rent-v2.js

# Or release via Sinch dashboard
```
