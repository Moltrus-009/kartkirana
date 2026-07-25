import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useAdmin } from '../context/AdminContext';
import { 
  MessageSquare, 
  Send, 
  User, 
  Truck, 
  Store,
  ChevronRight
} from 'lucide-react';

interface ChatMessage {
  id: number;
  sender_id: string;
  sender_role: string;
  receiver_id: string;
  receiver_role: string;
  message: string;
  timestamp: string;
}

export default function InternalChat() {
  const { users, riders, shops } = useAdmin();
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'customer' | 'rider' | 'owner'>('customer');

  useEffect(() => {
    if (!selectedUser) return;

    async function loadChat() {
      try {
        const history = await adminService.getInternalChats(selectedUser!.id);
        setChatHistory(history);
      } catch (err) {
        console.warn('Failed loading chat history:', err);
      }
    }

    loadChat();
    const interval = setInterval(loadChat, 4000); // Poll support chat logs every 4 seconds
    return () => clearInterval(interval);
  }, [selectedUser]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !message.trim()) return;

    try {
      const payload = {
        senderId: 'admin_panel',
        senderRole: 'admin',
        receiverId: selectedUser.id,
        receiverRole: selectedUser.role,
        message: message.trim()
      };
      await adminService.sendChatMessage(payload);
      const localChatMsg: ChatMessage = {
        id: Date.now(),
        sender_id: 'admin_panel',
        sender_role: 'admin',
        receiver_id: selectedUser.id,
        receiver_role: selectedUser.role,
        message: message.trim(),
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, localChatMsg]);
      setMessage('');
    } catch (err) {
      alert('Failed to dispatch message.');
    }
  };

  // List of chatable partners based on active tab
  const getPartnersList = () => {
    if (activeTab === 'customer') {
      return users.filter(u => u.role === 'customer' || !u.role).map(u => ({ id: u.uid, name: u.name || u.fullName || 'Customer', role: 'customer' }));
    } else if (activeTab === 'rider') {
      return riders.map(r => ({ id: r.uid, name: r.name, role: 'rider' }));
    } else {
      return shops.map(s => ({ id: s.ownerId, name: s.name, role: 'owner' }));
    }
  };

  const partners = getPartnersList();

  return (
    <div className="space-y-6 text-left select-none h-[calc(100vh-140px)] flex flex-col justify-between">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4.5 rounded-[24px] shadow-xs">
        <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
          <MessageSquare className="h-5 w-5 text-emerald-500 animate-pulse" /> Support Dispatch Communication Center
        </h1>
        <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mt-0.5">
          Realtime internal support messenger targeting active users, shops, and couriers
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 min-h-[400px]">
        
        {/* Left Side: Partners list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-5 shadow-xs flex flex-col justify-between max-h-full overflow-hidden">
          
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            {/* Tab Selector */}
            <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-850 p-1 rounded-xl text-[9px] font-black uppercase tracking-wider">
              <button onClick={() => { setActiveTab('customer'); setSelectedUser(null); }} className={`py-2 rounded-lg cursor-pointer ${activeTab === 'customer' ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-sm' : 'text-slate-500'}`}>Clients</button>
              <button onClick={() => { setActiveTab('rider'); setSelectedUser(null); }} className={`py-2 rounded-lg cursor-pointer ${activeTab === 'rider' ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-sm' : 'text-slate-500'}`}>Riders</button>
              <button onClick={() => { setActiveTab('owner'); setSelectedUser(null); }} className={`py-2 rounded-lg cursor-pointer ${activeTab === 'owner' ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-sm' : 'text-slate-500'}`}>Stores</button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pt-2">
              {partners.map(p => {
                const isSelected = selectedUser?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => { setSelectedUser(p); setChatHistory([]); }}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex justify-between items-center text-xs
                      ${isSelected 
                        ? 'bg-emerald-50/20 border-emerald-500/20 dark:bg-emerald-500/5' 
                        : 'bg-slate-50/40 dark:bg-slate-850/20 border-slate-100 dark:border-slate-800/40 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {activeTab === 'customer' && <User className="h-4 w-4 text-slate-400" />}
                      {activeTab === 'rider' && <Truck className="h-4 w-4 text-orange-500" />}
                      {activeTab === 'owner' && <Store className="h-4 w-4 text-indigo-500" />}
                      <span className="font-extrabold text-slate-900 dark:text-white truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                );
              })}
              {partners.length === 0 && (
                <div className="text-center py-20 text-slate-400 font-semibold italic">
                  No partners online.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Chat box */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-5 shadow-xs flex flex-col justify-between max-h-full overflow-hidden">
          {!selectedUser ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-semibold italic">
              Select a communication target from the list to start messaging.
            </div>
          ) : (
            <div className="flex flex-col h-full justify-between overflow-hidden">
              {/* Header */}
              <div className="border-b border-slate-50 dark:border-slate-800/40 pb-3 flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white">Active session: {selectedUser.name}</h4>
                  <span className="text-[9px] text-slate-450 block uppercase font-extrabold tracking-widest mt-0.5">{selectedUser.role} channel</span>
                </div>
              </div>

              {/* Message Log */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
                {chatHistory.map((chat) => {
                  const isAdmin = chat.sender_id === 'admin_panel';
                  return (
                    <div key={chat.id} className={`flex flex-col max-w-[75%] ${isAdmin ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
                      <span className="text-[8px] text-slate-450 font-bold mb-0.5">
                        {isAdmin ? 'System Admin' : selectedUser.name}
                      </span>
                      <div className={`p-3 rounded-2xl leading-relaxed text-xs ${
                        isAdmin 
                          ? 'bg-emerald-500 text-white rounded-tr-none' 
                          : 'bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-zinc-200 rounded-tl-none'
                      }`}>
                        {chat.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSend} className="border-t border-slate-50 dark:border-slate-800/40 pt-3 flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Type message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
                />
                <button
                  type="submit"
                  className="p-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
