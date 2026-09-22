export interface ProductSuggestion {
  name: string;
  hindi: string;
  category: string;
  shopCategory: string;
  description: string;
  image: string;
}

// Generic illustrations, not photographs of branded packs. Embedded images
// remain available across the customer app and website without a network host.
const rows = [
  ['Rice', 'चावल chawal', 'staples-atta', 'groceries', '🍚'],
  ['Wheat Flour (Atta)', 'आटा atta', 'staples-atta', 'groceries', '🌾'],
  ['Toor Dal', 'अरहर दाल arhar', 'staples-atta', 'groceries', '🫘'],
  ['Sugar', 'चीनी chini', 'staples-atta', 'groceries', '🥣'],
  ['Salt', 'नमक namak', 'staples-atta', 'groceries', '🧂'],
  ['Cooking Oil', 'तेल tel', 'staples-atta', 'groceries', '🫗'],
  ['Milk', 'दूध doodh', 'dairy-eggs', 'groceries', '🥛'],
  ['Eggs', 'अंडे ande', 'dairy-eggs', 'groceries', '🥚'],
  ['Bread', 'ब्रेड bread', 'bakery-bread', 'groceries', '🍞'],
  ['Potato', 'आलू aloo', 'fruits-vegetables', 'fruits-veg', '🥔'],
  ['Onion', 'प्याज pyaz', 'fruits-vegetables', 'fruits-veg', '🧅'],
  ['Tomato', 'टमाटर tamatar', 'fruits-vegetables', 'fruits-veg', '🍅'],
  ['Banana', 'केला kela', 'fruits-vegetables', 'fruits-veg', '🍌'],
  ['Apple', 'सेब seb', 'fruits-vegetables', 'fruits-veg', '🍎'],
  ['Biscuits', 'बिस्कुट biscuit', 'snacks-munchies', 'snacks-bev', '🍪'],
  ['Tea', 'चाय chai', 'beverages', 'snacks-bev', '🍵'],
  ['Coffee', 'कॉफी coffee', 'beverages', 'snacks-bev', '☕'],
  ['Soap', 'साबुन sabun', 'personal-care', 'home-essentials', '🧼'],
  ['Shampoo', 'शैम्पू shampoo', 'personal-care', 'beauty', '🧴'],
  ['Notebook', 'कॉपी notebook', 'stationery', 'stationery', '📓'],
  ['Pen', 'पेन pen', 'stationery', 'stationery', '🖊️'],
];

export const productSuggestions: ProductSuggestion[] = rows.map(([name, hindi, category, shopCategory, emoji]) => ({
  name, hindi, category, shopCategory,
  description: `${name}. Check the pack size and product details before ordering.`,
  image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="28" fill="#f0fdf4"/><text x="120" y="148" text-anchor="middle" font-size="104">${emoji}</text></svg>`),
}));

export function searchProductSuggestions(query: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return productSuggestions.filter(p => words.every(word => `${p.name} ${p.hindi}`.toLocaleLowerCase().includes(word))).slice(0, 6);
}
