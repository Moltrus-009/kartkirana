import React, { useEffect, useState } from 'react';

type SafeImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  fallback?: React.ReactNode;
};

/**
 * Prevents React from rendering an empty image source and replaces broken
 * catalogue URLs with an in-layout placeholder.
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = '',
  className = '',
  fallback = '🛍️',
  ...props
}) => {
  const normalizedSrc = typeof src === 'string' ? src.trim() : '';
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [normalizedSrc]);

  if (!normalizedSrc || failed) {
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`flex items-center justify-center bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800 ${className}`}
      >
        <span aria-hidden="true">{fallback}</span>
      </span>
    );
  }

  return (
    <img
      {...props}
      src={normalizedSrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};
