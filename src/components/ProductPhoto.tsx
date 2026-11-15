import { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  getCategoryFallbackDataUri,
  resolveKitAssetUrl,
  type KitCategory,
} from '../data/kitAssets';
import {
  compressImageToDataUrl,
  readCachedPhoto,
  writeCachedPhoto,
} from '../utils/photoCache';

export interface ProductPhotoTarget {
  id?: string;
  name: string;
  category?: KitCategory | string;
  sealedCode?: string;
  imagePath?: string;
  photoDataUrl?: string;
}

interface ProductPhotoProps {
  product: ProductPhotoTarget;
  showSealBadge?: boolean;
  compact?: boolean;
  className?: string;
  onPhotoCached?: (kitId: string, dataUrl: string) => void;
}

export function ProductPhoto({
  product,
  showSealBadge = false,
  className = '',
  onPhotoCached,
}: ProductPhotoProps) {
  const bundledUrl = useMemo(
    () => resolveKitAssetUrl(product.imagePath, product.id, product.category),
    [product.imagePath, product.id, product.category]
  );

  const fallbackDataUri = useMemo(
    () => getCategoryFallbackDataUri(product.category, product.sealedCode),
    [product.category, product.sealedCode]
  );

  const resolvedInitialSrc = useMemo(() => {
    if (product.photoDataUrl && product.photoDataUrl.startsWith('data:image/')) {
      return product.photoDataUrl;
    }
    const cached = readCachedPhoto(product.id, bundledUrl);
    if (cached) {
      return cached;
    }
    return bundledUrl || fallbackDataUri;
  }, [product.photoDataUrl, product.id, bundledUrl, fallbackDataUri]);

  const [activeSrc, setActiveSrc] = useState<string>(resolvedInitialSrc);
  const cachingInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setActiveSrc(resolvedInitialSrc);
    if (
      product.id &&
      product.photoDataUrl &&
      product.photoDataUrl.startsWith('data:image/')
    ) {
      writeCachedPhoto(product.id, product.photoDataUrl, bundledUrl);
    }
  }, [resolvedInitialSrc, product.id, product.photoDataUrl, bundledUrl]);

  const handleImageLoad = () => {
    if (!product.id) return;
    if (activeSrc.startsWith('data:image/')) return;
    const cacheKey = `${product.id}:${activeSrc}`;
    if (cachingInFlightRef.current.has(cacheKey)) return;
    if (readCachedPhoto(product.id, activeSrc)) return;

    cachingInFlightRef.current.add(cacheKey);
    compressImageToDataUrl(activeSrc, {
      targetWidth: 480,
      targetHeight: 360,
      quality: 0.80,
    })
      .then((dataUrl) => {
        if (!product.id) return;
        writeCachedPhoto(product.id, dataUrl, activeSrc);
        onPhotoCached?.(product.id, dataUrl);
      })
      .catch(() => {
        // Non-blocking background cache warm-up
      })
      .finally(() => {
        cachingInFlightRef.current.delete(cacheKey);
      });
  };

  const handleImageError = () => {
    if (activeSrc !== fallbackDataUri) {
      setActiveSrc(fallbackDataUri);
    }
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-100 via-teal-50/50 to-slate-100 dark:from-slate-800 dark:via-teal-950/40 dark:to-slate-900 ${className}`}
    >
      <img
        src={activeSrc}
        alt={product.name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
      />

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
