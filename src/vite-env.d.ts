/// <reference types="vite/client" />

declare const __FALLBACK_GOOGLE_MAPS_API_KEY__: string;

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
