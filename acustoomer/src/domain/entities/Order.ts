import { Order } from '../../types';
export class OrderEntity {
  static create(data: Partial<Order>): Order {
    if (!data.id) throw new Error('Order Entity requires an ID');
    if (!data.userId) throw new Error('Order Entity requires a userId');
    if (!data.shopId) throw new Error('Order Entity requires a shopId');
    return {
      id: data.id,
      userId: data.userId,
      shopId: data.shopId,
      shopName: data.shopName || '',
      items: data.items || [],
      status: data.status || 'PLACED',
      timeline: data.timeline || [],
      paymentMethod: data.paymentMethod || 'cod',
      priceBreakdown: data.priceBreakdown || { subtotal: 0, discount: 0, taxes: 0, deliveryCharge: 0, platformFee: 0, grandTotal: 0 },
      deliveryAddress: data.deliveryAddress!,
      estimatedDelivery: data.estimatedDelivery || '30 mins',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  }
}