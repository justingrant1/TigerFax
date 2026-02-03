/**
 * Push Notification Functions
 * 
 * Handles sending push notifications for incoming faxes and other events.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Cloud Function: Send notification when fax is received
 * Triggered by Firestore write to users/{uid}/inbox/{faxId}
 */
export const sendFaxReceivedNotification = functions.firestore
  .document('users/{uid}/inbox/{faxId}')
  .onCreate(async (snap, context) => {
    const uid = context.params.uid;
    const faxId = context.params.faxId;
    const faxData = snap.data();

    console.log(`New fax received for user ${uid}:`, faxId);

    try {
      // Get user's FCM token
      const userDoc = await db.doc(`users/${uid}`).get();
      const userData = userDoc.data();

      if (!userData) {
        console.log(`User ${uid} not found`);
        return null;
      }

      // Check notification preferences
      if (userData.settings?.notifications === false) {
        console.log(`User ${uid} has notifications disabled`);
        return null;
      }

      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        console.log(`User ${uid} has no FCM token`);
        return null;
      }

      // Send notification
      const message = {
        token: fcmToken,
        notification: {
          title: '📠 New Fax Received',
          body: `From: ${faxData.from} • ${faxData.pages} page${faxData.pages !== 1 ? 's' : ''}`,
        },
        data: {
          type: 'fax_received',
          faxId,
          from: faxData.from,
          pages: faxData.pages.toString(),
          screen: 'Inbox',
        },
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'fax_updates',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: userData.unreadFaxCount || 1,
            },
          },
        },
      };

      await admin.messaging().send(message);
      console.log(`Sent notification to user ${uid} for fax ${faxId}`);

      return null;
    } catch (error) {
      console.error(`Error sending notification to user ${uid}:`, error);
      return null;
    }
  });
