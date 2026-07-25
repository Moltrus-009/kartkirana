import { UserProfile, UserAddress } from '../../types';
export class UserEntity {
  static create(data: Partial<UserProfile>): UserProfile {
    if (!data.uid) throw new Error('User Entity requires a unique ID (uid)');
    if (!data.phone) throw new Error('User Entity requires a valid phone number');
    return {
      uid: data.uid,
      name: data.name || 'Guest User',
      phone: data.phone,
      email: data.email || '',
      profileImage: data.profileImage || '',
      addresses: data.addresses || [],
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      lastLogin: data.lastLogin || new Date().toISOString()
    };
  }
}