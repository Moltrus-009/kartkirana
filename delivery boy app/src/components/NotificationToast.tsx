import React, { useEffect } from 'react';
import { Bell, Info, CheckCircle2, AlertTriangle, CreditCard, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'payment' | 'alert';
  title: string;
  text: string;
  duration?: number;
}

interface NotificationToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const time = toast.duration || 4000;
    const timer = setTimeout(() => {
      onClose();
    }, time);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'payment':
        return <CreditCard className="h-5 w-5 text-emerald-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-sky-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-emerald-500/25';
      case 'warning':
        return 'border-amber-500/25';
      case 'payment':
        return 'border-emerald-500/35';
      case 'info':
        return 'border-sky-500/25';
      default:
        return 'border-primary/25';
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-bounce">
      <div className={`bg-slate-900/95 dark:bg-zinc-900/95 text-white backdrop-blur-md p-4 rounded-xl border ${getBorderColor()} shadow-2xl flex items-start space-x-3`}>
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-grow space-y-0.5">
          <p className="text-xs font-black text-white">{toast.title}</p>
          <p className="text-[10px] text-slate-350 leading-relaxed font-semibold">{toast.text}</p>
        </div>
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-white flex-shrink-0 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
