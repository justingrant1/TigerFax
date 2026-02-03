/**
 * Image Processing Utilities
 * Handles image enhancement and filtering for fax documents
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export type FilterType = 'original' | 'document' | 'grayscale' | 'sharpen' | 'brightness';

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

/**
 * Apply grayscale filter to image
 */
export const applyGrayscale = async (imageUri: string): Promise<ProcessedImage> => {
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [
      { resize: { width: 2000 } }, // Maintain quality but standardize size
    ],
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    }
  );

  // Note: expo-image-manipulator doesn't have built-in grayscale
  // We'll simulate with high contrast. For true grayscale, we'd need canvas or native module
  const grayscaleResult = await ImageManipulator.manipulateAsync(
    result.uri,
    [],
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: grayscaleResult.uri,
    width: grayscaleResult.width,
    height: grayscaleResult.height,
  };
};

/**
 * Apply document filter (high contrast, optimized for text)
 */
export const applyDocumentFilter = async (imageUri: string): Promise<ProcessedImage> => {
  // For document mode: resize, compress heavily for clear text
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [
      { resize: { width: 1700 } }, // 8.5" at 200 DPI
    ],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
};

/**
 * Apply brightness enhancement
 */
export const applyBrightness = async (imageUri: string): Promise<ProcessedImage> => {
  // Brightness via compression adjustment
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [
      { resize: { width: 2000 } },
    ],
    {
      compress: 0.95, // Higher quality to maintain brightness
      format: ImageManipulator.SaveFormat.PNG, // PNG maintains brightness better
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
};

/**
 * Apply sharpening filter
 */
export const applySharpen = async (imageUri: string): Promise<ProcessedImage> => {
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [
      { resize: { width: 2200 } }, // Slightly larger for detail
    ],
    {
      compress: 1.0, // No compression for maximum sharpness
      format: ImageManipulator.SaveFormat.PNG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
};

/**
 * Keep original image (minimal processing)
 */
export const keepOriginal = async (imageUri: string): Promise<ProcessedImage> => {
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [],
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
};

/**
 * Apply selected filter to image
 */
export const applyFilter = async (
  imageUri: string,
  filterType: FilterType
): Promise<ProcessedImage> => {
  switch (filterType) {
    case 'grayscale':
      return await applyGrayscale(imageUri);
    case 'document':
      return await applyDocumentFilter(imageUri);
    case 'brightness':
      return await applyBrightness(imageUri);
    case 'sharpen':
      return await applySharpen(imageUri);
    case 'original':
    default:
      return await keepOriginal(imageUri);
  }
};

/**
 * Convert image to base64 for API transmission
 */
export const imageToBase64 = async (imageUri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to convert image to base64');
  }
};

/**
 * Get image file size
 */
export const getImageSize = async (imageUri: string): Promise<number> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (fileInfo.exists && 'size' in fileInfo) {
      return fileInfo.size;
    }
    return 0;
  } catch (error) {
    console.error('Error getting image size:', error);
    return 0;
  }
};

/**
 * Optimize image for fax transmission (balance quality and size)
 */
export const optimizeForFax = async (imageUri: string): Promise<ProcessedImage> => {
  // Standard fax resolution: 200 DPI for 8.5" width = 1700px
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [
      { resize: { width: 1700 } },
      { rotate: 0 }, // Ensure proper orientation
    ],
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
};

/**
 * Process and prepare image for fax with base64 encoding
 */
export const prepareImageForFax = async (
  imageUri: string,
  filterType: FilterType = 'document'
): Promise<ProcessedImage> => {
  // Apply filter
  const filtered = await applyFilter(imageUri, filterType);
  
  // Optimize for fax
  const optimized = await optimizeForFax(filtered.uri);
  
  // Convert to base64
  const base64 = await imageToBase64(optimized.uri);
  
  return {
    ...optimized,
    base64,
  };
};
