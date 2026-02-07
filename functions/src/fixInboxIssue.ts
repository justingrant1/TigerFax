/**
 * Cloud Function to fix inbox issue
 * Checks user's fax number and manually adds missing fax to inbox
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

const db = admin.firestore();
const storage = admin.storage();

// Sinch API configuration
function getSinchConfig() {
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

const getAuthHeader = (): string => {
  const { keyId, keySecret } = getSinchConfig();
  const credentials = `${keyId}:${keySecret}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
};

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

  return await response.buffer();
}

/**
 * Upload fax document to Firebase Storage
 */
async function uploadFaxToStorage(
  uid: string,
  faxId: string,
  documentBuffer: Buffer
): Promise<string> {
  const bucket = storage.bucket();
  const fileName = `receivedFaxes/${uid}/${faxId}.pdf`;
  const file = bucket.file(fileName);

  await file.save(documentBuffer, {
    contentType: 'application/pdf',
    metadata: {
      faxId,
      uid,
      uploadedAt: new Date().toISOString(),
    },
  });

  console.log(`Uploaded fax document to Storage: ${fileName}`);
  return fileName;
}

/**
 * Generate a signed URL for the fax document
 */
async function generateSignedUrl(storagePath: string): Promise<string> {
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
}

export const fixInboxIssue = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, faxNumber, faxId, from, pages, receivedAt } = req.body;

  if (!email || !faxNumber || !faxId) {
    res.status(400).json({ error: 'Missing required fields: email, faxNumber, faxId' });
    return;
  }

  console.log(`Fixing inbox for ${email}, fax number: ${faxNumber}, fax ID: ${faxId}`);

  try {
    // Step 1: Find user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const uid = userDoc.id;
    const userData = userDoc.data();

    console.log(`Found user: ${uid}`);
    console.log(`Current fax number: ${userData.faxNumber || 'NOT SET'}`);

    const updates: any = {};
    let faxNumberUpdated = false;

    // Step 2: Update fax number if needed
    if (userData.faxNumber !== faxNumber) {
      console.log(`Updating fax number from ${userData.faxNumber} to ${faxNumber}`);
      updates.faxNumber = faxNumber;
      updates.faxNumberAssignedAt = admin.firestore.FieldValue.serverTimestamp();
      faxNumberUpdated = true;
    }

    if (Object.keys(updates).length > 0) {
      await db.collection('users').doc(uid).update(updates);
    }

    // Step 3: Check if fax already exists
    const existingFax = await db.collection('users')
      .doc(uid)
      .collection('inbox')
      .doc(faxId)
      .get();

    let faxAdded = false;
    let pdfDownloaded = false;
    if (!existingFax.exists) {
      console.log(`Adding fax ${faxId} to inbox`);

      // Try to download and upload the PDF from Sinch
      let storagePath = '';
      let documentUrl = '';
      
      try {
        console.log(`Downloading PDF from Sinch for fax ${faxId}...`);
        const pdfBuffer = await downloadFaxDocument(faxId);
        console.log(`Downloaded ${pdfBuffer.length} bytes`);
        
        storagePath = await uploadFaxToStorage(uid, faxId, pdfBuffer);
        console.log(`Uploaded to storage: ${storagePath}`);
        
        documentUrl = await generateSignedUrl(storagePath);
        console.log(`Generated signed URL`);
        
        pdfDownloaded = true;
      } catch (pdfError) {
        console.error(`Failed to download/upload PDF, but will still add fax metadata:`, pdfError);
        // Continue without PDF - user will see the fax but can't view it
      }

      // Add fax to inbox
      await db.collection('users')
        .doc(uid)
        .collection('inbox')
        .doc(faxId)
        .set({
          faxId,
          from: from || '+16464377113',
          to: faxNumber,
          pages: pages || 2,
          receivedAt: receivedAt || new Date().toISOString(),
          documentUrl,
          storagePath,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Update unread count
      await db.doc(`users/${uid}`).update({
        unreadFaxCount: admin.firestore.FieldValue.increment(1),
      });

      faxAdded = true;
    }

    // Step 4: Get final inbox count
    const inboxSnapshot = await db.collection('users')
      .doc(uid)
      .collection('inbox')
      .get();

    res.status(200).json({
      success: true,
      uid,
      faxNumberUpdated,
      faxAdded,
      pdfDownloaded,
      inboxCount: inboxSnapshot.size,
      message: faxAdded 
        ? 'Fax added to inbox successfully' 
        : 'Fax already exists in inbox',
    });

  } catch (error) {
    console.error('Error fixing inbox:', error);
    res.status(500).json({
      error: 'Failed to fix inbox',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
