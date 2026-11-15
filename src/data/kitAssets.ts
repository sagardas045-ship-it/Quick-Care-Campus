import type { SymptomCategory } from '../types';

import feverFluImg from '../assets/images/realistic_fever_kit_1794594888003.jpg';
import steamNasalImg from '../assets/images/realistic_steam_nasal_kit_1794601028978.jpg';
import coughSootherImg from '../assets/images/realistic_cough_syrup_kit_1794601032731.jpg';
import paracetamolStripImg from '../assets/images/paracetamol_thermometer_strip_1794761217424.jpg';

import headacheAcidityImg from '../assets/images/realistic_headache_kit_1794594889552.jpg';
import sinusEyecareImg from '../assets/images/realistic_eyecare_sinus_kit_1794601029299.jpg';
import migraineDarkroomImg from '../assets/images/realistic_migraine_darkroom_kit_1794601874371.jpg';
import coolingGelPatchesImg from '../assets/images/cooling_forehead_patches_1794761216808.jpg';

import canteenAcidityImg from '../assets/images/realistic_acidity_gas_kit_1794601029816.jpg';
import tummyRecoveryImg from '../assets/images/realistic_tummy_probiotic_kit_1794601030574.jpg';
import motionIndigestionImg from '../assets/images/realistic_motion_indigestion_kit_1794601875271.jpg';
import altHeadacheAcidityImg from '../assets/images/headache_acidity_kit_1794508327343.jpg';

import firstAidImg from '../assets/images/realistic_firstaid_kit_1794594889724.jpg';
import sportsSprainImg from '../assets/images/realistic_sprain_spray_kit_1794601031440.jpg';
import skinRashImg from '../assets/images/realistic_skin_rash_kit_1794601032454.jpg';
import painSprayWrapImg from '../assets/images/pain_relief_spray_wrap_1794761216181.jpg';

import dehydrationImg from '../assets/images/realistic_hydration_kit_1794594889489.jpg';
import studyHydrationImg from '../assets/images/realistic_study_energy_kit_1794601030335.jpg';
import fatigueResetImg from '../assets/images/realistic_fatigue_reset_kit_1794601874860.jpg';
import altHydrationImg from '../assets/images/dehydration_recovery_combo_1794508328099.jpg';

import periodCareImg from '../assets/images/realistic_period_kit_1794594890300.jpg';
import intimateComfortImg from '../assets/images/realistic_intimate_comfort_kit_1794601031912.jpg';
import heavyFlowImg from '../assets/images/realistic_heavy_flow_kit_1794601876070.jpg';
import altPeriodImg from '../assets/images/period_cramp_relief_box_1794508327752.jpg';

import fluHygieneImg from '../assets/images/realistic_n95_sanitizer_kit_1794601031772.jpg';
import dentalUlcerImg from '../assets/images/realistic_dental_ulcer_kit_1794601032171.jpg';
import lensEarCareImg from '../assets/images/realistic_lens_ear_kit_1794601876279.jpg';
import washroomPouchImg from '../assets/images/washroom_hygiene_pouch_1794761217185.jpg';

import deepSleepImg from '../assets/images/realistic_deep_sleep_kit_1794601875361.jpg';
import calmDownImg from '../assets/images/realistic_calm_down_kit_1794601877760.jpg';
import drySkinRescueImg from '../assets/images/realistic_dry_skin_rescue_kit_1794601878031.jpg';

import eyeDropWipesImg from '../assets/images/eye_drop_wipes_pack_1794761218382.jpg';
import fungalSkinRashImg from '../assets/images/fungal_skin_rash_kit_1794761218794.jpg';

import bandaidBoxImg from '../assets/images/bandaid_washproof_box_1794761218405.jpg';
import antacidSachetsImg from '../assets/images/antacid_effervescent_sachets_1794761219125.jpg';
import throatLozengesImg from '../assets/images/throat_lozenges_drops_1794761219825.jpg';
import antisepticCottonImg from '../assets/images/antiseptic_cotton_roll_1794761220827.jpg';

import altFeverFluImg from '../assets/images/fever_flu_kit_1794508326147.jpg';
import altFirstAidImg from '../assets/images/first_aid_cut_pack_1794508327129.jpg';
import heroMedicalKitImg from '../assets/images/hero_3d_medical_kit_1794601028244.jpg';

export type KitCategory = Exclude<SymptomCategory, 'All Kits'>;

export const HERO_KIT_ASSET = heroMedicalKitImg;

