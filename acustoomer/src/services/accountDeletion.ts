import { getApps, initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, RecaptchaVerifier, signInWithPhoneNumber, getAdditionalUserInfo, deleteUser, signOut, type ConfirmationResult, type Auth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { app } from '../infrastructure/firebase/firebase';
import { getSecureAppCheckToken } from './appCheckService';
import { getApiUrl } from '../config/api';

export type AccountType = 'customer' | 'shopkeeper' | 'rider';
export interface DeletionRequest {
  id: string; accountType: AccountType; status: string; requestedAt: string;
  processedAt?: string; blockers: string[]; authRetained?: boolean; retentionNotes: string;
}
export interface DeletionStatus { exists: boolean; request: DeletionRequest | null; blockers?: string[] }
let isolatedAuth: Auth | null = null;
function deletionAuth() {
  if (isolatedAuth) return isolatedAuth;
  if (!app) throw new Error('Phone verification is unavailable. Please contact support@kartkirana.com.');
  const secondary = getApps().find(a => a.name === 'account-deletion') || initializeApp(app.options, 'account-deletion');
  const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;
  if (siteKey) initializeAppCheck(secondary, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
  isolatedAuth = initializeAuth(secondary, { persistence: inMemoryPersistence });
  return isolatedAuth;
}
export function makeDeletionVerifier(element: HTMLElement) {
  return new RecaptchaVerifier(deletionAuth(), element, { size: 'normal' });
}
export async function sendDeletionOTP(phone: string, verifier: RecaptchaVerifier): Promise<ConfirmationResult> {
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Enter your phone with its country code, for example +919876543210.');
  return signInWithPhoneNumber(deletionAuth(), phone, verifier);
}
export async function verifyDeletionOTP(confirmation: ConfirmationResult, otp: string) {
  if (!/^\d{6}$/.test(otp)) throw new Error('Enter the six-digit verification code.');
  const result = await confirmation.confirm(otp);
  // Firebase phone sign-in can create Auth users. Do not leave an accidental
  // registration behind when someone tries a number that was never registered.
  if (getAdditionalUserInfo(result)?.isNewUser) {
    await deleteUser(result.user);
    throw new Error('No existing KartKirana sign-in was found for this number.');
  }
}
export async function deletionApi(type: AccountType, submit = false): Promise<DeletionStatus> {
  const user = deletionAuth().currentUser;
  if (!user) throw new Error('Verify your registered phone first.');
  const [token, appCheck] = await Promise.all([user.getIdToken(true), getSecureAppCheckToken()]);
  const response = await fetch(getApiUrl(`/v1/account-deletion/${type}`), {
    method: submit ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${token}`, 'X-Firebase-AppCheck': appCheck, 'Content-Type': 'application/json' },
    ...(submit ? { body: JSON.stringify({ confirm: 'DELETE' }) } : {})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request unavailable. Please retry or contact support.');
  return { ...data, exists: submit ? true : data.exists };
}
export async function endDeletionVerification() { if (isolatedAuth) await signOut(isolatedAuth); }
export function deletionError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  const errors: Record<string,string> = {
    'auth/invalid-verification-code': 'That code is incorrect. Check the SMS and try again.',
    'auth/code-expired': 'That code has expired. Request a new code.',
    'auth/session-expired': 'Verification expired. Request a new code.',
    'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
    'auth/quota-exceeded': 'SMS verification is temporarily unavailable. Contact support for help.',
    'auth/captcha-check-failed': 'Complete the verification challenge and try again.',
    'auth/network-request-failed': 'Check your connection and try again.'
  };
  return e.code ? (errors[e.code] || 'Verification is unavailable. Please retry or contact support.') : e.message || 'Unable to complete this request. Please try again.';
}
