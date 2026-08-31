import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAddress } from '../context/AddressContext';
import { dbService } from '../services/dbService';
import { UserAddress, NotificationItem } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { MapPin, LogOut, Shield, FileText, Lock, Bell, CreditCard, ChevronRight, Plus, Check, Trash2, Heart, Headphones, Upload, Image as ImageIcon, ShoppingBag, CalendarClock } from 'lucide-react';
import { AddressSelectorModal } from '../components/AddressSelectorModal';
import { useLanguage } from '../context/LanguageContext';
import { uploadFile, STORAGE_PATHS } from '../infrastructure/storage/localStorage';
import { SafeImage } from '../components/ui/SafeImage';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser, logoutUser } = useAuth();
  const { addresses, addAddress, editAddress, deleteAddress } = useAddress();
  const { language, setLanguage, t } = useLanguage();

  // Dialog controllers
  const [activeModal, setActiveModal] = useState<'profile' | 'address' | 'payments' | 'notifications' | 'terms' | 'about' | 'support' | null>(null);
  
  // Profile inputs
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [photoInput, setPhotoInput] = useState('');

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setUploadProgress(1);

    try {
      const path = STORAGE_PATHS.userProfile(user.uid);
      const url = await uploadFile(path, file, {
        compress: true,
        quality: 0.8,
        maxWidth: 400,
        maxHeight: 400,
        onProgress: (p) => setUploadProgress(Math.round(p))
      });
      setPhotoInput(url);
    } catch (err: any) {
      alert('Photo upload failed: ' + (err.message || String(err)));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Address form modal states
  const [selectedAddressToEdit, setSelectedAddressToEdit] = useState<UserAddress | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Notification items state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setNameInput(user.name);
    setEmailInput(user.email);
    setPhotoInput(user.profileImage);

    // Fetch notifications
    dbService.getNotifications(user.uid).then(list => setNotifications(list));
  }, [user, navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser({
        name: nameInput,
        email: emailInput,
        profileImage: photoInput
      });
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const handleAddressSave = async (payload: Omit<UserAddress, 'id'>) => {
    try {
      if (selectedAddressToEdit) {
        await editAddress(selectedAddressToEdit.id, payload);
      } else {
        await addAddress(payload);
      }
      setIsAddressModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save address.');
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!user) return;
    await dbService.markNotificationRead(user.uid, id);
    // Reload notifications list
    const list = await dbService.getNotifications(user.uid);
    setNotifications(list);
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 pb-24 text-left space-y-4">
      
      {/* Title Header */}
      <div className="py-4 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider">
          {t('profile_settings')}
        </h2>
      </div>

      {/* User Card */}
      <div className="surface-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SafeImage
            src={user.profileImage}
            alt={user.name}
            className="h-14 w-14 rounded-full border border-[#E2E8F0] dark:border-[#334155] object-cover"
            fallback="👤"
          />
          <div>
            <h3 className="text-base font-black text-gray-800 dark:text-white leading-tight">
              {user.name}
            </h3>
            <span className="text-xs font-semibold text-gray-400 dark:text-[#94A3B8] block mt-0.5">{user.phone}</span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-[#94A3B8] block">{user.email || 'No email attached'}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveModal('profile')}
          className="rounded-xl px-4 py-2 text-xs font-black"
        >
          {t('edit')}
        </Button>
      </div>

      {/* Profile menu categories */}
      <div className="flex flex-col gap-3.5 mt-6">
        
        <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#94A3B8] block px-1 tracking-wider">
          {t('manage_account')}
        </span>

        {/* Saved Addresses list summaries */}
        <div className="surface-card p-5 text-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0] dark:border-[#334155]">
            <span className="font-black text-gray-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
              <MapPin className="h-4.5 w-4.5 text-[#1565C0]" />
              {t('saved_delivery_locations')}
            </span>
            <button
              onClick={() => { setSelectedAddressToEdit(null); setIsAddressModalOpen(true); }}
              className="text-[10px] font-black text-[#1565C0] dark:text-[#1E88E5] uppercase flex items-center gap-0.5 cursor-pointer hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> {t('add')}
            </button>
          </div>

          <div className="flex flex-col gap-3.5 mt-3.5">
            {addresses.map(addr => (
              <div key={addr.id} className="flex items-start justify-between border-b border-[#E2E8F0] dark:border-[#334155]/40 pb-3 last:border-none last:pb-0 text-left">
                <div className="min-w-0 flex-1 pr-4">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-gray-800 dark:text-white truncate">{addr.name}</span>
                    {addr.isDefault && (
                      <span className="px-1.5 py-0.2 rounded bg-[#E2E8F0] dark:bg-[#334155] text-[#1565C0] dark:text-[#1E88E5] text-[8px] font-bold uppercase shrink-0">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-[#94A3B8] block mt-0.5 truncate">
                    {addr.details}, {addr.area}, {addr.city}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => { setSelectedAddressToEdit(addr); setIsAddressModalOpen(true); }} className="text-[10px] font-black text-[#1565C0] dark:text-[#1E88E5] hover:underline cursor-pointer">
                    {t('edit')}
                  </button>
                  <button onClick={() => deleteAddress(addr.id)} className="text-gray-300 hover:text-red-500 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Menu Toggles */}
        {[
          { id: 'orders' as const, name: 'Order history', icon: ShoppingBag, action: () => navigate('/orders') },
          { id: 'scheduled' as const, name: 'Scheduled orders', icon: CalendarClock, action: () => navigate('/preorders') },
          { id: 'payments' as const, name: t('saved_payment_methods'), icon: CreditCard },
          { id: 'wishlist' as const, name: t('my_favorite_items'), icon: Heart, action: () => navigate('/wishlist') },
          { id: 'notifications' as const, name: t('app_notifications'), icon: Bell, badge: notifications.filter(n => !n.read).length },
          { id: 'support' as const, name: t('support_helpdesk_faqs'), icon: Headphones },
          { id: 'terms' as const, name: 'Terms & Conditions', icon: FileText, action: () => navigate('/terms') },
          { id: 'privacy' as const, name: 'Privacy Policy', icon: Lock, action: () => navigate('/privacy') },
          { id: 'about' as const, name: t('about_kart_kirana'), icon: Shield }
        ].map(menu => {
          const Icon = menu.icon;
          return (
            <div
              key={menu.id}
              onClick={() => {
                if (menu.action) menu.action();
                else setActiveModal(menu.id as any);
              }}
              className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between cursor-pointer hover:border-blue-200 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 shadow-[0_8px_24px_-22px_rgba(5,10,36,0.4)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-[#1565C0] dark:text-[#1E88E5]">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-bold text-gray-800 dark:text-white">
                  {menu.name}
                </span>
                {menu.badge !== undefined && menu.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-[8px] font-black text-white shrink-0">
                    {menu.badge}
                  </span>
                )}
              </div>
              <ChevronRight className="h-4.5 w-4.5 text-gray-400" />
            </div>
          );
        })}

        {/* Preferred Language Settings Card */}
        <div className="surface-card p-5 text-xs flex flex-col gap-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155]">
            <span className="font-black text-gray-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              🌐 {t('preferred_language')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLanguage('en')}
              className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1
                ${language === 'en'
                  ? 'border-[#1565C0] bg-[#E2E8F0]/50 dark:bg-[#334155]/40 text-[#1565C0] dark:text-[#1E88E5] font-extrabold shadow-sm'
                  : 'border-[#E2E8F0] dark:border-[#334155] text-gray-500 dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#1E293B]'
                }`}
            >
              {language === 'en' && <Check className="h-3.5 w-3.5 text-[#1565C0] dark:text-[#1E88E5]" />}
              English
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1
                ${language === 'hi'
                  ? 'border-[#1565C0] bg-[#E2E8F0]/50 dark:bg-[#334155]/40 text-[#1565C0] dark:text-[#1E88E5] font-extrabold shadow-sm'
                  : 'border-[#E2E8F0] dark:border-[#334155] text-gray-500 dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#1E293B]'
                }`}
            >
              {language === 'hi' && <Check className="h-3.5 w-3.5 text-[#1565C0] dark:text-[#1E88E5]" />}
              हिन्दी
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 flex items-center justify-center gap-2 cursor-pointer mt-4 text-xs font-black"
        >
          <LogOut className="h-4.5 w-4.5" />
          {t('logout')}
        </button>

      </div>

      {/* Edit Profile Modal */}
      <Dialog isOpen={activeModal === 'profile'} onClose={() => setActiveModal(null)} title="Edit Profile">
        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
          <Input label="Name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} required />
          <Input label="Email Address" type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
          
          <div className="space-y-1.5 text-left text-xs font-bold text-gray-700 dark:text-[#94A3B8]">
            <span className="block text-[10px] uppercase tracking-wide">Avatar Image Upload</span>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gray-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                {photoInput ? (
                  <SafeImage src={photoInput} alt="Avatar Preview" className="h-full w-full object-cover" fallback="👤" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] hover:text-[#1565C0] rounded-xl cursor-pointer transition text-[10px] font-black uppercase select-none">
                <Upload className="h-3.5 w-3.5" /> {uploading ? `Uploading (${uploadProgress}%)` : 'Upload File'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <Button type="submit" fullWidth className="rounded-xl mt-2 py-3 text-xs font-black bg-gradient-to-br from-[#1E88E5] to-[#1565C0]" disabled={uploading}>
            Save Profile Settings
          </Button>
        </form>
      </Dialog>

      {/* Premium High-Precision Address Selector Modal */}
      <AddressSelectorModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleAddressSave}
        initialAddress={selectedAddressToEdit}
      />

      {/* Saved Payments Modal */}
      <Dialog isOpen={activeModal === 'payments'} onClose={() => setActiveModal(null)} title="Saved Payments">
        <div className="flex flex-col gap-3.5 text-left text-xs font-bold">
          <div className="p-4 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#1E293B] text-gray-500 border border-[#E2E8F0] dark:border-[#334155]">
                <CreditCard className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-gray-800 dark:text-white block">{user.savedPaymentMethods?.[0]?.label || 'No saved payment method'}</span>
                <span className="text-[10px] text-gray-400 font-semibold block">{user.savedPaymentMethods?.[0]?.last4 ? `Ending in ${user.savedPaymentMethods[0].last4}` : 'Manage securely during checkout'}</span>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase text-[#1565C0] dark:text-[#1E88E5] bg-[#E2E8F0] dark:bg-[#334155] px-2.5 py-1 rounded flex items-center gap-0.5">
              <Check className="h-3 w-3" /> {user.savedPaymentMethods?.[0] ? 'Linked' : 'None saved'}
            </span>
          </div>

          <p className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] p-3 text-[10px] leading-relaxed text-gray-500 dark:text-[#94A3B8]">For your security, card or UPI details are never stored in this app. Payment methods are tokenized and managed by the payment provider during checkout.</p>
        </div>
      </Dialog>

      {/* Notifications Modal */}
      <Dialog isOpen={activeModal === 'notifications'} onClose={() => setActiveModal(null)} title="System Notifications">
        <div className="flex flex-col gap-3.5 text-left text-xs font-semibold">
          {notifications.length > 0 ? (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && markNotificationAsRead(n.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5
                  ${n.read 
                    ? 'border-[#E2E8F0] dark:border-[#334155]/60 bg-gray-50/50 dark:bg-[#1E293B]/30' 
                    : 'border-[#90CAF9]/40 bg-[#E2E8F0]/30 dark:bg-[#334155]/20'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                    {n.type === 'order' ? '📦' : '🏷️'} {n.title}
                  </span>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                  )}
                </div>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-[11px]">
                  {n.body}
                </p>
                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 block">
                  {new Date(n.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <span className="text-gray-400 dark:text-[#94A3B8] italic">No notifications.</span>
          )}
        </div>
      </Dialog>

      {/* Terms Modal */}
      <Dialog isOpen={activeModal === 'terms'} onClose={() => setActiveModal(null)} title="Terms of Service">
        <div className="text-left text-xs font-semibold text-gray-550 dark:text-gray-400 leading-relaxed flex flex-col gap-3">
          <p>Welcome to Kart Kirana. By using our application, you agree to comply with our Terms of Service.</p>
          <p><strong>1. Services</strong>: We connect customers with local merchants to facilitate prompt delivery of groceries, medicines, electronics, and other merchant inventories.</p>
          <p><strong>2. Preorder Bookings</strong>: Preorder purchases are scheduled for delivery during the user-selected timeframe. Refunds on seasonal produce preorders must be requested at least 12 hours prior to scheduled delivery.</p>
        </div>
      </Dialog>

      {/* About Modal */}
      <Dialog isOpen={activeModal === 'about'} onClose={() => setActiveModal(null)} title="About Kart Kirana">
        <div className="text-left text-xs font-semibold text-gray-550 dark:text-gray-400 leading-relaxed flex flex-col gap-3">
          <h4 className="text-base font-black text-gray-800 dark:text-white">Kart Kirana Customer Client</h4>
          <p>Version: 1.0.0 (Production Build)</p>
          <p>Built using React, Vite, Tailwind CSS, and Firebase. Structured to scale for matching Shopkeeper, Delivery Partner, and Administration clients.</p>
          <p>© 2026 Kart Kirana Technology Labs. All rights reserved.</p>
        </div>
      </Dialog>

      {/* Support desk Modal */}
      <Dialog isOpen={activeModal === 'support'} onClose={() => setActiveModal(null)} title="Support Desk">
        <div className="flex flex-col gap-3 text-left text-xs text-gray-550 dark:text-gray-400 font-semibold leading-relaxed">
          <p>Our call and chat desks are open 24/7. Average response time is under 1 minute.</p>
          <div className="p-3 border border-[#E2E8F0] dark:border-[#334155] rounded-2xl flex items-center justify-between font-bold mt-2 text-gray-700 dark:text-white">
            <div>
              <span>Toll Free Number</span>
              <span className="block text-[10px] text-gray-400 font-medium">1800-419-3221</span>
            </div>
            <a href="tel:18004193221" className="px-3.5 py-2 bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white rounded-xl text-[10px] uppercase tracking-wide">
              Call
            </a>
          </div>
        </div>
      </Dialog>

    </div>
  );
};
