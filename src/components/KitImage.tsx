import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { resolveKitImagePath, type KitCategory } from '../data/kitAssets';
import { CategoryKitIllustration } from './CategoryKitIllustration';

interface KitImageProps {
  src?: string | null;
  alt: string;
  code: string;
  kitId?: string;
  category?: KitCategory | string;
  showSealBadge?: boolean;
  compact?: boolean;
  className?: string;
}

export function KitImage({
  src,
  alt,
  code,
  kitId,
  category,
  showSealBadge = false,
  compact = false,
  className = '',
}: KitImageProps) {
  const resolvedSrc = resolveKitImagePath(
    src,
    kitId,
    category as KitCategory | undefined
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-100 via-teal-50/50 to-slate-100 dark:from-slate-800 dark:via-teal-950/50 dark:to-slate-900 ${className}`}
    >
      {hasError || !resolvedSrc ? (
        <CategoryKitIllustration
          category={category}
          code={code}
          compact={compact}
        />
      ) : (
        <img
          src={resolvedSrc}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />
      )}

      {showSealBadge && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent flex items-end justify-between">
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900/85 backdrop-blur-md border border-white/15 px-2 py-1 text-[10px] font-semibold text-white tracking-tight shadow-xs">
            <ShieldCheck className="w-3 h-3 text-teal-300 shrink-0" />
            <span>Authentic Sealed OTC</span>
          </span>
        </div>
      )}
    </div>
  );
}
