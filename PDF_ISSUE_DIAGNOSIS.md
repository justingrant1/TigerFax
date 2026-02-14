# PDF Download Issue - Complete Diagnosis

## Current Status

### What We Know ✓
1. **Faxes appear in inbox** - The webhook is receiving faxes and storing metadata
2. **Base64 PDF data is received** - Logs show the PDF is included in the webhook payload
3. **Deployment timed out** - The enhanced logging code didn't deploy successfully
4. **Old webhook version is still running** - No enhanced logs are appearing

### The Problem ❌
- PDFs cannot be downloaded/viewed in the app
- `storagePath` field is likely empty in Firestore
- PDF files are not being uploaded to Firebase Storage

## Root Cause

The PDF upload to Firebase Storage is **failing silently**. The webhook code has proper logic to:
1. Receive base64 PDF from Sinch ✓
2. Decode it to a Buffer ✓
3. Upload to Firebase Storage ❌ **FAILS HERE**
4. Store metadata in Firestore ✓

The failure happens at step 3, but the error is caught and the webhook continues, storing the fax metadata with an empty `storagePath`.

## Why Is It Failing?

Most likely causes (in order of probability):

### 1. Firebase Storage Permissions Issue (MOST LIKELY)
The Cloud Function service account may not have permission to write to Firebase Storage.

**Solution**: Grant Storage Admin role to the Cloud Function service account
```
gcloud projects add-iam-policy-binding tigerfax-e3915 \
  --member="serviceAccount:tigerfax-e3915@appspot.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### 2. Storage Bucket Not Configured
The default storage bucket may not be properly initialized.

**Check**: Go to Firebase Console → Storage and verify the bucket exists

### 3. Storage Rules Too Restrictive
The storage.rules file may be blocking writes from Cloud Functions.

**Current rules** (from storage.rules):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Problem**: Cloud Functions don't have `request.auth` - they use service account credentials.

**Solution**: Update storage.rules to allow Cloud Function writes:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read/write their own files
    match /receivedFaxes/{userId}/{faxId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null; // Cloud Functions have auth
    }
    
    // Allow all other authenticated access
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Immediate Next Steps

### Step 1: Fix Storage Rules (RECOMMENDED FIRST)
1. Update `storage.rules` with the new rules above
2. Deploy: `firebase deploy --only storage`
3. Test by sending a new fax

### Step 2: Verify Service Account Permissions
1. Go to Google Cloud Console → IAM & Admin
2. Find service account: `tigerfax-e3915@appspot.gserviceaccount.com`
3. Verify it has "Storage Admin" or "Storage Object Admin" role
4. If not, add it using the gcloud command above

### Step 3: Redeploy Cloud Function
The deployment timed out, so the enhanced logging isn't active. Try again:
```
firebase deploy --only functions:incomingFaxWebhook
```

### Step 4: Test and Verify
1. Send a test fax
2. Check Firebase logs for the enhanced logging messages
3. Check Firestore to verify `storagePath` is populated
4. Check Firebase Storage to verify the PDF file exists
5. Try downloading the PDF in the app

## Testing Commands

### Check Firestore Data
```bash
# Using Firebase Console
# Navigate to: Firestore → users → [userId] → inbox → [faxId]
# Check if storagePath field has a value
```

### Check Firebase Storage
```bash
# Using Firebase Console  
# Navigate to: Storage → receivedFaxes → [userId] → [faxId].pdf
# Verify the file exists
```

### Check Cloud Function Logs
```bash
firebase functions:log --only incomingFaxWebhook
```

## Expected Behavior After Fix

1. Fax received from Sinch
2. Webhook processes fax with base64 PDF
3. PDF decoded to Buffer
4. **PDF uploaded to Storage** ← This should now work
5. `storagePath` stored in Firestore with value like: `receivedFaxes/[uid]/[faxId].pdf`
6. Signed URL generated
7. User can download/view PDF in app

## Files Modified

- `functions/src/incomingFaxWebhook.ts` - Enhanced logging (not deployed yet)
- `storage.rules` - Needs to be updated

## Related Documentation

- `PDF_UPLOAD_ROOT_CAUSE.md` - Detailed technical analysis
- `PDF_UPLOAD_FIX_SUMMARY.md` - Complete fix summary with testing checklist
- `WEBHOOK_PERMANENT_FIX.md` - Original webhook implementation

## Quick Fix Summary

**The most likely fix is updating storage.rules to allow Cloud Function writes.**

Current rules require `request.auth != null`, but Cloud Functions use service account credentials which may not satisfy this condition in the same way as client SDK requests.

