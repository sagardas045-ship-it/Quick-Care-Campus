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
  { id: 'kit-study-hydration', skuCode: 'QCC-018', name: 'All-Nighter Study Hydration Box', category: 'Hydration & Energy', price: 90, reliefFor: 'Late-night exam prep without caffeine crash' },
  { id: 'kit-fatigue-reset', skuCode: 'QCC-019', name: 'Morning Hangover & Fatigue Reset Kit', category: 'Hydration & Energy', price: 130, reliefFor: '8 AM grogginess, dehydration & low energy' },
  { id: 'kit-electral-ors-4pack', skuCode: 'QCC-020', name: '4-Pack Electral ORS & Lemon Electrolyte Blitz', category: 'Hydration & Energy', price: 85, reliefFor: 'Rapid electrolyte replacement after fever or vomiting' },
  { id: 'kit-period-care', skuCode: 'QCC-021', name: 'Period Care & Cramp Relief Box', category: 'Period & Cramp Care', price: 150, reliefFor: 'Discreet menstrual care & acute cramps' },
  { id: 'kit-intimate-comfort', skuCode: 'QCC-022', name: 'Intimate Hygiene & Comfort Pack', category: 'Period & Cramp Care', price: 135, reliefFor: 'Overnight comfort, pH wipes & soothing warmth' },
  { id: 'kit-heavy-flow', skuCode: 'QCC-023', name: 'Heavy Flow Overnight Protection Kit', category: 'Period & Cramp Care', price: 120, reliefFor: 'Leak-free overnight sleep & menstrual comfort' },
  { id: 'kit-overnight-pads-heatpad', skuCode: 'QCC-024', name: 'Whisper/Sofy XL Overnight Pads + Electric/Gel Heat Pad Refill', category: 'Period & Cramp Care', price: 160, reliefFor: 'Overnight leak protection & cramp warmth' },
  { id: 'kit-flu-hygiene', skuCode: 'QCC-025', name: 'Hostel Flu Protection & Hygiene Kit', category: 'Personal Hygiene & Masks', price: 80, reliefFor: 'Dorm flu protection & germ hygiene' },
  { id: 'kit-dental-ulcer', skuCode: 'QCC-026', name: 'Dental & Mouth Ulcer Emergency Pack', category: 'Personal Hygiene & Masks', price: 95, reliefFor: 'Mouth ulcers & midnight tooth sensitivity' },
  { id: 'kit-lens-ear-care', skuCode: 'QCC-027', name: 'Contact Lens & Ear Care Essentials', category: 'Personal Hygiene & Masks', price: 130, reliefFor: 'Dry contact lenses & mild ear discomfort' },
  { id: 'kit-washroom-hygiene-pouch', skuCode: 'QCC-028', name: 'Hostel Washroom & Travel Hygiene Emergency Pouch', category: 'Personal Hygiene & Masks', price: 75, reliefFor: 'Washroom sanitization & hygiene' },
  { id: 'kit-deep-sleep', skuCode: 'QCC-029', name: 'Hostel Noise & Deep Sleep Kit', category: 'Sleep & Wellness', price: 110, reliefFor: 'Loud corridors & restless insomnia' },
  { id: 'kit-calm-down', skuCode: 'QCC-030', name: 'Exam Anxiety & Calm Down Box', category: 'Sleep & Wellness', price: 125, reliefFor: 'Pre-viva stress & late-night tension' },
  { id: 'kit-dry-skin-rescue', skuCode: 'QCC-031', name: 'Lip & Dry Weather Skin Rescue', category: 'Sleep & Wellness', price: 95, reliefFor: 'Chapped winter lips & dry skin barrier repair' },
  { id: 'kit-melatonin-free-sleep', skuCode: 'QCC-032', name: 'Melatonin-Free Herbal Sleep & Eye Rest Kit', category: 'Sleep & Wellness', price: 115, reliefFor: 'Drug-free sleep aid & tired study eyes' },
  { id: 'kit-screen-eye-drops', skuCode: 'QCC-033', name: 'Late-Night Screen & Dust Eye Drop Relief Pack', category: 'Eye, Ear & Skin Care', price: 95, reliefFor: 'Dry, irritated or red eyes from screens' },
  { id: 'kit-fungal-skin-rash', skuCode: 'QCC-034', name: 'Hostel Water Fungal & Skin Rash Care Kit', category: 'Eye, Ear & Skin Care', price: 110, reliefFor: 'Rashes, itching & fungal skin irritation' },
  { id: 'kit-lip-crack-winter', skuCode: 'QCC-035', name: 'Cold Sore, Lip Crack & Winter Dryness Rescue', category: 'Eye, Ear & Skin Care', price: 80, reliefFor: 'Cracked lips, cold sores & winter dryness' },
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

  const specialtyLower = (req.doctorSpecialty || '').toLowerCase();
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
    combinedText.includes('tooth') ||
    combinedText.includes('ulcer') ||
    combinedText.includes('gum') ||
    combinedText.includes('dental') ||
    combinedText.includes('chhale')
  ) {
    pushKit('kit-dental-ulcer');
    if (!hasNsaidAllergy && !hasParacetamolAllergy) {
      pushKit('kit-headache-acidity');
    } else {
      pushKit('kit-cooling-gel-patches');
    }
    guidanceParts.push(
      'Apply a thin layer of oral ulcer gel on clean dry mucosa before sleep and brush gently with desensitizing paste.'
    );
    adviceParts.push(
      'Do a warm salt-water rinse for 30 seconds after eating and avoid very hot, spicy, or acidic foods tonight.'
    );
  }

  if (
    combinedText.includes('sprain') ||
    combinedText.includes('ankle') ||
    combinedText.includes('stair') ||
    combinedText.includes('back') ||
    combinedText.includes('muscle') ||
    combinedText.includes('twist')
  ) {
    pushKit('kit-sports-sprain');
    pushKit('kit-pain-spray-combo');
    guidanceParts.push(
      'Spray pain-relief mist from 15cm away up to 3x daily (not on open cuts) and apply elastic crepe wrap snug—never too tight.'
    );
    adviceParts.push(
      'Follow R.I.C.E.: Rest weight off the joint, Ice pack wrapped in cloth 15 mins every 2 hours, Compression wrap, and Elevate ankle on a pillow.'
    );
  }

  if (
    combinedText.includes('rash') ||
    combinedText.includes('fungal') ||
    combinedText.includes('allergy') ||
    combinedText.includes('itch') ||
    combinedText.includes('mosquito') ||
    combinedText.includes('blister') ||
    combinedText.includes('burn')
  ) {
    if (combinedText.includes('burn') || combinedText.includes('cut')) {
      pushKit('kit-first-aid');
      pushKit('kit-savlon-cotton-mini');
      guidanceParts.push(
        'Cool minor burn under running tap water for 10 mins first, then apply silver burn gel thinly.'
      );
    } else {
      pushKit('kit-fungal-skin-rash');
      pushKit('kit-skin-rash');
      guidanceParts.push(
        'Keep skin dry after showering and apply antifungal dusting powder or calamine lotion gently 2–3x daily.'
      );
    }
    adviceParts.push('Wear loose breathable cotton clothes and avoid scratching or tight wet socks.');
  }

  if (
    combinedText.includes('eye') ||
    combinedText.includes('lens') ||
    combinedText.includes('ear') ||
    combinedText.includes('sinus') ||
    combinedText.includes('blocked nose')
  ) {
    if (combinedText.includes('ear')) {
      pushKit('kit-ear-wax-swimmer');
      pushKit('kit-lens-ear-care');
      guidanceParts.push(
        'Instill 2–3 soothing ear drops only if there is no fluid/pus discharge or eardrum perforation history.'
      );
    }
    if (combinedText.includes('eye') || combinedText.includes('lens') || combinedText.includes('sinus')) {
      pushKit('kit-screen-eye-drops');
      pushKit('kit-sinus-eyecare');
      guidanceParts.push(
        'Use 1–2 sterile lubricating eye drops per eye every 4–6 hours; remove contact lenses until irritation clears.'
      );
    }
    adviceParts.push('Follow the 20-20-20 screen rule and avoid poking cotton buds deep into the ear canal.');
  }

  if (
    combinedText.includes('anxiety') ||
    combinedText.includes('panic') ||
    combinedText.includes('insomnia') ||
    combinedText.includes('sleep') ||
    combinedText.includes('fatigue')
  ) {
    pushKit('kit-calm-down');
    pushKit('kit-melatonin-free-sleep');
    pushKit('kit-deep-sleep');
    guidanceParts.push(
      'Brew warm chamomile tea 30 mins before bed, put on the self-warming eye mask, and use acoustic earplugs for hostel noise.'
    );
    adviceParts.push(
      'Try 4-7-8 slow paced breathing for 3 minutes and step away from exam screens for a 20-minute wind-down.'
    );
  }

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
    pushKit('kit-strepsils-16drop');
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

  if (combinedText.includes('period') || combinedText.includes('menstrual') || combinedText.includes('uti')) {
    pushKit('kit-period-care');
    pushKit('kit-overnight-pads-heatpad');
    pushKit('kit-intimate-comfort');
    guidanceParts.push(
      'Apply the self-warming heat patch over lower abdomen for 20–30 mins; hydrate with warm water.'
    );
    adviceParts.push('Rest with knees slightly elevated to ease pelvic muscle spasm.');
  }

  if (
    combinedText.includes('dehydrat') ||
    combinedText.includes('dizzy') ||
    combinedText.includes('weak')
  ) {
    pushKit('kit-dehydration');
    pushKit('kit-electral-ors-4pack');
    guidanceParts.push('Prepare Electral ORS as directed and sip slowly over 1–2 hours.');
    adviceParts.push('Sit or lie down immediately if lightheaded and loosen tight collars.');
  }

  // Specialist fallback if free-text matched no keywords
  if (pickedIds.length === 0) {
    if (specialtyLower.includes('orthoped')) {
      pushKit('kit-sports-sprain');
      pushKit('kit-pain-spray-combo');
    } else if (specialtyLower.includes('dermat')) {
      pushKit('kit-fungal-skin-rash');
      pushKit('kit-skin-rash');
    } else if (specialtyLower.includes('ent') || specialtyLower.includes('ophthalm')) {
      pushKit('kit-screen-eye-drops');
      pushKit('kit-ear-wax-swimmer');
    } else if (specialtyLower.includes('dental')) {
      pushKit('kit-dental-ulcer');
      pushKit('kit-headache-acidity');
    } else if (specialtyLower.includes('sleep') || specialtyLower.includes('stress')) {
      pushKit('kit-calm-down');
      pushKit('kit-melatonin-free-sleep');
    } else if (specialtyLower.includes('gynecol') || specialtyLower.includes('women')) {
      pushKit('kit-period-care');
      pushKit('kit-intimate-comfort');
    } else if (specialtyLower.includes('internal')) {
      pushKit('kit-canteen-acidity');
      pushKit('kit-electral-ors-4pack');
    } else {
      pushKit('kit-fever-flu');
      pushKit('kit-dehydration');
    }
    guidanceParts.push('Follow enclosed OTC kit instructions carefully and monitor how you feel tonight.');
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

  let clarifyingQuestion = 'Can you tell me if the pain or discomfort is worsening rapidly right now?';
  if (specialtyLower.includes('orthoped')) {
    clarifyingQuestion = 'Are you able to bear weight on the joint, and do you see visible swelling or bruising?';
  } else if (specialtyLower.includes('dental')) {
    clarifyingQuestion = 'Is there cheek/jaw swelling or pain triggered by hot or cold liquids?';
  } else if (specialtyLower.includes('dermat')) {
    clarifyingQuestion = 'Is the rash spreading rapidly, oozing, or accompanied by lip/throat swelling?';
  } else if (specialtyLower.includes('ent') || specialtyLower.includes('ophthalm')) {
    clarifyingQuestion = 'Are you experiencing blurred vision, pus discharge, or severe throbbing inside the ear?';
  } else if (specialtyLower.includes('sleep') || specialtyLower.includes('stress')) {
    clarifyingQuestion = 'Have you had heavy caffeine or energy drinks tonight, and are you feeling shortness of breath?';
  } else if (specialtyLower.includes('gynecol') || specialtyLower.includes('women')) {
    clarifyingQuestion = 'Are you experiencing burning urination, high fever, or dizziness with the cramps?';
  }

  const isFollowUp = studentMessagesCount > 1;
  const replyText = isFollowUp
    ? `Thank you for sharing that update, ${req.studentName}. ${
        latestStudentText.toLowerCase().includes('yes') ||
        latestStudentText.toLowerCase().includes('no')
          ? 'Noted clearly in your clinical chart.'
          : 'I have reviewed your update carefully.'
      } I have updated your OTC care guidance and prescription card below (${guidanceParts[0] || 'supportive first-aid & rest'}). Tap "+ Add Recommended Items to Cart" if you want immediate gate delivery, and visit the campus infirmary immediately if any red-flag signs appear.`
    : `Hello ${req.studentName}, I am ${req.doctorName} (${req.doctorNmcReg}). I reviewed your triage for ${req.symptoms.join(', ')} (${req.duration}). Quick safety check: ${clarifyingQuestion} Meanwhile, I have prepared your Digital Prescription Card below after checking your allergies (${req.allergies || 'None declared'}).`;

  return {
    replyText,
    issuePrescription: true,
    prescription: {
      diagnosisSummary: `Specialist triage (${req.doctorSpecialty}): ${req.symptoms.join(', ')} (${req.duration})`,
      dosageGuidance: guidanceParts.join(' '),
      firstAidAdvice: adviceParts.join(' '),
      redFlagWarning:
        'Seek urgent campus infirmary / ER care immediately if fever exceeds 103°F, breathing/swallowing becomes difficult, severe swelling or inability to bear weight occurs, vision blurs, or vomiting prevents keeping liquids down.',
      allergyCheckNote: allergyText,
      recommendedKitIds: finalIds,
      issuedBy: req.doctorName,
      issuedByNmc: req.doctorNmcReg,
      issuedAtIso: new Date().toISOString(),
    },
    source: 'clinical-fallback',
  };
}
