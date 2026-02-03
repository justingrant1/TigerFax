/**
 * Fax Status Polling Service
 * Polls Sinch API for fax status updates and updates the store
 */

import { getFaxStatus, mapSinchStatus } from '../api/sinch-fax';
import { useFaxStore } from '../state/fax-store';
import { sendFaxSuccessNotification, sendFaxFailureNotification } from './notifications';

interface PollingJob {
  faxId: string;
  intervalId: NodeJS.Timeout;
  attempts: number;
}

// Active polling jobs
const activePolls: Map<string, PollingJob> = new Map();

// Polling configuration
const POLL_INTERVAL = 10000; // 10 seconds
const MAX_POLL_ATTEMPTS = 60; // 10 minutes max (60 * 10 seconds)
const FINAL_STATUSES = ['sent', 'failed'];

/**
 * Start polling for fax status
 */
export const startPolling = (faxId: string) => {
  // Don't start if already polling
  if (activePolls.has(faxId)) {
    console.log(`Already polling fax ${faxId}`);
    return;
  }

  console.log(`Starting status polling for fax ${faxId}`);

  const intervalId = setInterval(async () => {
    await pollFaxStatus(faxId);
  }, POLL_INTERVAL);

  activePolls.set(faxId, {
    faxId,
    intervalId,
    attempts: 0,
  });

  // Do initial poll immediately
  pollFaxStatus(faxId);
};

/**
 * Stop polling for a specific fax
 */
export const stopPolling = (faxId: string) => {
  const job = activePolls.get(faxId);
  if (job) {
    clearInterval(job.intervalId);
    activePolls.delete(faxId);
    console.log(`Stopped polling fax ${faxId}`);
  }
};

/**
 * Stop all active polling
 */
export const stopAllPolling = () => {
  activePolls.forEach((job) => {
    clearInterval(job.intervalId);
  });
  activePolls.clear();
  console.log('Stopped all polling');
};

/**
 * Poll fax status from Sinch API
 */
const pollFaxStatus = async (faxId: string) => {
  const job = activePolls.get(faxId);
  if (!job) return;

  try {
    job.attempts++;

    // Check if max attempts reached
    if (job.attempts > MAX_POLL_ATTEMPTS) {
      console.log(`Max polling attempts reached for fax ${faxId}`);
      stopPolling(faxId);
      
      // Mark as failed if still not complete
      const store = useFaxStore.getState();
      const fax = store.faxHistory.find(f => f.id === faxId);
      if (fax && !FINAL_STATUSES.includes(fax.status)) {
        store.updateFaxStatus(faxId, 'failed');
      }
      return;
    }

    // Get status from Sinch API
    const response = await getFaxStatus(faxId);
    const mappedStatus = mapSinchStatus(response.status);

    console.log(`Fax ${faxId} status: ${response.status} -> ${mappedStatus} (attempt ${job.attempts})`);

    // Update store with new status
    const store = useFaxStore.getState();
    const currentFax = store.faxHistory.find(f => f.id === faxId);
    
    if (currentFax && currentFax.status !== mappedStatus) {
      store.updateFaxStatus(faxId, mappedStatus);
      
      // If status is final, stop polling and send notification
      if (FINAL_STATUSES.includes(mappedStatus)) {
        console.log(`Fax ${faxId} reached final status: ${mappedStatus}`);
        stopPolling(faxId);
        
        // Send notification
        if (mappedStatus === 'sent') {
          sendFaxSuccessNotification(currentFax.recipient, currentFax.totalPages);
        } else if (mappedStatus === 'failed') {
          sendFaxFailureNotification(currentFax.recipient);
        }
      }
    }
  } catch (error) {
    console.error(`Error polling fax status for ${faxId}:`, error);
    
    // On error, continue polling unless max attempts reached
    if (job.attempts >= MAX_POLL_ATTEMPTS) {
      stopPolling(faxId);
    }
  }
};

/**
 * Get polling status for a fax
 */
export const isPolling = (faxId: string): boolean => {
  return activePolls.has(faxId);
};

/**
 * Get number of active polling jobs
 */
export const getActivePollingCount = (): number => {
  return activePolls.size;
};

/**
 * Resume polling for incomplete faxes (on app start)
 */
export const resumePolling = () => {
  const store = useFaxStore.getState();
  const incompleteFaxes = store.faxHistory.filter(
    fax => !FINAL_STATUSES.includes(fax.status)
  );

  console.log(`Resuming polling for ${incompleteFaxes.length} incomplete faxes`);

  incompleteFaxes.forEach(fax => {
    startPolling(fax.id);
  });
};
