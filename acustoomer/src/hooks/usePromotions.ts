import { useEffect, useState } from 'react';
import { ShopPromotion } from '../types';
import { dbService } from '../services/dbService';

export const usePromotions = (shopId?: string, userId?: string) => {
  const [promotions, setPromotions] = useState<ShopPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    dbService.getShopPromotions(shopId, userId)
      .then(result => active && setPromotions(result))
      .catch(error => {
        console.error('Unable to load shop specials:', error);
        if (active) setPromotions([]);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [shopId, userId]);

  return { promotions, loading };
};
