import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { Merchant } from '../../domain/entities/Merchant';

const requireDb = () => {
  if (!db) throw new Error('User service is unavailable. Check your connection and try again.');
  return db;
};

export const userRepository: UserRepository = {
  async fetchProfile(uid: string): Promise<Merchant | null> {
    const docRef = doc(requireDb(), 'merchants', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data() as Merchant;

    // One-time compatibility migration for shopkeepers created when merchant
    // profiles were stored in users/{uid}. Customer records are never copied.
    const legacyRef = doc(requireDb(), 'users', uid);
    const legacySnap = await getDoc(legacyRef);
    if (legacySnap.exists()) {
      const legacy = legacySnap.data() as Merchant;
      if (legacy.role === 'owner' || legacy.role === 'employee') {
        const migrated = { ...legacy, phone: auth?.currentUser?.phoneNumber || legacy.phone };
        await setDoc(docRef, migrated);
        return migrated;
      }
    }
    return null;
  },

  async createProfile(uid: string, profile: Merchant): Promise<void> {
    const docRef = doc(requireDb(), 'merchants', uid);
    await setDoc(docRef, profile);
  },

  async updateProfile(uid: string, updates: Partial<Merchant>): Promise<void> {
    const docRef = doc(requireDb(), 'merchants', uid);
    await updateDoc(docRef, updates);
  }
};
