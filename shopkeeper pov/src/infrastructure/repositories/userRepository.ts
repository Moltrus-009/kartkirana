import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { Merchant } from '../../domain/entities/Merchant';

const requireDb = () => {
  if (!db) throw new Error('User service is unavailable. Check your connection and try again.');
  return db;
};

export const userRepository: UserRepository = {
  async fetchProfile(uid: string): Promise<Merchant | null> {
    const docRef = doc(requireDb(), 'users', uid);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as Merchant) : null;
  },

  async createProfile(uid: string, profile: Merchant): Promise<void> {
    const docRef = doc(requireDb(), 'users', uid);
    await setDoc(docRef, profile);
  },

  async updateProfile(uid: string, updates: Partial<Merchant>): Promise<void> {
    const docRef = doc(requireDb(), 'users', uid);
    await updateDoc(docRef, updates);
  }
};
