import type { ReliefKit } from '../types';

export interface QuickSymptomChip {
  id: string;
  emoji: string;
  label: string;
  query: string;
}

export const QUICK_SYMPTOM_CHIPS: QuickSymptomChip[] = [
  { id: 'fever', emoji: '🤒', label: 'Fever', query: 'fever' },
  { id: 'headache', emoji: '🤕', label: 'Headache', query: 'headache' },
  { id: 'acidity', emoji: '🤢', label: 'Acidity', query: 'acidity' },
  { id: 'first-aid', emoji: '🩹', label: 'First-Aid', query: 'first-aid' },
  { id: 'dehydration', emoji: '💧', label: 'Dehydration', query: 'dehydration' },
];

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'at',
  'be',
  'can',
  'do',
  'feel',
  'feeling',
  'for',
  'get',
  'got',
  'have',
  'having',
  'help',
  'hurts',
  'i',
  'im',
  'in',
  'is',
  'it',
  'kit',
  'kits',
  'me',
  'my',
  'need',
  'of',
  'on',
  'or',
  'pack',
  'please',
  'relief',
  'some',
  'something',
  'the',
  'to',
  'want',
  'with',
]);

// Fallback symptom & Indian campus medical keywords for legacy or custom kits
const KIT_SYMPTOM_KEYWORDS: Record<string, string[]> = {
  'kit-fever-flu': ['fever', 'bukhar', 'paracetamol', 'dolo', 'crocin', 'chills', 'flu', 'sore throat', 'thermometer', 'ors'],
  'kit-steam-nasal': ['cold', 'sardi', 'zukam', 'blocked nose', 'nasal', 'steam', 'vicks', 'vaporub', 'inhaler', 'sinus'],
  'kit-cough-soother': ['cough', 'khansi', 'dry cough', 'sore throat', 'syrup', 'gargle', 'lozenges'],
  'kit-paracetamol-strip': ['paracetamol', 'dolo', 'dolo 650', 'crocin', 'fever', 'bukhar', 'thermometer', 'strip'],
  'kit-headache-acidity': ['headache', 'sir dard', 'disprin', 'saridon', 'stress', 'balm', 'peppermint'],
  'kit-sinus-eyecare': ['eye', 'eye drops', 'sinus', 'laptop', 'screen', 'headache', 'dry eyes'],
  'kit-migraine-darkroom': ['migraine', 'severe headache', 'throbbing', 'light sensitivity', 'nausea'],
  'kit-cooling-gel-patches': ['cooling patch', 'gel patch', 'forehead', 'headache', 'migraine', 'fever', 'roll-on'],
  'kit-canteen-acidity': ['acidity', 'gas', 'eno', 'antacid', 'heartburn', 'bloating', 'reflux', 'stomach'],
  'kit-tummy-recovery': ['vomit', 'vomiting', 'puke', 'nausea', 'food poisoning', 'loose motion', 'diarrhea', 'stomach', 'tummy'],
  'kit-motion-indigestion': ['vomit', 'vomiting', 'nausea', 'motion sickness', 'indigestion', 'gas', 'stomach'],
  'kit-acid-reflux-pack': ['acidity', 'digene', 'pudin hara', 'gas', 'heartburn', 'reflux', 'stomach'],
  'kit-first-aid': ['first-aid', 'first aid', 'cut', 'burn', 'bleeding', 'wound', 'antiseptic', 'band-aid', 'gauze'],
  'kit-sports-sprain': ['sprain', 'ankle', 'twist', 'muscle', 'pain spray', 'bandage', 'ice pack', 'swelling', 'first-aid'],
  'kit-skin-rash': ['blister', 'bruise', 'mosquito', 'bite', 'rash', 'itch', 'calamine', 'first-aid'],
  'kit-pain-spray-combo': ['volini', 'moov', 'spray', 'pain spray', 'sprain', 'wrist', 'ankle', 'bandage', 'first-aid'],
  'kit-dehydration': ['dehydration', 'ors', 'electral', 'glucose', 'dizzy', 'dizziness', 'weakness', 'energy'],
  'kit-study-hydration': ['dehydration', 'hydration', 'electrolyte', 'ors', 'study', 'energy', 'fatigue'],
  'kit-fatigue-reset': ['dehydration', 'hangover', 'fatigue', 'tired', 'energy', 'b-complex'],
  'kit-electral-ors-4pack': ['ors', 'electral', 'electrolyte', 'dehydration', 'lemon', 'vitamin c'],
  'kit-period-care': ['period', 'pads', 'sanitary', 'cramp', 'cramps', 'heat patch', 'menstrual'],
  'kit-intimate-comfort': ['period', 'intimate', 'wipes', 'liners', 'hot water', 'cramp', 'pads'],
  'kit-heavy-flow': ['period', 'pads', 'heavy flow', 'overnight', 'xl pads', 'sanitary'],
  'kit-overnight-pads-heatpad': ['whisper', 'sofy', 'pads', 'xl pads', 'overnight', 'period', 'heat pad', 'cramp'],
  'kit-flu-hygiene': ['mask', 'n95', 'sanitizer', 'wipes', 'hygiene', 'flu'],
  'kit-dental-ulcer': ['ulcer', 'mouth ulcer', 'chhale', 'tooth', 'toothache', 'dental', 'mouthwash'],
  'kit-lens-ear-care': ['lens', 'contact lens', 'ear', 'ear drops', 'earache'],
  'kit-washroom-hygiene-pouch': ['washroom', 'toilet', 'sanitizer', 'wet wipes', 'soap', 'hygiene'],
  'kit-deep-sleep': ['sleep', 'insomnia', 'earplugs', 'noise', 'sleep mask', 'lavender'],
  'kit-calm-down': ['anxiety', 'stress', 'calm', 'exam', 'chamomile', 'sleep'],
  'kit-dry-skin-rescue': ['dry skin', 'lip balm', 'chapped lips', 'moisturizer', 'winter', 'cream'],
  'kit-melatonin-free-sleep': ['sleep', 'melatonin', 'herbal', 'eye mask', 'lavender', 'chamomile', 'insomnia'],
  'kit-screen-eye-drops': ['eye drops', 'eyes', 'dry eyes', 'red eyes', 'dust', 'screen', 'wipes'],
  'kit-fungal-skin-rash': ['rash', 'fungal', 'itch', 'itching', 'skin', 'calamine', 'powder', 'allergy'],
  'kit-lip-crack-winter': ['lip crack', 'chapped lips', 'cold sore', 'lip balm', 'vaseline', 'petroleum jelly', 'winter'],
  'kit-ear-wax-swimmer': ['ear', 'ear drops', 'ear wax', 'swimmer', 'cotton buds', 'earache'],
  'kit-bandaid-20pack': ['band-aid', 'bandaid', 'bandage', 'cut', 'shoe bite', 'blister', 'strips', 'first-aid'],
  'kit-eno-6sachet': ['eno', 'fruit salt', 'acidity', 'gas', 'heartburn', 'bloating', 'sachet', 'antacid'],
  'kit-strepsils-16drop': ['strepsils', 'vicks', 'lozenges', 'throat', 'sore throat', 'cough', 'drops'],
  'kit-savlon-cotton-mini': ['savlon', 'dettol', 'antiseptic', 'cotton', 'cotton roll', 'cut', 'wound', 'first-aid'],
};

