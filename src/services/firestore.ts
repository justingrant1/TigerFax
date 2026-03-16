import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  writeBatch,
  increment,
  onSnapshot,
  type UpdateData,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { UserData } from '../contexts/AuthContext';

export interface CreateUserData {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Helper to check if Firestore is available
 */
const ensureFirestore = () => {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured. Please add your credentials in the ENV tab.');
  }
  return db;
};

/**
 * Create a new user document in Firestore with default free tier settings
 */
export const createUserDocument = async (
  uid: string,
  userData: CreateUserData
): Promise<void> => {
  const firestore = ensureFirestore();
  try {
    const now = new Date().toISOString();
    const monthlyResetDate = getNextMonthDate();

    const userDoc = {
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      subscriptionTier: 'free' as const,
      faxesRemaining: 3, // legacy field — kept for backwards compat
      freePagesRemaining: 3, // lifetime free pages (new model: 3 free, then $0.99/page)
      creditsRemaining: 0,
      monthlyResetDate,
      createdAt: now,
      lastLogin: now,
      settings: {
        notifications: true,
        faxQuality: 'high',
        autoSave: true,
      },
      usage: {
        totalFaxesSent: 0,
        totalPagesSent: 0,
        totalSpent: 0,
      },
    };

    await setDoc(doc(firestore, 'users', uid), userDoc);
    console.log('User document created successfully:', uid);
  } catch (error) {
    console.error('Error creating user document:', error);
    throw new Error('Failed to create user profile');
  }
};

/**
 * Get user document from Firestore
 */
export const getUserDocument = async (uid: string): Promise<UserData> => {
  const firestore = ensureFirestore();
  try {
    const userDocRef = doc(firestore, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      throw new Error('User document not found');
    }

    const data = userDocSnap.data();
    if (!data) {
      throw new Error('User data is empty');
    }

    // Update last login timestamp
    await updateDoc(userDocRef, {
      lastLogin: new Date().toISOString(),
    });

    // Calculate freePagesRemaining correctly for legacy users who predate the field.
    // If the field exists in DB, use it directly (even if 0).
    // If it doesn't exist, derive it from usage.totalPagesSent so we don't
    // incorrectly show 3 free pages remaining for users who already used them.
    const FREE_PAGES_TOTAL = 3;
    let freePagesRemaining: number;
    if (data.freePagesRemaining !== undefined && data.freePagesRemaining !== null) {
      freePagesRemaining = data.freePagesRemaining;
    } else {
      // Legacy user: derive from pages already sent
      const pagesSent = data.usage?.totalPagesSent ?? 0;
      freePagesRemaining = Math.max(0, FREE_PAGES_TOTAL - pagesSent);
    }

    return {
      uid,
      email: data.email || null,
      displayName: data.displayName || null,
      photoURL: data.photoURL || null,
      subscriptionTier: data.subscriptionTier || 'free',
      faxesRemaining: data.faxesRemaining ?? 0,
      freePagesRemaining,
      creditsRemaining: data.creditsRemaining || 0,
      monthlyResetDate: data.monthlyResetDate,
      createdAt: data.createdAt,
      lastLogin: data.lastLogin,
      faxNumber: data.faxNumber || undefined,
      faxNumberAssignedAt: data.faxNumberAssignedAt || undefined,
      unreadFaxCount: data.unreadFaxCount || 0,
      faxesSent: data.usage?.totalFaxesSent ?? 0,
      totalPagesSent: data.usage?.totalPagesSent ?? 0,
    };
  } catch (error) {
    console.error('Error getting user document:', error);
    throw error;
  }
};

/**
 * Update user subscription tier
 */
export const updateSubscriptionTier = async (
  uid: string,
  tier: 'free' | 'pro' | 'credits'
): Promise<void> => {
  const firestore = ensureFirestore();
  try {
    const updates: UpdateData<Record<string, unknown>> = {
      subscriptionTier: tier,
      updatedAt: new Date().toISOString(),
    };

    // Set fax limits based on tier
    if (tier === 'pro') {
      updates.faxesRemaining = -1; // Unlimited for Pro
    } else if (tier === 'free') {
      updates.faxesRemaining = 3; // Reset to 3 for free tier
    }

    await updateDoc(doc(firestore, 'users', uid), updates);
    console.log('Subscription tier updated:', tier);
  } catch (error) {
    console.error('Error updating subscription tier:', error);
    throw new Error('Failed to update subscription');
  }
};

