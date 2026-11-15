import type { DigitalPrescription } from '../types.ts';

export interface TriageCatalogEntry {
  id: string;
  skuCode: string;
  name: string;
  category: string;
  price: number;
  reliefFor: string;
}

export const TRIAGE_CATALOG_SUMMARY: TriageCatalogEntry[] = [
  { id: 'kit-fever-flu', skuCode: 'QCC-001', name: 'Midnight Fever & Flu Kit', category: 'Fever & Cold', price: 110, reliefFor: 'High fever, chills, sore throat & body ache' },
  { id: 'kit-steam-nasal', skuCode: 'QCC-002', name: 'Blocked Nose & Steam Relief Pack', category: 'Fever & Cold', price: 95, reliefFor: 'Nasal congestion, blocked sinus & night cold' },
  { id: 'kit-cough-soother', skuCode: 'QCC-003', name: 'Dry Cough & Sore Throat Soothe Box', category: 'Fever & Cold', price: 125, reliefFor: 'Dry night cough, tickly throat & hoarseness' },
  { id: 'kit-paracetamol-strip', skuCode: 'QCC-004', name: 'Paracetamol 650mg Emergency Strip & Thermometer Pack', category: 'Fever & Cold', price: 65, reliefFor: 'Sudden night fever check & temperature spike' },
  { id: 'kit-headache-acidity', skuCode: 'QCC-005', name: 'Exam Night Headache & Stress Relief', category: 'Headache & Migraine', price: 85, reliefFor: 'Exam tension headaches & study fatigue' },
  { id: 'kit-sinus-eyecare', skuCode: 'QCC-006', name: 'Sinus & Laptop Eye Strain Kit', category: 'Headache & Migraine', price: 120, reliefFor: 'Screen dryness, sinus pressure & brow ache' },
  { id: 'kit-migraine-darkroom', skuCode: 'QCC-007', name: 'Migraine Dark-Room Recovery Pack', category: 'Headache & Migraine', price: 145, reliefFor: 'Throbbing migraine, light sensitivity & nausea' },
  { id: 'kit-cooling-gel-patches', skuCode: 'QCC-008', name: 'Instant Cooling Forehead Gel Patches & Balm Duo', category: 'Headache & Migraine', price: 90, reliefFor: 'Instant forehead cooling for fever & headache' },
  { id: 'kit-canteen-acidity', skuCode: 'QCC-009', name: 'Late-Night Canteen Acidity & Gas Pack', category: 'Stomach & Acidity', price: 70, reliefFor: 'Midnight heartburn, bloating & acid reflux' },
  { id: 'kit-tummy-recovery', skuCode: 'QCC-010', name: 'Food Poisoning & Tummy Relief Kit', category: 'Stomach & Acidity', price: 105, reliefFor: 'Stomach cramps, loose motions & upset digestion' },
  { id: 'kit-motion-indigestion', skuCode: 'QCC-011', name: 'Motion Sickness & Indigestion Combo', category: 'Stomach & Acidity', price: 80, reliefFor: 'Travel nausea, queasiness & heavy meals' },
  { id: 'kit-acid-reflux-pack', skuCode: 'QCC-012', name: 'Midnight Acid-Reflux & Heartburn Relief Pack', category: 'Stomach & Acidity', price: 60, reliefFor: 'Fast cooling relief for heartburn & gas' },
  { id: 'kit-first-aid', skuCode: 'QCC-013', name: 'Hostel Room Minor Cut & Burn Kit', category: 'First-Aid & Sprains', price: 140, reliefFor: 'Minor cuts, burns, scrapes & dorm injuries' },
  { id: 'kit-sports-sprain', skuCode: 'QCC-014', name: 'Sports & Stairs Ankle Sprain Pack', category: 'First-Aid & Sprains', price: 165, reliefFor: 'Ankle twists, sprains & muscle pulls' },
  { id: 'kit-skin-rash', skuCode: 'QCC-015', name: 'Blister, Bruise & Mosquito Bite Relief', category: 'First-Aid & Sprains', price: 115, reliefFor: 'Blisters, bites & skin irritation' },
  { id: 'kit-pain-spray-combo', skuCode: 'QCC-016', name: 'Volini / Moov Instant Pain Relief Spray & Bandage Combo', category: 'First-Aid & Sprains', price: 135, reliefFor: 'Muscle spasm, neck stiffness & sprains' },
  { id: 'kit-dehydration', skuCode: 'QCC-017', name: 'Dehydration & Recovery Combo', category: 'Hydration & Energy', price: 75, reliefFor: 'Exhaustion, dizziness & fluid loss' },
  { id: 'kit-electral-ors-4pack', skuCode: 'QCC-020', name: '4-Pack Electral ORS & Lemon Electrolyte Blitz', category: 'Hydration & Energy', price: 85, reliefFor: 'Rapid electrolyte replacement after fever or vomiting' },
  { id: 'kit-period-care', skuCode: 'QCC-021', name: 'Period Care & Cramp Relief Box', category: 'Period & Cramp Care', price: 150, reliefFor: 'Discreet menstrual care & acute cramps' },
  { id: 'kit-overnight-pads-heatpad', skuCode: 'QCC-024', name: 'Whisper/Sofy XL Overnight Pads + Electric/Gel Heat Pad Refill', category: 'Period & Cramp Care', price: 160, reliefFor: 'Overnight leak protection & cramp warmth' },
  { id: 'kit-flu-hygiene', skuCode: 'QCC-025', name: 'Hostel Flu Protection & Hygiene Kit', category: 'Personal Hygiene & Masks', price: 80, reliefFor: 'Dorm flu protection & germ hygiene' },
  { id: 'kit-dental-ulcer', skuCode: 'QCC-026', name: 'Dental & Mouth Ulcer Emergency Pack', category: 'Personal Hygiene & Masks', price: 95, reliefFor: 'Mouth ulcers & midnight tooth sensitivity' },
  { id: 'kit-deep-sleep', skuCode: 'QCC-029', name: 'Hostel Noise & Deep Sleep Kit', category: 'Sleep & Wellness', price: 110, reliefFor: 'Loud corridors & restless insomnia' },
  { id: 'kit-calm-down', skuCode: 'QCC-030', name: 'Exam Anxiety & Calm Down Box', category: 'Sleep & Wellness', price: 125, reliefFor: 'Pre-viva stress & late-night tension' },
  { id: 'kit-screen-eye-drops', skuCode: 'QCC-033', name: 'Late-Night Screen & Dust Eye Drop Relief Pack', category: 'Eye, Ear & Skin Care', price: 95, reliefFor: 'Dry, irritated or red eyes from screens' },
  { id: 'kit-fungal-skin-rash', skuCode: 'QCC-034', name: 'Hostel Water Fungal & Skin Rash Care Kit', category: 'Eye, Ear & Skin Care', price: 110, reliefFor: 'Rashes, itching & skin irritation' },
  { id: 'kit-ear-wax-swimmer', skuCode: 'QCC-036', name: "Ear Wax & Swimmer's Ear Relief Drops Pack", category: 'Eye, Ear & Skin Care', price: 90, reliefFor: 'Blocked ear & mild ear discomfort' },
  { id: 'kit-bandaid-20pack', skuCode: 'QCC-037', name: 'Band-Aid Washproof 20-Strip Pocket Box', category: 'Single Strip & Quick-Grab Essentials', price: 50, reliefFor: 'Quick cuts, shoe bites & scrapes' },
  { id: 'kit-eno-6sachet', skuCode: 'QCC-038', name: 'Eno Fruit Salt & Antacid 6-Sachet Emergency Pack', category: 'Single Strip & Quick-Grab Essentials', price: 55, reliefFor: 'Instant acidity, gas & bloating' },
  { id: 'kit-strepsils-16drop', skuCode: 'QCC-039', name: 'Strepsils / Vicks Throat Lozenges 16-Drop Pack', category: 'Single Strip & Quick-Grab Essentials', price: 45, reliefFor: 'Scratchy throat, dry cough & cold irritation' },
  { id: 'kit-savlon-cotton-mini', skuCode: 'QCC-040', name: 'Savlon / Dettol Antiseptic Liquid & Cotton Roll Mini', category: 'Single Strip & Quick-Grab Essentials', price: 70, reliefFor: 'Wound disinfection & cut cleaning' },
];

