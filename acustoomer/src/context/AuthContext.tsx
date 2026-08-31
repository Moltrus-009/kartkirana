import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { authService, PhoneSignInResult } from '../services/authService';
import { useAppStore } from '../core/store/useAppStore';
import { dbService } from '../services/dbService';
import { logger } from '../core/logger/logger';
import { mapFirebaseError } from '../core/errors/errors';
import { networkManager } from '../services/networkManager';
import { recaptchaManager } from '../services/recaptchaManager';
import { clearLegacySharedCustomerStorage } from '../utils/customerStorage';
import { auth, IS_MOCK_MODE } from '../infrastructure/firebase/firebase';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  verificationId: string | null;
  onboardingCompleted: boolean;
  completeOnboarding: () => void;
  sendOTPCode: (phoneNumber: string, containerId?: string) => Promise<boolean>;
  verifyOTPCode: (otp: string, signupProfile?: { name: string; email: string }) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<PhoneSignInResult | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(() => {
    return localStorage.getItem('onboarding_done') === 'true';
  });

  // Auto-login on load with loading failsafe
  useEffect(() => {
    let active = true;
    
    // Safety fallback in case checkPersistedAuth hangs indefinitely
    const safetyTimeout = setTimeout(() => {
      if (active) {
        console.warn('Auth initialization timed out, running failsafe.');
        setLoading(false);
      }
    }, 12000);

    const initAuth = async () => {
      try {
        const profile = await authService.checkPersistedAuth();
        if (active && profile) {
          setUser(profile);
          useAppStore.getState().setUserProfile(profile);
          useAppStore.getState().subscribeOrders(profile.uid);
        }
      } catch (err: any) {
        console.error('Error during auto login restore:', err);
      } finally {
        if (active) {
          clearTimeout(safetyTimeout);
          // Minimum delay for showing splash animation
          setTimeout(() => {
            if (active) setLoading(false);
          }, 150);
        }
      }
    };
    initAuth();

    return () => {
      active = false;
      clearTimeout(safetyTimeout);
      recaptchaManager.clear();
    };
  }, []);

  useEffect(() => {
    if (user?.uid) clearLegacySharedCustomerStorage();
  }, [user?.uid]);

  const completeOnboarding = () => {
    setOnboardingCompleted(true);
    localStorage.setItem('onboarding_done', 'true');
  };

  const clearError = () => setError(null);

  const sendOTPCode = async (phoneNumber: string, containerId?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    const maskedPhone = phoneNumber.replace(/.(?=.{4})/g, '•');
    logger.info('Auth', `Sending OTP code request for ${maskedPhone}`);

    // If an existing verification session is active, invalidate it and clean recaptcha
    if (confirmResult) {
      logger.info('Auth', 'Invalidating previous OTP session.');
      setConfirmResult(null);
      setVerificationId(null);
    }
    
    // Setup a timeout promise to reject after 30 seconds
    let timeoutId = 0;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error('Verification request timed out. Please check your network connection or Firebase configuration.'));
      }, 30000);
    });

    try {
      // Direct offline network check
      if (!networkManager.getOnlineStatus()) {
        throw new Error('You are currently offline. Please check your network connection.');
      }

      const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
      const isBypassNum = IS_MOCK_MODE && (
        cleanPhone === '9999999999' ||
        cleanPhone.endsWith('99999') ||
        cleanPhone.endsWith('11111') ||
        cleanPhone.endsWith('88888')
      );

      if (isBypassNum) {
        logger.info('Auth', `[Phone Auth Mock] Sending mock OTP for ${maskedPhone}`);
        setVerificationId('mock-verification-id');
        setConfirmResult({
          verificationId: 'mock-verification-id',
          confirm: async (otp: string) => {
            if (otp !== '123456') {
              throw new Error('Invalid verification code.');
            }
            return {
              uid: 'dev-customer-uid',
              phoneNumber: phoneNumber,
              displayName: 'Dev Customer',
              email: 'dev-customer@example.com'
            } as any;
          }
        });
        return true;
      }

      if (!auth) {
        throw Object.assign(new Error('Firebase Auth is not initialized.'), { code: 'auth/app-not-authorized' });
      }
      const verifier = recaptchaManager.setup(auth, containerId || 'recaptcha-container');
      if (!verifier) {
        throw Object.assign(new Error('reCAPTCHA could not be initialized.'), { code: 'auth/captcha-check-failed' });
      }
      
      const sendPromise = authService.sendOTP(phoneNumber, verifier);
      const result = await Promise.race([sendPromise, timeoutPromise]);
      
      setVerificationId(result.verificationId);
      setConfirmResult(result);
      logger.info('Auth', 'OTP verification session created.');
      return true;
    } catch (err: any) {
      logger.error('Auth', 'Error during sendOTPCode:', err);
      setError(mapFirebaseError(err));
      recaptchaManager.clear(); // Clear Recaptcha on failure to allow instant retry
      return false;
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const verifyOTPCode = async (otp: string, signupProfile?: { name: string; email: string }): Promise<boolean> => {
    // Dev login bypass support
    if (IS_MOCK_MODE && otp === '123456') {
      const devUid = 'dev-customer-uid';
      let profile: UserProfile | null = null;
      try {
        profile = await dbService.getUserProfile(devUid);
        if (!profile) {
          profile = await dbService.createUserProfile(devUid, {
            name: signupProfile?.name || 'Dev Customer',
            phone: '+919999977777',
            email: signupProfile?.email || 'dev-customer@example.com',
          });
        } else {
          profile = await dbService.updateUserProfile(devUid, {
            lastLogin: new Date().toISOString(),
            ...(signupProfile ? { name: signupProfile.name, email: signupProfile.email } : {})
          });
        }
      } catch (err) {
        logger.warn('Auth', 'Bypass profile creation failed. Using fallback.');
      }
      
      const targetProfile = profile || {
        uid: devUid,
        name: signupProfile?.name || 'Dev Customer',
        phone: '+919999977777',
        email: signupProfile?.email || 'dev-customer@example.com',
        profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      
      setUser(targetProfile);
      useAppStore.getState().setUserProfile(targetProfile);
      useAppStore.getState().subscribeOrders(targetProfile.uid);
      return true;
    }

    if (!confirmResult) {
      setError('No active verification session. Send OTP first.');
      return false;
    }
    
    setLoading(true);
    setError(null);
    logger.info('Auth', 'Verifying OTP code...');

    try {
      // Direct offline network check
      if (!networkManager.getOnlineStatus()) {
        throw new Error('You are currently offline. Please check your network connection.');
      }

      const firebaseUser = await confirmResult.confirm(otp);
      logger.info('Auth', `OTP confirmation successful. Firebase UID: ${firebaseUser.uid}`);

      // Fetch or create profile directly from the resolved Firebase credentials.
      let profile: UserProfile | null;
      try {
        profile = await dbService.getUserProfile(firebaseUser.uid);
        if (!profile) {
          profile = await dbService.createUserProfile(firebaseUser.uid, {
            name: signupProfile?.name || (firebaseUser as any).displayName || 'Customer',
            phone: firebaseUser.phoneNumber || '',
            email: signupProfile?.email || (firebaseUser as any).email || '',
          });
        } else {
          const persistedRole = (profile as UserProfile & { role?: string }).role;
          if (persistedRole && persistedRole !== 'customer') {
            // Older builds stored every role in users/{uid}. Preserve the
            // merchant/rider document and replace only the legacy customer
            // slot so one verified phone can use every Kart Kirana app.
            profile = await dbService.createUserProfile(firebaseUser.uid, {
              name: signupProfile?.name || (profile as any).name || (profile as any).fullName || (firebaseUser as any).displayName || 'Customer',
              phone: firebaseUser.phoneNumber || profile.phone || '',
              email: signupProfile?.email || profile.email || (firebaseUser as any).email || '',
            });
          } else {
            profile = await dbService.updateUserProfile(firebaseUser.uid, {
              lastLogin: new Date().toISOString(),
              ...(signupProfile ? { name: signupProfile.name, email: signupProfile.email } : {})
            });
          }
        }
      } catch (err) {
        logger.error('Auth', 'Profile synchronization failed after OTP verification.', err);
        await authService.logout().catch(() => undefined);
        throw err;
      }

      if (!profile) {
        throw new Error('Customer profile could not be loaded.');
      }
      const targetProfile = profile;

      setUser(targetProfile);
      useAppStore.getState().setUserProfile(targetProfile);
      useAppStore.getState().subscribeOrders(targetProfile.uid);
      
      // Clear OTP session variables on success
      setConfirmResult(null);
      setVerificationId(null);
      recaptchaManager.clear();
      return true;
    } catch (err: any) {
      logger.error('Auth', 'Error during verifyOTPCode:', err);
      setError(mapFirebaseError(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    try {
      // Unsubscribe orders and clear Zustand cached tables
      useAppStore.getState().unsubscribeOrders();
      useAppStore.getState().clearCache();
      
      await authService.logout();
    } catch (err: any) {
      setError('Sign out could not reach Firebase, but the local session was cleared.');
    } finally {
      setUser(null);
      useAppStore.getState().setUserProfile(null);
      setVerificationId(null);
      setConfirmResult(null);
      recaptchaManager.clear();
      setLoading(false);
    }
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const updated = await useAppStore.getState().updateUserProfile(user.uid, updates);
      setUser(updated);
    } catch (err: any) {
      setError('Failed to save profile changes');
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      verificationId,
      onboardingCompleted,
      completeOnboarding,
      sendOTPCode,
      verifyOTPCode,
      logoutUser,
      updateUser,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
