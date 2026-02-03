/**
 * Incoming Fax Webhook Handler
 * 
 * Receives webhook notifications from Sinch when a fax is received,
 * downloads the fax document, stores it in Firebase Storage, and notifies the user.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

const db = admin.firestore();
const storage = admin.storage();

// Sinch API configuration
function getSinchConfig() {
  // Use environment variables directly (works for both v1 and v2)
  return {
    projectId: process.env.SINCH_PROJECT_ID || '881d6487-fb61-4c40-85b1-ed77a90c7334',
    keyId: process.env.SINCH_KEY_ID || '945ba97f-aa5b-4ce1-a899-61a399da99b1',
    keySecret: process.env.SINCH_KEY_SECRET || '5o76bjtWk3RK47NodVmS5fRbCK',
  };
}

function getBaseUrl(): string {
  const { projectId } = getSinchConfig();
  return `https://fax.api.sinch.com/v3/projects/${projectId}`;
}

/**
 * Get Basic Auth header for Sinch API
 */
const getAuthHeader = (): string => {
  const { keyId, keySecret } = getSinchConfig();
  const credentials = `${keyId}:${keySecret}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
};

/**
 * Find user by fax number
 */
async function findUserByFaxNumber(faxNumber: string): Promise<string | null> {
  try {
    const snapshot = await db.collection('users').where('faxNumber', '==', faxNumber).limit(1).get();

    if (snapshot.empty) {
      console.log(`No user found with fax number: ${faxNumber}`);
      return null;
    }

    return snapshot.docs[0].id;
  } catch (error) {
    console.error('Error finding user by fax number:', error);
    return null;
  }
}

/**
 * Download fax document from Sinch
 */
async function downloadFaxDocument(faxId: string): Promise<Buffer> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/faxes/${faxId}/content`, {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download fax: ${response.status}`);
    }

    const buffer = await response.buffer();
    return buffer;
  } catch (error) {
    console.error('Error downloading fax document:', error);
    throw error;
  }
}

/**
 * Upload fax document to Firebase Storage
 */
async function uploadFaxToStorage(
  uid: string,
  faxId: string,
  documentBuffer: Buffer,
  contentType: string = 'application/pdf'
): Promise<string> {
  try {
    const bucket = storage.bucket();
    const fileName = `receivedFaxes/${uid}/${faxId}.pdf`;
    const file = bucket.file(fileName);

    await file.save(documentBuffer, {
      contentType,
      metadata: {
        faxId,
        uid,
        uploadedAt: new Date().toISOString(),
      },
    });

    console.log(`Uploaded fax document to Storage: ${fileName}`);
    
    // Return the storage path - the app will access it via Firebase Storage SDK
    return fileName;
  } catch (error) {
    console.error('Error uploading fax to storage:', error);
    throw error;
  }
}

/**
 * Store incoming fax metadata in Firestore
 */
async function storeFaxInInbox(
  uid: string,
  faxData: {
    faxId: string;
    from: string;
    to: string;
    pages: number;
    receivedAt: string;
    documentUrl: string;
    storagePath: string;
  }
): Promise<void> {
  try {
    await db.collection('users').doc(uid).collection('inbox').doc(faxData.faxId).set({
      ...faxData,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update unread count
    await db.doc(`users/${uid}`).update({
      unreadFaxCount: admin.firestore.FieldValue.increment(1),
    });

    console.log(`Stored fax ${faxData.faxId} in user ${uid}'s inbox`);
  } catch (error) {
    console.error('Error storing fax in inbox:', error);
    throw error;
  }
}

/**
 * Shared webhook handler logic
 * This can be used by both 1st gen and 2nd gen Cloud Functions
 */
export async function handleIncomingFaxWebhook(req: any, res: any) {
  // Enhanced logging to understand Sinch's exact payload
  console.log('========== INCOMING FAX WEBHOOK ==========');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Content-Type:', req.get('content-type'));
  console.log('==========================================');

  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Optional: Verify webhook secret for security (if configured)
  const expectedSecret = process.env.SINCH_WEBHOOK_SECRET;
  if (expectedSecret) {
    const providedSecret = req.get('x-sinch-secret') || req.get('x-webhook-secret');
    if (providedSecret !== expectedSecret) {
      console.warn('Webhook authentication failed - invalid secret');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    console.log('✓ Webhook secret verified');
  } else {
    console.log('ℹ️  No webhook secret configured - accepting all requests');
  }

  try {
    // Parse webhook payload from Sinch
    const payload = req.body;

    // Sinch sends data nested under "event.fax"
    const faxData = payload.event?.fax || payload;
    const fileData = payload.file; // Base64-encoded PDF

    // Extract fax details
    const faxId = faxData.id;
    const fromNumber = faxData.from;
    const toNumber = faxData.to;
    const pages = faxData.numberOfPages || 0;
    const status = faxData.status;
    const receivedAt = faxData.createTime || faxData.completedTime || new Date().toISOString();

    console.log('Processing incoming fax:', {
      faxId,
      from: fromNumber,
      to: toNumber,
      pages,
      status,
    });

    // Only process completed faxes
    if (status !== 'COMPLETED') {
      console.log(`Fax ${faxId} status is ${status}, skipping processing`);
      res.status(200).json({ message: 'Webhook received, fax not completed yet' });
      return;
    }

    // Find user by fax number
    const uid = await findUserByFaxNumber(toNumber);

    if (!uid) {
      console.error(`No user found for fax number ${toNumber}`);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get fax document - either from base64 file data or download from API
    let documentBuffer: Buffer;
    if (fileData && typeof fileData === 'string') {
      // Sinch sent base64-encoded PDF in webhook
      console.log('Using base64-encoded PDF from webhook payload');
      documentBuffer = Buffer.from(fileData, 'base64');
    } else {
      // Download from Sinch API as fallback
      console.log('Downloading PDF from Sinch API');
      documentBuffer = await downloadFaxDocument(faxId);
    }

    // Upload to Firebase Storage
    const storagePath = await uploadFaxToStorage(uid, faxId, documentBuffer);

    // Store in Firestore inbox
    await storeFaxInInbox(uid, {
      faxId,
      from: fromNumber,
      to: toNumber,
      pages,
      receivedAt,
      documentUrl: '', // Will be generated by app when needed
      storagePath,
    });

    // Send push notification to user
    const userDoc = await db.doc(`users/${uid}`).get();
    const userData = userDoc.data();

    if (userData?.fcmToken) {
      try {
        await admin.messaging().send({
          token: userData.fcmToken,
          notification: {
            title: '📠 New Fax Received',
            body: `From: ${fromNumber} • ${pages} page${pages !== 1 ? 's' : ''}`,
          },
          data: {
            type: 'fax_received',
            faxId,
            from: fromNumber,
            pages: pages.toString(),
          },
        });

        console.log(`Sent push notification to user ${uid}`);
      } catch (notifError) {
        console.error('Error sending push notification:', notifError);
        // Don't fail the webhook if notification fails
      }
    }

    // Return success
    res.status(200).json({
      message: 'Fax received and processed successfully',
      faxId,
      uid,
    });

  } catch (error) {
    console.error('Error processing incoming fax webhook:', error);
    res.status(500).json({
      error: 'Failed to process incoming fax',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Cloud Function (1st Gen): Handle incoming fax webhook from Sinch
 */
export const incomingFaxWebhook = functions.https.onRequest(handleIncomingFaxWebhook);
