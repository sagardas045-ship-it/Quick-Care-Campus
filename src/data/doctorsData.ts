import type { DoctorProfile, DoctorSpecialtyFilter } from '../types';
import ananyaPhoto from '../assets/images/doctor_ananya_sharma_1794762510626.jpg';
import rohanPhoto from '../assets/images/doctor_rohan_verma_1794762512159.jpg';
import priyaPhoto from '../assets/images/doctor_priya_negi_1794762510724.jpg';
import siddharthPhoto from '../assets/images/doctor_siddharth_rawat_1794763396471.jpg';
import meeraPhoto from '../assets/images/doctor_meera_joshi_1794763396394.jpg';
import kabirPhoto from '../assets/images/doctor_kabir_malhotra_1794763395721.jpg';
import snehaPhoto from '../assets/images/doctor_sneha_kulkarni_1794763397425.jpg';
import aaravPhoto from '../assets/images/doctor_aarav_bisht_1794763396807.jpg';

export const CONSULTATION_FEE = 99;
export const WELLNESS_PASS_CONSULT_FEE = 49;

export const DOCTOR_SPECIALTY_FILTERS: DoctorSpecialtyFilter[] = [
  'All Doctors',
  'General Physician',
  'Stomach & Digestion',
  "Women's Health",
  'Skin & Allergy',
  'ENT & Eye Care',
  'Ortho & Sports Injury',
  'Dental & Oral Care',
  'Sleep & Stress Wellness',
];

export const TRIAGE_SYMPTOM_CHIPS: string[] = [
  'High Fever',
  'Sore Throat & Cold',
  'Severe Headache',
  'Stomach Cramps',
  'Vomiting/Acidity',
  'Period Cramps',
  'Ankle Sprain',
  'Back / Muscle Pain',
  'Skin Rash',
  'Allergy / Minor Burn',
  'Eye Strain',
  'Ear Ache / Sinus',
  'Toothache',
  'Mouth Ulcer',
  'Exam Anxiety',
  'Insomnia / Fatigue',
];

export const DURATION_OPTIONS: string[] = [
  'Under 6 hours',
  '6 – 24 hours',
  '1 – 2 days',
  '3+ days',
];

