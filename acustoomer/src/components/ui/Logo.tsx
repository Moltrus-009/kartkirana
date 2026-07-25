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

  // The supplied customer artwork already includes the complete brand lockup
  // and tagline, so rendering it alone keeps the identity consistent.
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <img
        src="/logo.jpeg"
        alt="Kart Kirana customer app"
        style={{ width: current.width, height: current.height }}
        className="shrink-0 rounded-[16px] object-contain transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
};
