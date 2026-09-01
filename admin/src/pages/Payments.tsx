import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { 
  DollarSign, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  ArrowUpRight, 
  Wallet,
  Activity,
  RefreshCw
} from 'lucide-react';

export default function Payments() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadFinancials() {
    try {
      const summary = await adminService.getFinancialSummary();
      setData(summary);
      setError(null);
    } catch (err: any) {
      console.error('Failed loading financials ledger:', err);
      setError(err.message || 'Financial records could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFinancials();
    const interval = window.setInterval(() => void loadFinancials(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const handleExportCSV = () => {
    if (!data || !data.orders) return;
    
    const headers = ['Transaction ID', 'Order ID', 'Method', 'Payment Status', 'Reconciliation', 'Captured (INR)', 'Refunded (INR)', 'Net (INR)', 'Platform Fee (INR)', 'Tax (INR)', 'Delivery Fee (INR)', 'Created At'];
    const rows = data.orders.map((o: any) => [
      o.transactionId || '', o.orderId, o.paymentMethod, o.paymentRecordStatus, o.reconciliationStatus,
      o.amount,
      o.refundedAmount,
      o.netAmount,
      o.platformFee,
      o.tax,
      o.deliveryFee,
      o.createdAt
    ]);

    const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csvContent = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\n');
    const encodedUri = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kk_financials_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(encodedUri);
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">
            💳 Financial Ledger & Reconciliation
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
            Platform earnings splits, commissions, and CSV audits
          </p>
        </div>

        <div className="flex gap-2"><button onClick={() => void loadFinancials()} disabled={loading} className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 dark:border-slate-800 dark:bg-slate-900"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button><button
            onClick={handleExportCSV}
            disabled={!data}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl shadow-xs text-xs font-black uppercase tracking-wider cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" /> Export CSV Report
          </button></div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-300">{error}</div>}

      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse text-xs">
          Loading Financial Registry...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Captured</span><strong className="mt-1 block text-lg text-slate-900 dark:text-white">₹{data?.reconciliation?.totalCaptured?.toLocaleString() || 0}</strong></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Refunded</span><strong className="mt-1 block text-lg text-amber-600">₹{data?.reconciliation?.totalRefunded?.toLocaleString() || 0}</strong></div>
            <div className={`rounded-2xl border p-4 ${data?.reconciliation?.unmatchedCount ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'}`}><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reconciliation issues</span><strong className={`mt-1 block text-lg ${data?.reconciliation?.unmatchedCount ? 'text-rose-600' : 'text-emerald-600'}`}>{data?.reconciliation?.unmatchedCount || 0}</strong></div>
          </div>
          
          {/* Earnings totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Fees</span>
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                  ₹{data?.reconciliation?.platformEarnings?.toLocaleString() || 0}
                </h3>
                <span className="text-[9px] text-slate-400 font-bold block mt-1">Direct commission revenue</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Collections</span>
                <Activity className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                  ₹{data?.reconciliation?.taxCollection?.toLocaleString() || 0}
                </h3>
                <span className="text-[9px] text-slate-400 font-bold block mt-1">Tax collected for payout checks</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Fee Revenue</span>
                <Wallet className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                  ₹{data?.reconciliation?.deliveryEarnings?.toLocaleString() || 0}
                </h3>
                <span className="text-[9px] text-slate-400 font-bold block mt-1">Total riders dispatcher share</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Platform Revenue</span>
                <ArrowUpRight className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                  ₹{data?.reconciliation?.totalRevenue?.toLocaleString() || 0}
                </h3>
                <span className="text-[9px] text-slate-400 font-bold block mt-1">Includes platform fee, taxes, delivery</span>
              </div>
            </div>

          </div>

          {/* Ledger details list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-50 dark:border-slate-800/40">
              <h3 className="font-black text-slate-800 dark:text-white text-sm">📝 Transaction Ledger Registry</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 font-black text-[9px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/40">
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Order / Method</th>
                    <th className="px-6 py-4">Grand Total</th>
                    <th className="px-6 py-4">Platform Share</th>
                    <th className="px-6 py-4">Delivery Charge</th>
                    <th className="px-6 py-4">Reconciliation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                  {data?.orders?.map((order: any) => (
                    <tr key={order.orderId} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-950 dark:text-white">
                        {order.transactionId || order.paymentId}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-bold">
                        <span className="block font-mono">{order.orderId}</span>
                        <span className="block text-[9px] uppercase mt-1">{order.paymentMethod} · {order.paymentRecordStatus}</span>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">
                        ₹{order.amount}
                      </td>
                      <td className="px-6 py-4 text-emerald-500 font-bold">
                        ₹{order.platformFee}
                      </td>
                      <td className="px-6 py-4 text-indigo-500 font-bold">
                        ₹{order.deliveryFee}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-lg font-black text-[9px] tracking-wider uppercase flex items-center gap-0.5 w-max ${order.reconciliationStatus === 'MATCHED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {order.reconciliationStatus === 'MATCHED' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {order.reconciliationStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data?.orders || data.orders.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold italic">
                        No transactions registered in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
