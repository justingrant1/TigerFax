/**
 * Sinch Fax API Service
 * Documentation: https://developers.sinch.com/docs/fax/api-reference
 *
 * Sinch Fax API accepts faxes in two ways:
 * 1. contentUrl - A URL pointing to the document to fax
 * 2. multipart/form-data - Files uploaded directly
 *
 * Since we're in React Native and can't easily do multipart uploads with Blob,
 * we'll use expo-file-system's uploadAsync for proper multipart handling.
 */

import * as FileSystem from 'expo-file-system';
import { CoverPage } from '../state/fax-store';
import { logError, isRetryableError } from '../utils/error-handler';

// Get credentials from environment
const SINCH_PROJECT_ID = process.env.EXPO_PUBLIC_VIBECODE_SINCH_PROJECT_ID;
const SINCH_KEY_ID = process.env.EXPO_PUBLIC_VIBECODE_SINCH_KEY_ID;
const SINCH_KEY_SECRET = process.env.EXPO_PUBLIC_VIBECODE_SINCH_KEY_SECRET;

const BASE_URL = `https://fax.api.sinch.com/v3/projects/${SINCH_PROJECT_ID}`;

// Types
export interface SinchFaxResponse {
  id: string;
  to: string;
  from?: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createTime?: string;
  numberOfPages?: number;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface SendFaxParams {
  to: string;
  documents: Array<{ uri: string; name: string; base64?: string }>;
  coverPage?: CoverPage;
}

/**
 * Get Basic Auth header for Sinch API
 */
const getAuthHeader = (): string => {
  const credentials = `${SINCH_KEY_ID}:${SINCH_KEY_SECRET}`;
  // Use a polyfill-safe base64 encoding
  const encoded = globalThis.btoa ? globalThis.btoa(credentials) : Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
};

/**
 * Get content type from filename
 */
const getContentType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'tiff':
    case 'tif':
      return 'image/tiff';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
};

/**
 * Create cover page as simple text and save to temp file
 */
const createCoverPageFile = async (coverPage: CoverPage): Promise<string> => {
  const lines = [
    '================================',
    '         FAX COVER SHEET        ',
    '================================',
    '',
    `To:      ${coverPage.to}`,
    `From:    ${coverPage.from}`,
  ];

  if (coverPage.subject) {
    lines.push(`Subject: ${coverPage.subject}`);
  }

  lines.push(`Date:    ${new Date().toLocaleDateString()}`);
  lines.push('');

  if (coverPage.message) {
    lines.push('Message:');
    lines.push(coverPage.message);
  }

  lines.push('');
  lines.push('================================');

  const content = lines.join('\n');
  const coverPagePath = `${FileSystem.cacheDirectory}cover-page-${Date.now()}.txt`;

  await FileSystem.writeAsStringAsync(coverPagePath, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return coverPagePath;
};

/**
 * Send a fax via Sinch API using multipart/form-data upload
 */
export const sendFax = async (
  params: SendFaxParams,
  retryCount: number = 0,
  maxRetries: number = 2
): Promise<SinchFaxResponse> => {
  try {
    // Check credentials
    if (!SINCH_PROJECT_ID || !SINCH_KEY_ID || !SINCH_KEY_SECRET) {
      throw new Error(
        'Sinch API credentials not configured. Please add EXPO_PUBLIC_VIBECODE_SINCH_PROJECT_ID, EXPO_PUBLIC_VIBECODE_SINCH_KEY_ID, and EXPO_PUBLIC_VIBECODE_SINCH_KEY_SECRET in the ENV tab.'
      );
    }

    // Validate we have documents
    if (!params.documents || params.documents.length === 0) {
      throw new Error('At least one document is required to send a fax');
    }

    // Prepare files for upload
    const filesToUpload: Array<{ uri: string; name: string; mimeType: string }> = [];

    // Add cover page as first file if provided
    if (params.coverPage) {
      const coverPagePath = await createCoverPageFile(params.coverPage);
      filesToUpload.push({
        uri: coverPagePath,
        name: 'cover-page.txt',
        mimeType: 'text/plain',
      });
    }

    // Add document files with validation
    for (const doc of params.documents) {
      // Validate file exists
      const fileInfo = await FileSystem.getInfoAsync(doc.uri);
      if (!fileInfo.exists) {
        throw new Error(`File not found: ${doc.name}. Please try capturing the document again.`);
      }

      console.log(`Validated file: ${doc.name}`, {
        exists: fileInfo.exists,
        size: fileInfo.size,
        uri: doc.uri,
      });

      filesToUpload.push({
        uri: doc.uri,
        name: doc.name,
        mimeType: getContentType(doc.name),
      });
    }

    console.log('Sending fax to Sinch API:', {
      to: params.to,
      documentCount: filesToUpload.length,
      hasCoverPage: !!params.coverPage,
      url: `${BASE_URL}/faxes`,
      files: filesToUpload.map((f) => ({
        name: f.name,
        mimeType: f.mimeType,
        uri: f.uri,
      })),
    });

    // Use FileSystem.uploadAsync for the first file, which handles multipart properly
    // For single file faxes, use uploadAsync
    if (filesToUpload.length === 1) {
      const file = filesToUpload[0];

      console.log('Uploading single file:', {
        fileName: file.name,
        mimeType: file.mimeType,
        uri: file.uri,
      });

      const uploadResult = await FileSystem.uploadAsync(`${BASE_URL}/faxes`, file.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: file.mimeType,
        parameters: {
          to: params.to,
        },
        headers: {
          Authorization: getAuthHeader(),
        },
      });

      console.log('Upload result:', uploadResult.status, uploadResult.body);

      if (uploadResult.status >= 400) {
        let errorMessage = `Sinch API Error (${uploadResult.status})`;

        try {
          const errorJson = JSON.parse(uploadResult.body);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          } else if (errorJson.details?.[0]?.message) {
            errorMessage = errorJson.details[0].message;
          }
        } catch {
          if (uploadResult.body) {
            errorMessage = uploadResult.body.substring(0, 200);
          }
        }

        const errorObj = {
          status: uploadResult.status,
          message: uploadResult.body,
        };

        logError('sendFax', errorObj, {
          to: params.to,
          documentCount: params.documents.length,
          retryCount,
        });

        // Retry if appropriate
        if (isRetryableError(errorObj) && retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying fax send in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return sendFax(params, retryCount + 1, maxRetries);
        }

        throw new Error(errorMessage);
      }

      const result: SinchFaxResponse = JSON.parse(uploadResult.body);
      console.log('Fax sent successfully:', result);
      return result;
    }

    // For multiple files, we need to combine them or send sequentially
    // The Sinch API may accept multiple 'file' fields in multipart
    // Since uploadAsync only supports one file, we'll use the last (main) document
    // and log a warning about multiple documents

    console.warn('Multiple documents detected. Sending last document only. Multi-document support coming soon.');

    const file = filesToUpload[filesToUpload.length - 1]; // Use the last (main) document

    console.log('Uploading document:', {
      fileName: file.name,
      mimeType: file.mimeType,
      uri: file.uri,
    });

    const uploadResult = await FileSystem.uploadAsync(`${BASE_URL}/faxes`, file.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: file.mimeType,
      parameters: {
        to: params.to,
      },
      headers: {
        Authorization: getAuthHeader(),
      },
    });

    console.log('Upload result:', uploadResult.status, uploadResult.body);

    if (uploadResult.status >= 400) {
      let errorMessage = `Sinch API Error (${uploadResult.status})`;

      try {
        const errorJson = JSON.parse(uploadResult.body);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        } else if (errorJson.details?.[0]?.message) {
          errorMessage = errorJson.details[0].message;
        }
      } catch {
        if (uploadResult.body) {
          errorMessage = uploadResult.body.substring(0, 200);
        }
      }

      const errorObj = {
        status: uploadResult.status,
        message: uploadResult.body,
      };

      logError('sendFax', errorObj, {
        to: params.to,
        documentCount: params.documents.length,
        retryCount,
      });

      if (isRetryableError(errorObj) && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying fax send in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return sendFax(params, retryCount + 1, maxRetries);
      }

      throw new Error(errorMessage);
    }

    const result: SinchFaxResponse = JSON.parse(uploadResult.body);
    console.log('Fax sent successfully:', result);
    return result;

  } catch (error) {
    // If it's a network error and we can retry
    if (isRetryableError(error) && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying fax send after error in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendFax(params, retryCount + 1, maxRetries);
    }

    logError('sendFax', error, { params, retryCount });
    throw error;
  }
};

