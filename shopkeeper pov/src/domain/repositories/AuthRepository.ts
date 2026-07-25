import type { Merchant } from '../entities/Merchant';
import type { ApplicationVerifier } from 'firebase/auth';

export interface AuthRepository {
  triggerOTP(phone: string, appVerifier: ApplicationVerifier): Promise<{ success: boolean; error?: string }>;
  verifyOTP(phone: string, code: string, name?: string): Promise<{ success: boolean; error?: string; user?: Merchant }>;
  logout(): Promise<void>;
}
