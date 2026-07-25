import type { Merchant } from '../entities/Merchant';
export interface UserRepository {
  fetchProfile(uid: string): Promise<Merchant | null>;
  createProfile(uid: string, profile: Merchant): Promise<void>;
  updateProfile(uid: string, updates: Partial<Merchant>): Promise<void>;
}
