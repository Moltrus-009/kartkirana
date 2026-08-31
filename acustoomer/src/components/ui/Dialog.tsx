import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 50);
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.clearTimeout(focusTimer);
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className="relative z-10 w-full md:max-w-lg bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:p-6 flex flex-col max-h-[88vh] md:max-h-[90vh]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 md:hidden dark:bg-slate-700" />
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-4">
              {title ? (
                <h3 id={titleId} className="text-lg font-black text-gray-900 dark:text-gray-100">
                  {title}
                </h3>
              ) : (
                <div />
              )}
              <button
                ref={closeButtonRef}
                aria-label="Close dialog"
                onClick={onClose}
                className="app-icon-button min-h-9 min-w-9 bg-gray-50 dark:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar pr-0.5">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
