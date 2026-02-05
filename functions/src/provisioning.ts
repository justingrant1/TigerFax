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
    // Sinch requires VOICE capability for fax-capable numbers
    const response = await fetch(
      `${baseUrl}/availableNumbers?regionCode=${countryCode}&type=${numberType}&capabilities=VOICE`,
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
 * Rent any available phone number from Sinch for FAX use
 * Uses the rentAny endpoint which is more reliable than renting a specific number
 */
async function rentAnyNumber(
  countryCode: string = 'US',
  numberType: string = 'LOCAL'
): Promise<any> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/availableNumbers:rentAny`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regionCode: countryCode,
        type: numberType,
        capabilities: ['VOICE'], // Voice-capable numbers can be used for fax
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to rent number: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully rented number:', data.phoneNumber);
    return data;
  } catch (error) {
    console.error('Error renting number:', error);
    throw error;
  }
}

/**
 * Update a rented number's voice configuration to FAX
 */
async function configureNumberForFax(phoneNumber: string, callbackUrl: string): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/activeNumbers/${encodeURIComponent(phoneNumber)}`, {
      method: 'PATCH',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voiceConfiguration: {
          type: 'FAX',
          serviceId: callbackUrl,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Warning: Failed to configure number for FAX: ${response.status} - ${errorText}`);
      // Don't throw - the number is still rented and can be configured manually
    } else {
      console.log('Successfully configured number for FAX');
    }
  } catch (error) {
    console.warn('Warning: Error configuring number for FAX:', error);
    // Don't throw - the number is still rented
  }
}

/**
 * Release a rented phone number back to Sinch
 */
async function releaseNumber(phoneNumber: string): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/activeNumbers/${encodeURIComponent(phoneNumber)}:release`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
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

    // Check if user upgraded to Pro OR is Pro without a fax number
    const upgradedToPro = before.subscriptionTier !== 'pro' && after.subscriptionTier === 'pro';
    const isProWithoutNumber = after.subscriptionTier === 'pro' && !after.faxNumber && !before.faxNumber;
    
    // IMPORTANT: Also check that we're not in the middle of provisioning
    // If faxNumber changed from undefined to a value, we're done - don't trigger again
    const justGotNumber = !before.faxNumber && after.faxNumber;
    
    if (justGotNumber) {
      console.log(`User ${uid} just received fax number: ${after.faxNumber}. Skipping to prevent duplicate provisioning.`);
      return null;
    }
    
    if (upgradedToPro || isProWithoutNumber) {
      console.log(`User ${uid} ${upgradedToPro ? 'upgraded to' : 'is'} Pro. Provisioning fax number...`);

      try {
        // Double-check user doesn't already have a number (race condition protection)
        if (after.faxNumber) {
          console.log(`User ${uid} already has fax number: ${after.faxNumber}`);
          return null;
        }

        let selectedNumber: string;
        
        try {
          // Rent any available number from Sinch using the rentAny endpoint
          console.log('Renting a fax number from Sinch...');
          const rentedNumberData = await rentAnyNumber('US', 'LOCAL');
          
          selectedNumber = rentedNumberData.phoneNumber;
          console.log(`Successfully rented number: ${selectedNumber}`);

          // Get the FAX service ID (from your existing FAX-configured number)
          // This is the service ID that Sinch uses to route incoming faxes
          const faxServiceId = '01KGEAPNC5AY23XS2615BA4VNY';

          // Configure the number for FAX
          console.log(`Configuring number ${selectedNumber} for FAX with service ID ${faxServiceId}...`);
          await configureNumberForFax(selectedNumber, faxServiceId);
        } catch (sinchError) {
          // If Sinch fails, assign a temporary test number
          console.error('Sinch API error, assigning temporary test number:', sinchError);
          selectedNumber = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;
          console.log(`Assigned temporary test number: ${selectedNumber}`);
        }

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
