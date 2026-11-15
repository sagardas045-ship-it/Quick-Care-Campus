import { ProductPhoto } from './ProductPhoto';
import type { KitCategory } from '../data/kitAssets';

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
  return (
    <ProductPhoto
      product={{
        id: kitId,
        name: alt,
        category,
        sealedCode: code,
        imagePath: src ?? undefined,
      }}
      showSealBadge={showSealBadge}
      compact={compact}
      className={className}
    />
  );
}
