import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const SupportBot: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems } = useCart();
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const hidden = ['/splash', '/onboarding', '/login', '/support'].includes(location.pathname);
  if (hidden) return null;

  const raisedForCart = cartCount > 0 && !['/cart', '/checkout'].includes(location.pathname);
  return (
    <button
      type="button"
      aria-label="Open Help and Support"
      onClick={() => navigate('/support')}
      className={`fixed right-4 z-40 flex h-13 items-center gap-2 rounded-full border border-white/20 bg-gradient-to-br from-[#1E88E5] to-[#1565C0] px-4 text-white shadow-xl transition hover:scale-105 active:scale-95 ${raisedForCart ? 'bottom-[158px]' : 'bottom-24'}`}
    >
      <Headphones className="h-5 w-5" />
      <span className="text-[10px] font-black uppercase tracking-wider">Help</span>
    </button>
  );
};
