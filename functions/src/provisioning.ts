/**
 * Sinch Virtual Number Provisioning
 * 
 * Handles automatic assignment and release of dedicated fax numbers for Pro subscribers.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

const db = admin.firestore();

// Sinch API configuration - Uses environment variables (works for both v1 and v2)
function getSinchConfig() {
  return {
    projectId: process.env.SINCH_PROJECT_ID || '881d6487-fb61-4c40-85b1-ed77a90c7334',
    keyId: process.env.SINCH_KEY_ID || '945ba97f-aa5b-4ce1-a899-61a399da99b1',
    keySecret: process.env.SINCH_KEY_SECRET || '5o76bjtWk3RK47NodVmS5fRbCK',
  };
}

function getBaseUrl(): string {
  const { projectId } = getSinchConfig();
  return `https://numbers.api.sinch.com/v1/projects/${projectId}`;
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
 * Search for available fax numbers in Sinch
 */
async function searchAvailableNumbers(
  countryCode: string = 'US',
  numberType: string = 'LOCAL'
): Promise<any[]> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(
      `${baseUrl}/availableNumbers?regionCode=${countryCode}&type=${numberType}&capabilities=FAX`,
      {
        method: 'GET',
        headers: {
          Authorization: getAuthHeader(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to search numbers: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    return data.availableNumbers || [];
  } catch (error) {
    console.error('Error searching available numbers:', error);
    throw error;
  }
}

/**
 * Rent a specific phone number from Sinch
 */
async function rentNumber(phoneNumber: string, callbackUrl: string): Promise<any> {
  try {
    const baseUrl = getBaseUrl();
    const { projectId } = getSinchConfig();
    const response = await fetch(`${baseUrl}/activeNumbers`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        projectId,
        capability: 'FAX',
        callbackUrl, // Webhook URL for incoming faxes
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to rent number: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error renting number:', error);
    throw error;
  }
}

/**
 * Release a rented phone number back to Sinch
 */
async function releaseNumber(phoneNumber: string): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/activeNumbers/${encodeURIComponent(phoneNumber)}`, {
      method: 'DELETE',
      headers: {
        Authorization: getAuthHeader(),
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`Failed to release number: ${response.status} - ${errorText}`);
    }

    console.log(`Number ${phoneNumber} released successfully`);
  } catch (error) {
    console.error('Error releasing number:', error);
    throw error;
  }
}

/**
 * Cloud Function: Provision a fax number when user upgrades to Pro
 * Triggered by Firestore write to users/{uid}
 */
export const provisionFaxNumber = functions.firestore
  .document('users/{uid}')
  .onUpdate(async (change, context) => {
    const uid = context.params.uid;
    const before = change.before.data();
    const after = change.after.data();

    // Check if user upgraded to Pro
    if (before.subscriptionTier !== 'pro' && after.subscriptionTier === 'pro') {
      console.log(`User ${uid} upgraded to Pro. Provisioning fax number...`);

      try {
        // Check if user already has a number
        if (after.faxNumber) {
          console.log(`User ${uid} already has fax number: ${after.faxNumber}`);
          return null;
        }

        // Search for available numbers
        const availableNumbers = await searchAvailableNumbers('US', 'LOCAL');

        if (availableNumbers.length === 0) {
          console.error('No available fax numbers found');
          // Store error in user document
          await db.doc(`users/${uid}`).update({
            faxNumberError: 'No available numbers. Please contact support.',
          });
          return null;
        }

        const selectedNumber = availableNumbers[0].phoneNumber;

        // Get the webhook URL (replace with your actual Cloud Function URL after deployment)
        const { projectId } = getSinchConfig();
        const webhookUrl = `https://us-central1-tigerfax-e3915.cloudfunctions.net/incomingFaxWebhook`;

        // Rent the number
        await rentNumber(selectedNumber, webhookUrl);

        // Store the number in user document
        await db.doc(`users/${uid}`).update({
          faxNumber: selectedNumber,
          faxNumberAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
          faxNumberError: admin.firestore.FieldValue.delete(),
        });

        console.log(`Successfully provisioned fax number ${selectedNumber} for user ${uid}`);

        // Send notification to user
        if (after.fcmToken) {
          await admin.messaging().send({
            token: after.fcmToken,
            notification: {
              title: 'Your Fax Number is Ready! 📞',
              body: `You can now receive faxes at ${selectedNumber}`,
            },
            data: {
              type: 'number_provisioned',
              faxNumber: selectedNumber,
            },
          });
        }

        return null;
      } catch (error) {
        console.error(`Error provisioning fax number for user ${uid}:`, error);
        
        // Store error in user document
        await db.doc(`users/${uid}`).update({
          faxNumberError: 'Failed to provision number. Please contact support.',
        });

        return null;
      }
    }

    return null;
  });

/**
 * Cloud Function: Release fax number when user downgrades from Pro
 */
export const releaseFaxNumber = functions.firestore
  .document('users/{uid}')
  .onUpdate(async (change, context) => {
    const uid = context.params.uid;
    const before = change.before.data();
    const after = change.after.data();

    // Check if user downgraded from Pro
    if (before.subscriptionTier === 'pro' && after.subscriptionTier !== 'pro') {
      console.log(`User ${uid} downgraded from Pro. Releasing fax number...`);

      try {
        const faxNumber = before.faxNumber;

        if (!faxNumber) {
          console.log(`User ${uid} has no fax number to release`);
          return null;
        }

        // Release the number back to Sinch
        await releaseNumber(faxNumber);

        // Remove from user document
        await db.doc(`users/${uid}`).update({
          faxNumber: admin.firestore.FieldValue.delete(),
          faxNumberAssignedAt: admin.firestore.FieldValue.delete(),
        });

        console.log(`Successfully released fax number ${faxNumber} for user ${uid}`);

        return null;
      } catch (error) {
        console.error(`Error releasing fax number for user ${uid}:`, error);
        return null;
      }
    }

    return null;
  });
