import {
  CATEGORY_STUDIO_VARIANTS,
  HERO_KIT_ASSET,
  type KitCategory,
} from '../data/kitAssets';
import type { ReliefKit } from '../types';

const PHOTO_CACHE_STORAGE_KEY = 'qcc_kit_photo_cache_v1';
const MAX_CACHED_DATA_URL_LENGTH = 185000;
const MAX_CACHE_ENTRIES = 32;

interface CachedPhotoEntry {
  srcKey: string;
  dataUrl: string;
  updatedAt: number;
}

type PhotoCacheMap = Record<string, CachedPhotoEntry>;

const STUDIO_LIGHTING_GRADES = [
  'brightness(1.03) contrast(1.04) saturate(1.06)',
  'brightness(1.06) contrast(1.02) saturate(0.98) sepia(0.05)',
  'brightness(1.01) contrast(1.07) saturate(1.10)',
  'brightness(1.04) contrast(1.05) saturate(1.03) hue-rotate(-3deg)',
];

function readCacheMap(): PhotoCacheMap {
  try {
    const raw = window.localStorage.getItem(PHOTO_CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as PhotoCacheMap;
    }
  } catch {
    // ignore corrupted or unavailable localStorage
  }
  return {};
}

function writeCacheMap(map: PhotoCacheMap): void {
  try {
    const entries = Object.entries(map);
    if (entries.length > MAX_CACHE_ENTRIES) {
      entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);
      const trimmed: PhotoCacheMap = {};
      for (const [k, v] of entries.slice(0, MAX_CACHE_ENTRIES)) {
        trimmed[k] = v;
      }
      window.localStorage.setItem(PHOTO_CACHE_STORAGE_KEY, JSON.stringify(trimmed));
      return;
    }
    window.localStorage.setItem(PHOTO_CACHE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // If storage quota is exceeded, prune oldest half and retry once
    try {
      const entries = Object.entries(map).sort((a, b) => b[1].updatedAt - a[1].updatedAt);
      const half: PhotoCacheMap = {};
      for (const [k, v] of entries.slice(0, Math.max(8, Math.floor(entries.length / 2)))) {
        half[k] = v;
      }
      window.localStorage.setItem(PHOTO_CACHE_STORAGE_KEY, JSON.stringify(half));
    } catch {
      // ignore storage quota errors cleanly
    }
  }
}

export function readCachedPhoto(kitId?: string, expectedSrcKey?: string): string | null {
  if (!kitId || typeof window === 'undefined') return null;
  const map = readCacheMap();
  const entry = map[kitId];
  if (!entry || typeof entry.dataUrl !== 'string' || !entry.dataUrl.startsWith('data:image/')) {
    return null;
  }
  if (expectedSrcKey && entry.srcKey && entry.srcKey !== expectedSrcKey) {
    return null;
  }
  return entry.dataUrl;
}

export function writeCachedPhoto(
  kitId: string,
  dataUrl: string,
  srcKey = 'custom'
): void {
  if (!kitId || typeof window === 'undefined') return;
  if (!dataUrl.startsWith('data:image/') || dataUrl.length > MAX_CACHED_DATA_URL_LENGTH) {
    return;
  }
  const map = readCacheMap();
  map[kitId] = {
    srcKey,
    dataUrl,
    updatedAt: Date.now(),
  };
  writeCacheMap(map);
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for processing'));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read image file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read selected file'));
    reader.readAsDataURL(file);
  });
}

export async function compressImageToDataUrl(
  source: string | File,
  options?: {
    filter?: string;
    targetWidth?: number;
    targetHeight?: number;
    quality?: number;
  }
): Promise<string> {
  const targetWidth = options?.targetWidth ?? 480;
  const targetHeight = options?.targetHeight ?? 360;
  let quality = options?.quality ?? 0.80;

  const rawSrc = typeof source === 'string' ? source : await readFileAsDataUrl(source);
  const img = await loadImageElement(rawSrc);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Center-crop to 4:3 (object-cover equivalent)
  const srcRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const dstRatio = targetWidth / targetHeight;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (srcRatio > dstRatio) {
    sw = img.naturalHeight * dstRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else if (srcRatio < dstRatio) {
    sh = img.naturalWidth / dstRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  if (options?.filter) {
    ctx.filter = options.filter;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > MAX_CACHED_DATA_URL_LENGTH && quality > 0.45) {
    quality = Math.max(0.42, quality - 0.12);
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}

const variantCursorByKitId = new globalThis.Map<string, number>();

export async function regenerateStudioPhotoForKit(
  kit: ReliefKit
): Promise<{ imagePath: string; photoDataUrl: string }> {
  const category = kit.category as KitCategory;
  const pool =
    CATEGORY_STUDIO_VARIANTS[category] && CATEGORY_STUDIO_VARIANTS[category].length > 0
      ? CATEGORY_STUDIO_VARIANTS[category]
      : [HERO_KIT_ASSET];

  const prevCursor = variantCursorByKitId.get(kit.id) ?? 0;
  const nextCursor = prevCursor + 1;
  variantCursorByKitId.set(kit.id, nextCursor);

  // Pick a different studio photograph from the category pool when available
  const currentIdx = pool.indexOf(kit.imagePath);
  const candidateIdx =
    currentIdx >= 0
      ? (currentIdx + nextCursor) % pool.length
      : nextCursor % pool.length;
  const selectedVariantUrl = pool[candidateIdx] ?? HERO_KIT_ASSET;
  const grade = STUDIO_LIGHTING_GRADES[nextCursor % STUDIO_LIGHTING_GRADES.length];

  const dataUrl = await compressImageToDataUrl(selectedVariantUrl, {
    filter: grade,
    targetWidth: 480,
    targetHeight: 360,
    quality: 0.80,
  });

  writeCachedPhoto(kit.id, dataUrl, selectedVariantUrl);
  return {
    imagePath: selectedVariantUrl,
    photoDataUrl: dataUrl,
  };
}
