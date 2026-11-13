import { LatLngLiteral, ReliefKit, SymptomCategory } from '../types';

export const HERO_3D_KIT_IMAGE =
  '/src/assets/images/hero_3d_medical_kit_1794601028244.jpg';

export const SYMPTOM_FILTERS: SymptomCategory[] = [
  'All Kits',
  'Fever & Cold',
  'Headache & Migraine',
  'Stomach & Acidity',
  'First-Aid & Sprains',
  'Hydration & Energy',
  'Period & Cramp Care',
  'Personal Hygiene & Masks',
  'Sleep & Wellness',
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
  // 1. Fever & Cold (3 items)
  {
    id: 'kit-fever-flu',
    name: 'Midnight Fever & Flu Kit',
    category: 'Fever & Cold',
    price: 110,
    contents: [
      'Paracetamol 650mg strip (10 tabs)',
      'Soothing throat lozenges (8 pcs)',
      'Thermometer strip & Electral ORS sachet',
    ],
    reliefFor: 'High fever, chills, sore throat & body ache',
    imagePath: '/src/assets/images/realistic_fever_kit_1794594888003.jpg',
    etaMinutes: 16,
    sealedCode: 'OTC-FC01',
    inStock: true,
  },
  {
    id: 'kit-steam-nasal',
    name: 'Blocked Nose & Steam Relief Pack',
    category: 'Fever & Cold',
    price: 95,
    contents: [
      'Menthol Vaporub soothing jar',
      'Sterile saline nasal spray (30ml)',
      '2x Pocket menthol inhalers',
    ],
    reliefFor: 'Nasal congestion, blocked sinus & night cold relief',
    imagePath: '/src/assets/images/realistic_steam_nasal_kit_1794601028978.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-FC02',
    inStock: true,
  },
  {
    id: 'kit-cough-soother',
    name: 'Dry Cough & Sore Throat Soothe Box',
    category: 'Fever & Cold',
    price: 125,
    contents: [
      'Herbal honey cough syrup (150ml)',
      'Antiseptic warm gargle solution',
      'Honey-lemon throat drops (10 pcs)',
    ],
    reliefFor: 'Persistent dry night cough, tickly throat & hoarseness',
    imagePath: '/src/assets/images/realistic_cough_syrup_kit_1794601032731.jpg',
    etaMinutes: 16,
    sealedCode: 'OTC-FC03',
    inStock: true,
  },

  // 2. Headache & Migraine (3 items)
  {
    id: 'kit-headache-acidity',
    name: 'Exam Night Headache & Stress Relief',
    category: 'Headache & Migraine',
    price: 85,
    contents: [
      'Disprin / Saridon fast-relief strip',
      'Roll-on cooling peppermint balm',
      'Soft blackout sleep mask',
    ],
    reliefFor: 'Late-night exam tension headaches & study fatigue',
    imagePath: '/src/assets/images/realistic_headache_kit_1794594889552.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-HM01',
    inStock: true,
  },
  {
    id: 'kit-sinus-eyecare',
    name: 'Sinus & Laptop Eye Strain Kit',
    category: 'Headache & Migraine',
    price: 120,
    contents: [
      'Sterile lubricating eye drops (10ml)',
      'Fast-acting pain relief tablets',
      'Reusable warm eye compress mask',
    ],
    reliefFor: 'Late-night screen dryness, sinus pressure & brow ache',
    imagePath: '/src/assets/images/realistic_eyecare_sinus_kit_1794601029299.jpg',
    etaMinutes: 16,
    sealedCode: 'OTC-HM02',
    inStock: true,
  },
  {
    id: 'kit-migraine-darkroom',
    name: 'Migraine Dark-Room Recovery Pack',
    category: 'Headache & Migraine',
    price: 145,
    contents: [
      'Fast-acting migraine relief OTC strip',
      'Woven acupressure wrist band',
      'Pure peppermint essential oil roll-on',
    ],
    reliefFor: 'Throbbing one-sided migraine, light sensitivity & nausea',
    imagePath: '/src/assets/images/realistic_migraine_darkroom_kit_1794601874371.jpg',
    etaMinutes: 16,
    sealedCode: 'OTC-HM03',
    inStock: true,
  },

  // 3. Stomach & Acidity (3 items)
  {
    id: 'kit-canteen-acidity',
    name: 'Late-Night Canteen Acidity & Gas Pack',
    category: 'Stomach & Acidity',
    price: 70,
    contents: [
      '3x Cooling antacid mint gel sachets',
      '2x Eno effervescent fruit salt packs',
      'Chewable digestive enzyme tablets',
    ],
    reliefFor: 'Midnight mess food heartburn, bloating & acid reflux',
    imagePath: '/src/assets/images/realistic_acidity_gas_kit_1794601029816.jpg',
    etaMinutes: 14,
    sealedCode: 'OTC-SA01',
    inStock: true,
  },
  {
    id: 'kit-tummy-recovery',
    name: 'Food Poisoning & Tummy Relief Kit',
    category: 'Stomach & Acidity',
    price: 105,
    contents: [
      'Probiotic gut-restore capsules strip',
      '2x Oral rehydration electrolyte packs',
      'Gentle anti-nausea OTC tablets',
    ],
    reliefFor: 'Acute stomach cramps, loose motions & upset digestion',
    imagePath: '/src/assets/images/realistic_tummy_probiotic_kit_1794601030574.jpg',
    etaMinutes: 16,
    sealedCode: 'OTC-SA02',
    inStock: true,
  },
  {
    id: 'kit-motion-indigestion',
    name: 'Motion Sickness & Indigestion Combo',
    category: 'Stomach & Acidity',
    price: 80,
    contents: [
      'Ginger chewable nausea tablets',
      'Fast-relief chewable antacid strip',
      'Herbal digestive peppermint drops',
    ],
    reliefFor: 'Travel nausea, queasiness & heavy late-night meals',
    imagePath: '/src/assets/images/realistic_motion_indigestion_kit_1794601875271.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-SA03',
    inStock: true,
  },

  // 4. First-Aid & Sprains (3 items)
  {
    id: 'kit-first-aid',
    name: 'Hostel Room Minor Cut & Burn Kit',
    category: 'First-Aid & Sprains',
    price: 140,
    contents: [
      'Antiseptic liquid solution (30ml)',
      'Sterile non-stick gauze & band-aids',
      'Soothing silver burn-relief gel',
    ],
    reliefFor: 'Minor cuts, kettle/iron burns, scrapes & dorm injuries',
    imagePath: '/src/assets/images/realistic_firstaid_kit_1794594889724.jpg',
    etaMinutes: 16,
    sealedCode: 'OTC-FA01',
    inStock: true,
  },
  {
    id: 'kit-sports-sprain',
    name: 'Sports & Stairs Ankle Sprain Pack',
    category: 'First-Aid & Sprains',
    price: 165,
    contents: [
      'Instant pain-relief muscle spray (150ml)',
      'Elastic compression crepe bandage',
      'Reusable cold gel ice pack',
    ],
    reliefFor: 'Ankle twists, campus football sprains & muscle pulls',
    imagePath: '/src/assets/images/realistic_sprain_spray_kit_1794601031440.jpg',
    etaMinutes: 17,
    sealedCode: 'OTC-FA02',
    inStock: true,
  },
  {
    id: 'kit-skin-rash',
    name: 'Blister, Bruise & Mosquito Bite Relief',
    category: 'First-Aid & Sprains',
    price: 115,
    contents: [
      'Anti-itch soothing calamine cream',
      'Hydrocolloid blister healing pads',
      'Botanical mosquito repellent roll-on',
    ],
    reliefFor: 'Shoe blisters, hostel mosquito bites & skin irritation',
    imagePath: '/src/assets/images/realistic_skin_rash_kit_1794601032454.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-FA03',
    inStock: true,
  },

  // 5. Hydration & Energy (3 items)
  {
    id: 'kit-dehydration',
    name: 'Dehydration & Recovery Combo',
    category: 'Hydration & Energy',
    price: 75,
    contents: [
      '2x Electral WHO-formula ORS sachets',
      'Glucose-D instant energy pack',
      'Vitamin C immunity chewables',
    ],
    reliefFor: 'Exhaustion, dizziness, fluid loss & post-fever recovery',
    imagePath: '/src/assets/images/realistic_hydration_kit_1794594889489.jpg',
    etaMinutes: 14,
    sealedCode: 'OTC-HE01',
    inStock: true,
  },
  {
    id: 'kit-study-hydration',
    name: 'All-Nighter Study Hydration Box',
    category: 'Hydration & Energy',
    price: 90,
    contents: [
      '3x Electrolyte drink sachets',
      '70% Dark chocolate energy bar',
      'Antioxidant green tea sachets',
    ],
    reliefFor: 'Sustained late-night exam prep without caffeine crash',
    imagePath: '/src/assets/images/realistic_study_energy_kit_1794601030335.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-HE02',
    inStock: true,
  },
  {
    id: 'kit-fatigue-reset',
    name: 'Morning Hangover & Fatigue Reset Kit',
    category: 'Hydration & Energy',
    price: 130,
    contents: [
      'Effervescent hydration tablets tube',
      'B-complex energy boost strip',
      'Cooling peppermint restore mints',
    ],
    reliefFor: '8 AM class grogginess, dehydration & low energy reset',
    imagePath: '/src/assets/images/realistic_fatigue_reset_kit_1794601874860.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-HE03',
    inStock: true,
  },

  // 6. Period & Cramp Care (3 items)
  {
    id: 'kit-period-care',
    name: 'Period Care & Cramp Relief Box',
    category: 'Period & Cramp Care',
    price: 150,
    contents: [
      'Ultra-thin cotton sanitary pads pack',
      'Self-warming adhesive heat patch',
      'Anti-spasmodic OTC cramp relief strip',
    ],
    reliefFor: 'Discreet late-night menstrual care & acute cramps',
    imagePath: '/src/assets/images/realistic_period_kit_1794594890300.jpg',
    etaMinutes: 16,
    sealedCode: 'OTC-PC01',
    inStock: true,
  },
  {
    id: 'kit-intimate-comfort',
    name: 'Intimate Hygiene & Comfort Pack',
    category: 'Period & Cramp Care',
    price: 135,
    contents: [
      'pH-balanced intimate hygiene wipes',
      'Breathable cotton panty liners',
      'Mini knitted hot water comfort pouch',
    ],
    reliefFor: 'Overnight comfort, gentle hygiene & soothing warmth',
    imagePath: '/src/assets/images/realistic_intimate_comfort_kit_1794601031912.jpg',
    etaMinutes: 16,
    sealedCode: 'OTC-PC02',
    inStock: true,
  },
  {
    id: 'kit-heavy-flow',
    name: 'Heavy Flow Overnight Protection Kit',
    category: 'Period & Cramp Care',
    price: 120,
    contents: [
      'XL overnight cotton pads pack',
      'Biodegradable sanitary disposal bags',
      'Soothing chamomile herbal tea sachets',
    ],
    reliefFor: 'Leak-free overnight sleep & restful menstrual comfort',
    imagePath: '/src/assets/images/realistic_heavy_flow_kit_1794601876070.jpg',
    etaMinutes: 16,
    sealedCode: 'OTC-PC03',
    inStock: true,
  },

  // 7. Personal Hygiene & Masks (3 items)
  {
    id: 'kit-flu-hygiene',
    name: 'Hostel Flu Protection & Hygiene Kit',
    category: 'Personal Hygiene & Masks',
    price: 80,
    contents: [
      'N95 respirator masks (pack of 3)',
      '70% alcohol pocket sanitizer spray',
      'Antibacterial hand & surface wipes',
    ],
    reliefFor: 'Shared dorm flu protection & germ hygiene during exams',
    imagePath: '/src/assets/images/realistic_n95_sanitizer_kit_1794601031772.jpg',
    etaMinutes: 14,
    sealedCode: 'OTC-PH01',
    inStock: true,
  },
  {
    id: 'kit-dental-ulcer',
    name: 'Dental & Mouth Ulcer Emergency Pack',
    category: 'Personal Hygiene & Masks',
    price: 95,
    contents: [
      'Soothing oral ulcer relief gel tube',
      'Desensitizing fluoride toothpaste',
      'Alcohol-free antiseptic mouthwash',
    ],
    reliefFor: 'Painful mouth ulcers, midnight tooth sensitivity & gum care',
    imagePath: '/src/assets/images/realistic_dental_ulcer_kit_1794601032171.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-PH02',
    inStock: true,
  },
  {
    id: 'kit-lens-ear-care',
    name: 'Contact Lens & Ear Care Essentials',
    category: 'Personal Hygiene & Masks',
    price: 130,
    contents: [
      'Sterile contact lens solution mini (60ml)',
      'Sealed dual contact lens storage case',
      'Soothing ear-ache relief OTC drops',
    ],
    reliefFor: 'Dry contact lenses during late study & mild ear discomfort',
    imagePath: '/src/assets/images/realistic_lens_ear_kit_1794601876279.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-PH03',
    inStock: true,
  },

  // 8. Sleep & Wellness (3 items)
  {
    id: 'kit-deep-sleep',
    name: 'Hostel Noise & Deep Sleep Kit',
    category: 'Sleep & Wellness',
    price: 110,
    contents: [
      'Soft acoustic foam earplugs with case',
      'Contoured 3D blackout sleep mask',
      'Calming lavender pillow mist (30ml)',
    ],
    reliefFor: 'Loud hostel corridors, hallway lights & restless insomnia',
    imagePath: '/src/assets/images/realistic_deep_sleep_kit_1794601875361.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-SW01',
    inStock: true,
  },
  {
    id: 'kit-calm-down',
    name: 'Exam Anxiety & Calm Down Box',
    category: 'Sleep & Wellness',
    price: 125,
    contents: [
      'Chamomile herbal relaxation tea sachets',
      'Ergonomic matte teal stress squeeze ball',
      'Botanical aromatherapy roll-on bottle',
    ],
    reliefFor: 'Pre-viva stress, late-night racing thoughts & tension',
    imagePath: '/src/assets/images/realistic_calm_down_kit_1794601877760.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-SW02',
    inStock: true,
  },
  {
    id: 'kit-dry-skin-rescue',
    name: 'Lip & Dry Weather Skin Rescue',
    category: 'Sleep & Wellness',
    price: 95,
    contents: [
      'Medicated soothing lip balm stick',
      'Fragrance-free daily moisturizer (75ml)',
      'Nourishing barrier repair hand cream',
    ],
    reliefFor: 'Chapped winter Dehradun lips, dry hands & windburn',
    imagePath: '/src/assets/images/realistic_dry_skin_rescue_kit_1794601878031.jpg',
    etaMinutes: 15,
    sealedCode: 'OTC-SW03',
    inStock: true,
  },
];

export const CAMPUS_RUNNERS = [
  { name: 'Rohan Bisht', phone: '+919411180421' },
  { name: 'Ananya Rawat', phone: '+919412033519' },
  { name: 'Kabir Negi', phone: '+919557249012' },
];
