/**
 * Push Notifications Service
 * Handles notification permissions and sending notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('fax-updates', {
        name: 'Fax Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
        enableVibrate: true,
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Send notification when fax is sent successfully
 */
export async function sendFaxSuccessNotification(recipient: string, pages: number) {
  try {
    const enabled = await areNotificationsEnabled();
    if (!enabled) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Fax Sent Successfully',
        body: `Your fax to ${recipient} (${pages} page${pages > 1 ? 's' : ''}) was delivered successfully.`,
        sound: 'default',
        data: { type: 'fax_success', recipient },
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('Error sending success notification:', error);
  }
}

/**
 * Send notification when fax fails
 */
export async function sendFaxFailureNotification(recipient: string, reason?: string) {
  try {
    const enabled = await areNotificationsEnabled();
    if (!enabled) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '❌ Fax Send Failed',
        body: `Failed to send fax to ${recipient}. ${reason || 'Please try again.'}`,
        sound: 'default',
        data: { type: 'fax_failure', recipient },
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Error sending failure notification:', error);
  }
}

/**
 * Send notification when fax is sending
 */
export async function sendFaxSendingNotification(recipient: string) {
  try {
    const enabled = await areNotificationsEnabled();
    if (!enabled) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📤 Sending Fax',
        body: `Your fax to ${recipient} is being sent...`,
        sound: undefined, // No sound for sending notification
        data: { type: 'fax_sending', recipient },
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Error sending sending notification:', error);
  }
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error cancelling notifications:', error);
  }
}

/**
 * Get notification response subscription
 * Use this to handle notification taps
 */
export function addNotificationResponseListener(
  listener: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Initialize notifications on app start
 */
export async function initializeNotifications() {
  try {
    // Request permissions on first launch
    const hasPermission = await areNotificationsEnabled();
    
    if (!hasPermission) {
      console.log('Notifications not enabled. User can enable in settings.');
    } else {
      console.log('Notifications initialized successfully');
    }

    return hasPermission;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
}
