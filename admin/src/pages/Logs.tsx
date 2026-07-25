import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { 
  Search, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';

interface AuditLog {
  id: number;
  operator_id: string;
  operator_phone?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  ip_address?: string;
  device?: string;
  browser?: string;
  timestamp: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await adminService.getAuditLogs();
        setLogs(data);
      } catch (err) {
        console.error('Failed loading audit registry:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) || 
    l.operator_id.includes(search) || 
    l.entity_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          📜 Platform Audit Logs
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
          Immutable SQLite records, state change diffs, & operator traces
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4.5 rounded-[24px] shadow-xs flex gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs by action or operator UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none font-bold"
          />
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse text-xs">
          Loading audit trails...
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 font-black text-[9px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/40">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action Event</th>
                  <th className="px-6 py-4">Operator UID</th>
                  <th className="px-6 py-4">Target Entity</th>
                  <th className="px-6 py-4">Reason / Notes</th>
                  <th className="px-6 py-4 text-center">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <>
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                        <td className="px-6 py-4 text-slate-500 font-bold whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-slate-950 dark:text-white uppercase font-mono text-[10px] tracking-wider bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-200/40 dark:border-slate-800/40">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-[10px]">
                          {log.operator_id}
                        </td>
                        <td className="px-6 py-4 capitalize font-bold text-slate-800 dark:text-zinc-200">
                          {log.entity_type} ({log.entity_id || '—'})
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                          {log.reason || 'No details specified.'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-emerald-500 rounded-lg cursor-pointer transition"
                            title="Toggle state change diffs"
                          >
                            {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded state mapping */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/50 dark:bg-slate-950/40 px-8 py-5 text-left border-t border-b border-slate-100 dark:border-slate-850">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] font-mono leading-relaxed">
                              
                              {/* Left: Old JSON */}
                              <div className="space-y-1.5">
                                <span className="font-black text-red-500 uppercase tracking-widest text-[9px] block">OLD VALUE STATE [-]</span>
                                <pre className="p-3 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-850 rounded-xl overflow-x-auto text-slate-650 dark:text-zinc-400">
                                  {log.old_value ? JSON.stringify(JSON.parse(log.old_value), null, 2) : 'NULL'}
                                </pre>
                              </div>

                              {/* Right: New JSON */}
                              <div className="space-y-1.5">
                                <span className="font-black text-emerald-500 uppercase tracking-widest text-[9px] block">NEW VALUE STATE [+]</span>
                                <pre className="p-3 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-850 rounded-xl overflow-x-auto text-slate-650 dark:text-zinc-400">
                                  {log.new_value ? JSON.stringify(JSON.parse(log.new_value), null, 2) : 'NULL'}
                                </pre>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold italic">
                      No logs matching query parameter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