const CATEGORY_SYMPTOM_KEYWORDS: Record<string, string[]> = {
  'Fever & Cold': ['fever', 'bukhar', 'cold', 'cough', 'flu', 'paracetamol', 'dolo', 'throat', 'nasal', 'steam'],
  'Headache & Migraine': ['headache', 'migraine', 'sir dard', 'disprin', 'saridon', 'sinus', 'cooling patch'],
  'Stomach & Acidity': ['acidity', 'gas', 'stomach', 'vomit', 'vomiting', 'nausea', 'eno', 'digene', 'antacid', 'tummy'],
  'First-Aid & Sprains': ['first-aid', 'first aid', 'cut', 'burn', 'sprain', 'bandage', 'band-aid', 'wound', 'volini', 'moov'],
  'Hydration & Energy': ['dehydration', 'ors', 'electral', 'glucose', 'energy', 'tired', 'dizzy', 'fatigue', 'hydration'],
  'Period & Cramp Care': ['period', 'pads', 'sanitary', 'cramp', 'cramps', 'menstrual', 'heat patch', 'whisper', 'sofy'],
  'Personal Hygiene & Masks': ['mask', 'n95', 'sanitizer', 'hygiene', 'dental', 'ulcer', 'tooth', 'washroom', 'wipes'],
  'Sleep & Wellness': ['sleep', 'insomnia', 'anxiety', 'stress', 'calm', 'lip balm', 'dry skin', 'moisturizer'],
  'Eye, Ear & Skin Care': ['eye drops', 'ear drops', 'skin', 'rash', 'fungal', 'itch', 'lip crack', 'cotton buds'],
  'Single Strip & Quick-Grab Essentials': ['band-aid', 'eno', 'strepsils', 'vicks', 'lozenges', 'savlon', 'dettol', 'cotton', 'single', 'quick'],
};

function buildKitSearchCorpus(kit: ReliefKit): string {
  const parts = [
    kit.skuCode ?? '',
    kit.name,
    kit.subtitle ?? '',
    kit.category,
    kit.reliefFor,
    kit.sealedCode,
    ...kit.contents,
    ...(kit.symptomTags ?? []),
    ...(KIT_SYMPTOM_KEYWORDS[kit.id] ?? []),
    ...(CATEGORY_SYMPTOM_KEYWORDS[kit.category] ?? []),
  ];
  return parts.join(' ').toLowerCase();
}

export function matchesKitSearch(kit: ReliefKit, rawQuery: string): boolean {
  const normalized = rawQuery
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return true;

  const corpus = buildKitSearchCorpus(kit);
  if (corpus.includes(normalized)) return true;

  const dehyphenatedQuery = normalized.replace(/-/g, ' ');
  const dehyphenatedCorpus = corpus.replace(/-/g, ' ');
  if (dehyphenatedCorpus.includes(dehyphenatedQuery)) return true;

  const rawTokens = normalized.split(' ').filter(Boolean);
  const meaningfulTokens = rawTokens.filter((t) => !STOP_WORDS.has(t));
  const tokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

  if (tokens.length === 0) return true;

  return tokens.every(
    (token) => corpus.includes(token) || dehyphenatedCorpus.includes(token.replace(/-/g, ' '))
  );
}

export function filterKitsBySearch(kits: ReliefKit[], rawQuery: string): ReliefKit[] {
  const trimmed = rawQuery.trim();
  if (!trimmed) return kits;

  const strictMatches = kits.filter((kit) => matchesKitSearch(kit, trimmed));
  if (strictMatches.length > 0) return strictMatches;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = normalized
    .split(' ')
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));

  if (tokens.length <= 1) {
    return strictMatches;
  }

  return kits.filter((kit) => {
    const corpus = buildKitSearchCorpus(kit).replace(/-/g, ' ');
    return tokens.some((token) => corpus.includes(token.replace(/-/g, ' ')));
  });
}
