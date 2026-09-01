import { useState } from 'react';
import { adminService } from '../services/adminService';
import { 
  Database, 
  Upload, 
  Download, 
  RefreshCw, 
  CheckCircle
} from 'lucide-react';

export default function DisasterRecovery() {
  const [loading, setLoading] = useState(false);
  const [backupPayload, setBackupPayload] = useState<any>(null);
  const [restoreJson, setRestoreJson] = useState('');

  const handleBackup = async () => {
    setLoading(true);
    try {
      const res = await adminService.triggerBackup();
      setBackupPayload(res.backupPayload);
      
      // Trigger file download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href",     dataStr);
      downloadAnchor.setAttribute("download", `kk_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      alert('Database restore checkpoint generated and configuration payload downloaded.');
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreJson.trim()) return;
    if (!window.confirm('Restore the platform configuration from this payload? The action is audited and may immediately change live feature flags.')) return;
    setLoading(true);
    try {
      const parsed = JSON.parse(restoreJson);
      await adminService.triggerRestore(parsed);
      setRestoreJson('');
      alert('System configurations successfully restored from backup file.');
    } catch (err: any) {
      alert(`Restore failed. Please verify JSON schema syntax: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          🛡️ Disaster Recovery Console
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
          Configuration backups, data restore points, & system logs downloader
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Generate Backup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 rounded-[32px] shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-500" />
              <h3 className="font-black text-slate-850 dark:text-white text-sm">Create Restore Point</h3>
            </div>
            <p className="text-slate-500 leading-relaxed font-semibold">
              Exports the global settings collection, features flag config, and version parameters as a JSON backup payload file.
            </p>
            
            {backupPayload && (
              <div className="p-3.5 bg-emerald-55/10 border border-emerald-500/20 text-emerald-600 rounded-2xl flex items-center gap-1.5 font-extrabold text-[10px]">
                <CheckCircle className="h-4 w-4" /> Checkpoint generated successfully: {backupPayload.backupId}
              </div>
            )}
          </div>

          <button
            onClick={handleBackup}
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export Configuration Backup
          </button>
        </div>

        {/* Restore Backup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 rounded-[32px] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-indigo-500" />
            <h3 className="font-black text-slate-850 dark:text-white text-sm">Restore Configuration Backup</h3>
          </div>

          <form onSubmit={handleRestore} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Backup JSON Content *</label>
              <textarea
                required
                rows={4}
                placeholder='Paste backup JSON file content here...'
                value={restoreJson}
                onChange={(e) => setRestoreJson(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 font-bold outline-none font-mono text-[10px]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !restoreJson.trim()}
              className="w-full py-3 bg-indigo-550 hover:bg-indigo-600 text-white font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Restore Configurations
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
