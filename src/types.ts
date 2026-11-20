import type { Timestamp } from 'firebase/firestore';

export type SymptomCategory =
  | 'All Kits'
  | 'Fever & Cold'
  | 'Headache & Migraine'
  | 'Stomach & Acidity'
  | 'First-Aid & Sprains'
  | 'Hydration & Energy'
  | 'Period & Cramp Care'
  | 'Personal Hygiene & Masks'
  | 'Sleep & Wellness'
  | 'Eye, Ear & Skin Care'
  | 'Single Strip & Quick-Grab Essentials';

export type AppTab = 'order' | 'tracker' | 'operations';

export type UserRoleMode = 'student' | 'admin';

export interface DemoSession {
  role: UserRoleMode;
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
}

export type UpiProvider = 'GPay' | 'PhonePe' | 'Paytm';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface ReliefKit {
  id: string;
  skuCode?: string;
  name: string;
  subtitle?: string;
  category: Exclude<SymptomCategory, 'All Kits'>;
  price: number;
  contents: string[];
  symptomTags?: string[];
  reliefFor: string;
  imagePath: string;
  photoDataUrl?: string;
  etaMinutes: number;
  sealedCode: string;
  inStock: boolean;
}

export interface CartItem {
  id: string;
  kit: ReliefKit;
  quantity: number;
}

export type OrderStatus =
  | 'queued'
  | 'picked_up'
  | 'gate_cleared'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

export interface StudentProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  hostelName: string;
  roomNumber: string;
  emergencyContactName: string;
  gateLat: number;
  gateLng: number;
  wellnessPassActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OrderItem {
  kitId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CampusOrder {
  id: string;
  studentUid: string;
  studentName: string;
  studentPhone: string;
  hostelName: string;
  roomNumber: string;
  gateLat: number;
  gateLng: number;
  runnerName: string;
  runnerPhone: string;
  runnerLat: number;
  runnerLng: number;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  wellnessPassAdded: boolean;
  totalPayable: number;
  upiProvider: UpiProvider;
  handoverPin: string;
  trackerStep: 1 | 2 | 3 | 4;
  status: OrderStatus;
  deliveryMinutes: number;
  specialInstructions?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OrderFeedback {
  orderId: string;
  studentUid: string;
  studentName: string;
  runnerName: string;
  hostelName: string;
  rating: number;
  comment: string;
  createdAt?: Timestamp;
}

export interface SharedTracker {
  orderId: string;
  hostelName: string;
  gateLat: number;
  gateLng: number;
  runnerName: string;
  runnerLat: number;
  runnerLng: number;
  itemsSummary: string[];
  trackerStep: 1 | 2 | 3 | 4;
  status: OrderStatus;
  deliveryMinutes: number;
  updatedAt?: Timestamp;
}

export type ConsultationStatus = 'active' | 'prescribed' | 'completed';

export type DoctorSpecialtyFilter =
  | 'All Doctors'
  | 'General Physician'
  | 'Stomach & Digestion'
  | "Women's Health"
  | 'Skin & Allergy'
  | 'ENT & Eye Care'
  | 'Ortho & Sports Injury'
  | 'Dental & Oral Care'
  | 'Sleep & Stress Wellness';

export interface DoctorProfile {
  id: string;
  name: string;
  qualification: string;
  specialty: string;
  specialtyCategory: Exclude<DoctorSpecialtyFilter, 'All Doctors'>;
  nmcReg: string;
  focusSymptoms: string;
  languages: string[];
  responseTimeLabel: string;
  shiftLabel: string;
  experienceYears: number;
  photoUrl: string;
  baseFee: number;
  passFee: number;
  recommendedSymptomMatches: string[];
  defaultRecommendedKitIds: string[];
}

export interface ConsultationMessage {
  id: string;
  sender: 'student' | 'doctor' | 'admin';
  senderName: string;
  text: string;
  timestampIso: string;
}

export interface DigitalPrescription {
  diagnosisSummary: string;
  dosageGuidance: string;
  firstAidAdvice: string;
  redFlagWarning: string;
  allergyCheckNote: string;
  recommendedKitIds: string[];
  issuedBy: string;
  issuedByNmc: string;
  issuedAtIso: string;
}

export interface CampusConsultation {
  id: string;
  studentUid: string;
  studentName: string;
  studentPhone: string;
  hostelName: string;
  roomNumber: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorNmcReg: string;
  symptoms: string[];
  duration: string;
  allergies: string;
  notes: string;
  consultationFee: number;
  wellnessPassApplied: boolean;
  upiProvider: UpiProvider;
  status: ConsultationStatus;
  messages: ConsultationMessage[];
  recommendedKitIds: string[];
  prescription?: DigitalPrescription;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

