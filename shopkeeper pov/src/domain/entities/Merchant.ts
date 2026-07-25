export interface Merchant {
  uid: string;
  fullName: string;
  phone: string;
  email?: string;
  role: 'owner' | 'employee';
  shopId: string | null;
  accountStatus: 'pending' | 'approved' | 'suspended' | 'active';
  createdAt: string;
  lastLogin: string;
}

export class MerchantEntity {
  static create(data: Partial<Merchant>): Merchant {
    if (!data.uid) throw new Error('Merchant Entity requires a unique ID (uid)');
    if (!data.phone) throw new Error('Merchant Entity requires a phone number');
    return {
      uid: data.uid,
      fullName: data.fullName || 'Merchant Owner',
      phone: data.phone,
      email: data.email || '',
      role: data.role || 'owner',
      shopId: data.shopId || null,
      accountStatus: data.accountStatus || 'pending',
      createdAt: data.createdAt || new Date().toISOString(),
      lastLogin: data.lastLogin || new Date().toISOString()
    };
  }
}
