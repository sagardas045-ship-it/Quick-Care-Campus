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
  | 'Sleep & Wellness';

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
  name: string;
  category: Exclude<SymptomCategory, 'All Kits'>;
  price: number;
  contents: string[];
  reliefFor: string;
  imagePath: string;
  etaMinutes: number;
  sealedCode: string;
  inStock: boolean;
}

export interface CartItem {
  kit: ReliefKit;
  quantity: number;
}

export type OrderStatus =
  | 'queued'
  | 'picked_up'
  | 'gate_cleared'
  | 'arrived'
  | 'delivered';

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
