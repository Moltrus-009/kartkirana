import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/firebase';

export interface UploadOptions {
  compress?: boolean;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  onProgress?: (progress: number) => void;
}

export const STORAGE_PATHS = {
  userProfile: (userId: string) => `users/${userId}/profile.jpg`,
  userKyc: (userId: string, docName: 'aadhaar' | 'pan' | 'selfie') => `users/${userId}/kyc/${docName}.jpg`,
  userDocument: (userId: string, filename: string) => `users/${userId}/documents/${filename}`,
  shopLogo: (shopId: string) => `shops/${shopId}/logo.png`,
  shopBanner: (shopId: string) => `shops/${shopId}/banner.jpg`,
  productCover: (shopId: string, productId: string) => `products/${shopId}/${productId}/cover.jpg`,
  productGallery: (shopId: string, productId: string, filename: string) => `products/${shopId}/${productId}/${filename}`
};

export const compressImage = (
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);

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
      canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', options.quality || 0.75);
    };
    img.onerror = (err) => reject(err);
  });
};

export const uploadFile = async (path: string, file: File, options: UploadOptions = {}): Promise<string> => {
  if (!storage) throw new Error('File uploads are unavailable. Check your connection and try again.');
  if (!file.type.startsWith('image/')) throw new Error('Only image files can be uploaded here.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image files must be smaller than 5 MB.');

  let fileToUpload: Blob | File = file;
  if (options.compress && file.type.startsWith('image/')) {
    try {
      fileToUpload = await compressImage(file, {
        quality: options.quality,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight
      });
    } catch {
      // Upload the original validated image if client-side compression is unavailable.
    }
  }

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (options.onProgress) options.onProgress(progress);
      },
      (error) => reject(error),
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
      }
    );
  });
};

export const deleteFile = async (path: string): Promise<void> => {
  if (!storage) throw new Error('File uploads are unavailable. Check your connection and try again.');
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};
