import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  className?: string;
  variant?: 'horizontal' | 'vertical';
  textColor?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  variant = 'vertical',
  textColor = 'text-gray-900 dark:text-white',
}) => {
  const dimensions = {
    sm: { width: 36, height: 36, textClass: 'text-lg', subtextClass: 'text-[6px]' },
    md: { width: 64, height: 64, textClass: 'text-2xl', subtextClass: 'text-[8px]' },
    lg: { width: 110, height: 110, textClass: 'text-3.5xl', subtextClass: 'text-[11px]' },
    xl: { width: 160, height: 160, textClass: 'text-4.5xl', subtextClass: 'text-[13px]' },
    '2xl': { width: 220, height: 220, textClass: 'text-5xl', subtextClass: 'text-[15px]' },
  };

  const current = dimensions[size];

  if (!showText) {
    return (
      <div
        aria-label="Kart Kirana"
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#050A24] ring-1 ring-blue-400/20 ${className}`}
        style={{ width: current.width, height: current.height }}
      >
        <span className="-skew-x-6 text-sm font-black tracking-[-0.18em]" aria-hidden="true">
          <span className="text-[#FFC928]">K</span><span className="text-[#36B6F4]">K</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center ${variant === 'horizontal' ? 'gap-2.5' : 'flex-col'} ${className}`}>
      <img
        src="/logo.jpeg"
        alt="Kart Kirana"
        style={{ width: current.width, height: current.height }}
        className="shrink-0 rounded-[16px] object-contain"
      />
      {variant === 'horizontal' && (
        <div className="hidden min-w-0 lg:block text-left leading-none">
          <strong className={`block whitespace-nowrap text-lg font-black tracking-tight ${textColor}`}>Kart Kirana</strong>
          <span className="mt-1 block whitespace-nowrap text-[7px] font-black uppercase tracking-[0.18em] text-[#0B74E8]">Har dukaan, ek pehchaan</span>
        </div>
      )}
    </div>
  );
};
