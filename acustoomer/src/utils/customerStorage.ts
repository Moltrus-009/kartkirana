export const CUSTOMER_STORAGE_KEYS = {
  cart: 'shop_app_cart',
  coupon: 'shop_app_coupon',
  preorderSchedule: 'shop_app_preorder_schedule',
  addresses: 'shop_app_addresses',
  selectedAddress: 'shop_app_last_known_address',
  locationCoords: 'shop_app_last_known_coords',
  wishlist: 'wishlist_products',
  recentSearches: 'recent_searches',
  checkoutNotes: 'checkout_order_notes',
  checkoutSession: 'active_checkout_session'
} as const;

export const getCustomerStorageKey = (key: string, userId: string): string =>
  `${key}:user:${encodeURIComponent(userId)}`;

export const getCustomerStorageItem = (key: string, userId?: string | null): string | null =>
  userId ? localStorage.getItem(getCustomerStorageKey(key, userId)) : null;

export const setCustomerStorageItem = (key: string, userId: string | null | undefined, value: string): void => {
  if (!userId) return;
  localStorage.setItem(getCustomerStorageKey(key, userId), value);
};

export const removeCustomerStorageItem = (key: string, userId?: string | null): void => {
  if (!userId) return;
  localStorage.removeItem(getCustomerStorageKey(key, userId));
};

// Shared legacy keys cannot be safely assigned to any one customer. Remove them
// instead of migrating them to whichever account happens to sign in first.
export const clearLegacySharedCustomerStorage = (): void => {
  Object.values(CUSTOMER_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
};