export const KIT_ASSETS_BY_ID: Record<string, string> = {
  // 1. Fever & Cold
  'kit-fever-flu': feverFluImg,
  'kit-steam-nasal': steamNasalImg,
  'kit-cough-soother': coughSootherImg,
  'kit-paracetamol-strip': paracetamolStripImg,

  // 2. Headache & Migraine
  'kit-headache-acidity': headacheAcidityImg,
  'kit-sinus-eyecare': sinusEyecareImg,
  'kit-migraine-darkroom': migraineDarkroomImg,
  'kit-cooling-gel-patches': coolingGelPatchesImg,

  // 3. Stomach & Acidity
  'kit-canteen-acidity': canteenAcidityImg,
  'kit-tummy-recovery': tummyRecoveryImg,
  'kit-motion-indigestion': motionIndigestionImg,
  'kit-acid-reflux-pack': altHeadacheAcidityImg,

  // 4. First-Aid & Sprains
  'kit-first-aid': firstAidImg,
  'kit-sports-sprain': sportsSprainImg,
  'kit-skin-rash': skinRashImg,
  'kit-pain-spray-combo': painSprayWrapImg,

  // 5. Hydration & Energy
  'kit-dehydration': dehydrationImg,
  'kit-study-hydration': studyHydrationImg,
  'kit-fatigue-reset': fatigueResetImg,
  'kit-electral-ors-4pack': altHydrationImg,

  // 6. Period & Cramp Care
  'kit-period-care': periodCareImg,
  'kit-intimate-comfort': intimateComfortImg,
  'kit-heavy-flow': heavyFlowImg,
  'kit-overnight-pads-heatpad': altPeriodImg,

  // 7. Personal Hygiene & Masks
  'kit-flu-hygiene': fluHygieneImg,
  'kit-dental-ulcer': dentalUlcerImg,
  'kit-lens-ear-care': lensEarCareImg,
  'kit-washroom-hygiene-pouch': washroomPouchImg,

  // 8. Sleep & Wellness
  'kit-deep-sleep': deepSleepImg,
  'kit-calm-down': calmDownImg,
  'kit-dry-skin-rescue': drySkinRescueImg,
  'kit-melatonin-free-sleep': altFeverFluImg,

  // 9. Eye, Ear & Skin Care
  'kit-screen-eye-drops': eyeDropWipesImg,
  'kit-fungal-skin-rash': fungalSkinRashImg,
  'kit-lip-crack-winter': drySkinRescueImg,
  'kit-ear-wax-swimmer': lensEarCareImg,

  // 10. Single Strip & Quick-Grab Essentials
  'kit-bandaid-20pack': bandaidBoxImg,
  'kit-eno-6sachet': antacidSachetsImg,
  'kit-strepsils-16drop': throatLozengesImg,
  'kit-savlon-cotton-mini': antisepticCottonImg,
};

export const CATEGORY_FALLBACK_ASSETS: Record<KitCategory, string> = {
  'Fever & Cold': feverFluImg,
  'Headache & Migraine': headacheAcidityImg,
  'Stomach & Acidity': canteenAcidityImg,
  'First-Aid & Sprains': firstAidImg,
  'Hydration & Energy': dehydrationImg,
  'Period & Cramp Care': periodCareImg,
  'Personal Hygiene & Masks': fluHygieneImg,
  'Sleep & Wellness': deepSleepImg,
  'Eye, Ear & Skin Care': eyeDropWipesImg,
  'Single Strip & Quick-Grab Essentials': bandaidBoxImg,
};

export const CATEGORY_STUDIO_VARIANTS: Record<KitCategory, string[]> = {
  'Fever & Cold': [feverFluImg, paracetamolStripImg, altFeverFluImg, steamNasalImg, coughSootherImg],
  'Headache & Migraine': [headacheAcidityImg, coolingGelPatchesImg, altHeadacheAcidityImg, sinusEyecareImg, migraineDarkroomImg],
  'Stomach & Acidity': [canteenAcidityImg, antacidSachetsImg, tummyRecoveryImg, motionIndigestionImg, altHeadacheAcidityImg],
  'First-Aid & Sprains': [firstAidImg, painSprayWrapImg, altFirstAidImg, sportsSprainImg, skinRashImg],
  'Hydration & Energy': [dehydrationImg, altHydrationImg, studyHydrationImg, fatigueResetImg],
  'Period & Cramp Care': [periodCareImg, altPeriodImg, intimateComfortImg, heavyFlowImg],
  'Personal Hygiene & Masks': [fluHygieneImg, washroomPouchImg, dentalUlcerImg, lensEarCareImg],
  'Sleep & Wellness': [deepSleepImg, calmDownImg, drySkinRescueImg, heroMedicalKitImg],
  'Eye, Ear & Skin Care': [eyeDropWipesImg, fungalSkinRashImg, drySkinRescueImg, lensEarCareImg, sinusEyecareImg],
  'Single Strip & Quick-Grab Essentials': [bandaidBoxImg, antacidSachetsImg, throatLozengesImg, antisepticCottonImg, paracetamolStripImg],
};

const ALL_BUNDLED_ASSET_URLS = Array.from(
  new Set<string>([
    ...Object.values(KIT_ASSETS_BY_ID),
    ...Object.values(CATEGORY_STUDIO_VARIANTS).flat(),
    heroMedicalKitImg,
  ])
);

export const VALID_BUNDLED_ASSET_URLS = new Set<string>(ALL_BUNDLED_ASSET_URLS);

const BUNDLED_ASSET_BY_STEM = new globalThis.Map<string, string>();
for (const url of ALL_BUNDLED_ASSET_URLS) {
  const stem = url.match(/([a-z0-9_]+_1794\d+)/i)?.[1];
  if (stem) {
    BUNDLED_ASSET_BY_STEM.set(stem, url);
  }
}

