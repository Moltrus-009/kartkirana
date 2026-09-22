export const ADMIN_PHONES = ['+919580184045', '+918604519629'];
export const isAllowedAdminPhone = (phone: unknown) => typeof phone === 'string' && ADMIN_PHONES.includes(phone);