export const ON_CALL_DOCTORS: DoctorProfile[] = [
  {
    id: 'doc-ananya-sharma',
    name: 'Dr. Ananya Sharma',
    qualification: 'MBBS, General Physician',
    specialty: 'Fever, Viral Flu, Throat & Cold',
    specialtyCategory: 'General Physician',
    nmcReg: 'NMC-UK-2019-4812',
    focusSymptoms: 'High fever, chills, viral cough, sore throat & late-night flu recovery',
    languages: ['English', 'Hindi'],
    responseTimeLabel: '~2 mins',
    shiftLabel: '10:00 PM – 6:00 AM',
    experienceYears: 5,
    photoUrl: ananyaPhoto,
    baseFee: 99,
    passFee: 49,
    recommendedSymptomMatches: ['High Fever', 'Sore Throat & Cold'],
    defaultRecommendedKitIds: ['kit-fever-flu', 'kit-cough-soother', 'kit-paracetamol-strip'],
  },
  {
    id: 'doc-rohan-verma',
    name: 'Dr. Rohan Verma',
    qualification: 'MBBS, MD (Internal Medicine)',
    specialty: 'Acidity, Food Poisoning, Dehydration & Migraine',
    specialtyCategory: 'Stomach & Digestion',
    nmcReg: 'NMC-UK-2017-3194',
    focusSymptoms: 'Canteen gastritis, vomiting, food poisoning, migraine & electrolyte loss',
    languages: ['English', 'Hindi'],
    responseTimeLabel: '~2 mins',
    shiftLabel: '10:00 PM – 6:00 AM',
    experienceYears: 7,
    photoUrl: rohanPhoto,
    baseFee: 99,
    passFee: 49,
    recommendedSymptomMatches: [
      'Vomiting/Acidity',
      'Stomach Cramps',
      'Severe Headache',
    ],
    defaultRecommendedKitIds: ['kit-canteen-acidity', 'kit-tummy-recovery', 'kit-electral-ors-4pack'],
  },
  {
    id: 'doc-priya-negi',
    name: 'Dr. Priya Negi',
    qualification: 'MBBS, DGO (Gynecology)',
    specialty: "Period Cramps, Women's Health & UTI Relief",
    specialtyCategory: "Women's Health",
    nmcReg: 'NMC-UK-2020-5627',
    focusSymptoms: "Menstrual cramps, heavy flow, intimate hygiene, UTI guidance & women's care",
    languages: ['English', 'Hindi'],
    responseTimeLabel: '~3 mins',
    shiftLabel: '10:00 PM – 6:00 AM',
    experienceYears: 6,
    photoUrl: priyaPhoto,
    baseFee: 99,
    passFee: 49,
    recommendedSymptomMatches: ['Period Cramps'],
    defaultRecommendedKitIds: ['kit-period-care', 'kit-overnight-pads-heatpad', 'kit-intimate-comfort'],
  },
  {
    id: 'doc-siddharth-rawat',
    name: 'Dr. Siddharth Rawat',
    qualification: 'MBBS, MS (Orthopedics)',
    specialty: 'Ankle Sprains, Hostel Stair Falls, Back & Muscle Pain',
    specialtyCategory: 'Ortho & Sports Injury',
    nmcReg: 'NMC-UK-2016-2841',
    focusSymptoms: 'Ankle twists, campus sports sprains, neck stiffness, back spasms & falls',
    languages: ['English', 'Hindi'],
    responseTimeLabel: '~3 mins',
    shiftLabel: '10:00 PM – 6:00 AM',
    experienceYears: 8,
    photoUrl: siddharthPhoto,
    baseFee: 119,
    passFee: 59,
    recommendedSymptomMatches: ['Ankle Sprain', 'Back / Muscle Pain'],
    defaultRecommendedKitIds: ['kit-sports-sprain', 'kit-pain-spray-combo', 'kit-first-aid'],
  },
  {
    id: 'doc-meera-joshi',
    name: 'Dr. Meera Joshi',
    qualification: 'MBBS, MD (Dermatology)',
    specialty: 'Skin Rashes, Fungal Infections, Allergies & Burns',
    specialtyCategory: 'Skin & Allergy',
    nmcReg: 'NMC-UK-2019-6305',
    focusSymptoms: 'Hostel humidity fungal rashes, hives, bug bites, shoe blisters & kettle burns',
    languages: ['English', 'Hindi'],
    responseTimeLabel: '~2 mins',
    shiftLabel: '10:00 PM – 6:00 AM',
    experienceYears: 5,
    photoUrl: meeraPhoto,
    baseFee: 99,
    passFee: 49,
    recommendedSymptomMatches: ['Skin Rash', 'Allergy / Minor Burn'],
    defaultRecommendedKitIds: ['kit-fungal-skin-rash', 'kit-skin-rash', 'kit-first-aid'],
  },
  {
    id: 'doc-kabir-malhotra',
    name: 'Dr. Kabir Malhotra',
    qualification: 'MBBS, MS (ENT & Ophthalmology)',
    specialty: 'Eye Strain, Ear Ache, Sinusitis & Nasal Blockage',
    specialtyCategory: 'ENT & Eye Care',
    nmcReg: 'NMC-UK-2018-4129',
    focusSymptoms: 'Screen redness, dry contact lenses, ear wax pain, blocked sinus & nasal drip',
    languages: ['English', 'Hindi'],
    responseTimeLabel: '~3 mins',
    shiftLabel: '10:00 PM – 6:00 AM',
    experienceYears: 6,
    photoUrl: kabirPhoto,
    baseFee: 99,
    passFee: 49,
    recommendedSymptomMatches: ['Eye Strain', 'Ear Ache / Sinus'],
    defaultRecommendedKitIds: ['kit-screen-eye-drops', 'kit-ear-wax-swimmer', 'kit-steam-nasal'],
  },
  {
    id: 'doc-sneha-kulkarni',
    name: 'Dr. Sneha Kulkarni',
    qualification: 'BDS, MDS (Dental & Oral Care)',
    specialty: 'Sudden Toothache, Mouth Ulcers & Gum Swelling',
    specialtyCategory: 'Dental & Oral Care',
    nmcReg: 'DDC-UK-2021-1948',
    focusSymptoms: 'Midnight wisdom toothache, painful mouth ulcers, sensitivity & gum inflammation',
    languages: ['English', 'Hindi'],
    responseTimeLabel: '~2 mins',
    shiftLabel: '10:00 PM – 6:00 AM',
    experienceYears: 4,
    photoUrl: snehaPhoto,
    baseFee: 79,
    passFee: 39,
    recommendedSymptomMatches: ['Toothache', 'Mouth Ulcer'],
    defaultRecommendedKitIds: ['kit-dental-ulcer', 'kit-headache-acidity', 'kit-eno-6sachet'],
  },
  {
    id: 'doc-aarav-bisht',
    name: 'Dr. Aarav Bisht',
    qualification: 'MBBS, DPM (Sleep & Stress Wellness)',
    specialty: 'Exam Panic, Insomnia, Tension Headaches & Fatigue',
    specialtyCategory: 'Sleep & Stress Wellness',
    nmcReg: 'NMC-UK-2018-7752',
    focusSymptoms: 'Pre-exam anxiety, racing thoughts, hostel noise insomnia & burnout fatigue',
    languages: ['English', 'Hindi'],
    responseTimeLabel: '~2 mins',
    shiftLabel: '10:00 PM – 6:00 AM',
    experienceYears: 6,
    photoUrl: aaravPhoto,
    baseFee: 99,
    passFee: 49,
    recommendedSymptomMatches: ['Exam Anxiety', 'Insomnia / Fatigue', 'Severe Headache'],
    defaultRecommendedKitIds: ['kit-calm-down', 'kit-melatonin-free-sleep', 'kit-deep-sleep'],
  },
];

export function getDoctorById(doctorId: string): DoctorProfile {
  return ON_CALL_DOCTORS.find((doc) => doc.id === doctorId) ?? ON_CALL_DOCTORS[0];
}

export function findBestMatchedDoctor(symptoms: string[]): {
  doctor: DoctorProfile;
  matchedSymptom: string | null;
} {
  if (!Array.isArray(symptoms) || symptoms.length === 0) {
    return { doctor: ON_CALL_DOCTORS[0], matchedSymptom: null };
  }

  let bestDoctor = ON_CALL_DOCTORS[0];
  let bestScore = 0;
  let bestMatchedSymptom: string | null = null;

  // Score each doctor across selected symptoms; prefer latest tapped symptom on ties
  const orderedSymptoms = [...symptoms].reverse();
  for (const doc of ON_CALL_DOCTORS) {
    let score = 0;
    let firstHit: string | null = null;
    for (const sym of orderedSymptoms) {
      if (doc.recommendedSymptomMatches.includes(sym)) {
        score += sym === orderedSymptoms[0] ? 2 : 1;
        if (!firstHit) firstHit = sym;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestDoctor = doc;
      bestMatchedSymptom = firstHit;
    }
  }

  return { doctor: bestDoctor, matchedSymptom: bestMatchedSymptom };
}
