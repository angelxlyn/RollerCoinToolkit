import React, { useState, useEffect } from 'react';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { ensureFullUrl } from '../lib/utils';
import { cn } from '../lib/utils';

interface MinerImageProps {
  image: string | undefined;
  name?: string;
  className?: string;
  fallbackClassName?: string;
  showFallbackText?: boolean;
  baseUrl?: string;
  extension?: string;
}

export default function MinerImage({ 
  image, 
  name = 'Miner', 
  className, 
  fallbackClassName,
  showFallbackText = true,
  baseUrl = 'miners',
  extension = '.gif'
}: MinerImageProps) {
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(() => 
    image ? ensureFullUrl(image, baseUrl, extension) : ''
  );

  useEffect(() => {
    setError(false);
    if (image) {
      setCurrentSrc(ensureFullUrl(image, baseUrl, extension));
    } else {
      setCurrentSrc('');
    }
  }, [image, baseUrl, extension]);

  if (!image || !currentSrc) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 text-slate-600 bg-slate-900/50 rounded-xl", fallbackClassName)}>
        <ImageIcon className="w-8 h-8 opacity-20" />
        {showFallbackText && <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image</span>}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 text-slate-600 bg-slate-900/50 rounded-xl", fallbackClassName)}>
        <AlertCircle className="w-8 h-8 text-red-500/20" />
        {showFallbackText && <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/40">Not Found</span>}
      </div>
    );
  }

  return (
    <img 
      src={currentSrc} 
      alt={name} 
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        if (currentSrc.includes('.gif')) {
          setCurrentSrc(currentSrc.replace('.gif', '.png'));
        } else if (currentSrc.includes('/market/')) {
          setCurrentSrc(currentSrc.replace('/market/', '/storage/'));
        } else if (currentSrc.includes('static.rollercoin.com')) {
          setCurrentSrc(currentSrc.replace('static.rollercoin.com', 'rollercoin.com'));
        } else {
          setError(true);
        }
      }}
    />
  );
}
