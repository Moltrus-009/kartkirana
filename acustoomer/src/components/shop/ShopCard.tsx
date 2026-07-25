import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Clock } from 'lucide-react';
import { Shop } from '../../types';

interface ShopCardProps {
  shop: Shop;
}

export const ShopCard: React.FC<ShopCardProps> = ({ shop }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/shop/${shop.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative overflow-hidden bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col h-full ${!shop.isOpen ? 'opacity-75' : ''}`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-video w-full overflow-hidden">
        <img
          src={shop.coverImage}
          alt={shop.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Closed Overlay */}
        {!shop.isOpen && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-3.5 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-bold uppercase tracking-wider shadow">
              Closed
            </span>
          </div>
        )}

        {/* Distance Badge */}
        {shop.isOpen && (
          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-md">
            <MapPin className="h-3 w-3 text-blue-400" />
            {shop.distance}
          </span>
        )}

        {/* Offers Overlay */}
        {shop.offers && shop.offers.length > 0 && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-orange-500 text-white text-[10px] font-bold shadow-md shadow-orange-500/20 uppercase tracking-wide">
            {shop.offers[0]}
          </span>
        )}
      </div>

      {/* Card Info */}
      <div className="p-4 flex flex-col flex-1 text-left relative">
        {/* Shop Logo Floating */}
        <div className="absolute -top-6 right-4 h-12 w-12 rounded-full border border-gray-100 dark:border-slate-800 overflow-hidden shadow-md bg-white">
          <img src={shop.logo} alt={shop.name} className="h-full w-full object-cover" />
        </div>

        {/* Categories tags */}
        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
          {shop.categories.slice(0, 2).join(' • ')}
        </span>

        {/* Shop Name */}
        <h4 className="font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 pr-10 text-sm">
          {shop.name}
        </h4>

        {/* Rating and ETA */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1 text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>{shop.rating}</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span>{shop.deliveryTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