function findMatchingBundledAsset(rawPath?: string | null): string | null {
  if (!rawPath) return null;
  const trimmed = rawPath.trim();
  if (VALID_BUNDLED_ASSET_URLS.has(trimmed)) {
    return trimmed;
  }
  const stem = trimmed.match(/([a-z0-9_]+_1794\d+)/i)?.[1];
  if (stem && BUNDLED_ASSET_BY_STEM.has(stem)) {
    return BUNDLED_ASSET_BY_STEM.get(stem) ?? null;
  }
  return null;
}

export function isValidBundledKitImagePath(rawPath?: string | null): boolean {
  return Boolean(findMatchingBundledAsset(rawPath));
}

export function resolveKitAssetUrl(
  rawPath?: string | null,
  kitId?: string,
  category?: KitCategory | string
): string {
  const matchedBundled = findMatchingBundledAsset(rawPath);

  if (kitId && KIT_ASSETS_BY_ID[kitId]) {
    return matchedBundled ?? KIT_ASSETS_BY_ID[kitId];
  }

  if (rawPath) {
    const trimmed = rawPath.trim();
    if (trimmed.startsWith('data:image/')) {
      return trimmed;
    }
    if (matchedBundled) {
      return matchedBundled;
    }
    if (trimmed.startsWith('vector://')) {
      const strippedId = trimmed.replace('vector://', '').trim();
      if (KIT_ASSETS_BY_ID[strippedId]) {
        return KIT_ASSETS_BY_ID[strippedId];
      }
    }
  }

  if (category && category in CATEGORY_FALLBACK_ASSETS) {
    return CATEGORY_FALLBACK_ASSETS[category as KitCategory];
  }

  return heroMedicalKitImg;
}

const FALLBACK_COLORS: Record<
  KitCategory,
  { bg1: string; bg2: string; box: string; lid: string; accent: string }
> = {
  'Fever & Cold': { bg1: '#ecfeff', bg2: '#ccfbf1', box: '#0f766e', lid: '#2dd4bf', accent: '#ffffff' },
  'Headache & Migraine': { bg1: '#eef2ff', bg2: '#dbeafe', box: '#3730a3', lid: '#818cf8', accent: '#ffffff' },
  'Stomach & Acidity': { bg1: '#ecfdf5', bg2: '#d1fae5', box: '#047857', lid: '#34d399', accent: '#ffffff' },
  'First-Aid & Sprains': { bg1: '#fef2f2', bg2: '#e2e8f0', box: '#ffffff', lid: '#f8fafc', accent: '#dc2626' },
  'Hydration & Energy': { bg1: '#f0f9ff', bg2: '#cffafe', box: '#0284c7', lid: '#38bdf8', accent: '#ffffff' },
  'Period & Cramp Care': { bg1: '#fff1f2', bg2: '#fce7f3', box: '#be123c', lid: '#fb7185', accent: '#ffffff' },
  'Personal Hygiene & Masks': { bg1: '#f0fdfa', bg2: '#e0f2fe', box: '#0f172a', lid: '#2dd4bf', accent: '#ffffff' },
  'Sleep & Wellness': { bg1: '#f5f3ff', bg2: '#e0e7ff', box: '#5b21b6', lid: '#a78bfa', accent: '#ffffff' },
  'Eye, Ear & Skin Care': { bg1: '#f0f9ff', bg2: '#e0f2fe', box: '#0369a1', lid: '#38bdf8', accent: '#ffffff' },
  'Single Strip & Quick-Grab Essentials': { bg1: '#f8fafc', bg2: '#e2e8f0', box: '#0f766e', lid: '#14b8a6', accent: '#ffffff' },
};

export function getCategoryFallbackDataUri(
  category?: KitCategory | string,
  sealedCode = 'OTC'
): string {
  const palette =
    category && category in FALLBACK_COLORS
      ? FALLBACK_COLORS[category as KitCategory]
      : FALLBACK_COLORS['Fever & Cold'];
  const cleanCode = (sealedCode || 'OTC').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${palette.bg1}"/>
        <stop offset="100%" stop-color="${palette.bg2}"/>
      </linearGradient>
    </defs>
    <rect width="320" height="240" fill="url(#g)"/>
    <ellipse cx="160" cy="192" rx="96" ry="15" fill="#0f172a" fill-opacity="0.14"/>
    <g transform="translate(72,42)">
      <polygon points="20,34 106,12 178,36 92,60" fill="${palette.lid}"/>
      <polygon points="20,34 92,60 92,144 20,116" fill="${palette.box}" fill-opacity="0.82"/>
      <polygon points="92,60 178,36 178,120 92,144" fill="${palette.box}"/>
      <polyline points="20,34 92,60 178,36" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="2"/>
      <rect x="129" y="76" width="12" height="32" rx="3" fill="${palette.accent}"/>
      <rect x="119" y="86" width="32" height="12" rx="3" fill="${palette.accent}"/>
    </g>
    <rect x="218" y="16" width="86" height="22" rx="7" fill="#0f172a" fill-opacity="0.78"/>
    <text x="261" y="31" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="11" font-weight="700">${cleanCode}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
