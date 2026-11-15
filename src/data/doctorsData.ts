import type { DoctorProfile } from '../types';
import ananyaPhoto from '../assets/images/doctor_ananya_sharma_1794762510626.jpg';
import rohanPhoto from '../assets/images/doctor_rohan_verma_1794762512159.jpg';
import priyaPhoto from '../assets/images/doctor_priya_negi_1794762510724.jpg';

export const CONSULTATION_FEE = 99;
export const WELLNESS_PASS_CONSULT_FEE = 49;

export const TRIAGE_SYMPTOM_CHIPS: string[] = [
  'High Fever',
  'Severe Headache',
  'Stomach Cramps',
  'Vomiting/Acidity',
  'Allergy/Rash',
  'Sore Throat & Cold',
  'Period Cramps',
  'Sprain / Cut',
  'Dehydration / Dizzy',
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
    nmcReg: 'NMC-UK-2019-4812',
    focusSymptoms: 'High fever, chills, viral cough, blocked sinus & sore throat',
    languages: ['English', 'Hindi'],
    responseTimeLabel: '~2 mins',
    shiftLabel: '10:00 PM – 6:00 AM',
    experienceYears: 6,
    photoUrl: ananyaPhoto,
    baseFee: CONSULTATION_FEE,
    passFee: WELLNESS_PASS_CONSULT_FEE,
    recommendedSymptomMatches: ['High Fever', 'Sore Throat & Cold'],
  },
  {
    id: 'doc-rohan-verma',
    name: 'Dr. Rohan Verma',
    qualification: 'MBBS, MD Internal Medicine',
    specialty: 'Acidity, Stomach Pain, Dehydration & Migraine',
    nmcReg: 'NMC-UK-2017-3194',
    focusSymptoms: 'Canteen gastritis, vomiting, migraine, dizziness & electrolyte loss',
    languages: ['English', 'Hindi'],
    responseTimeLabel: '~2 mins',
    shiftLabel: '10:00 PM – 6:00 AM',
    experienceYears: 8,
    photoUrl: rohanPhoto,
    baseFee: CONSULTATION_FEE,
    passFee: WELLNESS_PASS_CONSULT_FEE,
    recommendedSymptomMatches: [
      'Severe Headache',
      'Stomach Cramps',
      'Vomiting/Acidity',
      'Dehydration / Dizzy',
    ],
  },
  {
    id: 'doc-priya-negi',
    name: 'Dr. Priya Negi',
    qualification: 'MBBS, DGO',
    specialty: "Women's Health, Period Cramps & General Wellness",
    nmcReg: 'NMC-UK-2020-5627',
    focusSymptoms: "Menstrual cramps, women's care, skin rashes, allergies & hostel wellness",
    languages: ['English', 'Hindi'],
    responseTimeLabel: '~2 mins',
    shiftLabel: '10:00 PM – 6:00 AM',
    experienceYears: 5,
    photoUrl: priyaPhoto,
    baseFee: CONSULTATION_FEE,
    passFee: WELLNESS_PASS_CONSULT_FEE,
    recommendedSymptomMatches: ['Period Cramps', 'Allergy/Rash', 'Sprain / Cut'],
  },
];

export function getDoctorById(doctorId: string): DoctorProfile {
  return ON_CALL_DOCTORS.find((doc) => doc.id === doctorId) ?? ON_CALL_DOCTORS[0];
}
