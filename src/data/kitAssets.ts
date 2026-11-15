import type { SymptomCategory } from '../types';

import hero3dMedicalKitImg from '../assets/images/hero_3d_medical_kit_1794601028244.jpg';
import feverFluImg from '../assets/images/realistic_fever_kit_1794594888003.jpg';
import steamNasalImg from '../assets/images/realistic_steam_nasal_kit_1794601028978.jpg';
import coughSyrupImg from '../assets/images/realistic_cough_syrup_kit_1794601032731.jpg';
import headacheImg from '../assets/images/realistic_headache_kit_1794594889552.jpg';
import eyecareSinusImg from '../assets/images/realistic_eyecare_sinus_kit_1794601029299.jpg';
import migraineDarkroomImg from '../assets/images/realistic_migraine_darkroom_kit_1794601874371.jpg';
import acidityGasImg from '../assets/images/realistic_acidity_gas_kit_1794601029816.jpg';
import tummyProbioticImg from '../assets/images/realistic_tummy_probiotic_kit_1794601030574.jpg';
import motionIndigestionImg from '../assets/images/realistic_motion_indigestion_kit_1794601875271.jpg';
import firstAidImg from '../assets/images/realistic_firstaid_kit_1794594889724.jpg';
import sprainSprayImg from '../assets/images/realistic_sprain_spray_kit_1794601031440.jpg';
import skinRashImg from '../assets/images/realistic_skin_rash_kit_1794601032454.jpg';
import hydrationImg from '../assets/images/realistic_hydration_kit_1794594889489.jpg';
import studyEnergyImg from '../assets/images/realistic_study_energy_kit_1794601030335.jpg';
import fatigueResetImg from '../assets/images/realistic_fatigue_reset_kit_1794601874860.jpg';
import periodKitImg from '../assets/images/realistic_period_kit_1794594890300.jpg';
import intimateComfortImg from '../assets/images/realistic_intimate_comfort_kit_1794601031912.jpg';
import heavyFlowImg from '../assets/images/realistic_heavy_flow_kit_1794601876070.jpg';
import n95SanitizerImg from '../assets/images/realistic_n95_sanitizer_kit_1794601031772.jpg';
import dentalUlcerImg from '../assets/images/realistic_dental_ulcer_kit_1794601032171.jpg';
import lensEarImg from '../assets/images/realistic_lens_ear_kit_1794601876279.jpg';
import deepSleepImg from '../assets/images/realistic_deep_sleep_kit_1794601875361.jpg';
import calmDownImg from '../assets/images/realistic_calm_down_kit_1794601877760.jpg';
import drySkinRescueImg from '../assets/images/realistic_dry_skin_rescue_kit_1794601878031.jpg';

import legacyFeverFluImg from '../assets/images/fever_flu_kit_1794508326147.jpg';
import legacyHeadacheAcidityImg from '../assets/images/headache_acidity_kit_1794508327343.jpg';
import legacyFirstAidCutImg from '../assets/images/first_aid_cut_pack_1794508327129.jpg';
import legacyDehydrationImg from '../assets/images/dehydration_recovery_combo_1794508328099.jpg';
import legacyPeriodCrampImg from '../assets/images/period_cramp_relief_box_1794508327752.jpg';

export type KitCategory = Exclude<SymptomCategory, 'All Kits'>;

export const HERO_KIT_ASSET = hero3dMedicalKitImg;

export const KIT_ASSETS_BY_ID: Record<string, string> = {
  'kit-fever-flu': feverFluImg,
  'kit-steam-nasal': steamNasalImg,
  'kit-cough-soother': coughSyrupImg,
  'kit-headache-acidity': headacheImg,
  'kit-sinus-eyecare': eyecareSinusImg,
  'kit-migraine-darkroom': migraineDarkroomImg,
  'kit-canteen-acidity': acidityGasImg,
  'kit-tummy-recovery': tummyProbioticImg,
  'kit-motion-indigestion': motionIndigestionImg,
  'kit-first-aid': firstAidImg,
  'kit-sports-sprain': sprainSprayImg,
  'kit-skin-rash': skinRashImg,
  'kit-dehydration': hydrationImg,
  'kit-study-hydration': studyEnergyImg,
  'kit-fatigue-reset': fatigueResetImg,
  'kit-period-care': periodKitImg,
  'kit-intimate-comfort': intimateComfortImg,
  'kit-heavy-flow': heavyFlowImg,
  'kit-flu-hygiene': n95SanitizerImg,
  'kit-dental-ulcer': dentalUlcerImg,
  'kit-lens-ear-care': lensEarImg,
  'kit-deep-sleep': deepSleepImg,
  'kit-calm-down': calmDownImg,
  'kit-dry-skin-rescue': drySkinRescueImg,
};