/**
 * Decrement usage counters when a fax is sent.
 * - Pro: just tracks usage stats
 * - Free: decrements freePagesRemaining (lifetime) then creditsRemaining
 * - Credits: decrements creditsRemaining
 * Returns false if the user has no pages/credits left (should be blocked before calling).
 */
export const decrementFaxCount = async (
  uid: string,
  pagesCount: number = 1
): Promise<boolean> => {
  const firestore = ensureFirestore();
  try {
    const userDocRef = doc(firestore, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    const data = userDocSnap.data();

    if (!data) throw new Error('User data not found');

    const tier = data.subscriptionTier;

    // Pro users — unlimited, just track stats
    if (tier === 'pro') {
      await updateDoc(userDocRef, {
        'usage.totalFaxesSent': increment(1),
        'usage.totalPagesSent': increment(pagesCount),
      });
      return true;
    }

    // Free tier — use lifetime free pages first, then paid credits
    if (tier === 'free') {
      const freeLeft: number = data.freePagesRemaining ?? 0;
      const creditsLeft: number = data.creditsRemaining ?? 0;

      if (freeLeft >= pagesCount) {
        // Fully covered by free pages
        await updateDoc(userDocRef, {
          freePagesRemaining: increment(-pagesCount),
          'usage.totalFaxesSent': increment(1),
          'usage.totalPagesSent': increment(pagesCount),
        });
        return true;
      } else if (freeLeft > 0) {
        // Partially covered by free pages, rest from credits
        const paidPages = pagesCount - freeLeft;
        if (creditsLeft < paidPages) return false;
        await updateDoc(userDocRef, {
          freePagesRemaining: 0,
          creditsRemaining: increment(-paidPages),
          'usage.totalFaxesSent': increment(1),
          'usage.totalPagesSent': increment(pagesCount),
        });
        return true;
      } else {
        // No free pages left — use credits only
        if (creditsLeft < pagesCount) return false;
        await updateDoc(userDocRef, {
          creditsRemaining: increment(-pagesCount),
          'usage.totalFaxesSent': increment(1),
          'usage.totalPagesSent': increment(pagesCount),
        });
        return true;
      }
    }

    // Credits tier users
    if (tier === 'credits') {
      const creditsLeft: number = data.creditsRemaining ?? 0;
      if (creditsLeft < pagesCount) return false;
      await updateDoc(userDocRef, {
        creditsRemaining: increment(-pagesCount),
        'usage.totalFaxesSent': increment(1),
        'usage.totalPagesSent': increment(pagesCount),
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error decrementing fax count:', error);
    throw new Error('Failed to update usage');
  }
};

/**
 * Add page credits to user account (consumable IAP — $0.99/page).
 * Each purchased page credit is stored in creditsRemaining.
 */
export const addPageCredits = async (uid: string, pages: number): Promise<void> => {
  const firestore = ensureFirestore();
  try {
    await updateDoc(doc(firestore, 'users', uid), {
      creditsRemaining: increment(pages),
      subscriptionTier: 'credits',
      updatedAt: new Date().toISOString(),
    });
    console.log(`Added ${pages} page credit(s) to user ${uid}`);
  } catch (error) {
    console.error('Error adding page credits:', error);
    throw new Error('Failed to add page credits');
  }
};

/**
 * Add credits to user account (for pay-per-use purchases) — legacy alias
 */
export const addCredits = async (uid: string, credits: number): Promise<void> => {
  return addPageCredits(uid, credits);
};

/**
 * Reset monthly fax count for free tier users
 * This should be called by a Cloud Function on a schedule
 */
export const resetMonthlyFaxCount = async (uid: string): Promise<void> => {
  const firestore = ensureFirestore();
  try {
    const userDocRef = doc(firestore, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    const data = userDocSnap.data();

    if (!data) {
      throw new Error('User data not found');
    }

    // Only reset for free tier users
    if (data.subscriptionTier === 'free') {
      await updateDoc(userDocRef, {
        faxesRemaining: 3,
        monthlyResetDate: getNextMonthDate(),
        updatedAt: new Date().toISOString(),
      });
      console.log('Monthly fax count reset for user:', uid);
    }
  } catch (error) {
    console.error('Error resetting monthly fax count:', error);
    throw error;
  }
};

/**
 * Update user settings
 */
export const updateUserSettings = async (
  uid: string,
  settings: {
    notifications?: boolean;
    faxQuality?: 'standard' | 'high' | 'superfine';
    autoSave?: boolean;
  }
): Promise<void> => {
  const firestore = ensureFirestore();
  try {
    const updates: UpdateData<Record<string, unknown>> = {
      updatedAt: new Date().toISOString(),
    };

    Object.entries(settings).forEach(([key, value]) => {
      updates[`settings.${key}`] = value;
    });

    await updateDoc(doc(firestore, 'users', uid), updates);
    console.log('User settings updated');
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw new Error('Failed to update settings');
  }
};

/**
 * Store fax history in Firestore (sync from local store)
 */
export const saveFaxToHistory = async (
  uid: string,
  faxData: {
    faxId: string;
    recipient: string;
    status: string;
    pages: number;
    timestamp: string;
    cost?: number;
  }
): Promise<void> => {
  const firestore = ensureFirestore();
  try {
    await setDoc(doc(firestore, 'users', uid, 'faxHistory', faxData.faxId), {
      ...faxData,
      createdAt: new Date().toISOString(),
    });

    console.log('Fax saved to history:', faxData.faxId);
  } catch (error) {
    console.error('Error saving fax to history:', error);
    // Don't throw - this is not critical
  }
};

/**
 * Get user's fax history from Firestore
 */
export const getFaxHistory = async (uid: string, limitCount: number = 50) => {
  const firestore = ensureFirestore();
  try {
    const faxHistoryRef = collection(firestore, 'users', uid, 'faxHistory');
    const q = query(faxHistoryRef, orderBy('timestamp', 'desc'), firestoreLimit(limitCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (error) {
    console.error('Error getting fax history:', error);
    return [];
  }
};

/**
 * Delete user account and all associated data
 */
export const deleteUserAccount = async (uid: string): Promise<void> => {
  const firestore = ensureFirestore();
  try {
    // Delete user document
    await deleteDoc(doc(firestore, 'users', uid));

    // Delete fax history subcollection
    const faxHistoryRef = collection(firestore, 'users', uid, 'faxHistory');
    const faxHistorySnapshot = await getDocs(faxHistoryRef);

    const batch = writeBatch(firestore);
    faxHistorySnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();

    console.log('User account deleted:', uid);
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw new Error('Failed to delete account');
  }
};

/**
 * Subscribe to real-time updates for user data
 * Returns an unsubscribe function
 */
export const subscribeToUserData = (
  uid: string,
  callback: (userData: UserData) => void
): (() => void) => {
  const firestore = ensureFirestore();
  
  const userDocRef = doc(firestore, 'users', uid);
  
  const unsubscribe = onSnapshot(
    userDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // Same legacy-safe calculation as getUserDocument
        const FREE_PAGES_TOTAL = 3;
        let freePagesRemaining: number;
        if (data.freePagesRemaining !== undefined && data.freePagesRemaining !== null) {
          freePagesRemaining = data.freePagesRemaining;
        } else {
          const pagesSent = data.usage?.totalPagesSent ?? 0;
          freePagesRemaining = Math.max(0, FREE_PAGES_TOTAL - pagesSent);
        }

        const userData: UserData = {
          uid,
          email: data.email || null,
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
          subscriptionTier: data.subscriptionTier || 'free',
          faxesRemaining: data.faxesRemaining ?? 0,
          freePagesRemaining,
          creditsRemaining: data.creditsRemaining || 0,
          monthlyResetDate: data.monthlyResetDate,
          createdAt: data.createdAt,
          lastLogin: data.lastLogin,
          faxNumber: data.faxNumber || undefined,
          faxNumberAssignedAt: data.faxNumberAssignedAt || undefined,
          unreadFaxCount: data.unreadFaxCount || 0,
          faxesSent: data.usage?.totalFaxesSent ?? 0,
          totalPagesSent: data.usage?.totalPagesSent ?? 0,
        };
        callback(userData);
      }
    },
    (error) => {
      console.error('Error in user data subscription:', error);
    }
  );
  
  return unsubscribe;
};

// Helper function to calculate next month's date
function getNextMonthDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}
