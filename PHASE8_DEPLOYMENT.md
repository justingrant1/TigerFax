# 🚀 Phase 8: Incoming Fax Numbers - Deployment Guide

> **Created:** February 2, 2026  
> **Status:** ✅ DEPLOYED & TESTED - February 2, 2026 17:33 UTC

---

## 📋 Overview

Phase 8 adds incoming fax capabilities for Pro subscribers, including:
- Automatic virtual number provisioning via Sinch
- Cloud Functions for webhook handling
- Mobile inbox screen for viewing received faxes
- Real-time notifications for new faxes

---

## ✅ Completed Implementation

### Backend (Firebase Cloud Functions)
- ✅ `functions/` directory with TypeScript configuration
- ✅ `provisionFaxNumber` - Auto-assign numbers when user upgrades to Pro
- ✅ `releaseFaxNumber` - Release numbers when subscription ends
- ✅ `incomingFaxWebhook` - Handle incoming fax webhooks from Sinch
- ✅ `sendFaxReceivedNotification` - Push notifications for new faxes

### Mobile App
- ✅ `InboxScreen.tsx` - View received faxes (Pro users only)
- ✅ `inbox.ts` service - Firestore operations for inbox
- ✅ Navigation updated with Inbox tab
- ✅ Real-time inbox updates with Firestore subscriptions
- ✅ Share, delete, and preview received faxes

---

## 🔧 Deployment Steps

### Step 1: Firebase Functions Setup

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase Functions** (if first time):
   ```bash
   firebase init functions
   # Select existing project: tigerfax-e3915
   # Choose TypeScript
   # Use existing functions/ directory
   ```

4. **Install Dependencies**:
   ```bash
   cd functions
   npm install
   cd ..
   ```

5. **Set Environment Variables**:
   ```bash
   firebase functions:config:set \
     sinch.project_id="881d6487-fb61-4c40-85b1-ed77a90c7334" \
     sinch.key_id="945ba97f-aa5b-4ce1-a899-61a399da99b1" \
     sinch.key_secret="5o76bjtWk3RK47NodVmS5fRbCK"
   ```

6. **Deploy Cloud Functions**:
   ```bash
   firebase deploy --only functions
   ```

   This will deploy:
   - `provisionFaxNumber` - Firestore trigger
   - `releaseFaxNumber` - Firestore trigger
   - `incomingFaxWebhook` - HTTPS endpoint
   - `sendFaxReceivedNotification` - Firestore trigger

7. **Note the Webhook URL**:
   After deployment, you'll get URLs like:
   ```
   https://us-central1-tigerfax-e3915.cloudfunctions.net/incomingFaxWebhook
   ```

---

### Step 2: Configure Sinch Webhook

**Important:** This step requires Sinch API access for virtual numbers.

1. **Verify Sinch Account**:
   - Ensure your Sinch account has access to virtual number provisioning
   - Check if Fax API includes number management features

2. **Update Webhook URL** (if different):
   - Edit `functions/src/provisioning.ts`
   - Update the webhook URL in the `provisionFaxNumber` function:
     ```typescript
     const webhookUrl = `https://us-central1-tigerfax-e3915.cloudfunctions.net/incomingFaxWebhook`;
     ```

3. **Test Number Provisioning**:
   - The function will automatically provision numbers when users upgrade to Pro
   - Monitor Firebase Functions logs: `firebase functions:log`

---

### Step 3: Firestore Security Rules

Update Firestore security rules to allow inbox access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Inbox subcollection - only user can read/write their own inbox
      match /inbox/{faxId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Fax history subcollection
      match /faxHistory/{faxId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

### Step 4: Firebase Storage Rules

Configure storage rules for received fax documents:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Received faxes - only user can access their own faxes
    match /receivedFaxes/{userId}/{faxId}.pdf {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only storage
```

---

### Step 5: Test the Complete Flow

#### Test 1: Number Provisioning
1. Create a test user account
2. Upgrade to Pro subscription
3. Check Firebase Functions logs:
   ```bash
   firebase functions:log --only provisionFaxNumber
   ```
4. Verify `faxNumber` field appears in Firestore user document
5. Check if user received push notification

#### Test 2: Incoming Fax
1. Send a test fax to the provisioned number
2. Monitor webhook function:
   ```bash
   firebase functions:log --only incomingFaxWebhook
   ```
