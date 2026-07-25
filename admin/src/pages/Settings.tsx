import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import DisasterRecovery from './DisasterRecovery';
import { 
  ToggleLeft, 
  ToggleRight, 
  Smartphone, 
  Activity
} from 'lucide-react';

export default function Settings() {
  const [flags, setFlags] = useState<any>({});
  const [versions, setVersions] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    try {
      const data = await adminService.getSettings();
      setFlags(data.featureFlags || {});
      setVersions(data.versionControl || {});
    } catch (err) {
      console.error('Failed fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggleFlag = (key: string) => {
    setFlags((prev: any) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminService.saveSettings({
        featureFlags: flags,
        versionControl: versions
      });
      alert('Platform configurations successfully updated.');
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left select-none max-w-4xl">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          ⚙️ Business Settings & Controls
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
          Realtime feature flags overrides, app version limits, & maintenance keys
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse text-xs">
          Loading configs...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 text-xs text-slate-700 dark:text-zinc-350">
          
          {/* Feature Flags Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-50 dark:border-slate-800/40">
              <Activity className="h-5 w-5 text-emerald-500" />
              <h3 className="font-black text-slate-850 dark:text-white text-sm">Real-time Feature Flags</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* COD */}
              <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl">
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white">Cash on Delivery (COD)</span>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Toggle COD availability for checkout</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFlag('cod')}
                  className={`cursor-pointer ${flags.cod ? 'text-emerald-500' : 'text-slate-400'}`}
                >
                  {flags.cod ? <ToggleRight className="h-9 w-9" /> : <ToggleLeft className="h-9 w-9" />}
                </button>
              </div>

              {/* UPI */}
              <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-855 rounded-2xl">
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white">UPI Gateway Payments</span>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Toggle UPI checkout pathways</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFlag('upi')}
                  className={`cursor-pointer ${flags.upi ? 'text-emerald-500' : 'text-slate-400'}`}
                >
                  {flags.upi ? <ToggleRight className="h-9 w-9" /> : <ToggleLeft className="h-9 w-9" />}
                </button>
              </div>

              {/* Wallet */}
              <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-855 rounded-2xl">
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white">Wallet Credits Usage</span>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Toggle wallet balance checkout usage</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFlag('wallet')}
                  className={`cursor-pointer ${flags.wallet ? 'text-emerald-500' : 'text-slate-400'}`}
                >
                  {flags.wallet ? <ToggleRight className="h-9 w-9" /> : <ToggleLeft className="h-9 w-9" />}
                </button>
              </div>

              {/* Delivery */}
              <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-855 rounded-2xl">
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white">Rider Dispatch Allocations</span>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Toggle live courier dispatcher dispatch</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFlag('delivery')}
                  className={`cursor-pointer ${flags.delivery ? 'text-emerald-500' : 'text-slate-400'}`}
                >
                  {flags.delivery ? <ToggleRight className="h-9 w-9" /> : <ToggleLeft className="h-9 w-9" />}
                </button>
              </div>

              {/* Maintenance */}
              <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-855 rounded-2xl border border-red-500/10">
                <div>
                  <span className="font-extrabold text-slate-950 dark:text-white text-red-550">System Maintenance Mode</span>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Enforces immediate system maintenance lock</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFlag('maintenance')}
                  className={`cursor-pointer ${flags.maintenance ? 'text-red-500' : 'text-slate-400'}`}
                >
                  {flags.maintenance ? <ToggleRight className="h-9 w-9" /> : <ToggleLeft className="h-9 w-9" />}
                </button>
              </div>

            </div>
          </div>

          {/* App Version Controls Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-50 dark:border-slate-800/40">
              <Smartphone className="h-5 w-5 text-indigo-500" />
              <h3 className="font-black text-slate-855 dark:text-white text-sm">App Version Control</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Android Minimum Version</label>
                <input
                  type="text"
                  value={versions.androidMinVersion || ''}
                  onChange={(e) => setVersions({ ...versions, androidMinVersion: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 font-bold outline-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Android Latest Version</label>
                <input
                  type="text"
                  value={versions.androidLatestVersion || ''}
                  onChange={(e) => setVersions({ ...versions, androidLatestVersion: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2.5 font-bold outline-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">iOS Minimum Version</label>
                <input
                  type="text"
                  value={versions.iosMinVersion || ''}
                  onChange={(e) => setVersions({ ...versions, iosMinVersion: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2.5 font-bold outline-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">iOS Latest Version</label>
                <input
                  type="text"
                  value={versions.iosLatestVersion || ''}
                  onChange={(e) => setVersions({ ...versions, iosLatestVersion: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2.5 font-bold outline-none font-mono"
                />
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Global Maintenance Message</label>
              <textarea
                rows={2}
                value={versions.maintenanceMessage || ''}
                onChange={(e) => setVersions({ ...versions, maintenanceMessage: e.target.value })}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 font-bold outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-40"
            >
              {saving ? 'Saving changes...' : 'Save configurations'}
            </button>
          </div>

        </form>
      )}

      {/* Disaster Recovery Console */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <DisasterRecovery />
      </div>

    </div>
  );
}
