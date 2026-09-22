import { useAdmin, type RiderDoc } from '../context/AdminContext';
import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { 
  Users, 
  MapPin, 
  Battery, 
  Check, 
  ShieldAlert, 
  Trash2,
  Lock,
  ChevronRight,
  TrendingUp,
  Star
} from 'lucide-react';

export default function Riders() {
  const { riders, updateRiderVerification } = useAdmin();
  const [selectedRider, setSelectedRider] = useState<RiderDoc | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingRider, setSavingRider] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riderFinancials, setRiderFinancials] = useState<any>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  useEffect(() => {
    setSelectedRider(previous => previous ? riders.find(rider => rider.uid === previous.uid) || null : null);
  }, [riders]);

  // Safely retrieve financials
  const handleSelectRider = async (rider: RiderDoc) => {
    setSelectedRider(rider);
    setActionMessage('');
    setRiderFinancials(null);
    setLoadingFinancials(true);
    try {
      const data = await adminService.getRiderFinancials(rider.uid);
      setRiderFinancials(data);
    } catch (err) {
      console.warn('Failed to retrieve rider financials:', err);
    } finally {
      setLoadingFinancials(false);
    }
  };

  const pendingRiders = riders.filter(r => (!r.verificationStatus || r.verificationStatus === 'pending'));

  // Filter riders safely
  const filteredRiders = riders.filter(r => {
    const nameStr = r.name || '';
    const phoneStr = r.phone || '';
    const matchSearch = nameStr.toLowerCase().includes(search.toLowerCase()) || phoneStr.includes(search);
    const matchStatus = statusFilter === 'pending_approval'
      ? (!r.verificationStatus || r.verificationStatus === 'pending')
      : statusFilter ? r.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const handleApprove = async (riderId: string) => {
    if (savingRider) return;
    setSavingRider(riderId);
    setActionMessage('');
    try {
      await updateRiderVerification(riderId, 'approved');
      setActionMessage('Approval saved. Rider access is enabled. The rider can go online with location permission.');
    } catch (e: any) {
      setActionMessage(`Approval failed: ${e.message}`);
    } finally { setSavingRider(null); }
  };

  const handleRejectOrSuspend = async (riderId: string, status: 'rejected' | 'suspended') => {
    if (savingRider) return;
    setSavingRider(riderId);
    try {
      await updateRiderVerification(riderId, status);
      setActionMessage(`Rider ${status}. Online access disabled.`);
    } catch (e: any) {
      setActionMessage(`Update failed: ${e.message}`);
    } finally { setSavingRider(null); }
  };

  const handleDeleteRider = async (riderId: string) => {
    if (!confirm('Are you sure you want to delete this rider?')) return;
    try {
      await adminService.deleteUserAccount(riderId, 'Rider account deletion');
      await deleteDoc(doc(db!, 'riders', riderId));
      alert('Rider account deleted.');
    } catch (e: any) {
      alert(`Deletion failed: ${e.message}`);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRider || !newPassword) return;
    try {
      await adminService.resetUserPassword(selectedRider.uid, newPassword, 'Reset by administrator');
      setShowPasswordModal(false);
      setNewPassword('');
      alert('Rider password reset successfully.');
    } catch (err: any) {
      alert(`Failed password reset: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">
            🛵 Courier Fleet Dispatch
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
            KYC Approvals, heartbeats tracking, & metrics audit
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4.5 rounded-[24px] shadow-xs flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search riders by name/phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none font-bold"
          />
        </div>
        <div className="relative flex-1 md:flex-initial w-full">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-44 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-3 text-xs focus:outline-none font-bold appearance-none cursor-pointer"
          >
            <option value="">All Riders ({riders.length})</option>
            <option value="pending_approval">⚡ Pending Approvals ({pendingRiders.length})</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="busy">Busy</option>
            <option value="idle">Idle</option>
          </select>
        </div>
      </div>

      {/* Grid Content layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Riders Cards List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRiders.map((rider) => {
              const isApproved = rider.verificationStatus === 'approved' && rider.documentStatus === 'verified';
              const stateColors = {
                online: 'bg-emerald-500/10 text-emerald-500',
                busy: 'bg-amber-500/10 text-amber-500',
                idle: 'bg-indigo-500/10 text-indigo-500',
                offline: 'bg-slate-500/10 text-slate-500'
              };

              return (
                <div 
                  key={rider.uid}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-[28px] shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-500/30 transition text-xs"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0">
                        {rider.photoUrl ? (
                          <img src={rider.photoUrl} alt={rider.name} className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white">{rider.name}</h4>
                        <span className="text-[9px] text-slate-400 font-extrabold block mt-0.5">{rider.phone}</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${stateColors[rider.status || 'offline']}`}>
                      {rider.status || 'offline'}
                    </span>
                  </div>

                  {/* Operational Telemetries */}
                  <div className="grid grid-cols-3 gap-2.5 border-t border-b border-slate-50 dark:border-slate-800/40 py-3 font-bold text-slate-500 dark:text-zinc-400">
                    <div>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block mb-0.5">Battery</span>
                      <span className="text-slate-800 dark:text-white font-extrabold flex items-center gap-0.5">
                        <Battery className="h-3.5 w-3.5 text-emerald-500" /> {rider.batteryLevel || 100}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block mb-0.5">GPS Precision</span>
                      <span className="text-slate-800 dark:text-white font-extrabold">{rider.gpsAccuracy ? `${rider.gpsAccuracy.toFixed(1)}m` : 'High'}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block mb-0.5">Online Hours</span>
                      <span className="text-slate-800 dark:text-white font-extrabold">{rider.onlineHoursToday || 0} hrs</span>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex justify-between items-center">
                    <span className="font-black text-indigo-500 bg-indigo-500/5 px-2 py-0.5 rounded-lg text-[9px] tracking-wider uppercase">
                      {rider.vehicle}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {!isApproved ? (
                        <button
                          onClick={() => handleSelectRider(rider)}
                          className="p-1.5 bg-emerald-500 text-slate-950 hover:bg-emerald-600 rounded-lg cursor-pointer transition"
                          title="Review documents and approval"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRejectOrSuspend(rider.uid, 'suspended')}
                          className="p-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-slate-950 rounded-lg cursor-pointer transition"
                          title="Suspend Rider"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => { handleSelectRider(rider); setShowPasswordModal(true); }}
                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-emerald-500 rounded-lg cursor-pointer transition"
                        title="Reset password"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleSelectRider(rider)}
                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-indigo-500 rounded-lg cursor-pointer transition"
                        title="Review rider documents"
                      >
                        <span className="text-[10px] font-bold">Review documents</span><ChevronRight className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteRider(rider.uid)}
                        className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer transition"
                        title="Delete accounts"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Right side: Detailed Rider Lifecycle Timeline details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs lg:max-h-[85vh] overflow-y-auto space-y-5 text-xs text-left">
          {!selectedRider ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-semibold text-center py-20">
              Select Review documents on a rider to inspect uploaded documents and approve access.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-50 dark:border-slate-800/40">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{selectedRider.name}</h3>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">UID: {selectedRider.uid}</span>
                </div>
                <button 
                  onClick={() => setSelectedRider(null)}
                  className="text-slate-400 hover:text-slate-650 font-black"
                >
                  ✕
                </button>
              </div>

              <section className="space-y-3" aria-label="Rider document review">
                <h4 className="font-black text-base">Documents and approval</h4>
                <p>Approval: <strong>{selectedRider.verificationStatus || 'pending'}</strong> · Access: <strong>{selectedRider.documentStatus === 'verified' ? 'Enabled' : 'Blocked until approval'}</strong></p>
                {selectedRider.verificationStatus === 'approved' && selectedRider.documentStatus !== 'verified' && <p role="alert" className="text-amber-600">Previous approval did not enable rider access. Use Sync approved access below.</p>}
                {([['Driving licence', selectedRider.dlUrl], ['Aadhaar', selectedRider.aadhaarUrl], ['Vehicle registration (RC)', selectedRider.rcUrl]] as const).map(([label, url]) => (
                  <div key={label} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex flex-wrap justify-between gap-2">
                    <span className="font-bold">{label}</span>
                    {url && /^https:\/\//i.test(url) ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-bold">Open document</a> : <span className="text-amber-600">Not uploaded</span>}
                  </div>
                ))}
                <p className="text-slate-500">Open each uploaded image or PDF to review it before approving. Missing documents are shown above.</p>
                <div className="flex flex-wrap gap-2">
                  <button disabled={!!savingRider} onClick={() => handleApprove(selectedRider.uid)} className="px-4 py-3 bg-emerald-500 rounded-xl font-bold disabled:opacity-50">{savingRider === selectedRider.uid ? 'Saving…' : selectedRider.verificationStatus === 'approved' && selectedRider.documentStatus !== 'verified' ? 'Sync approved access' : 'Approve rider'}</button>
                  <button disabled={!!savingRider} onClick={() => handleRejectOrSuspend(selectedRider.uid, 'rejected')} className="px-4 py-3 bg-red-100 text-red-700 rounded-xl font-bold">Reject</button>
                  <button disabled={!!savingRider} onClick={() => handleRejectOrSuspend(selectedRider.uid, 'suspended')} className="px-4 py-3 bg-amber-100 text-amber-800 rounded-xl font-bold">Suspend</button>
                </div>
                {actionMessage && <p role="status">{actionMessage}</p>}
              </section>

              {/* Financial Metrics from Centralized API */}
              {loadingFinancials ? (
                <div className="py-8 text-center text-slate-400 font-bold uppercase tracking-wider animate-pulse text-[10px]">
                  🔄 Fetching Centralized Financials...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5 text-center text-slate-500 dark:text-zinc-400 font-bold">
                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl">
                    <Star className="h-4 w-4 mx-auto text-yellow-400 mb-1" />
                    <span className="text-[8px] text-slate-400 uppercase tracking-widest block">Rating</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">{selectedRider.rating || 5.0}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl">
                    <TrendingUp className="h-4 w-4 mx-auto text-indigo-500 mb-1" />
                    <span className="text-[8px] text-slate-400 uppercase tracking-widest block">Acceptance %</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">{selectedRider.acceptanceRate || 95}%</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl">
                    <span className="text-slate-900 dark:text-white font-extrabold text-sm block mb-1">₹{riderFinancials ? riderFinancials.earningsToday : 0}</span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-widest block">Earnings Today</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl">
                    <span className="text-slate-900 dark:text-white font-extrabold text-sm block mb-1">₹{riderFinancials ? riderFinancials.totalEarnings : 0}</span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-widest block">Total Earnings</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl">
                    <span className="text-slate-900 dark:text-white font-extrabold text-sm block mb-1">{riderFinancials ? riderFinancials.todayDeliveries : 0}</span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-widest block">Today's Deliveries</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl">
                    <span className="text-slate-900 dark:text-white font-extrabold text-sm block mb-1">{riderFinancials ? riderFinancials.totalDeliveries : 0}</span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-widest block">Total Deliveries</span>
                  </div>
                </div>
              )}

              {/* Fleet Parameters */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl space-y-2 font-bold text-[10px] text-slate-550 dark:text-zinc-400 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-1.5">
                  <span className="text-slate-400 uppercase tracking-wider text-[8px]">Status</span>
                  <span className="uppercase text-emerald-550 font-extrabold">{selectedRider.status || 'offline'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-1.5">
                  <span className="text-slate-400 uppercase tracking-wider text-[8px]">Verification Status</span>
                  <span className="uppercase text-slate-800 dark:text-white font-extrabold">{selectedRider.verificationStatus || 'pending'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-1.5">
                  <span className="text-slate-400 uppercase tracking-wider text-[8px]">Vehicle Details</span>
                  <span className="text-slate-800 dark:text-white font-extrabold">{selectedRider.vehicle || 'Standard'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-1.5">
                  <span className="text-slate-400 uppercase tracking-wider text-[8px]">Assigned Order</span>
                  <span className="text-slate-800 dark:text-white font-mono font-extrabold">{(selectedRider as any).assignedOrderId || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase tracking-wider text-[8px]">Last Heartbeat</span>
                  <span className="text-slate-800 dark:text-white font-extrabold">{(selectedRider as any).lastOnline || 'N/A'}</span>
                </div>
              </div>

              {/* Courier Lifecycle Timeline mapping */}
              <div className="space-y-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Rider Lifecycle timeline</span>
                <div className="relative border-l border-slate-100 dark:border-slate-800 ml-2.5 pl-4.5 space-y-4.5 py-1 text-left">
                  
                  {/* Step A */}
                  <div className="relative">
                    <div className="absolute -left-6.5 top-0.5 bg-emerald-500 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900" />
                    <span className="font-extrabold text-slate-900 dark:text-white">Rider Account Created</span>
                    <p className="text-[10px] text-slate-450 mt-0.5">Profile successfully set up. Documents enqueued for review.</p>
                  </div>

                  {/* Step B */}
                  <div className="relative">
                    <div className={`absolute -left-6.5 top-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                      selectedRider.verificationStatus === 'approved' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`} />
                    <span className="font-extrabold text-slate-900 dark:text-white">KYC Documents Verified</span>
                    <p className="text-[10px] text-slate-450 mt-0.5">DL, Aadhaar, and RC verified by administrative checks.</p>
                  </div>

                  {/* Step C */}
                  <div className="relative">
                    <div className="absolute -left-6.5 top-0.5 bg-slate-300 dark:bg-slate-700 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900" />
                    <span className="font-extrabold text-slate-950 dark:text-white">First Order Dispatched</span>
                    <p className="text-[10px] text-slate-450 mt-0.5">Successfully fulfilled first customer order in target zone.</p>
                  </div>

                  {/* Coords Tracking trigger link */}
                  {selectedRider.coords && (
                    <div className="pt-2 border-t border-slate-50 dark:border-slate-800/40">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Live Courier Coordinates</span>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-indigo-500 bg-indigo-500/5 px-3 py-2 rounded-xl w-max">
                        <MapPin className="h-3.5 w-3.5 text-indigo-500" /> Lat: {selectedRider.coords.lat.toFixed(5)}, Lng: {selectedRider.coords.lng.toFixed(5)}
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* PASSWORD RESET MODAL */}
      {showPasswordModal && selectedRider && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[32px] max-w-sm w-full p-6 space-y-4 text-xs">
            <div>
              <h3 className="text-sm font-black">Reset Password for {selectedRider.name}</h3>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">This will update credentials instantly</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">New Secure Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter 6+ characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-55 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 font-bold outline-none"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl uppercase tracking-wider cursor-pointer"
                >
                  Reset Credential
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
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
