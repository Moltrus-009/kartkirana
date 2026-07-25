import { signInWithPhoneNumber, signOut, type ApplicationVerifier, type ConfirmationResult } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type { Merchant } from '../../domain/entities/Merchant';
import { mapFirebaseError } from '../../core/errors/errors';
import { logger } from '../../core/logger/logger';

let confirmationResult: ConfirmationResult | null = null;

export const authRepository: AuthRepository = {
  async triggerOTP(phone: string, appVerifier: ApplicationVerifier): Promise<{ success: boolean; error?: string }> {
    if (!auth) {
      return { success: false, error: 'Secure sign-in is unavailable. Please contact support.' };
    }
    if (!db) return { success: false, error: 'Secure data service is unavailable. Please try again shortly.' };
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    try {
      logger.info('Auth', `Triggering OTP SMS for ${formattedPhone}`);
      confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      return { success: true };
    } catch (e: any) {
      logger.error('Auth', 'Error sending phone OTP', e);
      return { success: false, error: mapFirebaseError(e) };
    }
  },

  async verifyOTP(phone: string, code: string, name?: string): Promise<{ success: boolean; error?: string; user?: Merchant }> {
    if (!confirmationResult) {
      return { success: false, error: 'No active OTP confirmation result session.' };
    }
    try {
      logger.info('Auth', `Verifying code for phone ${phone}`);
      const credentials = await confirmationResult.confirm(code);
      const user = credentials.user;

      if (!user) {
        return { success: false, error: 'Verification failed to return a user profile.' };
      }

      // Check Firestore if profile exists
      if (!db) return { success: false, error: 'Secure data service is unavailable. Please try again shortly.' };
      const docRef = doc(db, 'users', user.uid);
      const snap = await getDoc(docRef);
      
      let merchant: Merchant;
      if (snap.exists()) {
        merchant = snap.data() as Merchant;
        await setDoc(docRef, { lastLogin: new Date().toISOString() }, { merge: true });
      } else {
        // Create default merchant
        merchant = {
          uid: user.uid,
          fullName: name || 'Shop Owner',
          phone: phone,
          role: 'owner',
          shopId: null,
          accountStatus: 'pending',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await setDoc(docRef, merchant);
      }

      return { success: true, user: merchant };
    } catch (e: any) {
      logger.error('Auth', 'Error verifying OTP', e);
      return { success: false, error: mapFirebaseError(e) };
    }
  },

  async logout(): Promise<void> {
    if (!auth) return;
    await signOut(auth);
  }
};
