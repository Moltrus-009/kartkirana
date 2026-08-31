import { 
  signInWithPhoneNumber, 
  User as FirebaseUser,
  signOut,
  type ApplicationVerifier
} from 'firebase/auth';
import { auth } from '../infrastructure/firebase/firebase';
import { UserProfile } from '../types';
import { dbService } from './dbService';

export interface PhoneSignInResult {
  verificationId: string;
  confirm: (otp: string) => Promise<FirebaseUser>;
}

export const authService = {
  // Send OTP
  async sendOTP(phoneWithCountry: string, appVerifier: ApplicationVerifier): Promise<PhoneSignInResult> {
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
    return new Promise((resolve, reject) => {
      if (!auth) return resolve(null);
      const firebaseAuth = auth;

      let settled = false;
      let hydrating = false;
      let unsubscribe = () => {};
      let authTimeout: ReturnType<typeof setTimeout> | undefined;

      const finish = (callback: (value: any) => void, value: any) => {
        if (settled) return;
        settled = true;
        if (authTimeout) clearTimeout(authTimeout);
        unsubscribe();
        callback(value);
      };

      const hydrateProfile = async (firebaseUser: FirebaseUser | null) => {
        if (settled || hydrating) return;
        hydrating = true;
        if (authTimeout) clearTimeout(authTimeout);
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
              const persistedRole = (profile as UserProfile & { role?: string }).role;
              if (persistedRole && persistedRole !== 'customer') {
                profile = await dbService.createUserProfile(firebaseUser.uid, {
                  name: (profile as any).name || (profile as any).fullName || firebaseUser.displayName || 'Customer',
                  phone: firebaseUser.phoneNumber,
                  email: (profile as any).email || firebaseUser.email || '',
                  profileImage: firebaseUser.photoURL || '',
                  addresses: [],
                });
              } else {
                profile = await dbService.updateUserProfile(firebaseUser.uid, {
                  lastLogin: new Date().toISOString()
                });
              }
            }
            finish(resolve, profile);
          } catch (err) {
            finish(reject, err);
          }
        } else {
          finish(resolve, null);
        }
      };

      unsubscribe = firebaseAuth.onAuthStateChanged(
        firebaseUser => void hydrateProfile(firebaseUser),
        error => finish(reject, error)
      );

      // This guards only a listener that never fires. A known persisted user is
      // still hydrated instead of being incorrectly treated as signed out.
      authTimeout = setTimeout(() => {
        void hydrateProfile(firebaseAuth.currentUser);
      }, 10000);
    });
  },

  // Logout
  async logout(): Promise<void> {
    if (auth) {
      await signOut(auth);
    }
  }
};
