import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { UserProfile } from '../../types';
import { UserRepository } from '../../domain/repositories/UserRepository';
export const userRepository: UserRepository = {
  async fetchProfile(uid: string): Promise<UserProfile | null> {
    if (!db) return null;
    const docRef = doc(db, 'users', uid);
    return getDoc(docRef).then(snap => snap.exists() ? (snap.data() as UserProfile) : null);
  },
  async createProfile(uid: string, profile: UserProfile): Promise<void> {
    if (!db) return;
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, profile);
  },
  async updateProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    if (!db) return;
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, updates);
  }
};