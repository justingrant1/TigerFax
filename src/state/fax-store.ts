import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendFax as sendFaxToSinch, mapSinchStatus } from '../api/sinch-fax';
import { toE164, validatePhoneNumber } from '../utils/phone-validation';
import { startPolling } from '../services/fax-polling';

export interface FaxDocument {
  id: string;
  name: string;
  uri: string;
  type: 'image' | 'document';
  size: number;
  timestamp: number;
}

export interface CoverPage {
  to: string;
  from: string;
  subject: string;
  message: string;
}

export interface FaxJob {
  id: string;
  recipient: string;
  documents: FaxDocument[];
  coverPage?: CoverPage;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  timestamp: number;
  totalPages: number;
}

interface FaxState {
  // Current fax being prepared
  currentFax: {
    recipient: string;
    documents: FaxDocument[];
    coverPage?: CoverPage;
  };
  
  // History of all fax jobs
  faxHistory: FaxJob[];
  
  // Actions
  setRecipient: (recipient: string) => void;
  addDocument: (document: FaxDocument) => void;
  removeDocument: (documentId: string) => void;
  setCoverPage: (coverPage: CoverPage) => void;
  removeCoverPage: () => void;
  sendFax: () => Promise<string>;
  clearCurrentFax: () => void;
  updateFaxStatus: (jobId: string, status: FaxJob['status']) => void;
  clearHistory: () => void;
  updateFaxWithSinchId: (jobId: string, sinchId: string) => void;
}

export const useFaxStore = create<FaxState>()(
  persist(
    (set, get) => ({
      currentFax: {
        recipient: '',
        documents: [],
      },
      faxHistory: [],

      setRecipient: (recipient: string) =>
        set((state) => ({
          currentFax: { ...state.currentFax, recipient },
        })),

      addDocument: (document: FaxDocument) =>
        set((state) => ({
          currentFax: {
            ...state.currentFax,
            documents: [...state.currentFax.documents, document],
          },
        })),

      removeDocument: (documentId: string) =>
        set((state) => ({
          currentFax: {
            ...state.currentFax,
            documents: state.currentFax.documents.filter(
              (doc) => doc.id !== documentId
            ),
          },
        })),

      setCoverPage: (coverPage: CoverPage) =>
        set((state) => ({
          currentFax: { ...state.currentFax, coverPage },
        })),

      removeCoverPage: () =>
        set((state) => ({
          currentFax: { ...state.currentFax, coverPage: undefined },
        })),

      sendFax: async (): Promise<string> => {
        const { currentFax } = get();

        if (!currentFax.recipient || currentFax.documents.length === 0) {
          throw new Error('Recipient and documents required');
        }

        // Validate phone number before sending
        const validation = validatePhoneNumber(currentFax.recipient);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid phone number');
        }

        const jobId = Date.now().toString();
        const totalPages = currentFax.documents.length + (currentFax.coverPage ? 1 : 0);

        // Use the validated E.164 format
        const e164Recipient = validation.e164 || toE164(currentFax.recipient);
        
        const faxJob: FaxJob = {
          id: jobId,
          recipient: e164Recipient,
          documents: [...currentFax.documents],
          coverPage: currentFax.coverPage ? { ...currentFax.coverPage } : undefined,
          status: 'pending',
          timestamp: Date.now(),
          totalPages,
        };

        // Add to history immediately
        set((state) => ({
          faxHistory: [faxJob, ...state.faxHistory],
        }));

        // Send fax via Sinch API in background
        try {
          get().updateFaxStatus(jobId, 'sending');
          
          const sinchResponse = await sendFaxToSinch({
            to: e164Recipient,
            documents: currentFax.documents.map(doc => ({
              uri: doc.uri,
              name: doc.name,
            })),
            coverPage: currentFax.coverPage,
          });

          // Update job with Sinch ID and initial status
          get().updateFaxWithSinchId(jobId, sinchResponse.id);
          
          const mappedStatus = mapSinchStatus(sinchResponse.status);
          get().updateFaxStatus(jobId, mappedStatus);
          
          console.log('Fax sent successfully via Sinch:', sinchResponse.id);
          
          // Start polling for status updates
          startPolling(sinchResponse.id);
        } catch (error) {
          console.error('Error sending fax via Sinch:', error);
          get().updateFaxStatus(jobId, 'failed');
          throw error;
        }

        return jobId;
      },

      clearCurrentFax: () =>
        set({
          currentFax: {
            recipient: '',
            documents: [],
          },
        }),

      updateFaxStatus: (jobId: string, status: FaxJob['status']) =>
        set((state) => ({
          faxHistory: state.faxHistory.map((job) =>
            job.id === jobId ? { ...job, status } : job
          ),
        })),

      clearHistory: () =>
        set({
          faxHistory: [],
        }),

      updateFaxWithSinchId: (jobId: string, sinchId: string) =>
        set((state) => ({
          faxHistory: state.faxHistory.map((job) =>
            job.id === jobId ? { ...job, id: sinchId } : job
          ),
        })),
    }),
    {
      name: 'fax-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ faxHistory: state.faxHistory }),
    }
  )
);
