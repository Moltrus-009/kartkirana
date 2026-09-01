import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock3, Headphones, MessageSquare, PhoneCall, Plus, RotateCw, Send, WalletCards } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../hooks/useData';
import { supportService, SupportCategory, SupportTicket } from '../services/supportService';
import { Button } from '../components/ui/Button';

const callbackAcknowledgement = 'Sorry for the wait. We have received your callback request and will make sure a support team member contacts you within 24 hours.';

const ticketLabel = (category: SupportCategory) => category === 'refund' ? 'Refund review' : category === 'callback' ? 'Callback' : 'Help request';

export const SupportCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const orders = useOrders(user?.uid);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState(searchParams.get('ticket') || '');
  const requestedOrderId = searchParams.get('order') || '';
  const [showForm, setShowForm] = useState(Boolean(requestedOrderId));
  const [category, setCategory] = useState<SupportCategory>('general');
  const [orderId, setOrderId] = useState(requestedOrderId);
  const [subject, setSubject] = useState(requestedOrderId ? 'Help with my order' : '');
  const [message, setMessage] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedTicket = useMemo(() => tickets.find(ticket => ticket.id === selectedId) || null, [selectedId, tickets]);

  const refresh = useCallback(async (quiet = false) => {
    if (!user?.uid) return;
    if (!quiet) setLoading(true);
    try {
      const list = await supportService.getTickets();
      setTickets(list);
      setSelectedId(current => list.some(ticket => ticket.id === current) ? current : list[0]?.id || '');
    } catch (error: any) {
      if (!quiet) setNotice(error.message || 'Could not load support requests.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(true), 15000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages?.length]);

  const openRequest = (nextCategory: SupportCategory) => {
    setCategory(nextCategory);
    setOrderId('');
    setSubject(nextCategory === 'refund' ? 'Refund review request' : nextCategory === 'callback' ? 'Callback request' : '');
    setMessage(nextCategory === 'callback' ? 'Please arrange a support callback on my registered mobile number.' : '');
    setNotice('');
    setShowForm(true);
  };

  const createTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const result = await supportService.createTicket({ userName: user.name || 'Customer', orderId, subject, message, category });
      setNotice(result.acknowledgement || (category === 'callback' ? callbackAcknowledgement : 'Your support request was submitted.'));
      setShowForm(false);
      await refresh(true);
      setSelectedId(result.id);
      setSubject('');
      setMessage('');
      setOrderId('');
    } catch (error: any) {
      setNotice(error.message || 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !chatMessage.trim()) return;
    setSubmitting(true);
    try {
      await supportService.sendMessage(selectedTicket.id, chatMessage.trim());
      setChatMessage('');
      await refresh(true);
    } catch (error: any) {
      setNotice(error.message || 'Message could not be sent.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-flow-page w-full overflow-x-hidden pb-24 text-left">
      <div className="app-page-header sticky top-0 z-30 -mx-3 mb-4 flex items-center justify-between px-3 py-3.5">
        <div className="flex items-center gap-2.5">
          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="app-icon-button"><ArrowLeft className="h-5 w-5" /></button>
          <div><h1 className="text-lg font-black text-slate-900 dark:text-white">Help & Support</h1><p className="text-[10px] font-bold text-slate-400">Private support requests and replies</p></div>
        </div>
        <button onClick={() => void refresh()} aria-label="Refresh support requests" className="app-icon-button"><RotateCw className="h-4 w-4" /></button>
      </div>

      {notice && <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-[11px] font-bold leading-relaxed text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">{notice}</div>}

      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <button onClick={() => openRequest('general')} className="rounded-[20px] border border-blue-100 bg-white p-3 text-left shadow-sm dark:border-slate-700 dark:bg-slate-800"><MessageSquare className="h-5 w-5 text-[#0B74E8]" /><strong className="mt-3 block text-[11px] font-black text-slate-900 dark:text-white">Ask for help</strong></button>
        <button onClick={() => openRequest('refund')} className="rounded-[20px] border border-amber-100 bg-white p-3 text-left shadow-sm dark:border-slate-700 dark:bg-slate-800"><WalletCards className="h-5 w-5 text-amber-500" /><strong className="mt-3 block text-[11px] font-black text-slate-900 dark:text-white">Refund review</strong></button>
        <button onClick={() => openRequest('callback')} className="rounded-[20px] border border-emerald-100 bg-white p-3 text-left shadow-sm dark:border-slate-700 dark:bg-slate-800"><PhoneCall className="h-5 w-5 text-emerald-500" /><strong className="mt-3 block text-[11px] font-black text-slate-900 dark:text-white">Request call</strong><span className="mt-1 block text-[8px] font-bold text-slate-400">Within 24 hours</span></button>
      </div>

      {showForm && (
        <form onSubmit={createTicket} className="mb-5 space-y-3 rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between"><strong className="text-sm font-black text-slate-900 dark:text-white">New {ticketLabel(category)}</strong><button type="button" onClick={() => setShowForm(false)} className="text-[10px] font-black text-slate-400">Cancel</button></div>
          <select required={category === 'refund'} value={orderId} onChange={event => setOrderId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <option value="">{category === 'refund' ? 'Select the relevant order' : 'No specific order'}</option>
              {orders.map(order => <option key={order.id} value={order.id}>{order.id} — ₹{order.priceBreakdown?.grandTotal ?? ''}</option>)}
          </select>
          <input required maxLength={120} value={subject} onChange={event => setSubject(event.target.value)} placeholder="What do you need help with?" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          <textarea required maxLength={2000} rows={4} value={message} onChange={event => setMessage(event.target.value)} placeholder="Describe the issue clearly so our admin can help you." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          {category === 'refund' && <p className="text-[9px] font-bold leading-relaxed text-amber-600">A request starts an admin review. It does not automatically issue a refund.</p>}
          {category === 'callback' && <p className="text-[9px] font-bold leading-relaxed text-emerald-600">{callbackAcknowledgement}</p>}
          <Button type="submit" fullWidth isLoading={submitting}>Submit request</Button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1"><strong className="text-[10px] font-black uppercase tracking-wider text-slate-400">Your requests</strong><button onClick={() => openRequest('general')} className="text-[#0B74E8]"><Plus className="h-4 w-4" /></button></div>
          {loading ? <div className="h-24 rounded-2xl shimmer" /> : tickets.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-[10px] font-bold text-slate-400">No support requests yet.</div> : tickets.map(ticket => (
            <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={`w-full rounded-2xl border p-3 text-left ${selectedId === ticket.id ? 'border-[#0B74E8] bg-blue-50 dark:bg-blue-950/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}>
              <span className="flex items-center justify-between gap-2"><strong className="truncate text-[11px] font-black text-slate-900 dark:text-white">{ticket.subject}</strong><span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${ticket.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{ticket.status}</span></span>
              <span className="mt-1 block text-[9px] font-bold text-slate-400">{ticketLabel(ticket.category || 'general')} · {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}</span>
            </button>
          ))}
        </div>

        <div className="flex min-h-[380px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          {!selectedTicket ? <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><Headphones className="h-10 w-10 text-[#0B74E8]" /><strong className="mt-3 text-sm font-black text-slate-900 dark:text-white">Select or create a request</strong><p className="mt-1 text-[10px] font-semibold text-slate-400">Admin replies will appear in this private chat.</p></div> : <>
            <div className="border-b border-slate-100 p-4 dark:border-slate-700"><strong className="block text-sm font-black text-slate-900 dark:text-white">{selectedTicket.subject}</strong><span className="mt-1 flex items-center gap-1 text-[9px] font-bold text-slate-400"><Clock3 className="h-3 w-3" /> Ticket {selectedTicket.id}{selectedTicket.orderId ? ` · Order ${selectedTicket.orderId}` : ''}</span></div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4 dark:bg-slate-900/30">
              {(selectedTicket.messages?.length ? selectedTicket.messages : [{ id: 'legacy', senderId: selectedTicket.userId, senderRole: 'customer' as const, senderName: selectedTicket.userName, text: selectedTicket.message, createdAt: selectedTicket.createdAt }]).map(item => (
                <div key={item.id} className={`max-w-[88%] rounded-2xl p-3 text-[11px] font-semibold leading-relaxed ${item.senderRole === 'customer' ? 'ml-auto rounded-br-sm bg-[#0B74E8] text-white' : item.senderRole === 'system' ? 'mx-auto border border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200' : 'mr-auto rounded-bl-sm border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>
                  {item.senderRole !== 'customer' && <strong className="mb-1 block text-[9px] font-black uppercase">{item.senderName}</strong>}{item.text}<span className="mt-1 block text-[8px] opacity-60">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {selectedTicket.status !== 'CLOSED' ? <div className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-700"><input maxLength={2000} value={chatMessage} onChange={event => setChatMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void sendMessage(); }} placeholder="Reply to support..." className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900 dark:text-white" /><button disabled={submitting || !chatMessage.trim()} onClick={() => void sendMessage()} className="rounded-xl bg-[#0B74E8] p-3 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div> : <div className="border-t border-slate-100 p-3 text-center text-[10px] font-bold text-slate-400 dark:border-slate-700">This ticket is closed. Create a new request if you need more help.</div>}
          </>}
        </div>
      </div>
    </div>
  );
};
