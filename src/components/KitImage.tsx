import { useState } from 'react';
import { Cross, ShieldCheck } from 'lucide-react';

interface KitImageProps {
  src: string;
  alt: string;
  code: string;
  showSealBadge?: boolean;
}

export function KitImage({
  src,
  alt,
  code,
  showSealBadge = false,
}: KitImageProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100 dark:bg-slate-800">
      {hasError ? (
        <div className="w-full h-full bg-gradient-to-br from-slate-100 via-teal-50/70 to-slate-100 dark:from-slate-800 dark:via-teal-950/60 dark:to-slate-900 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-11 h-11 rounded-xl bg-teal-600/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 flex items-center justify-center mb-2">
            <Cross className="w-5 h-5" />
          </div>
          <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
            {code}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
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
