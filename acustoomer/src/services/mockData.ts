import { Shop, Product, Coupon, PromoBanner, Review } from '../types';
import { APP_CATEGORIES } from '../config/categories';

export const MOCK_CATEGORIES = APP_CATEGORIES;

export const MOCK_BANNERS: PromoBanner[] = [
  {
    id: 'b1',
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1200&q=80',
    title: 'Super Saver Week',
    subtitle: 'Flat 50% Off on Groceries',
    categoryId: 'groceries',
  },
  {
    id: 'b2',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=1200&q=80',
    title: 'Instant Electronics',
    subtitle: 'Smartphones & Accessories in 15 Mins',
    categoryId: 'electronics',
  },
  {
    id: 'b3',
    image: 'https://images.unsplash.com/photo-1616671285420-a61c34a2e240?auto=format&fit=crop&w=1200&q=80',
    title: 'Preorder Fresh Alphonso',
    subtitle: 'Direct from Farms. Next Day Morning Delivery',
    categoryId: 'fruits-veg',
  },
];

export const MOCK_COUPONS: Coupon[] = [
  {
    code: 'WELCOME50',
    discountType: 'percentage',
    discountValue: 50,
    minOrderValue: 150,
    maxDiscount: 100,
    description: '50% off up to ₹100 on your first order',
    expiryDate: '2026-12-31',
  },
  {
    code: 'INSTANT10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 300,
    maxDiscount: 75,
    description: '10% off up to ₹75 on order value above ₹300',
    expiryDate: '2026-12-31',
  },
  {
    code: 'SUPERBUY',
    discountType: 'fixed',
    discountValue: 50,
    minOrderValue: 499,
    description: 'Flat ₹50 off on orders above ₹499',
    expiryDate: '2026-12-31',
  },
  {
    code: 'FREEDEL',
    discountType: 'fixed',
    discountValue: 29, // Matches standard delivery charge
    minOrderValue: 199,
    description: 'Free delivery on orders above ₹199',
    expiryDate: '2026-12-31',
  },
];

export const MOCK_SHOPS: Shop[] = [];

export const MOCK_PRODUCTS: Product[] = [];

export const MOCK_REVIEWS: Review[] = [];