export const CATEGORY_DEFAULT_ASSET: Record<KitCategory, string> = {
  'Fever & Cold': feverFluImg,
  'Headache & Migraine': headacheImg,
  'Stomach & Acidity': acidityGasImg,
  'First-Aid & Sprains': firstAidImg,
  'Hydration & Energy': hydrationImg,
  'Period & Cramp Care': periodKitImg,
  'Personal Hygiene & Masks': n95SanitizerImg,
  'Sleep & Wellness': deepSleepImg,
};

const KIT_ASSETS_BY_FILENAME: Record<string, string> = {
  'hero_3d_medical_kit_1794601028244.jpg': hero3dMedicalKitImg,
  'realistic_fever_kit_1794594888003.jpg': feverFluImg,
  'realistic_steam_nasal_kit_1794601028978.jpg': steamNasalImg,
  'realistic_cough_syrup_kit_1794601032731.jpg': coughSyrupImg,
  'realistic_headache_kit_1794594889552.jpg': headacheImg,
  'realistic_eyecare_sinus_kit_1794601029299.jpg': eyecareSinusImg,
  'realistic_migraine_darkroom_kit_1794601874371.jpg': migraineDarkroomImg,
  'realistic_acidity_gas_kit_1794601029816.jpg': acidityGasImg,
  'realistic_tummy_probiotic_kit_1794601030574.jpg': tummyProbioticImg,
  'realistic_motion_indigestion_kit_1794601875271.jpg': motionIndigestionImg,
  'realistic_firstaid_kit_1794594889724.jpg': firstAidImg,
  'realistic_sprain_spray_kit_1794601031440.jpg': sprainSprayImg,
  'realistic_skin_rash_kit_1794601032454.jpg': skinRashImg,
  'realistic_hydration_kit_1794594889489.jpg': hydrationImg,
  'realistic_study_energy_kit_1794601030335.jpg': studyEnergyImg,
  'realistic_fatigue_reset_kit_1794601874860.jpg': fatigueResetImg,
  'realistic_period_kit_1794594890300.jpg': periodKitImg,
  'realistic_intimate_comfort_kit_1794601031912.jpg': intimateComfortImg,
  'realistic_heavy_flow_kit_1794601876070.jpg': heavyFlowImg,
  'realistic_n95_sanitizer_kit_1794601031772.jpg': n95SanitizerImg,
  'realistic_dental_ulcer_kit_1794601032171.jpg': dentalUlcerImg,
  'realistic_lens_ear_kit_1794601876279.jpg': lensEarImg,
  'realistic_deep_sleep_kit_1794601875361.jpg': deepSleepImg,
  'realistic_calm_down_kit_1794601877760.jpg': calmDownImg,
  'realistic_dry_skin_rescue_kit_1794601878031.jpg': drySkinRescueImg,
  'fever_flu_kit_1794508326147.jpg': legacyFeverFluImg,
  'headache_acidity_kit_1794508327343.jpg': legacyHeadacheAcidityImg,
  'first_aid_cut_pack_1794508327129.jpg': legacyFirstAidCutImg,
  'dehydration_recovery_combo_1794508328099.jpg': legacyDehydrationImg,
  'period_cramp_relief_box_1794508327752.jpg': legacyPeriodCrampImg,
};

const BUNDLED_ASSET_SET = new Set<string>(Object.values(KIT_ASSETS_BY_FILENAME));

function extractFilename(rawPath: string): string {
  const withoutQuery = rawPath.split('?')[0].split('#')[0];
  const segments = withoutQuery.split('/');
  return segments[segments.length - 1] ?? '';
}

export function resolveKitImagePath(
  rawPath?: string | null,
  kitId?: string,
  category?: KitCategory
): string {
  const trimmed = (rawPath ?? '').trim();

  if (kitId && KIT_ASSETS_BY_ID[kitId]) {
    return KIT_ASSETS_BY_ID[kitId];
  }

  if (trimmed) {
    if (BUNDLED_ASSET_SET.has(trimmed)) {
      return trimmed;
    }

    const filename = extractFilename(trimmed);
    if (filename && KIT_ASSETS_BY_FILENAME[filename]) {
      return KIT_ASSETS_BY_FILENAME[filename];
    }

    if (trimmed.startsWith('data:image/')) {
      return trimmed;
    }
  }

  if (category && CATEGORY_DEFAULT_ASSET[category]) {
    return CATEGORY_DEFAULT_ASSET[category];
  }

  return feverFluImg;
}

export function isValidBundledKitImagePath(rawPath?: string | null): boolean {
  const trimmed = (rawPath ?? '').trim();
  if (!trimmed) return false;
  if (BUNDLED_ASSET_SET.has(trimmed)) return true;
  if (trimmed.startsWith('data:image/')) return true;
  return false;
}
