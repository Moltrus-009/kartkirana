import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { auth } from '../infrastructure/firebase/firebase';
import { UserProfile } from '../types';
import { dbService } from './dbService';

export interface PhoneSignInResult {
  verificationId: string;
  confirm: (otp: string) => Promise<FirebaseUser>;
}

export const authService = {
  // Setup Recaptcha Verifier
  setupRecaptcha(containerId: string): RecaptchaVerifier | null {
    if (!auth) {
      console.warn('Firebase Auth is not initialized. Cannot setup Recaptcha.');
      return null;
    }
    try {
      // Create a ReCAPTCHA verifier. Blinkit uses invisible reCAPTCHA for seamless verification.
      return new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved automatically
        },
        'expired-callback': () => {
          // Response expired.
        }
      });
    } catch (error) {
      console.error('Error setting up recaptcha:', error);
      return null;
    }
  },

  // Send OTP
  async sendOTP(phoneWithCountry: string, appVerifier: any): Promise<PhoneSignInResult> {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please configure API keys.');
    }

    // Real Firebase auth path. No local bypasses, no fallback to mock code.
    const confirmationResult = await signInWithPhoneNumber(auth, phoneWithCountry, appVerifier);
    return {
      verificationId: confirmationResult.verificationId,
      confirm: async (otp: string) => {
        const result = await confirmationResult.confirm(otp);
        return result.user;
      }
    };
  },

  // Auto Login Check
  async checkPersistedAuth(): Promise<UserProfile | null> {
    return new Promise((resolve) => {
      if (!auth) return resolve(null);
      
      // Guard timeout in case Firebase Auth connection or listener hangs
      const authTimeout = setTimeout(() => {
        console.warn('[authService] checkPersistedAuth timed out.');
        resolve(null);
      }, 2500);

      const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        clearTimeout(authTimeout);
        unsubscribe();
        if (firebaseUser && firebaseUser.phoneNumber) {
          try {
            let profile = await dbService.getUserProfile(firebaseUser.uid);
            if (!profile) {
              profile = await dbService.createUserProfile(firebaseUser.uid, {
                name: firebaseUser.displayName || 'Customer',
                phone: firebaseUser.phoneNumber,
                email: firebaseUser.email || '',
                profileImage: firebaseUser.photoURL || '',
                addresses: [],
              });
            } else {
              profile = await dbService.updateUserProfile(firebaseUser.uid, {
                lastLogin: new Date().toISOString()
              });
            }
            resolve(profile);
          } catch (err) {
            console.warn('Error fetching/creating user profile in Firestore. Using local fallback.', err);
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Customer',
              phone: firebaseUser.phoneNumber,
              email: firebaseUser.email || '',
              profileImage: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
              addresses: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            };
            resolve(fallbackProfile);
          }
        } else {
          resolve(null);
        }
      });
    });
  },

  // Logout
  async logout(): Promise<void> {
    if (auth) {
      await signOut(auth);
    }
  }
};
