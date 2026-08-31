import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl font-extrabold transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  
  const variants = {
    primary: 'border border-[#0B74E8] bg-[#0B74E8] text-white shadow-sm shadow-[#0B74E8]/20 hover:border-[#0758C7] hover:bg-[#0758C7] hover:shadow-md active:scale-[0.98]',
    secondary: 'bg-white dark:bg-[#1E293B] border border-[#0B74E8]/50 text-[#0758C7] dark:text-[#90CAF9] hover:bg-blue-50 dark:hover:bg-blue-950/30 active:scale-[0.98] shadow-sm',
    outline: 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-transparent hover:border-[#0B74E8] hover:text-[#0B74E8] active:scale-[0.98]',
    ghost: 'hover:bg-gray-150 dark:hover:bg-[#1E293B] text-gray-600 dark:text-[#94A3B8] hover:text-gray-900 dark:hover:text-white active:scale-[0.98]',
    danger: 'border border-[#D32F2F] bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-sm shadow-red-500/10 active:scale-[0.98]'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <motion.button
      whileTap={!disabled && !isLoading ? { scale: 0.96 } : {}}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      disabled={disabled || isLoading}
      {...(props as any)}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-current mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </motion.button>
  );
};
