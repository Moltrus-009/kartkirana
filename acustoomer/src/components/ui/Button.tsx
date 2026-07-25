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
  const baseStyles = 'inline-flex items-center justify-center font-extrabold rounded-full transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm';
  
  const variants = {
    primary: 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] hover:from-[#43A047] hover:to-[#1B5E20] text-white shadow-md shadow-[#1565C0]/20 hover:shadow-lg hover:shadow-[#1565C0]/30 active:scale-[0.98] btn-glossy border border-[#90CAF9]/20',
    secondary: 'bg-white dark:bg-[#1E293B] border border-[#1E88E5] text-[#1565C0] dark:text-[#90CAF9] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] active:scale-[0.98] shadow-sm',
    outline: 'border border-[#1E88E5]/40 text-[#1565C0] dark:text-[#90CAF9] bg-transparent hover:bg-[#1E88E5]/10 active:scale-[0.98]',
    ghost: 'hover:bg-gray-150 dark:hover:bg-[#1E293B] text-gray-600 dark:text-[#94A3B8] hover:text-gray-900 dark:hover:text-white active:scale-[0.98]',
    danger: 'bg-gradient-to-r from-[#D32F2F] to-[#C62828] hover:from-[#C62828] hover:to-[#B71C1C] text-white shadow-md shadow-red-500/10 active:scale-[0.98]'
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