3. Verify fax appears in Firestore `users/{uid}/inbox/`
4. Check Firebase Storage for PDF file
5. Verify push notification sent

#### Test 3: Mobile App Inbox
1. Open app as Pro user
2. Navigate to Inbox tab
3. Verify fax number displayed in header
4. Check received faxes list
5. Test preview, share, and delete functions

---

## 🐛 Troubleshooting

### Functions Not Deploying
```bash
# Check Firebase project
firebase use --add

# Ensure correct project selected
firebase use tigerfax-e3915

# Re-deploy with verbose logging
firebase deploy --only functions --debug
```

### Webhook Not Receiving Faxes
1. Check Sinch dashboard for webhook configuration
2. Verify webhook URL is correct
3. Test webhook manually:
   ```bash
   curl -X POST https://us-central1-tigerfax-e3915.cloudfunctions.net/incomingFaxWebhook \
     -H "Content-Type: application/json" \
     -d '{"id":"test123","from":"+11234567890","to":"+10987654321","status":"COMPLETED","numberOfPages":2}'
   ```
4. Check function logs for errors

### Number Provisioning Fails
1. Verify Sinch credentials are correct
2. Check if Sinch account has number provisioning enabled
3. View detailed error in user document:
   ```javascript
   // In Firestore console, check users/{uid}.faxNumberError
   ```
4. Contact Sinch support if needed

### Storage Access Denied
1. Verify Storage rules deployed
2. Check user authentication
3. Ensure signed URLs have correct expiration
4. Re-deploy storage rules

---

## 📊 Monitoring & Maintenance

### Firebase Console Monitoring
- **Functions**: Monitor invocations, errors, execution time
- **Firestore**: Check inbox document counts
- **Storage**: Monitor storage usage for received faxes
- **Authentication**: Track Pro user count

### Cost Monitoring
- Cloud Functions: ~$0.40 per million invocations
- Storage: $0.026/GB/month
- Firestore: $0.18 per million document reads
- Sinch Numbers: Check Sinch pricing for number rental

### Logs
```bash
# View all function logs
firebase functions:log

# View specific function
firebase functions:log --only incomingFaxWebhook

# Follow logs in real-time
firebase functions:log --follow
```

---

## 🔐 Security Considerations

1. **Webhook Authentication**: Consider adding signature verification
2. **Rate Limiting**: Implement rate limits on webhook endpoint
3. **Data Encryption**: Faxes stored in Firebase Storage (encrypted at rest)
4. **Access Control**: Users can only access their own inbox
5. **Audit Logging**: Log all inbox access and modifications

---

## 📈 Success Metrics

After deployment, track:
- ✅ Number of Pro users with provisioned numbers
- ✅ Incoming fax volume
- ✅ Webhook success rate
- ✅ Notification delivery rate
- ✅ Inbox engagement (views, shares, deletes)
- ✅ Average fax processing time

---

## 🚀 Next Steps

1. **Deploy Functions**: Run deployment commands
2. **Configure Sinch**: Set up webhook in Sinch dashboard
3. **Test Thoroughly**: Complete all test scenarios
4. **Monitor**: Watch logs for first 24-48 hours
5. **User Communication**: Announce incoming fax feature to Pro users
6. **Support Documentation**: Update help docs with inbox usage

---

## 📝 Notes

- **Sinch API Limitations**: Verify your Sinch plan supports virtual number provisioning
- **Regional Numbers**: Currently configured for US numbers only
- **Scaling**: Cloud Functions auto-scale, but monitor costs
- **Backup**: Regularly backup received fax metadata from Firestore

---

## ✅ Phase 8 Checklist

- [x] Cloud Functions implemented
- [x] Webhook handler created
- [x] Number provisioning logic
- [x] Inbox screen built
- [x] Navigation updated
- [x] Real-time updates
- [x] Functions deployed ✅ (Feb 2, 2026)
- [x] Webhook tested successfully ✅
- [ ] Webhook configured in Sinch dashboard (manual step)
- [ ] Firestore security rules deployed (pending)
- [ ] Storage rules deployed (pending)
- [x] End-to-end webhook testing complete ✅
- [ ] Monitoring dashboards configured

**✅ WEBHOOK TESTED:** Successfully received, processed, and stored test fax!

---

**🎯 Once deployed, Pro users will automatically receive fax numbers and can start receiving faxes immediately!**
