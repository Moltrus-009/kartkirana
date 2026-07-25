import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useAdmin } from '../context/AdminContext';
import { 
  Send
} from 'lucide-react';

interface Complaint {
  id: string;
  userId: string;
  userName: string;
  userType: 'customer' | 'owner' | 'rider';
  orderId?: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string | null;
  reply?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Complaints() {
  const { adminUser } = useAdmin();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Complaint | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'OPEN' | 'RESOLVED'>('OPEN');
  // Form resolution fields
  const [replyMsg, setReplyMsg] = useState('');
  const [statusVal, setStatusVal] = useState<'OPEN' | 'RESOLVED' | 'CLOSED'>('RESOLVED');

  async function loadComplaints() {
    try {
      const data = await adminService.getComplaints();
      setComplaints(data);
    } catch (err) {
      console.error('Failed loading complaints:', err);
    }
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMsg.trim()) return;
    try {
      await adminService.updateComplaint(selectedTicket.id, {
        status: statusVal,
        reply: replyMsg.trim(),
        assignedTo: adminUser?.uid || 'admin'
      });
      setSelectedTicket(null);
      setReplyMsg('');
      loadComplaints();
      alert('Helpdesk ticket status updated successfully.');
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const filteredTickets = complaints.filter(c => 
    statusFilter === 'all' ? true : c.status === statusFilter
  );

  return (
    <div className="space-y-6 text-left select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          💬 Helpdesk Complaints Support
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
          Resolve client tickets, assign support staff, & record solutions
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-1.5 rounded-[20px] text-[10px] font-black uppercase tracking-wider w-full md:w-max">
        {(['all', 'OPEN', 'RESOLVED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setStatusFilter(tab); setSelectedTicket(null); }}
            className={`px-6 py-2.5 rounded-xl transition cursor-pointer text-center relative ${
              statusFilter === tab 
                ? 'bg-slate-100 dark:bg-slate-850 text-emerald-500' 
                : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main content grid split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Tickets queue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-5 shadow-xs h-[500px] overflow-y-auto space-y-3.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block pl-1">
            Active Tickets ({filteredTickets.length})
          </span>

          {filteredTickets.map(ticket => {
            const isSelected = selectedTicket?.id === ticket.id;
            return (
              <div 
                key={ticket.id}
                onClick={() => { setSelectedTicket(ticket); setReplyMsg(ticket.reply || ''); setStatusVal(ticket.status); }}
                className={`p-4 rounded-2xl border transition cursor-pointer text-xs space-y-2 text-left
                  ${isSelected 
                    ? 'bg-emerald-50/20 border-emerald-500/30 dark:bg-emerald-500/5' 
                    : 'bg-slate-50/40 dark:bg-slate-850/20 border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                  }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    {ticket.subject}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                    ticket.status === 'OPEN' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 font-bold flex justify-between">
                  <span>{ticket.userName} ({ticket.userType})</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
          {filteredTickets.length === 0 && (
            <div className="text-center py-20 text-slate-405 font-bold italic">
              No tickets found in this queue.
            </div>
          )}
        </div>

        {/* Right: Ticket detail and resolution tools */}
        <div className="lg:col-span-2">
          {!selectedTicket ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-12 text-center text-slate-400 font-semibold text-xs h-full flex items-center justify-center">
              Select a helpdesk ticket from the left panel to review complaint details and issue responses.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-6 text-xs text-left h-full flex flex-col justify-between">
              
              {/* Header Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-start pb-3.5 border-b border-slate-50 dark:border-slate-800/40">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Subject: {selectedTicket.subject}</h3>
                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Submitted: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-500/5 px-2.5 py-1 rounded-xl">
                    {selectedTicket.userType}
                  </span>
                </div>

                {/* Complaint Info */}
                <div className="space-y-3.5 leading-relaxed">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Client User Details</span>
                    <h4 className="font-extrabold text-slate-850 dark:text-zinc-200">{selectedTicket.userName} (ID: {selectedTicket.userId})</h4>
                  </div>

                  {selectedTicket.orderId && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Linked Order ID</span>
                      <h4 className="font-mono font-bold text-slate-800 dark:text-zinc-300">{selectedTicket.orderId}</h4>
                    </div>
                  )}

                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Support ticket Message</span>
                    <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-150/40 dark:border-slate-800/40 rounded-2xl text-slate-700 dark:text-zinc-300 font-semibold leading-relaxed">
                      {selectedTicket.message}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolution Input */}
              <form onSubmit={handleResolve} className="pt-4 border-t border-slate-50 dark:border-slate-800/40 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Modify status</label>
                    <select
                      value={statusVal}
                      onChange={(e) => setStatusVal(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 font-bold outline-none cursor-pointer"
                    >
                      <option value="OPEN">Keep OPEN</option>
                      <option value="RESOLVED">Set RESOLVED</option>
                      <option value="CLOSED">Set CLOSED</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Resolution Response Message *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide details about the issue resolution steps..."
                    value={replyMsg}
                    onChange={(e) => setReplyMsg(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold outline-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="h-4 w-4" /> Save Ticket Resolution
                </button>
              </form>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
