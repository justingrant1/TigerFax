# Inbox Fax Not Showing - Root Cause & Fix

## Issue
Fax was successfully received by Sinch (ID: 01KGPICZPMN288OAAW647ZSR2Q) and webhook was called (200 response), but the fax is not showing in the user's inbox in the app.

**User:** jgkoff+10@gmail.com  
**Fax Number:** +12232426242  
**Fax Details:**
- From: +16464377113
- To: +12232426242
- Pages: 2
- Status: COMPLETED
- Direction: INBOUND

## Root Cause

The webhook function (`incomingFaxWebhook`) looks up the user by fax number:

```typescript
const uid = await findUserByFaxNumber(toNumber); // toNumber = +12232426242

if (!uid) {
  console.error(`No user found for fax number ${toNumber}`);
  res.status(404).json({ error: 'User not found' });
  return;
}
```

**The problem:** The user's `faxNumber` field in Firestore likely doesn't match `+12232426242` exactly, so the webhook couldn't find the user and returned 404 (or the fax number field is not set at all).

## Possible Causes

1. **Fax number not set** - User upgraded to Pro but the provisioning function didn't set the faxNumber field
2. **Format mismatch** - Fax number is stored in a different format (e.g., without +, with spaces, etc.)
3. **Wrong number** - A different number was assigned to the user

## Solution Steps

### 1. Check User's Fax Number in Firestore

Go to Firebase Console → Firestore → `users` collection → Find user by email `jgkoff+10@gmail.com`

Check the `faxNumber` field:
- Is it set?
- Does it match `+12232426242` exactly?

### 2. Fix the Fax Number

If the fax number is missing or incorrect, update it in Firestore:

```javascript
// In Firebase Console or using Admin SDK
await db.collection('users').doc(uid).update({
  faxNumber: '+12232426242',
  faxNumberAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

### 3. Manually Add the Fax to Inbox (if needed)

Since the webhook already processed the fax but couldn't store it, you may need to manually add it:

```javascript
await db.collection('users').doc(uid).collection('inbox').doc('01KGPICZPMN288OAAW647ZSR2Q').set({
  faxId: '01KGPICZPMN288OAAW647ZSR2Q',
  from: '+16464377113',
  to: '+12232426242',
  pages: 2,
  receivedAt: '2026-02-05T04:36:29Z',
  documentUrl: '',
  storagePath: '', // May need to download from Sinch manually
  read: false,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});

// Update unread count
await db.doc(`users/${uid}`).update({
  unreadFaxCount: admin.firestore.FieldValue.increment(1),
});
```

### 4. Download Fax PDF from Sinch (if needed)

If the fax wasn't stored in Firebase Storage, download it from Sinch:

```bash
curl -X GET \
  "https://fax.api.sinch.com/v3/projects/881d6487-fb61-4c40-85b1-ed77a90c7334/faxes/01KGPICZPMN288OAAW647ZSR2Q/content" \
  -H "Authorization: Basic OTQ1YmE5N2YtYWE1Yi00Y2UxLWE4OTktNjFhMzk5ZGE5OWIxOjVvNzZianRXazNSSzQ3Tm9kVm1TNWZSYkNL" \
  -o received-fax.pdf
```

Then upload to Firebase Storage at: `receivedFaxes/{uid}/01KGPICZPMN288OAAW647ZSR2Q.pdf`

## Prevention - Fix Provisioning

The provisioning Cloud Function should always set the faxNumber field when assigning a number. Check `functions/src/provisioning.ts`:

```typescript
await admin.firestore().doc(`users/${uid}`).update({
  faxNumber: phoneNumber, // Make sure this is in E.164 format (+12232426242)
  faxNumberAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
  subscriptionTier: 'pro',
});
```

## Testing

After fixing:
1. Check Firestore - user should have `faxNumber: '+12232426242'`
2. Open app and go to Inbox screen
3. Fax should appear with 2 pages from +16464377113
4. Send another test fax to verify webhook works correctly

## Quick Fix Commands

```bash
# Check Firebase logs for webhook errors
firebase functions:log --only incomingFaxWebhook

# Check user in Firestore (requires Firebase CLI auth)
firebase firestore:get users --where email==jgkoff+10@gmail.com

# Update user's fax number (requires Firebase CLI auth)
firebase firestore:update users/{uid} faxNumber=+12232426242
```
