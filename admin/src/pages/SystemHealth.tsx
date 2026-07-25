import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { 
  Cpu, 
  HardDrive, 
  Clock, 
  RefreshCw, 
  Database
} from 'lucide-react';

export default function SystemHealth() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDiagnostics() {
    try {
      const res = await adminService.getSystemHealth();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to sync telemetry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDiagnostics();
    const timer = setInterval(loadDiagnostics, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">
            🔌 System Diagnostics Telemetry
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
            Realtime backend stats, API latencies, & jobs queue checks
          </p>
        </div>

        <button
          onClick={() => { setLoading(true); loadDiagnostics(); }}
          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:text-emerald-500 transition cursor-pointer"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {loading && !data ? (
        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse text-xs">
          Querying Core Telemetry...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black text-xs">
          Telemetry Error: {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Uptime */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API Server Uptime</span>
              <Clock className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                {data.api_uptime ? `${(data.api_uptime / 3600).toFixed(1)} Hours` : 'Online'}
              </h3>
              <span className="text-[9px] text-slate-400 font-bold block mt-1">Uptime ticker: {data.api_uptime || 0}s</span>
            </div>
          </div>

          {/* CPU usage */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPU Configuration</span>
              <Cpu className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white truncate">
                {data.cpu_model || 'AMD / Intel Core'}
              </h3>
              <span className="text-[9px] text-slate-400 font-bold block mt-1">Process loads stable</span>
            </div>
          </div>

          {/* Memory load */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RAM Allocation</span>
              <HardDrive className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                {data.memory?.usagePercentage ? `${data.memory.usagePercentage.toFixed(1)}%` : '0%'}
              </h3>
              <span className="text-[9px] text-slate-400 font-bold block mt-1">
                Total size: {data.memory ? `${(data.memory.total / (1024 * 1024 * 1024)).toFixed(1)} GB` : '--'}
              </span>
            </div>
          </div>

          {/* SQLite DB logs size */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logs Storage</span>
              <Database className="h-5 w-5 text-teal-500" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                {data.sqlite_logs_count || 0} Records
              </h3>
              <span className="text-[9px] text-slate-400 font-bold block mt-1">Persisted under SQLite storage db</span>
            </div>
          </div>

        </div>
      )}

      {/* Background Jobs table */}
      {!loading && data && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-4">
          <h3 className="font-black text-slate-850 dark:text-white text-sm">🔄 Asynchronous Background Jobs Queue</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.background_jobs_queue?.map((job: any) => (
              <div key={job.status} className="bg-slate-50 dark:bg-slate-850 p-4.5 rounded-2xl text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{job.status}</span>
                <span className={`text-xl font-black block ${
                  job.status === 'FAILED' ? 'text-red-500' : 'text-slate-800 dark:text-white'
                }`}>{job.count} jobs</span>
              </div>
            ))}
            {(!data.background_jobs_queue || data.background_jobs_queue.length === 0) && (
              <div className="col-span-4 text-center py-6 text-slate-450 italic font-semibold">
                No active jobs enqueued in worker table.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
