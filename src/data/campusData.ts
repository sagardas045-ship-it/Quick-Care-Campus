import { LatLngLiteral, ReliefKit, SymptomCategory } from '../types';

export const SYMPTOM_FILTERS: SymptomCategory[] = [
  'All Kits',
  'Fever & Flu',
  'Headache & Acidity',
  'First-Aid',
  'Hydration & Cramps',
];

// 24/7 Partner Pharmacy Hub (Premnagar / Chakrata Rd belt, Dehradun)
export const PHARMACY_ORIGIN: LatLngLiteral = {
  lat: 30.3358,
  lng: 77.9612,
};

export interface HostelPreset {
  name: string;
  coords: LatLngLiteral;
}

export const DEHRADUN_HOSTEL_PRESETS: HostelPreset[] = [
  {
    name: 'DBS Boys Hostel Block A',
    coords: { lat: 30.3489, lng: 77.9518 },
  },
  {
    name: 'Girls Hostel Main Gate',
    coords: { lat: 30.3465, lng: 77.9491 },
  },
  {
    name: 'Boys Hostel Block B Gate',
    coords: { lat: 30.3502, lng: 77.9542 },
  },
  {
    name: 'Selakui Private PG Cluster',
    coords: { lat: 30.3574, lng: 77.9375 },
  },
];

export const DELIVERY_FEE = 60;
export const WELLNESS_PASS_PRICE = 129;
export const RUNNER_PAYOUT = 25;
export const CONTRIBUTION_MARGIN = DELIVERY_FEE - RUNNER_PAYOUT; // ₹35
export const BREAK_EVEN_ORDERS = 172; // ₹6,020 fixed monthly pilot cost ÷ ₹35 margin
export const BASELINE_PILOT_COMPLETED = 128;

export const RELIEF_KITS: ReliefKit[] = [
  {
    id: 'kit-fever-flu',
    name: 'Midnight Fever & Flu Kit',
    category: 'Fever & Flu',
    price: 110,
    contents: [
      'Paracetamol 650mg strip (10 tabs)',
      'Soothing throat lozenges (8 pcs)',
      'Digital thermometer strip',
      'Electral ORS hydration sachet',
    ],
    reliefFor: 'High fever, chills, sore throat & body ache',
    imagePath: '/src/assets/images/fever_flu_kit_1794508326147.jpg',
    etaMinutes: 16,
    sealedCode: 'OTC-FF01',
  },
  {
    id: 'kit-headache-acidity',
    name: 'Exam Stress Headache & Acidity Pack',
    category: 'Headache & Acidity',
    price: 85,
    contents: [
      'Saridon / Disprin fast-relief strip',
      '2x Liquid antacid cooling gel sachets',
      'Peppermint forehead relief balm',
    ],
    reliefFor: 'Late-night study migraines, reflux & gastric burn',
    imagePath: '/src/assets/images/headache_acidity_kit_1794508327343.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-HA02',
  },
  {
    id: 'kit-first-aid',
    name: 'Hostel First-Aid & Minor Cut Kit',
    category: 'First-Aid',
    price: 140,
    contents: [
      'Antiseptic liquid solution (30ml)',
      'Sterile non-stick gauze pads',
      'Waterproof adhesive band-aids (10 pcs)',
      'Instant muscle & sprain pain spray',
    ],
    reliefFor: 'Minor cuts, scrapes, bruises & dorm sports sprains',
    imagePath: '/src/assets/images/first_aid_cut_pack_1794508327129.jpg',
    etaMinutes: 17,
    sealedCode: 'OTC-FA03',
  },
  {
    id: 'kit-dehydration',
    name: 'Dehydration & Recovery Combo',
    category: 'Hydration & Cramps',
    price: 75,
    contents: [
      '2x Electral WHO-formula ORS sachets',
      'Instant glucose energy pack',
      'Gut-balance probiotic sachet',
    ],
    reliefFor: 'Stomach upset, exhaustion, dizziness & fluid loss',
    imagePath: '/src/assets/images/dehydration_recovery_combo_1794508328099.jpg',
    etaMinutes: 14,
    sealedCode: 'OTC-DR04',
  },
  {
    id: 'kit-period-care',
    name: 'Period Care & Cramp Relief Box',
    category: 'Hydration & Cramps',
    price: 150,
    contents: [
      'Ultra-soft cotton sanitary pads pack',
      'Self-warming abdominal heat patch',
      'Anti-spasmodic OTC cramp relief strip',
    ],
    reliefFor: 'Discreet late-night menstrual care & acute cramps',
    imagePath: '/src/assets/images/period_cramp_relief_box_1794508327752.jpg',
    etaMinutes: 16,
    sealedCode: 'OTC-PC05',
  },
];

export const CAMPUS_RUNNERS = [
  { name: 'Rohan Bisht', phone: '+919411180421' },
  { name: 'Ananya Rawat', phone: '+919412033519' },
  { name: 'Kabir Negi', phone: '+919557249012' },
];
