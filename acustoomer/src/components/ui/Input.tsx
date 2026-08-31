import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-gray-400 dark:text-gray-500">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 outline-none
            ${leftIcon ? 'pl-11' : ''}
            ${rightIcon ? 'pr-11' : ''}
            ${error 
              ? 'border-[#FF4D4F] bg-[#FF4D4F]/10 focus:border-[#FF4D4F] focus:ring-1 focus:ring-[#FF4D4F]' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 placeholder-[#757575] focus:border-[#0B74E8] focus:ring-2 focus:ring-[#0B74E8]/10'
            }
            ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 text-gray-400 dark:text-gray-500">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <span className="text-xs font-semibold text-red-500">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
