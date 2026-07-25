export interface Shop {
  id: string;
  name: string;
  ownerId: string;
  image: string;
  logo?: string;
  logoUrl?: string;
  coverImage?: string;
  bannerUrl?: string;
  rating: number;
  reviewsCount: number;
  deliveryTime: number;
  distance: number;
  deliveryFee: number;
  productsCount: number;
  status: 'open' | 'closed';
  featured: boolean;
  address: string;
  gstNumber?: string;
  ownerName?: string;
  ownerPhone?: string;
  email?: string;
  openingTime?: string;
  closingTime?: string;
  description?: string;
  deliveryRadius?: number;
  categories: string[];
  holidayMode?: boolean;
  temporaryPauseOrders?: boolean;
  maxOrdersPerHour?: number;
  preparationTime?: number;
  lat?: number;
  lng?: number;
}

export class ShopEntity {
  static create(data: Partial<Shop>): Shop {
    if (!data.id) throw new Error('Shop Entity requires an ID');
    if (!data.ownerId) throw new Error('Shop Entity requires an ownerId');
    return {
      id: data.id,
      name: data.name || 'Store Name',
      ownerId: data.ownerId,
      image: data.image || '',
      logo: data.logo || '',
      logoUrl: data.logoUrl || '',
      coverImage: data.coverImage || '',
      bannerUrl: data.bannerUrl || '',
      rating: data.rating ?? 5.0,
      reviewsCount: data.reviewsCount ?? 0,
      deliveryTime: data.deliveryTime ?? 20,
      distance: data.distance ?? 1.0,
      deliveryFee: data.deliveryFee ?? 15,
      productsCount: data.productsCount ?? 0,
      status: data.status || 'open',
      featured: data.featured || false,
      address: data.address || '',
      gstNumber: data.gstNumber || '',
      ownerName: data.ownerName || '',
      ownerPhone: data.ownerPhone || '',
      email: data.email || '',
      openingTime: data.openingTime || '08:00',
      closingTime: data.closingTime || '22:00',
      description: data.description || '',
      deliveryRadius: data.deliveryRadius ?? 5,
      categories: data.categories || ['groceries'],
      holidayMode: data.holidayMode || false,
      temporaryPauseOrders: data.temporaryPauseOrders || false,
      maxOrdersPerHour: data.maxOrdersPerHour ?? 20,
      preparationTime: data.preparationTime ?? 15,
      lat: data.lat || 0,
      lng: data.lng || 0
    };
  }
}
