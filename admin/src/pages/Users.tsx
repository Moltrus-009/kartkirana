import { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { ShieldCheck, User, RefreshCw } from 'lucide-react';

export default function UsersList() {
  const { users, shops, updateUserRole, updateUserAccountStatus, refreshAllData } = useAdmin();
  
  // Inline edit state
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'customer' | 'owner' | 'rider' | 'admin'>('customer');
  const [editShopId, setEditShopId] = useState<string>('');
  const [editAccountStatus, setEditAccountStatus] = useState<'pending' | 'approved' | 'active' | 'suspended'>('active');

  const startEdit = (user: any) => {
    setEditingUid(user.uid);
    setEditRole(user.role || 'customer');
    setEditShopId(user.shopId || '');
    setEditAccountStatus(user.accountStatus || (user.role === 'owner' ? 'pending' : 'active'));
  };

  const handleSave = async (uid: string) => {
    try {
      await updateUserRole(uid, editRole, editShopId || null);
      await updateUserAccountStatus(uid, editAccountStatus);
      setEditingUid(null);
    } catch (e) {
      alert("Failed to update user profile.");
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">
            👥 User Management
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
            Database accounts, role allocation, & shop assignments
          </p>
        </div>

        <button
          onClick={refreshAllData}
          className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:text-emerald-500 transition-colors shadow-xs text-xs font-bold cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh List
        </button>
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 font-black text-[9px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/40">
                <th className="px-6 py-4">User Info</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Account Role</th>
                <th className="px-6 py-4">Shop Assignment</th>
                <th className="px-6 py-4">Approval Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {users.map((u) => {
                const isEditing = u.uid === editingUid;
                const displayName = u.name || u.fullName || 'Registered User';
                const status = u.accountStatus || (u.role === 'owner' ? 'pending' : 'active');
                
                return (
                  <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                    
                    {/* User profile details */}
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-400 shrink-0">
                        {u.role === 'admin' ? (
                          <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                        ) : (
                          <User className="h-4.5 w-4.5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white truncate max-w-[150px]">
                          {displayName}
                        </h4>
                        <span className="text-[9px] text-slate-400 block mt-0.5 truncate max-w-[150px]">
                          UID: {u.uid}
                        </span>
                        {u.role === 'rider' && (
                          <div className="flex gap-2 mt-1.5 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800/40 text-[9px]">
                            {u.dlUrl ? (
                              <a href={u.dlUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 font-extrabold flex items-center">
                                🪪 DL
                              </a>
                            ) : (
                              <span className="text-slate-400 italic font-semibold">No DL</span>
                            )}
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            {u.aadhaarUrl ? (
                              <a href={u.aadhaarUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 font-extrabold flex items-center">
                                🆔 Aadhaar
                              </a>
                            ) : (
                              <span className="text-slate-400 italic font-semibold">No Aadhaar</span>
                            )}
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            {u.rcUrl ? (
                              <a href={u.rcUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 font-extrabold flex items-center">
                                📄 RC
                              </a>
                            ) : (
                              <span className="text-slate-400 italic font-semibold">No RC</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Contact number */}
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                      {u.phone || 'N/A'}
                    </td>

                    {/* Role field / selector */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={(e: any) => setEditRole(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl px-2 py-1.5 focus:outline-none font-bold text-[11px]"
                        >
                          <option value="customer">Customer</option>
                          <option value="owner">Shopkeeper Owner</option>
                          <option value="rider">Delivery Rider</option>
                          <option value="admin">System Admin</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider block w-max
                          ${u.role === 'admin' ? 'bg-emerald-500/10 text-emerald-500' : ''}
                          ${u.role === 'owner' ? 'bg-indigo-500/10 text-indigo-500' : ''}
                          ${u.role === 'rider' ? 'bg-orange-500/10 text-orange-500' : ''}
                          ${!u.role || u.role === 'customer' ? 'bg-slate-500/10 text-slate-500' : ''}
                        `}>
                          {u.role || 'customer'}
                        </span>
                      )}
                    </td>

                    {/* Linked shop assignment */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        editRole === 'owner' ? (
                          <select
                            value={editShopId}
                            onChange={(e) => setEditShopId(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl px-2 py-1.5 focus:outline-none font-bold text-[11px] max-w-[140px]"
                          >
                            <option value="">No Shop Link</option>
                            {shops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-400 italic font-semibold">N/A</span>
                        )
                      ) : (
                        u.shopId ? (
                          <span className="font-extrabold text-indigo-500 bg-indigo-500/5 px-2 py-1 rounded-lg text-[10px]">
                            {u.shopId}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-semibold">—</span>
                        )
                      )}
                    </td>

                    {/* Account Approval Status */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          value={editAccountStatus}
                          onChange={(e: any) => setEditAccountStatus(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl px-2 py-1.5 focus:outline-none font-bold text-[11px]"
                        >
                          <option value="active">Active / Approved</option>
                          <option value="approved">Approved</option>
                          <option value="pending">Pending Review</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider block w-max
                          ${status === 'active' || status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : ''}
                          ${status === 'pending' ? 'bg-amber-500/10 text-amber-500' : ''}
                          ${status === 'suspended' ? 'bg-red-500/10 text-red-500' : ''}
                        `}>
                          {status}
                        </span>
                      )}
                    </td>

                    {/* Edit control actions */}
                    <td className="px-6 py-4 text-center">
                      {isEditing ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleSave(u.uid)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl font-black text-[10px] uppercase cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingUid(null)}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold text-[10px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(u)}
                          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:text-emerald-500 rounded-xl font-black text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          Modify Role
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
