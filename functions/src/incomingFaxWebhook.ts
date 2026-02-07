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
}

/**
 * Download fax document with retry logic
 * Sinch PDFs may not be immediately available, so we retry with exponential backoff
 */
async function downloadFaxDocumentWithRetry(faxId: string, maxRetries: number = 3): Promise<Buffer> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait before retry (exponential backoff: 2s, 4s, 8s)
      if (attempt > 1) {
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt}/${maxRetries} - waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      console.log(`Attempting to download PDF (attempt ${attempt}/${maxRetries})...`);
      const buffer = await downloadFaxDocument(faxId);
      console.log(`✓ Successfully downloaded PDF on attempt ${attempt}`);
      return buffer;
      
    } catch (error) {
      lastError = error as Error;
      console.log(`Download attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error(`All ${maxRetries} download attempts failed`);
        throw lastError;
      }
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Download failed');
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
 * Generate a signed URL for the fax document
 */
async function generateSignedUrl(storagePath: string): Promise<string> {
  try {
    if (!storagePath) {
      return '';
    }

    const bucket = storage.bucket();
    const file = bucket.file(storagePath);

    // Generate a signed URL that expires in 7 days
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return '';
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
    // Generate signed URL if we have a storage path
    let documentUrl = faxData.documentUrl;
    if (faxData.storagePath && !documentUrl) {
      documentUrl = await generateSignedUrl(faxData.storagePath);
      console.log('Generated signed URL for fax document');
    }

    await db.collection('users').doc(uid).collection('inbox').doc(faxData.faxId).set({
      ...faxData,
      documentUrl, // Use the generated signed URL
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

    // Sinch can send data in different structures:
    // 1. Nested under "event.fax" (some webhook types)
    // 2. Nested under "fax" (new structure)
    // 3. At root level (other webhook types)
    let faxData = payload.event?.fax || payload.fax || payload;
    const fileData = payload.file; // Base64-encoded PDF

    // Extract fax details with fallbacks for different payload structures
    const faxId = faxData.id || faxData.faxId;
    const fromNumber = faxData.from || faxData.fromNumber;
    const toNumber = faxData.to || faxData.toNumber || faxData.phoneNumber;
    const pages = faxData.numberOfPages || faxData.pages || 0;
    
    // Status might be in different fields or missing entirely
    // If completedTime exists, assume it's completed
    const status = faxData.status || (faxData.completedTime ? 'COMPLETED' : undefined);
    const receivedAt = faxData.createTime || faxData.completedTime || new Date().toISOString();

    console.log('Processing incoming fax:', {
      faxId,
      from: fromNumber,
      to: toNumber,
      pages,
      status,
    });

    // If we have completedTime but no status, treat as COMPLETED
    // Otherwise, only process if status is explicitly COMPLETED
    const isCompleted = status === 'COMPLETED' || (faxData.completedTime && !status);
    
    if (!isCompleted) {
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
    let documentBuffer: Buffer | null = null;
    let storagePath = '';
    
    try {
      if (fileData && typeof fileData === 'string') {
        // Sinch sent base64-encoded PDF in webhook
        console.log('✓ Found base64-encoded PDF in webhook payload');
        console.log(`  PDF data length: ${fileData.length} characters`);
        
        try {
          documentBuffer = Buffer.from(fileData, 'base64');
          console.log(`✓ Successfully decoded base64 to Buffer: ${documentBuffer.length} bytes`);
        } catch (decodeError) {
          console.error('❌ Failed to decode base64 PDF:', decodeError);
          throw decodeError;
        }
      } else {
        // Download from Sinch API with retry logic
        console.log('No base64 PDF in payload, downloading from Sinch API with retry logic...');
        documentBuffer = await downloadFaxDocumentWithRetry(faxId, 3);
      }

      // Upload to Firebase Storage
      console.log(`Uploading PDF to Firebase Storage (${documentBuffer.length} bytes)...`);
      storagePath = await uploadFaxToStorage(uid, faxId, documentBuffer);
      console.log(`✓ PDF uploaded to storage successfully: ${storagePath}`);
    } catch (storageError) {
      // Log the error but don't fail the webhook
      console.error('❌ Failed to download/upload PDF after all retries, but will still store fax metadata');
      console.error('Error details:', storageError);
      if (storageError instanceof Error) {
        console.error('Error message:', storageError.message);
        console.error('Error stack:', storageError.stack);
      }
      // Set empty storage path - the PDF can be downloaded later if needed
      storagePath = '';
    }

    // ALWAYS store in Firestore inbox, even if PDF upload failed
    // This ensures the user sees the fax in their inbox
    try {
      await storeFaxInInbox(uid, {
        faxId,
        from: fromNumber,
        to: toNumber,
        pages,
        receivedAt,
        documentUrl: '', // Will be generated by app when needed
        storagePath,
      });
      console.log('✓ Fax metadata stored in inbox successfully');
    } catch (inboxError) {
      // This is critical - if we can't store in inbox, the fax is lost
      console.error('❌ CRITICAL: Failed to store fax in inbox:', inboxError);
      throw inboxError; // Re-throw to return 500 and trigger Sinch retry
    }

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
