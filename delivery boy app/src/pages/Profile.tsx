import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Phone, 
  Bike, 
  Star, 
  FileText, 
  CheckCircle2, 
  LogOut, 
  Edit2, 
  Save, 
  ShieldCheck,
  Upload,
  Eye
} from 'lucide-react';
import { uploadFile, STORAGE_PATHS } from '../services/storageService';

export const Profile: React.FC = () => {
  const { user, logout, setOnlineStatus, updateProfile } = useApp();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.fullName || 'Rider');
  const [vehicleType, setVehicleType] = useState<'Bike' | 'Scooter' | 'Cycle'>(user?.vehicleType || 'Bike');
  const [vehicleNumber, setVehicleNumber] = useState(user?.vehicleNumber || 'Not set');

  // File Upload Progress States
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [dlProgress, setDlProgress] = useState(0);
  const [aadhaarProgress, setAadhaarProgress] = useState(0);
  const [rcProgress, setRcProgress] = useState(0);

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout from the partner app?")) {
      await setOnlineStatus(false);
      await logout();
    }
  };

  const handleSave = async () => {
    setIsEditing(false);
    await updateProfile({
      fullName: name,
      vehicleType,
      vehicleNumber
    });
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'dl' | 'aadhaar' | 'rc') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const setProgress = 
      type === 'avatar' ? setAvatarProgress :
      type === 'dl' ? setDlProgress :
      type === 'aadhaar' ? setAadhaarProgress :
      setRcProgress;

    setProgress(1);

    try {
      let path = '';
      if (type === 'avatar') {
        path = STORAGE_PATHS.riderProfile(user.uid);
      } else if (type === 'dl') {
        path = STORAGE_PATHS.riderDoc(user.uid, 'driving-license');
      } else if (type === 'aadhaar') {
        path = STORAGE_PATHS.riderDoc(user.uid, 'aadhaar');
      } else {
        path = STORAGE_PATHS.riderDoc(user.uid, 'rc');
      }

      const downloadUrl = await uploadFile(path, file, {
        compress: type !== 'dl' && type !== 'rc', // Compress photos, keep PDF/scans original
        quality: 0.85,
        onProgress: (p) => setProgress(Math.round(p))
      });

      if (type === 'avatar') {
        await updateProfile({ avatarUrl: downloadUrl });
      } else if (type === 'dl') {
        await updateProfile({ dlUrl: downloadUrl });
      } else if (type === 'aadhaar') {
        await updateProfile({ aadhaarUrl: downloadUrl });
      } else {
        await updateProfile({ rcUrl: downloadUrl });
      }
      alert(`${type.toUpperCase()} uploaded successfully!`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to upload ${type}: ` + (err.message || String(err)));
    } finally {
      setProgress(0);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in text-left">
      
      <div className="flex justify-between items-center pb-1">
        <h2 className="text-base font-black uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
          Partner Profile
        </h2>
        <span className="text-[10px] bg-primary-light text-primary px-2.5 py-0.5 rounded font-extrabold uppercase border border-primary/10">
          ID: {user?.uid.substring(0, 10).toUpperCase() || 'RIDER-ID'}
        </span>
      </div>

      {/* Main Profile Header Card */}
      <section className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-5 rounded-2xl shadow-xs text-center space-y-4 relative overflow-hidden transition-all duration-300">
        {/* Verification banner overlay */}
        <div className="absolute top-3.5 right-3.5 bg-success-light text-success border border-success/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide flex items-center space-x-1">
          <ShieldCheck className="h-3.5 w-3.5 animate-pulse" />
          <span>Active Partner</span>
        </div>

        {/* Initial/Avatar representation */}
        <div className="mx-auto h-20 w-20 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center border-4 border-slate-200/40 dark:border-zinc-700 shadow-md relative overflow-hidden group">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-slate-650 dark:text-zinc-350">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          {/* Upload Overlay */}
          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-black uppercase cursor-pointer select-none">
            <Upload className="h-4 w-4 mb-0.5" />
            <span>{avatarProgress > 0 ? `${avatarProgress}%` : 'Upload'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleDocUpload(e, 'avatar')}
              disabled={avatarProgress > 0}
            />
          </label>
        </div>

        <div className="space-y-1">
          {isEditing ? (
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 px-3 py-1.5 rounded text-center text-sm font-black focus:outline-hidden dark:text-white"
            />
          ) : (
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {user?.fullName || 'Rider Partner'}
            </h3>
          )}
          
          <p className="text-[10px] text-slate-455 dark:text-zinc-500 font-semibold flex items-center justify-center space-x-1.5 leading-none">
            <Phone className="h-3 w-3 text-slate-400" />
            <span>{user?.phone || 'No phone set'}</span>
          </p>
        </div>

        {/* Rating and Deliveries stats widget */}
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-zinc-800 pt-4 text-xs font-bold text-center">
          <div className="space-y-0.5 border-r border-slate-100 dark:border-zinc-800">
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Average Rating</p>
            <div className="flex items-center justify-center space-x-1 font-black text-slate-805 dark:text-zinc-200">
              <Star className="h-3.5 w-3.5 text-warning fill-warning" />
              <span>{user?.rating || 'No ratings'}</span>
            </div>
          </div>
          
          <div className="space-y-0.5">
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Total Trips Completed</p>
            <p className="font-black text-slate-805 dark:text-zinc-200">
              {user?.totalDeliveries || 0} Orders
            </p>
          </div>
        </div>
      </section>

      {/* Vehicle details edit card */}
      <section className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-3.5 transition-all duration-300">
        <div className="flex justify-between items-center border-b border-slate-105 dark:border-zinc-800 pb-2.5">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Vehicle & Registration Details
          </h4>
          
          {isEditing ? (
            <button 
              onClick={handleSave}
              className="text-[9px] font-black uppercase text-success flex items-center space-x-1 hover:underline cursor-pointer transition"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
            </button>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-[9px] font-black uppercase text-primary flex items-center space-x-1 hover:underline cursor-pointer transition"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Details</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
          <div className="space-y-0.5 text-left">
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Vehicle Type</p>
            {isEditing ? (
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 p-1.5 rounded focus:outline-hidden dark:text-white"
              >
                <option value="Bike">Bike</option>
                <option value="Scooter">Scooter</option>
                <option value="Cycle">Cycle</option>
              </select>
            ) : (
              <p className="font-extrabold text-slate-800 dark:text-zinc-200 flex items-center space-x-1">
                <Bike className="h-4 w-4 text-primary" />
                <span>{user?.vehicleType || 'Bike'}</span>
              </p>
            )}
          </div>

          <div className="space-y-0.5 text-left">
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Registration Number</p>
            {isEditing ? (
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-255 dark:border-zinc-700 p-1.5 rounded focus:outline-hidden dark:text-white"
              />
            ) : (
              <p className="font-extrabold text-slate-800 dark:text-zinc-200">
                {user?.vehicleNumber || 'Not registered'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Documents Status */}
      <section className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border p-4.5 rounded-2xl shadow-xs space-y-3.5">
        <div className="border-b border-slate-100 dark:border-dark-border pb-2.5">
          <h4 className="text-[10px] font-black uppercase text-slate-455 tracking-wider">
            Verification Documents Status
          </h4>
        </div>

        <div className="space-y-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
          {/* Driving License */}
          <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-slate-200/20">
            <span className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <span>Driving License (DL)</span>
            </span>
            <div className="flex items-center gap-2">
              {user?.dlUrl ? (
                <>
                  <a href={user.dlUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-450 hover:text-primary transition shrink-0" title="View DL">
                    <Eye className="h-4.5 w-4.5" />
                  </a>
                  <span className="text-success flex items-center space-x-1 text-[9px] font-black uppercase bg-success/10 px-2 py-0.5 rounded border border-success/10">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Uploaded</span>
                  </span>
                </>
              ) : null}
              <label className="text-[9px] font-black uppercase bg-slate-100 dark:bg-zinc-800 px-2 py-1.5 hover:text-emerald-500 rounded border border-slate-200 dark:border-dark-border cursor-pointer flex items-center gap-1 select-none">
                <Upload className="h-3 w-3" /> {dlProgress > 0 ? `Uploading (${dlProgress}%)` : user?.dlUrl ? 'Re-upload' : 'Upload'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleDocUpload(e, 'dl')}
                  disabled={dlProgress > 0}
                />
              </label>
            </div>
          </div>

          {/* Aadhaar Identity Card */}
          <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-slate-200/20">
            <span className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <span>Aadhaar Identity Card</span>
            </span>
            <div className="flex items-center gap-2">
              {user?.aadhaarUrl ? (
                <>
                  <a href={user.aadhaarUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-450 hover:text-primary transition shrink-0" title="View Aadhaar">
                    <Eye className="h-4.5 w-4.5" />
                  </a>
                  <span className="text-success flex items-center space-x-1 text-[9px] font-black uppercase bg-success/10 px-2 py-0.5 rounded border border-success/10">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Uploaded</span>
                  </span>
                </>
              ) : null}
              <label className="text-[9px] font-black uppercase bg-slate-100 dark:bg-zinc-800 px-2 py-1.5 hover:text-emerald-500 rounded border border-slate-200 dark:border-dark-border cursor-pointer flex items-center gap-1 select-none">
                <Upload className="h-3 w-3" /> {aadhaarProgress > 0 ? `Uploading (${aadhaarProgress}%)` : user?.aadhaarUrl ? 'Re-upload' : 'Upload'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleDocUpload(e, 'aadhaar')}
                  disabled={aadhaarProgress > 0}
                />
              </label>
            </div>
          </div>

          {/* Vehicle Registration Certificate */}
          <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-slate-200/20">
            <span className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <span>Vehicle Registration Certificate (RC)</span>
            </span>
            <div className="flex items-center gap-2">
              {user?.rcUrl ? (
                <>
                  <a href={user.rcUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-450 hover:text-primary transition shrink-0" title="View RC">
                    <Eye className="h-4.5 w-4.5" />
                  </a>
                  <span className="text-success flex items-center space-x-1 text-[9px] font-black uppercase bg-success/10 px-2 py-0.5 rounded border border-success/10">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Uploaded</span>
                  </span>
                </>
              ) : null}
              <label className="text-[9px] font-black uppercase bg-slate-100 dark:bg-zinc-800 px-2 py-1.5 hover:text-emerald-500 rounded border border-slate-200 dark:border-dark-border cursor-pointer flex items-center gap-1 select-none">
                <Upload className="h-3 w-3" /> {rcProgress > 0 ? `Uploading (${rcProgress}%)` : user?.rcUrl ? 'Re-upload' : 'Upload'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleDocUpload(e, 'rc')}
                  disabled={rcProgress > 0}
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
      >
        <LogOut className="h-4.5 w-4.5" />
        <span>Logout Session</span>
      </button>

    </div>
  );
};
