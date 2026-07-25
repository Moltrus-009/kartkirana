import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { uploadFile, STORAGE_PATHS } from '../services/storageService';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Image as ImageIcon
} from 'lucide-react';

interface Banner {
  id: string;
  imageUrl: string;
  targetUrl?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function Banners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [targetUrl, setTargetUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(collection(db, 'banners'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Banner));
      setBanners(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !startDate || !endDate) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      const id = `banner_${Date.now()}`;
      const path = STORAGE_PATHS.advertisementBanner(id);
      
      // Upload file with canvas compression
      const downloadUrl = await uploadFile(path, file, {
        compress: true,
        quality: 0.8,
        onProgress: (p) => setUploadProgress(Math.round(p))
      });

      const payload: Banner = {
        id,
        imageUrl: downloadUrl,
        targetUrl: targetUrl.trim(),
        startDate,
        endDate,
        isActive: true
      };

      await setDoc(doc(db!, 'banners', id), payload);

      setFile(null);
      setTargetUrl('');
      setStartDate('');
      setEndDate('');
      setUploadProgress(0);
      setShowAddForm(false);
      alert('Banner uploaded and scheduled successfully.');
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo banner?')) return;
    try {
      await deleteDoc(doc(db!, 'banners', id));
      alert('Banner deleted.');
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 text-left select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center text-left">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">
            🖼️ Ad banner scheduler
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
            Targeted slots, home slider schedule, & uploads
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-2.5 px-4 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-xs transition duration-200 uppercase tracking-wider"
        >
          <Plus className="h-4 w-4" /> Add Banner
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Loading active Banners...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div 
              key={banner.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs flex flex-col justify-between"
            >
              {/* Image Preview */}
              <div className="h-36 bg-slate-100 dark:bg-slate-800 overflow-hidden relative flex items-center justify-center">
                {banner.imageUrl ? (
                  <img src={banner.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                )}
                <span className="absolute bottom-3 left-4 px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-[9px] font-black text-white uppercase tracking-wider">
                  ID: {banner.id}
                </span>
              </div>

              {/* Schedules details */}
              <div className="p-5 space-y-4 text-xs">
                <div className="space-y-1.5 text-slate-500 dark:text-zinc-400 font-bold">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Start: {new Date(banner.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Expiry: {new Date(banner.endDate).toLocaleDateString()}</span>
                  </div>
                  {banner.targetUrl && (
                    <div className="truncate text-indigo-500 text-[10px] select-all font-mono">
                      Target: {banner.targetUrl}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-50 dark:border-slate-800/40 flex justify-between items-center">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider block ${
                    banner.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-550'
                  }`}>
                    {banner.isActive ? 'Active' : 'Expired'}
                  </span>

                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl transition cursor-pointer"
                    title="Delete Banner"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
          {banners.length === 0 && (
            <div className="col-span-3 text-center py-20 text-slate-400 font-semibold italic">
              No advertising banners scheduled currently.
            </div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[32px] max-w-sm w-full p-6 space-y-5 text-xs text-slate-850 dark:text-white">
            <div>
              <h3 className="text-base font-black">Upload Ad banner</h3>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Upload to Firebase Storage and schedule slot</p>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 text-left font-bold text-slate-700 dark:text-zinc-350">
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Image File *</label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 outline-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Click URL</label>
                <input
                  type="text"
                  placeholder="e.g. /category/fruits"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2.5 font-bold outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-855 rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-855 rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>
              </div>

              {uploadProgress > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-black">
                    <span>UPLOADING IMAGE</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div style={{ width: `${uploadProgress}%` }} className="h-full bg-emerald-500" />
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={uploadProgress > 0}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl uppercase tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Schedule Banner
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
