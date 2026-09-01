import { useAdmin, type OrderDoc, type RiderDoc } from '../context/AdminContext';
import { useState } from 'react';
import { adminService } from '../services/adminService';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  Truck, 
  User, 
  Store, 
  Trash2, 
  RotateCcw, 
  MessageSquare, 
  ChevronRight, 
  UserPlus, 
  DollarSign
} from 'lucide-react';

export default function Operations() {
  const { orders, riders, shops } = useAdmin();
  const [selectedOrder, setSelectedOrder] = useState<OrderDoc | null>(null);
  
  // Modals / Picker triggers
  const [showRiderPicker, setShowRiderPicker] = useState(false);
  const [showShopPicker, setShowShopPicker] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatUser, setChatUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  // Columns layout definitions
  const COLUMNS = [
    { title: 'Pending', statuses: ['confirmed', 'PLACED', 'upcoming'] },
    { title: 'Accepted', statuses: ['accepted'] },
    { title: 'Preparing', statuses: ['preparing', 'SHOP_ACCEPTED'] },
    { title: 'Ready', statuses: ['ready_for_pickup', 'packed'] },
    { title: 'Assigned', statuses: ['rider_assigned', 'SEARCHING_RIDER', 'RIDER_ASSIGNED'] },
    { title: 'Picked Up', statuses: ['rider_picked_up', 'ARRIVED_AT_SHOP', 'PICKED_UP'] },
    { title: 'On Route', statuses: ['out_for_delivery', 'OUT_FOR_DELIVERY'] },
    { title: 'Delivered', statuses: ['delivered', 'COMPLETED'] },
    { title: 'Cancelled', statuses: ['cancelled', 'SHOP_REJECTED', 'returned'] }
  ];

  // Group orders into columns
  const getOrdersInColumn = (statuses: string[]) => {
    return orders.filter(o => statuses.includes(o.status));
  };

  // Dispatch Actions
  const handleAssignRider = async (rider: RiderDoc) => {
    if (!selectedOrder) return;
    try {
      const orderRef = doc(db!, 'orders', selectedOrder.id);
      const updates = {
        status: 'rider_assigned',
        rider: {
          uid: rider.uid,
          name: rider.name,
          phone: rider.phone,
          coords: rider.coords || { lat: 28.5835, lng: 77.3142 },
          progress: 0
        }
      };
      await updateDoc(orderRef, updates);
      
      // Update rider status in riders collection
      await updateDoc(doc(db!, 'riders', rider.uid), { status: 'busy' });
      
      setShowRiderPicker(false);
      setSelectedOrder(null);
      alert(`Rider ${rider.name} assigned successfully.`);
    } catch (e: any) {
      alert(`Failed to assign rider: ${e.message}`);
    }
  };

  const handleChangeShop = async (shopId: string, shopName: string) => {
    if (!selectedOrder) return;
    try {
      await updateDoc(doc(db!, 'orders', selectedOrder.id), {
        shopId,
        shopName
      });
      setShowShopPicker(false);
      setSelectedOrder(null);
      alert('Shop assignment updated.');
    } catch (e: any) {
      alert(`Failed changing shop: ${e.message}`);
    }
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !refundAmount) return;
    try {
      const amt = parseFloat(refundAmount);
      await adminService.refundOrder(selectedOrder.id, amt, refundReason || 'Requested by Administrator');
      setShowRefundModal(false);
      setSelectedOrder(null);
      setRefundAmount('');
      setRefundReason('');
      alert(`Refund of ₹${amt} processed successfully via gateway.`);
    } catch (err: any) {
      alert(`Refund process error: ${err.message}`);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const reason = window.prompt('Enter the cancellation reason. Inventory will be released safely:');
    if (!reason?.trim()) return;
    try {
      await adminService.cancelOrder(orderId, reason.trim());
      setSelectedOrder(null);
      alert('Order cancelled safely and inventory reservations were released.');
    } catch (e: any) {
      alert(`Cancel error: ${e.message}`);
    }
  };

  const handleResendNotification = async (order: OrderDoc) => {
    try {
      await adminService.sendNotification({
        target: 'everyone',
        title: `Order Alert: ${order.id.slice(-6).toUpperCase()}`,
        body: `Order status currently flagged: ${order.status.replace(/_/g, ' ').toUpperCase()}`
      });
      alert('Order status reminder notification enqueued.');
    } catch (err: any) {
      alert(`Failed sending warning notification: ${err.message}`);
    }
  };

  const handleOpenChat = async (userId: string, name: string, role: string) => {
    setChatUser({ id: userId, name, role });
    setShowChatModal(true);
    setChatMessage('');
    try {
      const history = await adminService.getInternalChats(userId);
      setChatHistory(history);
    } catch (err) {
      setChatHistory([]);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatUser || !chatMessage.trim()) return;
    try {
      const payload = {
        senderId: 'admin_panel',
        senderRole: 'admin',
        receiverId: chatUser.id,
        receiverRole: chatUser.role,
        message: chatMessage
      };
      await adminService.sendChatMessage(payload);
      setChatHistory(prev => [...prev, { ...payload, timestamp: new Date().toISOString() }]);
      setChatMessage('');
    } catch (err) {
      alert('Failed to dispatch message.');
    }
  };

  return (
    <div className="space-y-6 text-left select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          ⚡ Dispatch Control Tower
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
          Realtime Operations Board & Actionable Columns
        </p>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[600px] h-[calc(100vh-200px)]">
        {COLUMNS.map((col) => {
          const colOrders = getOrdersInColumn(col.statuses);
          return (
            <div 
              key={col.title} 
              className="bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 rounded-[28px] w-80 shrink-0 flex flex-col max-h-full"
            >
              {/* Column Header */}
              <div className="p-4 flex justify-between items-center border-b border-slate-200/20">
                <span className="font-black text-xs text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                  {col.title}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-black text-slate-650 dark:text-zinc-400">
                  {colOrders.length}
                </span>
              </div>

              {/* Column Orders list */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {colOrders.map((order) => (
                  <div 
                    key={order.id}
                    className="p-4 bg-white dark:bg-slate-850 border border-slate-150/40 dark:border-slate-800/40 rounded-2xl shadow-xs space-y-3.5 text-xs text-left"
                  >
                    {/* ID Header */}
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        ORD: {order.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="font-black text-slate-700 dark:text-zinc-300">
                        ₹{order.total}
                      </span>
                    </div>

                    {/* Stores & Client info */}
                    <div className="space-y-1 text-slate-500 dark:text-zinc-400 font-semibold leading-relaxed">
                      <div className="flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{order.shopName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{order.contact.name}</span>
                      </div>
                      {order.rider && (
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <Truck className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate font-black">{order.rider.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Operational Commands toolbar */}
                    <div className="pt-3 border-t border-slate-50 dark:border-slate-800/40 flex justify-between gap-1">
                      
                      {/* Left: Chat Support */}
                      <button
                        onClick={() => handleOpenChat(order.userId, order.contact.name, 'customer')}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-xl transition cursor-pointer"
                        title="Chat with Customer"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>

                      {order.rider?.uid && (
                        <button
                          onClick={() => handleOpenChat(order.rider!.uid!, order.rider!.name, 'rider')}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-xl transition cursor-pointer"
                          title="Chat with Rider"
                        >
                          <Truck className="h-4 w-4" />
                        </button>
                      )}

                      {/* Right side operational buttons */}
                      <div className="flex items-center gap-1 ml-auto">
                        {!order.rider && (
                          <button
                            onClick={() => { setSelectedOrder(order); setShowRiderPicker(true); }}
                            className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition cursor-pointer flex items-center justify-center"
                            title="Assign Courier Partner"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => { setSelectedOrder(order); setShowShopPicker(true); }}
                          className="p-2 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-xl transition cursor-pointer"
                          title="Change Shop Assignment"
                        >
                          <Store className="h-4 w-4" />
                        </button>

                        {order.paymentStatus === 'completed' && (
                          <button
                            onClick={() => { setSelectedOrder(order); setShowRefundModal(true); }}
                            className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-450 hover:bg-amber-500 hover:text-slate-950 rounded-xl transition cursor-pointer"
                            title="Trigger Refund"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleResendNotification(order)}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-xl transition cursor-pointer"
                          title="Resend status alert"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>

                        {!['delivered', 'cancelled', 'COMPLETED'].includes(order.status) && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition cursor-pointer"
                            title="Cancel Order"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* RIDER PICKER MODAL */}
      {showRiderPicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[32px] max-w-md w-full p-6 space-y-6 text-slate-800 dark:text-white">
            <div>
              <h3 className="text-base font-black">Assign Courier Partner</h3>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
                Assign rider manually to order dispatch task
              </p>
            </div>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {riders.filter(r => r.status === 'online' || r.status === 'idle').map(rider => (
                <div 
                  key={rider.uid} 
                  onClick={() => handleAssignRider(rider)}
                  className="p-3.5 bg-slate-50 dark:bg-slate-850 hover:bg-emerald-500/10 border border-slate-150/40 dark:border-slate-800/40 rounded-2xl flex justify-between items-center cursor-pointer transition text-xs"
                >
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white">{rider.name}</h4>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Vehicle: {rider.vehicle} • Deliveries today: {rider.todayDeliveries || 0}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              ))}
              {riders.filter(r => r.status === 'online' || r.status === 'idle').length === 0 && (
                <div className="text-center py-6 text-slate-400 font-semibold text-xs italic">
                  No active or idle riders online.
                </div>
              )}
            </div>
            <div className="pt-2">
              <button 
                onClick={() => setShowRiderPicker(false)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOP PICKER MODAL */}
      {showShopPicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[32px] max-w-md w-full p-6 space-y-6 text-slate-800 dark:text-white">
            <div>
              <h3 className="text-base font-black">Change Shop Assignment</h3>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
                Route order checkout destination to another merchant
              </p>
            </div>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {shops.map(shop => (
                <div 
                  key={shop.id} 
                  onClick={() => handleChangeShop(shop.id, shop.name)}
                  className="p-3.5 bg-slate-50 dark:bg-slate-850 hover:bg-indigo-500/10 border border-slate-150/40 dark:border-slate-800/40 rounded-2xl flex justify-between items-center cursor-pointer transition text-xs"
                >
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white">{shop.name}</h4>
                    <span className="text-[9px] text-slate-450 block mt-0.5">Address: {shop.address}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              ))}
            </div>
            <div className="pt-2">
              <button 
                onClick={() => setShowShopPicker(false)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl cursor-pointer text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[32px] max-w-sm w-full p-6 space-y-5 text-slate-850 dark:text-white text-xs">
            <div>
              <h3 className="text-base font-black">Issue Razorpay Refund</h3>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
                Processed directly via payments gateway
              </p>
            </div>
            <form onSubmit={handleRefund} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder={`Max ₹${selectedOrder?.total || ''}`}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 font-bold outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Missing Item, Store Closed"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 font-bold outline-none"
                />
              </div>
              <div className="pt-2 flex gap-3.5">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider cursor-pointer"
                >
                  Refund Payment
                </button>
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHAT SUPPORT SYSTEM OVERLAY MODAL */}
      {showChatModal && chatUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[32px] max-w-md w-full p-5 space-y-4 flex flex-col h-[480px]">
            <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/40 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">Chat with {chatUser.name}</h3>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mt-0.5">Role: {chatUser.role}</span>
              </div>
              <button 
                onClick={() => setShowChatModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chat Body messages logs */}
            <div className="flex-1 overflow-y-auto space-y-3.5 p-1 text-xs">
              {chatHistory.map((chat, idx) => {
                const isAdminMsg = chat.sender_id === 'admin_panel';
                return (
                  <div 
                    key={idx} 
                    className={`flex flex-col max-w-[80%] ${isAdminMsg ? 'ml-auto text-right' : 'mr-auto text-left'}`}
                  >
                    <span className="text-[8px] text-slate-400 font-semibold mb-0.5">
                      {isAdminMsg ? 'Platform Admin' : chatUser.name}
                    </span>
                    <div className={`p-3 rounded-2xl ${
                      isAdminMsg 
                        ? 'bg-emerald-500 text-white rounded-tr-none' 
                        : 'bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-zinc-200 rounded-tl-none border border-slate-100 dark:border-slate-800/40'
                    }`}>
                      {chat.message}
                    </div>
                  </div>
                );
              })}
              {chatHistory.length === 0 && (
                <div className="text-center py-20 text-slate-450 italic font-semibold">
                  No chat history found. Start communication below.
                </div>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendChat} className="border-t border-slate-50 dark:border-slate-800/40 pt-3 flex gap-2">
              <input
                type="text"
                required
                placeholder="Type message here..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
