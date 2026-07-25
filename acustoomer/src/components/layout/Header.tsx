import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, ChevronDown, Search, Bell, Plus, Compass, Sun, Moon } from 'lucide-react';
import { useAddress } from '../../context/AddressContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { addresses, selectedAddress, selectAddress, detectCurrentLocation, addAddress } = useAddress();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const handleGPSDetect = async () => {
    setIsDetecting(true);
    try {
      const detected = await detectCurrentLocation();
      await addAddress({
        ...detected,
        isDefault: true
      });
      setIsLocationOpen(false);
    } catch (e) {
      alert('Could not locate GPS. Try again.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSelectAddress = (id: string) => {
    selectAddress(id);
    setIsLocationOpen(false);
  };

  const isHomeOrSearch = routerLocation.pathname === '/' || routerLocation.pathname === '/search';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-300 px-4 py-3">
      <div className="max-w-xl mx-auto flex flex-col gap-2.5">
        
        {/* Top Location Bar & Utilities */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 max-w-[70%]">
            <Logo size="sm" showText={false} className="h-9 w-9 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-blue-500/20 shadow-inner" />
            <div 
              onClick={() => setIsLocationOpen(true)}
              className="flex flex-col cursor-pointer text-left min-w-0"
            >
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1 leading-none">
                {selectedAddress?.name || 'Set Location'}
                <ChevronDown className="h-3.5 w-3.5 text-[#72C61D]" />
              </span>
              <span className="text-[9px] font-bold text-slate-500 dark:text-[#B8B8B8] block truncate mt-1">
                {selectedAddress ? `${selectedAddress.details}, ${selectedAddress.area}` : 'Click here to pick location'}
              </span>
            </div>
          </div>
 
          {/* Right Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-300 text-slate-500 dark:text-[#B8B8B8] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-[#FFD83D]" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {user && (
              <button
                onClick={() => navigate('/profile')}
                className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-300 text-slate-500 dark:text-[#B8B8B8] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#FFD83D] shadow-[0_0_6px_#FFD83D]" />
              </button>
            )}
          </div>
        </div>

        {/* Search Input Bar (Visible on home screen specifically or as navigators on other sheets) */}
        {isHomeOrSearch && (
          <div 
            onClick={() => {
              if (routerLocation.pathname !== '/search') {
                navigate('/search');
              }
            }}
            className="relative flex items-center cursor-pointer"
          >
            <Search className="absolute left-3.5 h-4 w-4 text-[#757575]" />
            <input
              type="text"
              readOnly={routerLocation.pathname !== '/search'}
              placeholder="Search products, shops, groceries..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#161616] border border-[#2D2D2D] text-sm font-semibold text-white placeholder-[#757575] outline-none focus:border-[#72C61D] transition-all cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Location Selector Sheet */}
      <Dialog isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} title="Select Address">
        <div className="flex flex-col gap-4 text-left">
          
          {/* GPS Auto Detector */}
          <Button 
            variant="outline" 
            fullWidth 
            onClick={handleGPSDetect} 
            isLoading={isDetecting}
            className="rounded-2xl"
          >
            <Compass className="h-5 w-5 mr-2" />
            Detect Current Location via GPS
          </Button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-100 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs font-bold text-gray-400 dark:text-gray-500">SAVED ADDRESSES</span>
            <div className="flex-grow border-t border-gray-100 dark:border-slate-800"></div>
          </div>

          {/* List Saved */}
          <div className="flex flex-col gap-3">
            {addresses.map(addr => (
              <div
                key={addr.id}
                onClick={() => handleSelectAddress(addr.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3
                  ${addr.id === selectedAddress?.id 
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-emerald-950/20' 
                    : 'border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-850'
                  }`}
              >
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{addr.name}</span>
                    {addr.isDefault && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-emerald-950 text-blue-600 dark:text-blue-400 text-[8px] font-bold uppercase">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-1 block">
                    {addr.details}, {addr.area}, {addr.city} - {addr.pinCode}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Trigger */}
          <Button 
            variant="primary" 
            fullWidth 
            onClick={() => {
              setIsLocationOpen(false);
              navigate('/profile'); // Redirects to profile settings to input custom fields
            }}
            className="rounded-2xl mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Address Manually
          </Button>

        </div>
      </Dialog>
    </header>
  );
};
