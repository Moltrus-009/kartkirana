export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'operations'
  | 'support'
  | 'finance'
  | 'marketing'
  | 'logistics'
  | 'merchant_success'
  | 'analyst';

const ROLE_PATHS: Record<Exclude<AdminRole, 'super_admin'>, string[]> = {
  admin: [
    '/', '/operations', '/orders', '/shops', '/riders', '/users', '/products',
    '/inventory-health', '/categories', '/banners', '/coupons', '/map', '/zones',
    '/complaints', '/chats', '/notifications', '/payments', '/analytics', '/settings'
  ],
  operations: [
    '/', '/operations', '/orders', '/shops', '/riders', '/users', '/products',
    '/inventory-health', '/map', '/zones', '/notifications', '/chats'
  ],
  support: ['/', '/orders', '/users', '/shops', '/riders', '/products', '/complaints', '/chats', '/map'],
  finance: ['/', '/orders', '/shops', '/products', '/payments', '/analytics'],
  marketing: ['/', '/products', '/categories', '/banners', '/coupons', '/notifications', '/analytics'],
  logistics: ['/', '/operations', '/orders', '/riders', '/map', '/shops'],
  merchant_success: ['/', '/shops', '/products', '/inventory-health', '/categories'],
  analyst: ['/', '/analytics', '/orders', '/users', '/shops', '/products', '/riders']
};

export function canAccessAdminPath(role: string | undefined, path: string): boolean {
  if (!role) return false;
  if (role === 'super_admin' || role === 'admin_super') return true;
  return (ROLE_PATHS[role as Exclude<AdminRole, 'super_admin'>] || []).includes(path);
}

export function canManageSupport(role: string | undefined): boolean {
  return ['super_admin', 'admin_super', 'admin', 'support'].includes(role || '');
}
