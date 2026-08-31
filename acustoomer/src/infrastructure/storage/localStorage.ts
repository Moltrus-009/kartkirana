import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, IS_MOCK_MODE } from '../firebase/firebase';
const hasValidConfig = !IS_MOCK_MODE;

export interface UploadOptions {
  compress?: boolean;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  onProgress?: (progress: number) => void;
}

// 1. Unified and Centralized Storage Paths
export const STORAGE_PATHS = {
  userProfile: (userId: string) => `users/${userId}/profile.jpg`,
  userKyc: (userId: string, docName: 'aadhaar' | 'pan' | 'selfie') => `users/${userId}/kyc/${docName}.jpg`,
  userDocument: (userId: string, filename: string) => `users/${userId}/documents/${filename}`,
  
  shopLogo: (shopId: string) => `shops/${shopId}/logo.png`,
  shopBanner: (shopId: string) => `shops/${shopId}/banner.jpg`,
  shopLicense: (shopId: string) => `shops/${shopId}/license.pdf`,
  shopGallery: (shopId: string, filename: string) => `shops/${shopId}/gallery/${filename}`,
  
  productCover: (shopId: string, productId: string) => `products/${shopId}/${productId}/cover.jpg`,
  productGallery: (shopId: string, productId: string, filename: string) => `products/${shopId}/${productId}/${filename}`,
  
  riderProfile: (riderId: string) => `riders/${riderId}/profile.jpg`,
  riderDoc: (riderId: string, docName: 'aadhaar' | 'driving-license' | 'rc') => `riders/${riderId}/${docName}.jpg`,
  riderVehicle: (riderId: string, filename: string) => `riders/${riderId}/vehicle/${filename}`,
  
  orderInvoice: (orderId: string) => `orders/${orderId}/invoice.pdf`,
  orderReceipt: (orderId: string) => `orders/${orderId}/receipt.pdf`,
  orderProof: (orderId: string) => `orders/${orderId}/proof-of-delivery.jpg`,
  orderSignature: (orderId: string) => `orders/${orderId}/customer-signature.png`,
  
  advertisementBanner: (adId: string) => `advertisements/${adId}/banner.jpg`,
  advertisementThumbnail: (adId: string) => `advertisements/${adId}/thumbnail.jpg`,
  
  categoryIcon: (categoryName: string, filename: string) => `categories/${categoryName}/${filename}`,
  temp: (filename: string) => `temp/${filename}`
};

// 2. Client-side Image Compression (HTML5 Canvas)
export const compressImage = (
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file); // Don't compress non-images (like PDFs)
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(file);
      }

      let width = img.width;
      let height = img.height;
      const maxWidth = options.maxWidth || 1024;
      const maxHeight = options.maxHeight || 1024;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        options.quality || 0.75
      );
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
};

// 3. Centralized File Upload Handler (with Mock Mode Fallback)
export const uploadFile = async (
  path: string,
  file: File,
  options: UploadOptions = {}
): Promise<string> => {
  // Sandbox Mock Mode fallback
  if (!hasValidConfig || !storage) {
    console.log(`[Storage Mock Upload] Simulating upload to: ${path}`);
    if (options.onProgress) {
      options.onProgress(20);
      await new Promise(r => setTimeout(r, 100));
      options.onProgress(60);
      await new Promise(r => setTimeout(r, 100));
      options.onProgress(100);
    }
    
    // Generate a temporary offline local Object URL for instant previewing
    const mockUrl = URL.createObjectURL(file);
    return mockUrl;
  }

  let fileToUpload: Blob | File = file;
  if (options.compress && file.type.startsWith('image/')) {
    try {
      fileToUpload = await compressImage(file, {
        quality: options.quality,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight
      });
    } catch (e) {
      console.warn('[Storage Config] Image compression failed, uploading original:', e);
    }
  }

  if (import.meta.env.DEV) {
    console.log(`[Storage Image Pipeline] Starting uploadBytesResumable to path: ${path}`);
  }
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (import.meta.env.DEV) {
          console.log(`[Storage Image Pipeline] Path: ${path} | Progress: ${progress.toFixed(1)}%`);
        }
        if (options.onProgress) {
          options.onProgress(progress);
        }
      },
      (error) => {
        if (import.meta.env.DEV) console.error(`[Storage Image Pipeline] Upload failed at ${path}:`, error);
        else console.error('[Storage Image Pipeline] Upload failed.');
        reject(error);
      },
      async () => {
        try {
          if (import.meta.env.DEV) {
            console.log(`[Storage Image Pipeline] Upload completed for ${path}. Retrieving download URL...`);
          }
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (import.meta.env.DEV) {
            console.log(`[Storage Image Pipeline] Download URL resolved for ${path}.`);
          }
          resolve(downloadUrl);
        } catch (err) {
          if (import.meta.env.DEV) console.error(`[Storage Image Pipeline] Download URL failed for ${path}:`, err);
          else console.error('[Storage Image Pipeline] Download URL could not be created.');
          reject(err);
        }
      }
    );
  });
};

// 4. File Deletion Handler
export const deleteFile = async (path: string): Promise<void> => {
  if (!hasValidConfig || !storage) {
    console.log(`[Storage Mock Delete] Simulating file deletion at: ${path}`);
    return;
  }
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error(`[Storage Error] Deletion failed at ${path}:`, error);
    throw error;
  }
};