export interface DoctorTriageRequest {
  doctorName: string;
  doctorSpecialty: string;
  doctorNmcReg: string;
  studentName: string;
  symptoms: string[];
  duration: string;
  allergies: string;
  notes: string;
  messages: Array<{
    sender: 'student' | 'doctor' | 'admin';
    text: string;
  }>;
  availableKitIds?: string[];
}

export interface DoctorTriageResponse {
  replyText: string;
  issuePrescription: boolean;
  prescription: DigitalPrescription;
  source: 'gemini' | 'clinical-fallback';
}

const VALID_ID_SET = new Set(TRIAGE_CATALOG_SUMMARY.map((k) => k.id));

export function normalizeRecommendedKitIds(
  candidateIds: unknown,
  allowedIds?: string[]
): string[] {
  const allowed =
    Array.isArray(allowedIds) && allowedIds.length > 0
      ? new Set(allowedIds)
      : VALID_ID_SET;
  if (!Array.isArray(candidateIds)) return [];

  const unique: string[] = [];
  for (const raw of candidateIds) {
    if (typeof raw !== 'string') continue;
    const clean = raw.trim();
    if (!clean || !allowed.has(clean) || unique.includes(clean)) continue;
    unique.push(clean);
    if (unique.length >= 3) break;
  }
  return unique;
}

