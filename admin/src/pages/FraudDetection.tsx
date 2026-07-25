import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { 
  AlertOctagon, 
  Check
} from 'lucide-react';

interface FraudEvent {
  id: number;
  user_id?: string;
  rider_id?: string;
  shop_id?: string;
  order_id?: string;
  event_type: string;
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  timestamp: string;
}

export default function FraudDetection() {
  const [events, setEvents] = useState<FraudEvent[]>([]);

  async function loadEvents() {
    try {
      const data = await adminService.getFraudEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed loading fraud database:', err);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const handleResolve = async (id: number) => {
    try {
      // Mock local update or call resolved
      setEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'RESOLVED' } : e));
      alert(`Fraud event #${id} marked as RESOLVED.`);
    } catch (e: any) {
      alert(`Update failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          🛡️ Fraud & Risk Auditor
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
          Flagged spoofing accounts, device clones, & refund abuse logs
        </p>
      </div>

      {/* Grid of Fraud events list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 font-black text-[9px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/40">
                <th className="px-6 py-4">Trigger Date</th>
                <th className="px-6 py-4">Anomaly Details</th>
                <th className="px-6 py-4">Linked Entity ID</th>
                <th className="px-6 py-4">Risk Severity</th>
                <th className="px-6 py-4">State Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {events.map((event) => {
                const isResolved = event.status === 'RESOLVED';
                const severityColors = {
                  HIGH: 'bg-red-500/10 text-red-500',
                  MEDIUM: 'bg-amber-500/10 text-amber-500',
                  LOW: 'bg-indigo-500/10 text-indigo-500'
                };

                return (
                  <tr key={event.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-bold whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      <div className="flex gap-2">
                        <AlertOctagon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-extrabold text-slate-950 dark:text-white uppercase text-[10px] tracking-wider font-mono">
                            {event.event_type}
                          </h4>
                          <p className="text-[10px] text-slate-450 mt-1 font-semibold leading-relaxed">
                            {event.details}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1 select-all font-mono font-black text-[10px]">
                      {event.user_id && <div>USR: {event.user_id}</div>}
                      {event.rider_id && <div>RDR: {event.rider_id}</div>}
                      {event.order_id && <div>ORD: {event.order_id}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase ${severityColors[event.severity]}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                        isResolved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!isResolved && (
                        <button
                          onClick={() => handleResolve(event.id)}
                          className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-slate-950 rounded-xl transition cursor-pointer"
                          title="Mark Event Resolved"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold italic">
                    No risk incidents enqueued. Security scanner clean.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
