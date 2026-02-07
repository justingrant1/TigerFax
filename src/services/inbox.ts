/**
 * Inbox Service - Manage received faxes
 */

import {
  collection,
  query,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from '../config/firebase';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export interface ReceivedFax {
  faxId: string;
  from: string;
  to: string;
  pages: number;
  receivedAt: string;
  documentUrl: string;
  storagePath: string;
  read: boolean;
  createdAt?: any;
}

/**
 * Helper to check if Firestore is available
 */
const ensureFirestore = () => {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured');
  }
  return db;
};

/**
 * Helper to get download URL from storage path
 */
const getDownloadURLFromPath = async (storagePath: string): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage is not configured');
  }
  
  try {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw error;
  }
};

/**
 * Get received faxes for user
 */
export const getReceivedFaxes = async (
  uid: string,
  limitCount: number = 50
): Promise<ReceivedFax[]> => {
  const firestore = ensureFirestore();
  
  try {
    const inboxRef = collection(firestore, 'users', uid, 'inbox');
    const q = query(
      inboxRef,
      orderBy('receivedAt', 'desc'),
      firestoreLimit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    
    const faxes = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let documentUrl = data.documentUrl;
        
        // If documentUrl is empty but storagePath exists, generate download URL
        if (!documentUrl && data.storagePath) {
          try {
            documentUrl = await getDownloadURLFromPath(data.storagePath);
          } catch (error) {
            console.error(`Failed to get download URL for fax ${docSnap.id}:`, error);
            documentUrl = ''; // Keep empty if we can't generate URL
          }
        }
        
        return {
          faxId: docSnap.id,
          ...data,
          documentUrl,
        } as ReceivedFax;
      })
    );
    
    return faxes;
  } catch (error) {
    console.error('Error getting received faxes:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for inbox
 */
export const subscribeToInbox = (
  uid: string,
  callback: (faxes: ReceivedFax[]) => void
): Unsubscribe => {
  const firestore = ensureFirestore();
  
  const inboxRef = collection(firestore, 'users', uid, 'inbox');
  const q = query(inboxRef, orderBy('receivedAt', 'desc'), firestoreLimit(50));
  
  return onSnapshot(
    q,
    async (snapshot) => {
      // Generate download URLs for faxes that need them
      const faxes = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let documentUrl = data.documentUrl;
          
          // If documentUrl is empty but storagePath exists, generate download URL
          if (!documentUrl && data.storagePath) {
            try {
              documentUrl = await getDownloadURLFromPath(data.storagePath);
            } catch (error) {
              console.error(`Failed to get download URL for fax ${docSnap.id}:`, error);
              documentUrl = ''; // Keep empty if we can't generate URL
            }
          }
          
          return {
            faxId: docSnap.id,
            ...data,
            documentUrl,
          } as ReceivedFax;
        })
      );
      
      callback(faxes);
    },
    (error) => {
      console.error('Error subscribing to inbox:', error);
    }
  );
};

/**
 * Mark fax as read
 */
export const markFaxAsRead = async (
  uid: string,
  faxId: string
): Promise<void> => {
  const firestore = ensureFirestore();
  
  try {
    const faxRef = doc(firestore, 'users', uid, 'inbox', faxId);
    await updateDoc(faxRef, {
      read: true,
    });
    
    // Decrement unread count
    const userRef = doc(firestore, 'users', uid);
    await updateDoc(userRef, {
      unreadFaxCount: 0, // Could use increment(-1) if tracking precisely
    });
  } catch (error) {
    console.error('Error marking fax as read:', error);
    throw error;
  }
};

/**
 * Delete received fax
 */
export const deleteReceivedFax = async (
  uid: string,
  faxId: string
): Promise<void> => {
  const firestore = ensureFirestore();
  
  try {
    const faxRef = doc(firestore, 'users', uid, 'inbox', faxId);
    await deleteDoc(faxRef);
  } catch (error) {
    console.error('Error deleting received fax:', error);
    throw error;
  }
};

/**
 * Download and share received fax
 */
export const shareReceivedFax = async (
  fax: ReceivedFax
): Promise<void> => {
  try {
    // Download the file from the signed URL
    const fileUri = `${FileSystem.cacheDirectory}received-fax-${fax.faxId}.pdf`;
    
    const downloadResult = await FileSystem.downloadAsync(
      fax.documentUrl,
      fileUri
    );
    
    if (downloadResult.status !== 200) {
      throw new Error('Failed to download fax document');
    }
    
    // Share the file
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Received Fax from ${fax.from}`,
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error sharing received fax:', error);
    throw error;
  }
};