/**
 * Get fax status from Sinch API
 */
export const getFaxStatus = async (
  faxId: string,
  retryCount: number = 0,
  maxRetries: number = 2
): Promise<SinchFaxResponse> => {
  try {
    if (!SINCH_PROJECT_ID || !SINCH_KEY_ID || !SINCH_KEY_SECRET) {
      throw new Error('Sinch API credentials not configured');
    }

    const response = await fetch(`${BASE_URL}/faxes/${faxId}`, {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorObj = {
        status: response.status,
        message: errorText,
      };

      logError('getFaxStatus', errorObj, { faxId, retryCount });

      if (isRetryableError(errorObj) && retryCount < maxRetries) {
        const delay = 1000 * (retryCount + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return getFaxStatus(faxId, retryCount + 1, maxRetries);
      }

      throw new Error(`Failed to get fax status: ${response.status}`);
    }

    const result: SinchFaxResponse = await response.json();
    return result;
  } catch (error) {
    if (isRetryableError(error) && retryCount < maxRetries) {
      const delay = 1000 * (retryCount + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return getFaxStatus(faxId, retryCount + 1, maxRetries);
    }

    logError('getFaxStatus', error, { faxId, retryCount });
    throw error;
  }
};

/**
 * Cancel a queued fax
 */
export const cancelFax = async (faxId: string): Promise<void> => {
  try {
    if (!SINCH_PROJECT_ID || !SINCH_KEY_ID || !SINCH_KEY_SECRET) {
      throw new Error('Sinch API credentials not configured');
    }

    const response = await fetch(`${BASE_URL}/faxes/${faxId}`, {
      method: 'DELETE',
      headers: {
        Authorization: getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel fax: ${response.status}`);
    }
  } catch (error) {
    console.error('Error cancelling fax:', error);
    throw error;
  }
};

/**
 * Map Sinch status to app status
 */
export const mapSinchStatus = (
  sinchStatus: SinchFaxResponse['status']
): 'pending' | 'sending' | 'sent' | 'failed' => {
  const status = sinchStatus?.toUpperCase();
  switch (status) {
    case 'QUEUED':
      return 'pending';
    case 'IN_PROGRESS':
      return 'sending';
    case 'COMPLETED':
      return 'sent';
    case 'FAILED':
    case 'CANCELLED':
      return 'failed';
    default:
      return 'pending';
  }
};