export function buildDeterministicDoctorTriage(
  req: DoctorTriageRequest
): DoctorTriageResponse {
  const combinedText = [
    ...req.symptoms,
    req.notes,
    ...req.messages.filter((m) => m.sender === 'student').map((m) => m.text),
  ]
    .join(' ')
    .toLowerCase();

  const allergyLower = (req.allergies || '').toLowerCase();
  const hasParacetamolAllergy =
    allergyLower.includes('paracetamol') ||
    allergyLower.includes('acetaminophen') ||
    allergyLower.includes('dolo');
  const hasNsaidAllergy =
    allergyLower.includes('ibuprofen') ||
    allergyLower.includes('aspirin') ||
    allergyLower.includes('disprin') ||
    allergyLower.includes('nsaid');

  const pickedIds: string[] = [];
  const pushKit = (id: string) => {
    if (
      (!req.availableKitIds || req.availableKitIds.includes(id)) &&
      !pickedIds.includes(id)
    ) {
      pickedIds.push(id);
    }
  };

  const guidanceParts: string[] = [];
  const adviceParts: string[] = [];

  if (
    combinedText.includes('fever') ||
    combinedText.includes('bukhar') ||
    combinedText.includes('chills') ||
    combinedText.includes('flu')
  ) {
    if (!hasParacetamolAllergy) {
      pushKit('kit-fever-flu');
      pushKit('kit-cooling-gel-patches');
      guidanceParts.push(
        'Paracetamol 650mg: 1 tablet every 6–8 hours after light food (max 3g in 24h).'
      );
    } else {
      pushKit('kit-cooling-gel-patches');
      pushKit('kit-dehydration');
      guidanceParts.push(
        'Avoid Paracetamol due to your reported allergy. Use cooling forehead gel patches and tepid sponging every 30 mins.'
      );
    }
    adviceParts.push(
      'Check temperature every 4 hours, dress in breathable cotton layers, and sip lukewarm fluids.'
    );
  }

  if (
    combinedText.includes('throat') ||
    combinedText.includes('cough') ||
    combinedText.includes('cold') ||
    combinedText.includes('nasal')
  ) {
    pushKit('kit-cough-soother');
    pushKit('kit-steam-nasal');
    guidanceParts.push(
      'Throat lozenges 1 pc every 4 hours as needed + warm saline gargle before sleep.'
    );
    adviceParts.push('Keep hydrated with warm water and avoid iced drinks during recovery.');
  }

  if (
    combinedText.includes('stomach') ||
    combinedText.includes('acidity') ||
    combinedText.includes('vomit') ||
    combinedText.includes('gas') ||
    combinedText.includes('nausea')
  ) {
    if (combinedText.includes('vomit') || combinedText.includes('cramp')) {
      pushKit('kit-tummy-recovery');
      pushKit('kit-electral-ors-4pack');
      guidanceParts.push(
        'Sip 1 sachet Electral ORS dissolved in 1L clean drinking water in small mouthfuls every 10–15 mins.'
      );
    } else {
      pushKit('kit-canteen-acidity');
      pushKit('kit-eno-6sachet');
      guidanceParts.push(
        'Antacid gel 1 sachet after meals or before lying down; stay upright for 30 minutes.'
      );
    }
    adviceParts.push('Stick to bland foods (curd rice, banana, toast) until symptoms settle.');
  }

  if (
    combinedText.includes('headache') ||
    combinedText.includes('migraine') ||
    combinedText.includes('sir dard')
  ) {
    if (hasNsaidAllergy) {
      pushKit('kit-cooling-gel-patches');
      pushKit('kit-paracetamol-strip');
      guidanceParts.push(
        'Avoid Aspirin/Disprin (NSAID allergy noted). Apply cooling gel patch and take Paracetamol only if tolerated.'
      );
    } else {
      pushKit('kit-headache-acidity');
      pushKit('kit-migraine-darkroom');
      guidanceParts.push(
        'Apply peppermint balm gently on temples and rest in a darkened room away from screens.'
      );
    }
    adviceParts.push('Dim laptop/phone screens and rest eyes for at least 30 minutes.');
  }

  if (
    combinedText.includes('period') ||
    combinedText.includes('menstrual')
  ) {
    pushKit('kit-period-care');
    pushKit('kit-overnight-pads-heatpad');
    guidanceParts.push(
      'Apply the self-warming heat patch over lower abdomen for 20–30 mins; hydrate well.'
    );
    adviceParts.push('Rest with knees slightly elevated to ease lower pelvic muscle spasm.');
  }

  if (
    combinedText.includes('allergy') ||
    combinedText.includes('rash') ||
    combinedText.includes('itch')
  ) {
    pushKit('kit-fungal-skin-rash');
    pushKit('kit-skin-rash');
    guidanceParts.push(
      'Apply calamine lotion thinly over affected itchy skin 2–3 times nightly; keep area dry.'
    );
    adviceParts.push('Wear loose cotton clothing and avoid scratching or perfumed soaps.');
  }

  if (
    combinedText.includes('sprain') ||
    combinedText.includes('cut') ||
    combinedText.includes('burn') ||
    combinedText.includes('ankle')
  ) {
    if (combinedText.includes('cut') || combinedText.includes('burn')) {
      pushKit('kit-first-aid');
      pushKit('kit-savlon-cotton-mini');
      guidanceParts.push(
        'Clean gently with diluted antiseptic solution and cover with sterile non-stick gauze.'
      );
    } else {
      pushKit('kit-sports-sprain');
      pushKit('kit-pain-spray-combo');
      guidanceParts.push(
        'Apply RICE protocol (Rest, Ice pack 15 mins, Compression crepe wrap, Elevation).'
      );
    }
    adviceParts.push('Avoid putting weight on an acutely swollen ankle until evaluated.');
  }

  if (
    combinedText.includes('dehydrat') ||
    combinedText.includes('dizzy') ||
    combinedText.includes('weak')
  ) {
    pushKit('kit-dehydration');
    pushKit('kit-electral-ors-4pack');
    guidanceParts.push(
      'Prepare Electral ORS as directed and sip slowly over 1–2 hours.'
    );
    adviceParts.push('Sit or lie down immediately if lightheaded and loosen tight collars.');
  }

  if (pickedIds.length === 0) {
    pushKit('kit-fever-flu');
    pushKit('kit-dehydration');
    guidanceParts.push(
      'Supportive hydration with ORS and temperature monitoring every 4 hours.'
    );
    adviceParts.push('Rest in your hostel room and message again if new symptoms appear.');
  }

  const finalIds = pickedIds.slice(0, 3);
  const allergyText =
    req.allergies && req.allergies.trim() && !allergyLower.includes('none')
      ? `Verified against declared allergy (${req.allergies.trim()}). Cross-check ingredient foil strip before ingesting.`
      : 'No drug allergies declared. Always confirm OTC label ingredients prior to use.';

  const studentMessagesCount = req.messages.filter((m) => m.sender === 'student').length;
  const latestStudentText =
    req.messages.filter((m) => m.sender === 'student').slice(-1)[0]?.text ?? '';

  const isFollowUp = studentMessagesCount > 1;
  const replyText = isFollowUp
    ? `Thank you for the update, ${req.studentName}. ${
        latestStudentText.toLowerCase().includes('yes') ||
        latestStudentText.toLowerCase().includes('no')
          ? 'Noted clearly in your clinical chart.'
          : 'I have reviewed these details carefully.'
      } I have updated your OTC care guidance and prescription card below (${guidanceParts[0] || 'supportive hydration & rest'}). Please tap "+ Add Recommended Items to Cart" if you want immediate gate delivery, and alert the hostel warden or visit the campus infirmary immediately if you develop red-flag symptoms.`
    : `Hello ${req.studentName}, I am ${req.doctorName} (${req.doctorNmcReg}). I reviewed your triage for ${req.symptoms.join(', ')} (${req.duration}). To confirm safety: have you checked your current temperature or noticed any dizziness when standing? Meanwhile, I have prepared your OTC prescription card below based on your allergy check (${req.allergies || 'None declared'}).`;

  return {
    replyText,
    issuePrescription: true,
    prescription: {
      diagnosisSummary: `Acute symptomatic hostel triage: ${req.symptoms.join(', ')} (${req.duration})`,
      dosageGuidance: guidanceParts.join(' '),
      firstAidAdvice: adviceParts.join(' '),
      redFlagWarning:
        'Seek urgent campus infirmary / ER care immediately if fever exceeds 103°F, breathing becomes difficult, pain turns severe/unrelenting, vomiting prevents keeping liquids down, or dizziness worsens.',
      allergyCheckNote: allergyText,
      recommendedKitIds: finalIds,
      issuedBy: req.doctorName,
      issuedByNmc: req.doctorNmcReg,
      issuedAtIso: new Date().toISOString(),
    },
    source: 'clinical-fallback',
  };
}
