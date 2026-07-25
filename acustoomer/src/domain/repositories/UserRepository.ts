import { UserProfile } from '../../types';
export interface UserRepository {
  fetchProfile(uid: string): Promise<UserProfile | null>;
  createProfile(uid: string, profile: UserProfile): Promise<void>;
  updateProfile(uid: string, updates: Partial<UserProfile>): Promise<void>;
}