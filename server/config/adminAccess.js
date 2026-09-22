const ADMIN_PHONES = ['+919580184045', '+918604519629'];
module.exports = { ADMIN_PHONES, isAllowedAdminPhone: phone => ADMIN_PHONES.includes(phone) };
