import { useId } from 'react';
import type { KitCategory } from '../data/kitAssets';

interface CategoryKitIllustrationProps {
  category?: KitCategory | string;
  code?: string;
  compact?: boolean;
}

interface CategoryTheme {
  backdropFrom: string;
  backdropTo: string;
  glow: string;
  boxFront: string;
  boxSide: string;
  boxTop: string;
  accent: string;
  accentSoft: string;
  variant:
    | 'fever'
    | 'headache'
    | 'stomach'
    | 'firstaid'
    | 'hydration'
    | 'period'
    | 'hygiene'
    | 'sleep';
}

const CATEGORY_THEMES: Record<KitCategory, CategoryTheme> = {
  'Fever & Cold': {
    backdropFrom: '#ecfeff',
    backdropTo: '#ccfbf1',
    glow: '#14b8a6',
    boxFront: '#0f766e',
    boxSide: '#115e59',
    boxTop: '#2dd4bf',
    accent: '#ffffff',
    accentSoft: '#99f6e4',
    variant: 'fever',
  },
  'Headache & Migraine': {
    backdropFrom: '#eef2ff',
    backdropTo: '#e0e7ff',
    glow: '#6366f1',
    boxFront: '#312e81',
    boxSide: '#1e1b4b',
    boxTop: '#818cf8',
    accent: '#ffffff',
    accentSoft: '#c7d2fe',
    variant: 'headache',
  },
  'Stomach & Acidity': {
    backdropFrom: '#ecfdf5',
    backdropTo: '#d1fae5',
    glow: '#10b981',
    boxFront: '#047857',
    boxSide: '#065f46',
    boxTop: '#34d399',
    accent: '#ffffff',
    accentSoft: '#a7f3d0',
    variant: 'stomach',
  },
  'First-Aid & Sprains': {
    backdropFrom: '#fef2f2',
    backdropTo: '#f1f5f9',
    glow: '#ef4444',
    boxFront: '#f8fafc',
    boxSide: '#cbd5e1',
    boxTop: '#ffffff',
    accent: '#dc2626',
    accentSoft: '#fecaca',
    variant: 'firstaid',
  },
  'Hydration & Energy': {
    backdropFrom: '#f0f9ff',
    backdropTo: '#cffafe',
    glow: '#06b6d4',
    boxFront: '#0284c7',
    boxSide: '#0369a1',
    boxTop: '#38bdf8',
    accent: '#ffffff',
    accentSoft: '#bae6fd',
    variant: 'hydration',
  },
  'Period & Cramp Care': {
    backdropFrom: '#fff1f2',
    backdropTo: '#ffe4e6',
    glow: '#f43f5e',
    boxFront: '#be123c',
    boxSide: '#9f1239',
    boxTop: '#fb7185',
    accent: '#ffffff',
    accentSoft: '#fecdd3',
    variant: 'period',
  },
  'Personal Hygiene & Masks': {
    backdropFrom: '#f0fdfa',
    backdropTo: '#e0f2fe',
    glow: '#0d9488',
    boxFront: '#0f172a',
    boxSide: '#020617',
    boxTop: '#2dd4bf',
    accent: '#ffffff',
    accentSoft: '#99f6e4',
    variant: 'hygiene',
  },
  'Sleep & Wellness': {
    backdropFrom: '#f5f3ff',
    backdropTo: '#ede9fe',
    glow: '#8b5cf6',
    boxFront: '#4c1d95',
    boxSide: '#2e1065',
    boxTop: '#a78bfa',
    accent: '#ffffff',
    accentSoft: '#ddd6fe',
    variant: 'sleep',
  },
};

const DEFAULT_THEME: CategoryTheme = CATEGORY_THEMES['Fever & Cold'];

