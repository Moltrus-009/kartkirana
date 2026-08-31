import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ShoppingBag, Map, FileText, HelpCircle, RefreshCw, ChevronDown, ChevronUp, Package, Truck, Smile, X, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { dbService } from '../services/dbService';
import { Order, OrderStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { useOrders } from '../hooks/useData';
import { useAppStore } from '../core/store/useAppStore';
import { IS_MOCK_MODE } from '../infrastructure/firebase/firebase';

export const Orders: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const orders = useOrders(user?.uid);
  const loading = useAppStore(state => state.loading.orders ?? true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');

  const currentOrders = orders.filter(o => 
    ['upcoming', 'confirmed', 'accepted', 'preparing', 'packed', 'ready_for_pickup', 'rider_assigned', 'rider_picked_up', 'out_for_delivery', 'PLACED', 'ORDER_PLACED', 'SHOP_ACCEPTED', 'SEARCHING_RIDER', 'RIDER_ASSIGNED', 'ARRIVED_AT_SHOP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DRAFT', 'PAYMENT_PENDING'].includes(o.status)
  );
  
  const pastOrders = orders.filter(o => 
    ['delivered', 'cancelled', 'DELIVERED', 'COMPLETED', 'SHOP_REJECTED', 'CANCELLED'].includes(o.status)
  );

  const getStatusStyles = (status: OrderStatus) => {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
      case 'delivered' as any:
        return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20';
      case 'SHOP_REJECTED':
      case 'cancelled' as any:
      case 'CANCELLED' as any:
        return 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/20';
      case 'OUT_FOR_DELIVERY':
      case 'PICKED_UP':
      case 'out_for_delivery' as any:
      case 'rider_picked_up' as any:
        return 'bg-blue-50 dark:bg-green-950/20 text-[#1565C0] dark:text-[#1E88E5] border-blue-100 dark:border-blue-900/20';
      case 'SHOP_ACCEPTED':
      case 'SEARCHING_RIDER':
      case 'RIDER_ASSIGNED':
      case 'ARRIVED_AT_SHOP':
      case 'accepted' as any:
      case 'preparing' as any:
      case 'packed' as any:
      case 'ready_for_pickup' as any:
      case 'rider_assigned' as any:
        return 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/20';
      case 'PLACED':
      case 'ORDER_PLACED':
      case 'upcoming':
      case 'confirmed' as any:
      default:
        return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/20';
    }
  };

  // Invoice / Support modals
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Check if navigate passed a newly placed order ID to expand immediately
  const state = location.state as { placedOrderId?: string };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (state?.placedOrderId) {
      setExpandedOrderId(state.placedOrderId);
    } else if (orders.length > 0 && expandedOrderId === null) {
      setExpandedOrderId(orders[0].id);
    }
  }, [user, navigate, state, orders, expandedOrderId]);

  const handleReorder = (order: Order) => {
    order.items.forEach(item => {
      const product = item.product || {
        id: (item as any).productId || (item as any).id,
        name: (item as any).name || 'Unknown Item',
        price: (item as any).price || 0,
        shopId: order.shopId,
        shopName: order.shopName
      };
      addToCart(product as any, item.quantity);
    });
    navigate('/cart');
  };

  const handleCancelOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this preorder booking?')) {
      try {
        await dbService.cancelOrder(orderId);
      } catch (err) {
        console.error(err);
        alert('Failed to cancel order booking.');
      }
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'upcoming': return <Clock className="h-4.5 w-4.5 text-blue-500 animate-pulse" />;
      case 'PLACED':
      case 'ORDER_PLACED':
      case 'confirmed' as any: return <Clock className="h-4.5 w-4.5 text-blue-500 animate-pulse" />;
      case 'SHOP_ACCEPTED':
      case 'accepted' as any: return <Clock className="h-4.5 w-4.5 text-blue-500 animate-pulse" />;
      case 'SEARCHING_RIDER':
      case 'preparing' as any: return <Package className="h-4.5 w-4.5 text-amber-500 animate-pulse" />;
      case 'packed' as any: return <Package className="h-4.5 w-4.5 text-orange-500" />;
      case 'ready_for_pickup' as any: return <Package className="h-4.5 w-4.5 text-orange-500" />;
      case 'RIDER_ASSIGNED':
      case 'ARRIVED_AT_SHOP':
      case 'rider_assigned' as any: return <Truck className="h-4.5 w-4.5 text-amber-500 animate-pulse" />;
      case 'PICKED_UP':
      case 'rider_picked_up' as any: return <Truck className="h-4.5 w-4.5 text-[#1565C0] dark:text-[#1E88E5] animate-pulse" />;
      case 'OUT_FOR_DELIVERY':
      case 'out_for_delivery' as any: return <Truck className="h-4.5 w-4.5 text-[#1565C0] dark:text-[#1E88E5] animate-bounce" />;
      case 'DELIVERED':
      case 'COMPLETED':
      case 'delivered' as any: return <Smile className="h-4.5 w-4.5 text-[#1565C0]" />;
      case 'SHOP_REJECTED':
      case 'cancelled' as any:
      case 'CANCELLED' as any: return <X className="h-4.5 w-4.5 text-red-500" />;
      default: return <Clock className="h-4.5 w-4.5 text-gray-500" />;
    }
  };

  const formatStatus = (status: OrderStatus) => {
    return status.toUpperCase().replace(/_/g, ' ');
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 pb-24 text-left space-y-4">
      
      {/* Title Header */}
      <div className="sticky top-0 z-35 bg-[#F8FAFC]/90 dark:bg-[#0F172A]/90 backdrop-blur-md py-3.5 flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#334155] mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 rounded-xl hover:bg-gray-150 dark:hover:bg-[#1E293B] text-gray-500 dark:text-gray-400 cursor-pointer border border-[#E2E8F0] dark:border-[#334155] shadow-sm bg-white dark:bg-[#1E293B]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider">
              My Orders
            </h2>
            {IS_MOCK_MODE ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-[8px] font-black uppercase tracking-wider">
                Offline Cache
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#1565C0] dark:text-[#1E88E5] text-[8px] font-black uppercase tracking-wider">
                Live Cloud
              </span>
            )}
          </div>
        </div>
        
        {/* Manual Refresh button */}
        <button
          onClick={async () => {
            if (user?.uid) {
              useAppStore.getState().subscribeOrders(user.uid);
            }
          }}
          className="p-2.5 rounded-xl hover:bg-gray-150 dark:hover:bg-[#1E293B] text-gray-500 dark:text-[#94A3B8] cursor-pointer border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm active:scale-95 transition-all"
          title="Refresh Orders List"
        >
          <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Active vs Past Tabs */}
      <div className="flex gap-2 p-1 bg-[#E2E8F0]/50 dark:bg-[#334155]/20 rounded-2xl mb-5 border border-[#E2E8F0] dark:border-[#334155]">
        <button
          onClick={() => {
            setActiveTab('current');
            if (currentOrders.length > 0) setExpandedOrderId(currentOrders[0].id);
          }}
          className={`flex-1 py-3 text-xs font-black rounded-xl uppercase tracking-wider transition-all duration-300 cursor-pointer
            ${activeTab === 'current'
              ? 'bg-gradient-to-r from-[#1E88E5] to-[#1565C0] text-white shadow-md'
              : 'text-gray-500 dark:text-[#94A3B8] hover:text-[#1565C0]'
            }`}
        >
          Active ({currentOrders.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('past');
            if (pastOrders.length > 0) setExpandedOrderId(pastOrders[0].id);
          }}
          className={`flex-1 py-3 text-xs font-black rounded-xl uppercase tracking-wider transition-all duration-300 cursor-pointer
            ${activeTab === 'past'
              ? 'bg-gradient-to-r from-[#1E88E5] to-[#1565C0] text-white shadow-md'
              : 'text-gray-500 dark:text-[#94A3B8] hover:text-[#1565C0]'
            }`}
        >
          Past Orders ({pastOrders.length})
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          <div className="w-full h-32 shimmer rounded-[20px]" />
          <div className="w-full h-32 shimmer rounded-[20px]" />
        </div>
      ) : (activeTab === 'current' ? currentOrders : pastOrders).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
          <ShoppingBag className="h-16 w-16 text-gray-300 dark:text-[#64748B] mb-4" />
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-350">
            {activeTab === 'current' ? 'No active orders' : 'No past orders found'}
          </h3>
          <p className="text-xs mt-1">
            {activeTab === 'current' ? 'Get everything delivered in minutes by shopping now.' : 'Your completed or cancelled orders will appear here.'}
          </p>
          {activeTab === 'current' && (
            <Button variant="primary" className="mt-6 rounded-xl" onClick={() => navigate('/')}>
              Explore Products
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(activeTab === 'current' ? currentOrders : pastOrders).map(order => {
            const isExpanded = order.id === expandedOrderId;
            const canTrack = !['delivered', 'cancelled'].includes(order.status);
            
            return (
              <div
                key={order.id}
                className="rounded-[20px] bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] overflow-hidden shadow-[0_8px_24px_-20px_rgba(5,10,36,0.45)] transition-all"
              >
                {/* Header info */}
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#F8FAFC]/50 dark:hover:bg-[#1E293B]/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2.5 rounded-2xl bg-[#E2E8F0] dark:bg-[#334155] text-[#1565C0] dark:text-[#1E88E5] shrink-0 border border-[#90CAF9]/20">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black text-gray-800 dark:text-white truncate">
                        {order.shopName}
                      </h4>
                      <span className="text-[9px] font-semibold text-gray-400 dark:text-[#94A3B8] block mt-0.5 truncate">
                        ID: {order.id} • Total: ₹{order.priceBreakdown.grandTotal}
                        {order.preorderDate && (
                          <span className="text-purple-650 dark:text-purple-400 font-extrabold ml-1.5 uppercase">
                            • Scheduled: {order.preorderDate}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-wide ${getStatusStyles(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span>{formatStatus(order.status)}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4.5 w-4.5 text-gray-400" /> : <ChevronDown className="h-4.5 w-4.5 text-gray-400" />}
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="px-4 pb-4.5 pt-2.5 border-t border-[#E2E8F0] dark:border-[#334155] flex flex-col gap-4 text-xs font-semibold">
                    
                    {/* Delivery Address */}
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-2">Delivery Address</span>
                      <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#334155] flex items-start gap-2.5">
                        <MapPin className="h-4.5 w-4.5 text-[#1565C0] dark:text-[#1E88E5] mt-0.5 shrink-0 animate-bounce" />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-black text-gray-800 dark:text-white">{order.deliveryAddress.name}</span>
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-[#94A3B8] mt-1 leading-relaxed">
                            {order.deliveryAddress.details}, {order.deliveryAddress.area}, {order.deliveryAddress.city} - {order.deliveryAddress.pinCode}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Live Tracking map option */}
                    {canTrack && (
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/orders/track/${order.id}`)}
                        className="rounded-2xl py-3 text-xs font-black flex items-center justify-center gap-1 bg-[#E2E8F0] dark:bg-[#334155] hover:bg-[#DBEAFE] text-[#1565C0]"
                      >
                        <Map className="h-4.5 w-4.5" />
                        Track Delivery Partner Live on Map
                      </Button>
                    )}

                    {/* Timeline Tracker */}
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-3.5">Order Timeline</span>
                      <div className="flex flex-col gap-4 pl-2 relative border-l border-[#E2E8F0] dark:border-[#334155] ml-2">
                        {order.timeline.map((step, idx) => {
                          const isLatest = idx === order.timeline.length - 1;
                          return (
                            <div key={idx} className="relative pl-6 text-left">
                              {/* Bullet dot */}
                              <div 
                                className={`absolute -left-[14.5px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#1E293B] flex items-center justify-center
                                  ${isLatest 
                                    ? 'bg-[#1565C0] dark:bg-[#1E88E5] ring-4 ring-[#90CAF9]/30 scale-110' 
                                    : 'bg-gray-300 dark:bg-gray-600'
                                  }`} 
                              />
                              <div>
                                <span className={`font-black block text-xs leading-none ${isLatest ? 'text-[#1565C0] dark:text-[#1E88E5]' : 'text-gray-700 dark:text-[#94A3B8]'}`}>{step.title}</span>
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 block mt-1 leading-normal">{step.description}</span>
                                <span className="text-[9px] font-medium text-gray-400/70 block mt-0.5">
                                  {new Date(step.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Purchased Items List */}
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-2">Purchased Items</span>
                      <div className="flex flex-col gap-2 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B]/50 p-3.5 border border-[#E2E8F0] dark:border-[#334155]">
                        {order.items.map(item => {
                          const product = item.product || {
                            id: (item as any).productId || (item as any).id,
                            name: (item as any).name || 'Unknown Item',
                            price: (item as any).price || 0
                          };
                          return (
                            <div key={product.id} className="flex justify-between">
                              <span className="text-gray-700 dark:text-[#94A3B8] font-bold text-left">
                                {product.name} (x{item.quantity})
                              </span>
                              <span className="text-gray-950 dark:text-white font-extrabold">₹{product.price * item.quantity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bill Details */}
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-2">Bill Details</span>
                      <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#334155] flex flex-col gap-2 text-left text-[11px] font-bold text-gray-700 dark:text-[#94A3B8]">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Item Subtotal:</span>
                          <span>₹{order.priceBreakdown.subtotal}</span>
                        </div>
                        {order.priceBreakdown.discount > 0 && (
                          <div className="flex justify-between text-blue-600 dark:text-[#1E88E5]">
                            <span className="text-blue-600 dark:text-[#1E88E5]">Promo Discount:</span>
                            <span>-₹{order.priceBreakdown.discount}</span>
                          </div>
                        )}
                        {!!order.priceBreakdown?.taxes && order.priceBreakdown.taxes > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">GST & Taxes (5%):</span>
                            <span>₹{order.priceBreakdown.taxes}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">Delivery Partner Fee:</span>
                          <span>
                            {order.priceBreakdown.deliveryCharge === 0 ? (
                              <span className="text-blue-600 dark:text-[#1E88E5] uppercase text-[10px]">FREE</span>
                            ) : (
                              `₹${order.priceBreakdown.deliveryCharge}`
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Platform Handling Fee:</span>
                          <span>₹{order.priceBreakdown.platformFee}</span>
                        </div>
                        <div className="flex justify-between text-xs font-black text-gray-900 dark:text-white pt-2 border-t border-[#E2E8F0]/50 dark:border-[#334155]/50">
                          <span>Total Payable:</span>
                          <span className="text-[#1565C0] dark:text-[#1E88E5]">₹{order.priceBreakdown.grandTotal}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block mb-2">Payment Details</span>
                      <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#334155] flex flex-col gap-2 text-left text-[11px] font-bold text-gray-700 dark:text-[#94A3B8]">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Method:</span>
                          <span className="uppercase">{order.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`uppercase font-extrabold ${order.paymentStatus === 'completed' ? 'text-blue-600 dark:text-[#1E88E5]' : 'text-amber-600'}`}>
                            {order.paymentStatus || 'pending'}
                          </span>
                        </div>
                        {order.paymentGateway && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Gateway:</span>
                            <span className="uppercase">{order.paymentGateway}</span>
                          </div>
                        )}
                        {order.razorpayPaymentId && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Payment ID:</span>
                            <span className="select-all font-mono text-[10px]">{order.razorpayPaymentId}</span>
                          </div>
                        )}
                        {order.razorpayOrderId && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Order ID:</span>
                            <span className="select-all font-mono text-[10px]">{order.razorpayOrderId}</span>
                          </div>
                        )}
                        {order.paymentTimestamp ? (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Timestamp:</span>
                            <span>{new Date(order.paymentTimestamp).toLocaleString()}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Timestamp:</span>
                            <span>{new Date(order.createdAt).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Helper buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedInvoiceOrder(order)}
                        className="flex-1 rounded-xl py-2 text-xs font-bold border-[#E2E8F0] bg-white text-gray-700"
                      >
                        <FileText className="h-4 w-4 mr-1.5" />
                        Invoice
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsSupportOpen(true)}
                        className="flex-1 rounded-xl py-2 text-xs font-bold border-[#E2E8F0] bg-white text-gray-700"
                      >
                        <HelpCircle className="h-4 w-4 mr-1.5" />
                        Support
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => handleReorder(order)}
                        className="flex-1 rounded-xl py-2 text-xs font-bold bg-gradient-to-br from-[#1E88E5] to-[#1565C0]"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Reorder
                      </Button>
                    </div>

                    {/* Cancel preorder button if upcoming */}
                    {order.status === 'upcoming' && (
                      <div className="mt-1">
                        <Button
                          variant="danger"
                          onClick={() => handleCancelOrder(order.id)}
                          className="w-full rounded-2xl py-3.5 text-xs font-black"
                        >
                          Cancel Preorder Booking
                        </Button>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Modal sheet */}
      <Dialog isOpen={selectedInvoiceOrder !== null} onClose={() => setSelectedInvoiceOrder(null)} title="Order Invoice">
        {selectedInvoiceOrder && (
          <div className="flex flex-col gap-4 text-xs font-bold text-gray-605 dark:text-[#94A3B8] text-left">
            <div className="border-b border-[#E2E8F0] dark:border-[#334155] pb-3">
              <h4 className="text-base font-black text-gray-800 dark:text-white mb-1">{selectedInvoiceOrder.shopName}</h4>
              <p className="text-[10px] font-semibold text-gray-400">Order Ref: {selectedInvoiceOrder.id}</p>
              <p className="text-[10px] font-semibold text-gray-400">Date: {new Date(selectedInvoiceOrder.createdAt).toLocaleString()}</p>
            </div>
            
            <div className="flex flex-col gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-3">
              {selectedInvoiceOrder.items.map(item => (
                <div key={item.product.id} className="flex justify-between">
                  <span>{item.product.name} (x{item.quantity})</span>
                  <span className="text-gray-900 dark:text-white">₹{item.product.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{selectedInvoiceOrder.priceBreakdown.subtotal}</span>
              </div>
              {selectedInvoiceOrder.priceBreakdown.discount > 0 && (
                <div className="flex justify-between text-blue-600 dark:text-[#1E88E5]">
                  <span>Discount</span>
                  <span>-₹{selectedInvoiceOrder.priceBreakdown.discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span>₹{selectedInvoiceOrder.priceBreakdown.deliveryCharge}</span>
              </div>
              {selectedInvoiceOrder.priceBreakdown.taxes > 0 && (
                <div className="flex justify-between">
                  <span>GST & Taxes (5%)</span>
                  <span>₹{selectedInvoiceOrder.priceBreakdown.taxes}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span>₹{selectedInvoiceOrder.priceBreakdown.platformFee}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-2 border-t border-[#E2E8F0] dark:border-[#334155]">
                <span>Total Amount Paid</span>
                <span className="text-[#1565C0] dark:text-[#1E88E5] text-base">₹{selectedInvoiceOrder.priceBreakdown.grandTotal}</span>
              </div>
            </div>

            <Button variant="primary" fullWidth className="rounded-xl mt-4 py-3" onClick={() => window.print()}>
              Print / Save PDF
            </Button>
          </div>
        )}
      </Dialog>

      {/* Support Modal sheet */}
      <Dialog isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} title="Order Support Desk">
        <div className="flex flex-col gap-4 text-xs text-left">
          <p className="font-semibold text-gray-500 dark:text-[#94A3B8] leading-relaxed">
            Need help with your order? Our support desk is available 24/7. Call or chat with us regarding item missing, quality issues, or payment failures.
          </p>
          <div className="flex flex-col gap-2.5 mt-2">
            <div className="p-3 border border-[#E2E8F0] dark:border-[#334155] rounded-2xl flex items-center justify-between font-bold">
              <div>
                <span className="text-gray-800 dark:text-white block">Support Hotline</span>
                <span className="text-[10px] font-semibold text-gray-400 dark:text-[#94A3B8]">1800-419-3221 (Toll-Free)</span>
              </div>
              <a href="tel:18004193221" className="px-3.5 py-2 rounded-xl bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white font-black text-[10px] uppercase shadow-sm">
                Call Now
              </a>
            </div>
            
            <div className="p-3 border border-[#E2E8F0] dark:border-[#334155] rounded-2xl flex items-center justify-between font-bold">
              <div>
                <span className="text-gray-800 dark:text-white block">Instant Chat Help</span>
                <span className="text-[10px] font-semibold text-gray-400 dark:text-[#94A3B8]">Average response time: 30 secs</span>
              </div>
              <button onClick={() => alert('Support chat initialization...')} className="px-3.5 py-2 rounded-xl bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white font-black text-[10px] uppercase cursor-pointer shadow-sm">
                Start Chat
              </button>
            </div>
          </div>
        </div>
      </Dialog>

    </div>
  );
};
