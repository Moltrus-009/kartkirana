import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { Plus, Trash2, Compass } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  polygon: { lat: number; lng: number }[];
  pricing: { minOrder: number; deliveryFee: number };
  isActive: boolean;
}

export default function Zones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Creation form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [minOrder, setMinOrder] = useState('150');
  const [deliveryFee, setDeliveryFee] = useState('30');
  const [coordsInput, setCoordsInput] = useState('');

  async function loadZones() {
    try {
      const data = await adminService.getZones();
      setZones(data);
    } catch (err) {
      console.error('Failed loading zones:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadZones();
  }, []);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      // Parse coordinates (e.g. "28.58,77.31; 28.59,77.31; 28.59,77.32")
      const pairs = coordsInput.split(';').map(p => {
        const parts = p.trim().split(',');
        return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
      }).filter(p => !isNaN(p.lat) && !isNaN(p.lng));

      if (pairs.length < 3) {
        alert('Please input at least 3 lat,lng coordinate pairs to define a closed zone area.');
        return;
      }

      await adminService.saveZone({
        name: name.trim(),
        polygon: pairs,
        pricing: {
          minOrder: parseInt(minOrder) || 100,
          deliveryFee: parseInt(deliveryFee) || 20
        },
        isActive: true
      });

      setName('');
      setCoordsInput('');
      setShowAddForm(false);
      loadZones();
      alert('Zone boundary saved successfully.');
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this zone mapping?')) return;
    try {
      await adminService.deleteZone(id);
      loadZones();
      alert('Zone deleted.');
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 text-left select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">
            🗺️ Zone geofencing
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
            Operational boundary coordinates & pricing structures
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl shadow-xs text-xs font-black uppercase tracking-wider cursor-pointer transition"
        >
          <Plus className="h-4 w-4" /> Create zone
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse text-xs">
          Loading Geofenced Zones...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map((zone) => (
            <div 
              key={zone.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs flex flex-col justify-between"
            >
              <div className="h-28 bg-gradient-to-br from-indigo-500/10 to-teal-500/10 border-b border-slate-50 dark:border-slate-850 flex items-center justify-center relative">
                <Compass className="h-10 w-10 text-indigo-500/60" />
                <span className="absolute bottom-3 left-4 px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-[9px] font-black text-white uppercase tracking-wider">
                  ID: {zone.id}
                </span>
              </div>

              {/* Zone info */}
              <div className="p-5 space-y-4 text-xs">
                <div>
                  <h3 className="text-base font-black text-slate-850 dark:text-white truncate">{zone.name}</h3>
                  <span className="text-[9px] text-slate-450 block mt-1">Coordinates Count: {zone.polygon?.length || 0} vertices</span>
                </div>

                <div className="space-y-1.5 text-slate-500 dark:text-zinc-400 font-bold">
                  <div>Min bill threshold: <span className="text-slate-800 dark:text-white font-extrabold">₹{zone.pricing?.minOrder || 100}</span></div>
                  <div>Delivery fee: <span className="text-slate-800 dark:text-white font-extrabold">₹{zone.pricing?.deliveryFee || 20}</span></div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-50 dark:border-slate-800/40 flex justify-between items-center">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider block ${
                    zone.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {zone.isActive ? 'Active' : 'Disabled'}
                  </span>

                  <button
                    onClick={() => handleDelete(zone.id)}
                    className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl transition cursor-pointer"
                    title="Delete Zone"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
          {zones.length === 0 && (
            <div className="col-span-3 text-center py-20 text-slate-400 font-semibold italic">
              No delivery boundaries configured.
            </div>
          )}
        </div>
      )}

      {/* CREATE ZONE MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[32px] max-w-md w-full p-6 space-y-5 text-xs text-slate-850 dark:text-white">
            <div>
              <h3 className="text-base font-black">Configure boundary zone</h3>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Configure geofencing nodes</p>
            </div>
            <form onSubmit={handleCreateZone} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Zone Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Noida Sector 15 Zone"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Min Order (₹)</label>
                  <input
                    type="number"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Delivery Fee (₹)</label>
                  <input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Polygon Coords nodes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="28.58,77.31; 28.59,77.31; 28.59,77.32"
                  value={coordsInput}
                  onChange={(e) => setCoordsInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl uppercase tracking-wider cursor-pointer"
                >
                  Create zone
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
