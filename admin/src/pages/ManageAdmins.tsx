import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useAdmin } from '../context/AdminContext';
import { 
  ShieldAlert, 
  UserPlus, 
  Trash2, 
  Shield, 
  Lock, 
  Info
} from 'lucide-react';

interface AdminUser {
  uid: string;
  phone: string;
  role: string;
}

export default function ManageAdmins() {
  const { adminUser } = useAdmin();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Promotion form state
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('admin');
  const [promoting, setPromoting] = useState(false);

  // Role modification modals
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState('admin');
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Permissions mappings reference display
  const [showPermissionsInfo, setShowPermissionsInfo] = useState(false);

  const adminRoles = [
    { value: 'super_admin', label: 'Super Admin (All permissions)' },
    { value: 'admin', label: 'Admin (Operations & catalogs settings)' },
    { value: 'operations', label: 'Operations Manager (Dispatches & fleet)' },
    { value: 'support', label: 'Support Agent (Complaints resolution)' },
    { value: 'finance', label: 'Finance (Reconciliations & refunds)' },
    { value: 'marketing', label: 'Marketing (Banners & coupons)' },
    { value: 'merchant_success', label: 'Merchant Success (Store onboarding)' },
    { value: 'logistics', label: 'Logistics Coordinator (Riders assignment)' },
    { value: 'analyst', label: 'Business Analyst (Dashboard views)' }
  ];

  async function loadAdmins() {
    try {
      setLoading(true);
      const data = await adminService.getAdmins();
      setAdmins(data);
    } catch (err) {
      console.error('Failed to load administrators:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (adminUser?.role === 'super_admin') {
      loadAdmins();
    }
  }, [adminUser]);

  // Deny access to non-Super Admins immediately
  if (adminUser?.role !== 'super_admin') {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] max-w-xl mx-auto space-y-4">
        <Lock className="h-12 w-12 text-red-500 animate-bounce" />
        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs text-slate-400 font-bold max-w-sm leading-relaxed">
          The requested page is restricted to platform Super Administrators only. Please contact system administrators to escalate your role claims.
        </p>
      </div>
    );
  }

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setPromoting(true);
    try {
      await adminService.assignAdminRole(phone.trim(), role);
      setPhone('');
      loadAdmins();
      alert('User successfully promoted to administrator.');
    } catch (err: any) {
      alert(`Promotion failed: ${err.message}`);
    } finally {
      setPromoting(false);
    }
  };

  const handleRemoveRole = async (uid: string) => {
    if (!confirm('Are you sure you want to revoke administrative claims from this operator?')) return;
    try {
      await adminService.removeAdminRole(uid);
      loadAdmins();
      alert('Administrative access revoked successfully.');
    } catch (err: any) {
      alert(`Failed to revoke role: ${err.message}`);
    }
  };

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    try {
      await adminService.changeAdminRole(selectedAdmin.uid, newRole);
      setShowRoleModal(false);
      setSelectedAdmin(null);
      loadAdmins();
      alert('Administrator role updated successfully.');
    } catch (err: any) {
      alert(`Role change failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 text-left select-none">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-500" /> Manage Administrators (RBAC)
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
            Assign custom claims, update roles permissions, & audit operator access keys
          </p>
        </div>

        <button
          onClick={() => setShowPermissionsInfo(prev => !prev)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-850 hover:bg-emerald-500/10 hover:text-emerald-500 text-slate-700 dark:text-zinc-350 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
        >
          <Info className="h-4 w-4" /> View Roles Mappings
        </button>
      </div>

      {/* Role mappings panel */}
      {showPermissionsInfo && (
        <div className="p-5 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-500/15 rounded-3xl text-xs space-y-3 animate-in slide-in-from-top-3 duration-200">
          <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">🔒 Standard Role Permissions Hierarchy</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-bold text-slate-500 dark:text-zinc-400">
            <div>
              <span className="text-slate-800 dark:text-zinc-200 font-black">Super Admin</span>
              <p className="text-[10px] mt-0.5">Absolute privileges (roles, settings backups, logs).</p>
            </div>
            <div>
              <span className="text-slate-800 dark:text-zinc-200 font-black">Admin / Operations</span>
              <p className="text-[10px] mt-0.5">Approve shops, update dispatch settings, manage banners/fleet.</p>
            </div>
            <div>
              <span className="text-slate-800 dark:text-zinc-200 font-black">Support / Finance</span>
              <p className="text-[10px] mt-0.5">Resolve helpdesk complaints, audit transactions ledger, issue refunds.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Operators Registry table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-50 dark:border-slate-800/40">
              <h3 className="font-black text-slate-850 dark:text-white text-sm">👥 Administrative Operators Registry</h3>
            </div>

            {loading ? (
              <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse text-xs">
                Querying Auth Claims...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-855 text-slate-400 font-black text-[9px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/40">
                      <th className="px-6 py-4">UID Reference</th>
                      <th className="px-6 py-4">Phone Number</th>
                      <th className="px-6 py-4">Custom Role Claim</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
                    {admins.map((adm) => (
                      <tr key={adm.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-[10px] select-all">
                          {adm.uid}
                        </td>
                        <td className="px-6 py-4 font-extrabold text-slate-950 dark:text-white">
                          {adm.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 font-black text-[9px] uppercase tracking-wider">
                            {adm.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => { setSelectedAdmin(adm); setNewRole(adm.role); setShowRoleModal(true); }}
                              className="p-1.5 bg-slate-50 dark:bg-slate-850 hover:text-emerald-500 rounded-xl transition cursor-pointer text-slate-500"
                              title="Modify Admin Role"
                            >
                              <ShieldAlert className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleRemoveRole(adm.uid)}
                              className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition cursor-pointer"
                              title="Revoke Admin Access"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {admins.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center text-slate-400 font-semibold italic">
                          No administrators registered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Promote Admin Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs h-max space-y-5">
          <div>
            <h3 className="font-black text-slate-850 dark:text-white text-sm">Promote User to Admin</h3>
            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Assign administrative custom claims</p>
          </div>

          <form onSubmit={handlePromote} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Phone Number (with Country Code) *</label>
              <input
                type="text"
                required
                placeholder="e.g. +919580184045"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Select Claim Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 font-bold outline-none cursor-pointer"
              >
                {adminRoles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={promoting || !phone.trim()}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <UserPlus className="h-4 w-4" /> {promoting ? 'Promoting...' : 'Promote Operator'}
            </button>
          </form>
        </div>

      </div>

      {/* CHANGE ROLE MODAL */}
      {showRoleModal && selectedAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-[32px] max-w-sm w-full p-6 space-y-4 text-xs text-slate-850 dark:text-white">
            <div>
              <h3 className="text-base font-black">Change Administrator Role</h3>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">UID: {selectedAdmin.uid}</p>
            </div>
            <form onSubmit={handleChangeRole} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Custom Role Claim *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-slate-55 dark:bg-zinc-800 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 font-bold outline-none cursor-pointer"
                >
                  {adminRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl uppercase tracking-wider cursor-pointer"
                >
                  Update Role
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRoleModal(false); setSelectedAdmin(null); }}
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