export function CategoryKitIllustration({
  category,
  code,
  compact = false,
}: CategoryKitIllustrationProps) {
  const uid = useId().replace(/:/g, '');
  const theme =
    (category && CATEGORY_THEMES[category as KitCategory]) || DEFAULT_THEME;

  const bgGradId = `bg-${uid}`;
  const glowGradId = `glow-${uid}`;
  const frontGradId = `front-${uid}`;

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <svg
        viewBox="0 0 320 240"
        className="w-full h-full block"
        role="img"
        aria-label={`${category || 'Medical'} 3D OTC kit illustration`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.backdropFrom} />
            <stop offset="100%" stopColor={theme.backdropTo} />
          </linearGradient>
          <radialGradient id={glowGradId} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={theme.glow} stopOpacity="0.28" />
            <stop offset="100%" stopColor={theme.glow} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={frontGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.boxFront} />
            <stop offset="100%" stopColor={theme.boxSide} />
          </linearGradient>
        </defs>

        {/* Studio Seamless Backdrop */}
        <rect width="320" height="240" fill={`url(#${bgGradId})`} />
        <circle cx="160" cy="112" r="105" fill={`url(#${glowGradId})`} />

        {/* Studio Floor Shadow */}
        <ellipse
          cx="162"
          cy="192"
          rx="96"
          ry="16"
          fill="#0f172a"
          fillOpacity="0.14"
        />

        {theme.variant === 'hydration' ? (
          <g>
            {/* 3D Isometric Hydration Bottle + ORS Pack */}
            <g transform="translate(88, 42)">
              {/* ORS Sachet Box Behind */}
              <polygon
                points="74,26 146,16 164,28 92,40"
                fill={theme.boxTop}
              />
              <polygon
                points="74,26 92,40 92,138 74,124"
                fill={theme.boxSide}
              />
              <polygon
                points="92,40 164,28 164,126 92,138"
                fill={`url(#${frontGradId})`}
              />
              <path
                d="M128 60 C128 60 116 77 116 86 C116 93 121 98 128 98 C135 98 140 93 140 86 C140 77 128 60 128 60 Z"
                fill={theme.accent}
                fillOpacity="0.92"
              />
              <rect
                x="110"
                y="108"
                width="36"
                height="6"
                rx="3"
                fill={theme.accentSoft}
              />

              {/* Studio 3D Hydration Bottle */}
              <rect
                x="14"
                y="22"
                width="54"
                height="122"
                rx="18"
                fill="#ffffff"
                stroke="#38bdf8"
                strokeWidth="2.5"
              />
              <rect
                x="20"
                y="62"
                width="42"
                height="72"
                rx="12"
                fill="#0ea5e9"
                fillOpacity="0.22"
              />
              <rect
                x="28"
                y="4"
                width="26"
                height="18"
                rx="5"
                fill="#0284c7"
              />
              <rect
                x="24"
                y="18"
                width="34"
                height="7"
                rx="3"
                fill="#0369a1"
              />
              <path
                d="M41 72 C41 72 32 85 32 92 C32 97 36 101 41 101 C46 101 50 97 50 92 C50 85 41 72 41 72 Z"
                fill="#0284c7"
              />
              <rect
                x="22"
                y="34"
                width="6"
                height="86"
                rx="3"
                fill="#ffffff"
                fillOpacity="0.7"
              />
            </g>
          </g>
        ) : (
          <g>
            {/* 3D Isometric Studio Medical Kit Box */}
            <g transform="translate(68, 44)">
              {/* Top Face */}
              <polygon
                points="20,34 110,12 184,38 94,62"
                fill={theme.boxTop}
              />
              {/* Left Shadowed Side */}
              <polygon
                points="20,34 94,62 94,146 20,116"
                fill={theme.boxSide}
              />
              {/* Main Front Face */}
              <polygon
                points="94,62 184,38 184,122 94,146"
                fill={`url(#${frontGradId})`}
              />
              {/* Crisp Studio Rim Highlight */}
              <polyline
                points="20,34 94,62 184,38"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.55"
                strokeWidth="2"
              />

              {/* Tamper-Proof Clinical Seal Band on Top */}
              <polygon
                points="66,23 92,16 144,34 118,41"
                fill="#ffffff"
                fillOpacity="0.88"
              />

              {/* Category-Specific 3D Emblem on Front Face */}
              {theme.variant === 'firstaid' ? (
                <g transform="translate(124, 72)">
                  <rect x="11" y="0" width="12" height="36" rx="3" fill={theme.accent} />
                  <rect x="-1" y="12" width="36" height="12" rx="3" fill={theme.accent} />
                </g>
              ) : theme.variant === 'fever' ? (
                <g transform="translate(123, 72)">
                  <rect x="11" y="2" width="12" height="34" rx="3" fill={theme.accent} />
                  <rect x="0" y="13" width="34" height="12" rx="3" fill={theme.accent} />
                </g>
              ) : theme.variant === 'headache' ? (
                <g transform="translate(119, 76)">
                  <rect
                    x="0"
                    y="10"
                    width="38"
                    height="14"
                    rx="7"
                    fill={theme.accent}
                  />
                  <rect
                    x="19"
                    y="10"
                    width="19"
                    height="14"
                    rx="7"
                    fill={theme.accentSoft}
                  />
                </g>
              ) : theme.variant === 'stomach' ? (
                <g transform="translate(122, 74)">
                  <circle cx="17" cy="17" r="16" fill={theme.accent} fillOpacity="0.22" />
                  <path
                    d="M6 19 Q12 10 18 19 T30 19"
                    fill="none"
                    stroke={theme.accent}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </g>
              ) : theme.variant === 'period' ? (
                <g transform="translate(122, 74)">
                  <path
                    d="M17 31 C17 31 3 21 3 11 C3 6 7 2 12 2 C15 2 17 4 17 6 C17 4 19 2 22 2 C27 2 31 6 31 11 C31 21 17 31 17 31 Z"
                    fill={theme.accent}
                  />
                </g>
              ) : theme.variant === 'hygiene' ? (
                <g transform="translate(122, 71)">
                  <path
                    d="M17 2 L32 8 V18 C32 27 25 33 17 36 C9 33 2 27 2 18 V8 Z"
                    fill={theme.accent}
                    fillOpacity="0.92"
                  />
                  <path
                    d="M11 19 L15 23 L24 14"
                    fill="none"
                    stroke={theme.boxFront}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ) : (
                <g transform="translate(122, 73)">
                  <path
                    d="M24 6 A14 14 0 1 0 30 25 A11 11 0 1 1 24 6 Z"
                    fill={theme.accent}
                  />
                </g>
              )}

              {/* Foreground Blister / Capsule Accent */}
              <g transform="translate(-8, 102)">
                <rect
                  x="0"
                  y="0"
                  width="54"
                  height="32"
                  rx="8"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />
                <circle cx="15" cy="11" r="4.5" fill={theme.glow} fillOpacity="0.85" />
                <circle cx="29" cy="11" r="4.5" fill={theme.glow} fillOpacity="0.85" />
                <circle cx="43" cy="11" r="4.5" fill={theme.glow} fillOpacity="0.85" />
                <circle cx="15" cy="22" r="4.5" fill={theme.glow} fillOpacity="0.55" />
                <circle cx="29" cy="22" r="4.5" fill={theme.glow} fillOpacity="0.55" />
                <circle cx="43" cy="22" r="4.5" fill={theme.glow} fillOpacity="0.55" />
              </g>
            </g>
          </g>
        )}

        {/* Compact Code Label for Non-Compact Containers */}
        {!compact && code && (
          <g transform="translate(214, 18)">
            <rect
              width="88"
              height="24"
              rx="8"
              fill="#0f172a"
              fillOpacity="0.78"
            />
            <text
              x="44"
              y="15.5"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10.5"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontWeight="700"
            >
              {code}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
