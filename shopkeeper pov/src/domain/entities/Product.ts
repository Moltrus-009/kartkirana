export interface Product {
  id: string;
  shopId: string;
  shopName: string;
  name: string;
  image: string;
  images: string[];
  videoUrl?: string;
  price: number;
  mrp: number;
  discount: number;
  rating: number;
  reviewsCount: number;
  category: string;
  subcategory?: string;
  brand?: string;
  stock: number;
  description: string;
  specs: Record<string, string>;
  gstPercentage?: number;
  sku?: string;
  barcode?: string;
  weight?: string;
  unit?: string;
  minStockAlert?: number;
  maxOrderQuantity?: number;
  returnAllowed?: boolean;
  replacementAllowed?: boolean;
  tags: string[];
  featured: boolean;
  bestseller?: boolean;
  trending?: boolean;
  preorderAvailable?: boolean;
  estimatedPrepTime?: number;
  status: 'active' | 'disabled';
}

export class ProductEntity {
  static create(data: Partial<Product>): Product {
    if (!data.id) throw new Error('Product Entity requires an ID');
    if (!data.shopId) throw new Error('Product Entity requires a shopId');
    if (!data.name) throw new Error('Product Entity requires a name');
    return {
      id: data.id,
      shopId: data.shopId,
      shopName: data.shopName || '',
      name: data.name,
      image: data.image || '',
      images: data.images || [],
      videoUrl: data.videoUrl || '',
      price: data.price ?? 0,
      mrp: data.mrp ?? 0,
      discount: data.discount ?? 0,
      rating: data.rating ?? 5.0,
      reviewsCount: data.reviewsCount ?? 0,
      category: data.category || 'groceries',
      subcategory: data.subcategory || '',
      brand: data.brand || '',
      stock: data.stock ?? 0,
      description: data.description || '',
      specs: data.specs || {},
      gstPercentage: data.gstPercentage ?? 0,
      sku: data.sku || '',
      barcode: data.barcode || '',
      weight: data.weight || '',
      unit: data.unit || 'unit',
      minStockAlert: data.minStockAlert ?? 5,
      maxOrderQuantity: data.maxOrderQuantity ?? 10,
      returnAllowed: data.returnAllowed || false,
      replacementAllowed: data.replacementAllowed || false,
      tags: data.tags || [],
      featured: data.featured || false,
      bestseller: data.bestseller || false,
      trending: data.trending || false,
      preorderAvailable: data.preorderAvailable || false,
      estimatedPrepTime: data.estimatedPrepTime ?? 10,
      status: data.status || 'active'
    };
  }
}
