import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import {
  Bell,
  BellOff,
  BellRing,
  Cross,
  History,
  LogOut,
  MapPin,
  Moon,
  PackagePlus,
  Shield,
  Store,
  Sun,
  UserCog,
} from 'lucide-react';
import {
  CAMPUS_RUNNERS,
  DELIVERY_FEE,
  PHARMACY_ORIGIN,
  RELIEF_KITS,
  WELLNESS_PASS_PRICE,
} from './data/campusData';
import { isValidBundledKitImagePath, resolveKitAssetUrl } from './data/kitAssets';
import { writeCachedPhoto } from './utils/photoCache';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  CampusOrder,
  CartItem,
  DemoSession,
  LatLngLiteral,
  OrderFeedback,
  OrderStatus,
  ReliefKit,
  StudentProfile,
  UpiProvider,
  UserRoleMode,
} from './types';
import { LoginScreen } from './components/LoginScreen';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { EmergencyOrderView } from './components/EmergencyOrderView';
import { LiveTrackerView } from './components/LiveTrackerView';
import { OrderHistoryView } from './components/OrderHistoryView';
import { SharedTrackerView } from './components/SharedTrackerView';
import { OperationsView } from './components/OperationsView';
import { publishSharedTracker, syncSharedTrackerStatus } from './utils/sharedTracker';
import {
  buildOrderStatusCopy,
  OrderStatusNotification,
  OrderStatusToastStack,
} from './components/OrderStatusToastStack';

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  (typeof __FALLBACK_GOOGLE_MAPS_API_KEY__ !== 'undefined'
    ? __FALLBACK_GOOGLE_MAPS_API_KEY__
    : '');

const CAMPUS_ADMIN_EMAIL = 'sagardas045@gmail.com';

const DEMO_ORDERS_KEY = 'qcc_demo_orders_v1';
const DEMO_KITS_KEY = 'qcc_demo_kits_v1';
const DEMO_FEEDBACK_KEY = 'qcc_demo_feedback_v1';
const DEMO_PROFILE_PREFIX = 'qcc_demo_profile_v1_';
const THEME_STORAGE_KEY = 'qcc_theme_pref_v2';

type CustomerTab = 'order' | 'tracker' | 'history';

function readStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorageJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

function getInitialDarkMode(): boolean {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // ignore storage access issues
  }
  return false;
}

function getCurfewHeaderTelemetry(): { isNightCurfew: boolean; pillLabel: string; subLabel: string } {
  const hour = new Date().getHours();
  const isNightCurfew = hour >= 22 || hour < 6;
  return {
    isNightCurfew,
    pillLabel: isNightCurfew ? 'Night Curfew Live' : 'Curfew Express Ready',
    subLabel: isNightCurfew ? '10 PM – 6 AM Active' : '24/7 Gate Dispatch',
  };
}

const VALID_KIT_CATEGORIES = new Set([
  'Fever & Cold',
  'Headache & Migraine',
  'Stomach & Acidity',
  'First-Aid & Sprains',
  'Hydration & Energy',
  'Period & Cramp Care',
  'Personal Hygiene & Masks',
  'Sleep & Wellness',
]);

const LEGACY_CATEGORY_UPGRADES: Record<string, ReliefKit['category']> = {
  'Fever & Flu': 'Fever & Cold',
  'Headache & Acidity': 'Headache & Migraine',
  'First-Aid': 'First-Aid & Sprains',
  'Hydration & Cramps': 'Hydration & Energy',
};

type RawFirestoreKit = ReliefKit & { imageUrl?: string };

function getValidPhotoDataUrl(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('data:image/') || trimmed.length > 200000) {
    return undefined;
  }
  return trimmed;
}

function sanitizeKitForFirestore(kit: ReliefKit): ReliefKit {
  const validPhotoDataUrl = getValidPhotoDataUrl(kit.photoDataUrl);
  return {
    id: kit.id,
    name: kit.name,
    category: kit.category,
    price: kit.price,
    contents: kit.contents,
    reliefFor: kit.reliefFor,
    imagePath: kit.imagePath,
    ...(validPhotoDataUrl ? { photoDataUrl: validPhotoDataUrl } : {}),
    etaMinutes: kit.etaMinutes,
    sealedCode: kit.sealedCode,
    inStock: kit.inStock,
  };
}

function mergeCatalogWithDefaults(existingKits: RawFirestoreKit[]): {
  merged: ReliefKit[];
  kitsToSync: ReliefKit[];
} {
  const existingById = new globalThis.Map<string, RawFirestoreKit>();
  existingKits.forEach((kit) => existingById.set(kit.id, kit));

  const kitsToSync: ReliefKit[] = [];
  const merged: ReliefKit[] = [];

  for (const starter of RELIEF_KITS) {
    const existing = existingById.get(starter.id);
    if (!existing) {
      merged.push(starter);
      kitsToSync.push(starter);
    } else {
      const hasValidCategory = VALID_KIT_CATEGORIES.has(existing.category);
      const rawImage = (existing.imagePath || existing.imageUrl || '').trim();
      const validPhotoDataUrl = getValidPhotoDataUrl(existing.photoDataUrl);
      const hasValidBundledPath = isValidBundledKitImagePath(rawImage);
      const resolvedImagePath = hasValidBundledPath
        ? resolveKitAssetUrl(rawImage, starter.id, starter.category)
        : starter.imagePath;

      if (validPhotoDataUrl) {
        writeCachedPhoto(starter.id, validPhotoDataUrl, resolvedImagePath);
      }

      const hasBrokenOrOutdatedImage =
        !hasValidBundledPath || Boolean(existing.imageUrl);
      const needsStarterUpgrade =
        !hasValidCategory ||
        existing.name !== starter.name ||
        existing.price !== starter.price ||
        existing.category !== starter.category ||
        hasBrokenOrOutdatedImage;

      const upgradedKit: ReliefKit = needsStarterUpgrade
        ? sanitizeKitForFirestore({
            ...starter,
            imagePath: resolvedImagePath,
            ...(validPhotoDataUrl ? { photoDataUrl: validPhotoDataUrl } : {}),
            inStock: typeof existing.inStock === 'boolean' ? existing.inStock : starter.inStock,
          })
        : sanitizeKitForFirestore({
            ...existing,
            imagePath: resolvedImagePath,
            ...(validPhotoDataUrl ? { photoDataUrl: validPhotoDataUrl } : {}),
          });

      merged.push(upgradedKit);
      if (needsStarterUpgrade) {
        kitsToSync.push(upgradedKit);
      }
      existingById.delete(starter.id);
    }
  }

  for (const customKit of existingById.values()) {
    const mappedCategory =
      LEGACY_CATEGORY_UPGRADES[customKit.category] ?? customKit.category;
    const normalizedCategory: ReliefKit['category'] = VALID_KIT_CATEGORIES.has(mappedCategory)
      ? (mappedCategory as ReliefKit['category'])
      : 'First-Aid & Sprains';
    const rawImage = (customKit.imagePath || customKit.imageUrl || '').trim();
    const validPhotoDataUrl = getValidPhotoDataUrl(customKit.photoDataUrl);
    const resolvedImage = resolveKitAssetUrl(rawImage, customKit.id, normalizedCategory);

    if (validPhotoDataUrl) {
      writeCachedPhoto(customKit.id, validPhotoDataUrl, resolvedImage);
    }

    const needsCustomRepair =
      normalizedCategory !== customKit.category ||
      !isValidBundledKitImagePath(rawImage) ||
      resolvedImage !== customKit.imagePath ||
      Boolean(customKit.imageUrl);

    const normalizedCustom = sanitizeKitForFirestore({
      ...customKit,
      category: normalizedCategory,
      imagePath: resolvedImage,
      ...(validPhotoDataUrl ? { photoDataUrl: validPhotoDataUrl } : {}),
    });
    merged.push(normalizedCustom);
    if (needsCustomRepair) {
      kitsToSync.push(normalizedCustom);
    }
  }

  return { merged, kitsToSync };
}

export default function App() {
  const reduceMotion = useReducedMotion();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialDarkMode);
  const [curfewTelemetry, setCurfewTelemetry] = useState(getCurfewHeaderTelemetry);

  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [prefilledPhone, setPrefilledPhone] = useState<string | null>(null);

  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [sharedTrackId, setSharedTrackId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const param = new URLSearchParams(window.location.search).get('track')?.trim();
    return param || null;
  });
  const [activeTab, setActiveTab] = useState<CustomerTab>('order');
  const [roleMode, setRoleMode] = useState<UserRoleMode>('student');

  // OTC Kits Catalog (synced with Firestore `kits` collection or Demo storage)
  const [kits, setKits] = useState<ReliefKit[]>(RELIEF_KITS);
  const syncedKitSignaturesRef = useRef<Set<string>>(new Set());

  // Ordering state
  const [cart, setCart] = useState<CartItem[]>([
    { kit: RELIEF_KITS[0], quantity: 1 },
  ]);
  const [orderPin, setOrderPin] = useState<LatLngLiteral>(PHARMACY_ORIGIN);
  const [roomNumber, setRoomNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [wellnessPassAdded, setWellnessPassAdded] = useState(false);
  const [upiProvider, setUpiProvider] = useState<UpiProvider>('GPay');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Orders & Post-delivery Feedback state
  const [orders, setOrders] = useState<CampusOrder[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [feedbackList, setFeedbackList] = useState<OrderFeedback[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Browser Push & Local Toast Notifications state
  const [browserNotifStatus, setBrowserNotifStatus] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return window.Notification.permission;
  });
  const [orderToasts, setOrderToasts] = useState<OrderStatusNotification[]>([]);
  const ordersHydratedRef = useRef(false);
  const prevOrderStatusMapRef = useRef<globalThis.Map<string, OrderStatus>>(
    new globalThis.Map()
  );

  const isDemoMode = Boolean(demoSession && !currentUser);
  const isCampusAdmin =
    Boolean(currentUser?.emailVerified) &&
    currentUser?.email === CAMPUS_ADMIN_EMAIL;

  const dismissOrderToast = useCallback((toastId: string) => {
    setOrderToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const pushLocalAndBrowserAlert = useCallback(
    (order: CampusOrder) => {
      const copy = buildOrderStatusCopy(order);
      const toastId = `notif-${order.id}-${order.status}-${Date.now()}`;
      const nowLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const toast: OrderStatusNotification = {
        id: toastId,
        orderId: order.id,
        status: order.status,
        stageLabel: copy.stageLabel,
        title: copy.title,
        message: copy.message,
        timestampLabel: nowLabel,
      };

      setOrderToasts((prev) => [toast, ...prev].slice(0, 3));
      window.setTimeout(() => {
        setOrderToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 6500);

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        try {
          const browserNotif = new window.Notification(copy.title, {
            body: copy.message,
            tag: `qcc-${order.id}-${order.status}`,
          });
          browserNotif.onclick = () => {
            window.focus();
            setRoleMode('student');
            setSelectedOrderId(order.id);
            setActiveTab('tracker');
            browserNotif.close();
          };
        } catch {
          // Embedded iframe environments may restrict native Notification constructor; local toast remains active
        }
      }
    },
    []
  );

  const pushSystemToast = useCallback(
    (stageLabel: string, title: string, message: string) => {
      const toastId = `sys-${Date.now()}`;
      const nowLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const toast: OrderStatusNotification = {
        id: toastId,
        status: 'picked_up',
        stageLabel,
        title,
        message,
        timestampLabel: nowLabel,
      };
      setOrderToasts((prev) => [toast, ...prev].slice(0, 3));
      window.setTimeout(() => {
        setOrderToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 5000);
    },
    []
  );

  const handleRequestBrowserNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserNotifStatus('unsupported');
      pushSystemToast(
        'In-App Alerts Active',
        'Live Toast Notifications Active',
        'Your browser does not support native push alerts. Live order status toasts will appear here.'
      );
      return;
    }

    if (window.Notification.permission === 'granted') {
      setBrowserNotifStatus('granted');
      pushSystemToast(
        'Push Alerts Active',
        'Browser & Toast Alerts Active',
        'You will receive instant alerts for Runner Assigned, Picked Up, Out for Delivery, and Arrival.'
      );
      try {
        new window.Notification('Quick Care Campus Alerts Active', {
          body: 'You will receive browser push notifications as your runner picks up and delivers your order.',
          tag: 'qcc-alerts-check',
        });
      } catch {
        // ignore iframe notification block
      }
      return;
    }

    if (window.Notification.permission === 'denied') {
      setBrowserNotifStatus('denied');
      pushSystemToast(
        'In-App Alerts Active',
        'Browser Push Blocked — Using Local Toasts',
        'Native browser alerts are blocked in site settings, so live status toasts will notify you in-app.'
      );
      return;
    }

    try {
      const permission = await window.Notification.requestPermission();
      setBrowserNotifStatus(permission);
      if (permission === 'granted') {
        pushSystemToast(
          'Push Alerts Enabled',
          'Browser Push Notifications Enabled',
          'Live updates active for Runner Assigned, Picked Up, Out for Delivery, and Arrival.'
        );
        try {
          new window.Notification('Quick Care Campus Alerts Enabled', {
            body: 'Live updates active for Runner Assigned, Picked Up, Out for Delivery, and Arrival.',
            tag: 'qcc-alerts-enabled',
          });
        } catch {
          // ignore iframe block
        }
      } else {
        pushSystemToast(
          'In-App Alerts Active',
          'In-App Toast Alerts Active',
          'You will still receive real-time in-app toast notifications for every order milestone.'
        );
      }
    } catch {
      const fallback = window.Notification.permission;
      setBrowserNotifStatus(fallback);
      pushSystemToast(
        'In-App Alerts Active',
        'Live Toast Notifications Active',
        'Order milestone updates will appear here in real time.'
      );
    }
  }, [pushSystemToast]);

  // Watch order creations and status transitions once initial snapshot is hydrated
  useEffect(() => {
    if (!ordersLoaded) return;

    if (!ordersHydratedRef.current) {
      const initialMap = new globalThis.Map<string, OrderStatus>();
      for (const order of orders) {
        initialMap.set(order.id, order.status);
      }
      prevOrderStatusMapRef.current = initialMap;
      ordersHydratedRef.current = true;
      return;
    }

    const prevMap = prevOrderStatusMapRef.current;
    const nextMap = new globalThis.Map<string, OrderStatus>();

    for (const order of orders) {
      nextMap.set(order.id, order.status);
      const previousStatus = prevMap.get(order.id);
      if (!previousStatus || previousStatus !== order.status) {
        pushLocalAndBrowserAlert(order);
      }
    }

    prevOrderStatusMapRef.current = nextMap;
  }, [orders, ordersLoaded, pushLocalAndBrowserAlert]);

  // Apply adaptive dark/light mode to root document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [isDarkMode]);

  // Refresh curfew pulse indicator every minute
  useEffect(() => {
    const id = window.setInterval(() => {
      setCurfewTelemetry(getCurfewHeaderTelemetry());
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // Listen to Tier 1/2 Google Maps Platform quota events
  useEffect(() => {
    const handler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Sync ?track=<orderId> URL parameter on browser Back/Forward
  useEffect(() => {
    const handlePopState = () => {
      const param = new URLSearchParams(window.location.search).get('track')?.trim();
      setSharedTrackId(param || null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openSharedTrackPreview = useCallback((orderId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('track', orderId);
    window.history.pushState({}, '', url.toString());
    setSharedTrackId(orderId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const exitSharedTrackView = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('track');
    window.history.replaceState({}, '', url.toString());
    setSharedTrackId(null);
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (user) {
        setDemoSession(null);
      } else {
        setProfile(null);
        setOrders([]);
        setOrdersLoaded(false);
        ordersHydratedRef.current = false;
        prevOrderStatusMapRef.current.clear();
        setOrderToasts([]);
        setFeedbackList([]);
        setSelectedOrderId(null);
        setRoleMode('student');
        setActiveTab('order');
        setPrefilledPhone(null);
        setKits(RELIEF_KITS);
        syncedKitSignaturesRef.current.clear();
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Student Profile listener (users/{uid})
  useEffect(() => {
    if (!currentUser) return;
    setProfileLoading(true);
    const userPath = `users/${currentUser.uid}`;
    const unsubscribe = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as StudentProfile;
          setProfile(data);
          setOrderPin({ lat: data.gateLat, lng: data.gateLng });
          setRoomNumber(data.roomNumber);
        } else {
          setProfile(null);
        }
        setProfileLoading(false);
      },
      (error) => {
        setProfileLoading(false);
        handleFirestoreError(error, OperationType.GET, userPath);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Firestore OTC Kits Catalog listener (kits collection)
  useEffect(() => {
    if (!currentUser) return;

    const kitsPath = 'kits';
    const unsubscribe = onSnapshot(
      collection(db, 'kits'),
      (snapshot) => {
        if (snapshot.empty) {
          setKits(RELIEF_KITS);
          if (isCampusAdmin) {
            for (const kit of RELIEF_KITS) {
              const signature = `${kit.id}:${kit.imagePath}:${kit.photoDataUrl ? kit.photoDataUrl.length : 0}`;
              if (syncedKitSignaturesRef.current.has(signature)) continue;
              syncedKitSignaturesRef.current.add(signature);
              setDoc(doc(db, 'kits', kit.id), {
                ...sanitizeKitForFirestore(kit),
                updatedAt: serverTimestamp(),
              }).catch((err) =>
                handleFirestoreError(err, OperationType.CREATE, `kits/${kit.id}`)
              );
            }
          }
          return;
        }

        const loadedKits = snapshot.docs.map((d) => d.data() as RawFirestoreKit);
        const { merged, kitsToSync } = mergeCatalogWithDefaults(loadedKits);

        if (isCampusAdmin && kitsToSync.length > 0) {
          for (const kit of kitsToSync) {
            const signature = `${kit.id}:${kit.imagePath}:${kit.photoDataUrl ? kit.photoDataUrl.length : 0}`;
            if (syncedKitSignaturesRef.current.has(signature)) continue;
            syncedKitSignaturesRef.current.add(signature);
            setDoc(doc(db, 'kits', kit.id), {
              ...sanitizeKitForFirestore(kit),
              updatedAt: serverTimestamp(),
            }).catch((err) =>
              handleFirestoreError(err, OperationType.WRITE, `kits/${kit.id}`)
            );
          }
        }

        setKits(merged);

        setCart((prev) =>
          prev
            .map((item) => {
              const latest = merged.find((k) => k.id === item.kit.id);
              return latest ? { ...item, kit: latest } : item;
            })
            .filter((item) => item.kit.inStock)
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, kitsPath);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isCampusAdmin]);

  // Firestore Orders listener (orders collection)
  useEffect(() => {
    if (!currentUser) return;
    if (roleMode === 'student' && !profile) return;

    const ordersPath = 'orders';
    const ordersQuery =
      roleMode === 'admin' && isCampusAdmin
        ? query(collection(db, 'orders'))
        : query(collection(db, 'orders'), where('studentUid', '==', currentUser.uid));

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const loaded: CampusOrder[] = snapshot.docs.map((d) => d.data() as CampusOrder);
        loaded.sort((a, b) => {
          const aMs = a.createdAt?.toMillis?.() ?? 0;
          const bMs = b.createdAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
        setOrders(loaded);
        setOrdersLoaded(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, ordersPath);
      }
    );

    return () => unsubscribe();
  }, [currentUser, profile, roleMode, isCampusAdmin]);

  // Firestore Post-Delivery Feedback listener (feedback collection)
  useEffect(() => {
    if (!currentUser) return;
    if (roleMode === 'student' && !profile) return;

    const feedbackPath = 'feedback';
    const feedbackQuery =
      roleMode === 'admin' && isCampusAdmin
        ? query(collection(db, 'feedback'))
        : query(collection(db, 'feedback'), where('studentUid', '==', currentUser.uid));

    const unsubscribe = onSnapshot(
      feedbackQuery,
      (snapshot) => {
        const loaded: OrderFeedback[] = snapshot.docs.map((d) => d.data() as OrderFeedback);
        setFeedbackList(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, feedbackPath);
      }
    );

    return () => unsubscribe();
  }, [currentUser, profile, roleMode, isCampusAdmin]);

  // Demo Session Entry Handler
  const handleEnterDemoSession = useCallback((session: DemoSession) => {
    setDemoSession(session);
    setRoleMode(session.role);
    setActiveTab('order');
    setEditingProfile(false);

    const savedKits = readStorageJson<ReliefKit[]>(DEMO_KITS_KEY, RELIEF_KITS);
    const { merged } = mergeCatalogWithDefaults(savedKits);
    writeStorageJson(DEMO_KITS_KEY, merged);
    setKits(merged);
    const savedOrders = readStorageJson<CampusOrder[]>(DEMO_ORDERS_KEY, []);
    ordersHydratedRef.current = false;
    prevOrderStatusMapRef.current.clear();
    setOrders(savedOrders);
    setOrdersLoaded(true);
    const savedFeedback = readStorageJson<OrderFeedback[]>(DEMO_FEEDBACK_KEY, []);
    setFeedbackList(savedFeedback);

    const savedProfile = readStorageJson<StudentProfile | null>(
      `${DEMO_PROFILE_PREFIX}${session.uid}`,
      null
    );
    if (savedProfile) {
      setProfile(savedProfile);
      setOrderPin({ lat: savedProfile.gateLat, lng: savedProfile.gateLng });
      setRoomNumber(savedProfile.roomNumber);
    } else {
      setProfile(null);
    }
  }, []);

  const handleSignOut = async () => {
    if (currentUser) {
      await signOut(auth);
    }
    setDemoSession(null);
    setProfile(null);
    setOrders([]);
    setOrdersLoaded(false);
    ordersHydratedRef.current = false;
    prevOrderStatusMapRef.current.clear();
    setOrderToasts([]);
    setFeedbackList([]);
    setSelectedOrderId(null);
    setRoleMode('student');
    setActiveTab('order');
    setPrefilledPhone(null);
    setEditingProfile(false);
  };

  const activeOrder = useMemo(() => {
    if (orders.length === 0) return null;
    if (selectedOrderId) {
      const found = orders.find((o) => o.id === selectedOrderId);
      if (found) return found;
    }
    return orders.find((o) => o.status !== 'delivered' && o.status !== 'cancelled') ?? orders[0];
  }, [orders, selectedOrderId]);

  const lastCompletedOrder = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'delivered');
    if (delivered.length === 0) return null;
    return [...delivered].sort((a, b) => {
      const aMs = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const bMs = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return bMs - aMs;
    })[0];
  }, [orders]);

  const handleAddKit = (kit: ReliefKit) => {
    if (!kit.inStock) return;
    setFormError(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.kit.id === kit.id);
      if (existing) {
        return prev.map((item) =>
          item.kit.id === kit.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { kit, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (kitId: string, delta: number) => {
    setFormError(null);
    setCart((prev) =>
      prev
        .map((item) =>
          item.kit.id === kitId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleReorderKits = (
    order: CampusOrder,
    options?: { stayOnStorefront?: boolean }
  ) => {
    setFormError(null);
    const kitsById = new globalThis.Map<string, ReliefKit>();
    kits.forEach((kit) => kitsById.set(kit.id, kit));

    const availableEntries: CartItem[] = [];
    const unavailableNames: string[] = [];

    order.items.forEach((item) => {
      const catalogKit = kitsById.get(item.kitId);
      if (catalogKit && catalogKit.inStock) {
        availableEntries.push({ kit: catalogKit, quantity: item.quantity });
      } else {
        unavailableNames.push(item.name);
      }
    });

    if (availableEntries.length === 0) {
      pushSystemToast(
        'Catalog Notice',
        'Kits Currently Out of Stock',
        `Items from #${order.id} are temporarily out of stock at the pharmacy.`
      );
      return;
    }

    setCart((prev) => {
      const next = [...prev];
      availableEntries.forEach(({ kit, quantity }) => {
        const idx = next.findIndex((c) => c.kit.id === kit.id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], kit, quantity: next[idx].quantity + quantity };
        } else {
          next.push({ kit, quantity });
        }
      });
      return next;
    });

    if (!options?.stayOnStorefront) {
      setActiveTab('order');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (unavailableNames.length > 0) {
      pushSystemToast(
        'Partial Reorder',
        `Added Available Kits from #${order.id}`,
        `Skipped out-of-stock item(s): ${unavailableNames.join(', ')}.`
      );
    } else {
      pushSystemToast(
        'Cart Updated',
        `Reordered Kits from #${order.id}`,
        `${availableEntries.length} kit line(s) added to your emergency cart.`
      );
    }
  };

  const handleLocalKitUpdate = (updatedKit: ReliefKit) => {
    setKits((prev) => {
      const next = prev.map((k) => (k.id === updatedKit.id ? updatedKit : k));
      if (isDemoMode) writeStorageJson(DEMO_KITS_KEY, next);
      return next;
    });
    setCart((prev) =>
      prev
        .map((item) => (item.kit.id === updatedKit.id ? { ...item, kit: updatedKit } : item))
        .filter((item) => item.kit.inStock)
    );
  };

  const handleLocalKitAdd = (newKit: ReliefKit) => {
    setKits((prev) => {
      const next = [...prev, newKit];
      if (isDemoMode) writeStorageJson(DEMO_KITS_KEY, next);
      return next;
    });
  };

  const handleDemoUpdateOrder = useCallback(
    (orderId: string, patch: Partial<CampusOrder>) => {
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o));
        writeStorageJson(DEMO_ORDERS_KEY, next);
        return next;
      });
    },
    []
  );

  const handleConfirmOrder = async (): Promise<boolean> => {
    const activeUid = currentUser?.uid ?? demoSession?.uid;
    if (!activeUid || !profile) return false;

    if (cart.length === 0) {
      setFormError('Please add at least one OTC relief kit before dispatching.');
      return false;
    }
    if (!roomNumber.trim()) {
      setFormError('Please enter your hostel room or wing number.');
      return false;
    }

    setFormError(null);
    setSubmittingOrder(true);

    const subtotal = cart.reduce((sum, item) => sum + item.kit.price * item.quantity, 0);
    const passApplied = profile.wellnessPassActive || wellnessPassAdded;
    const deliveryFee = passApplied ? 0 : DELIVERY_FEE;
    const passCost = !profile.wellnessPassActive && wellnessPassAdded ? WELLNESS_PASS_PRICE : 0;
    const totalPayable = subtotal + deliveryFee + passCost;

    const suffix = String(Math.floor(100 + Math.random() * 900));
    const orderId = `QCC-${Date.now().toString().slice(-4)}${suffix}`;
    const handoverPin = String(Math.floor(1000 + Math.random() * 9000));
    const runner = CAMPUS_RUNNERS[orders.length % CAMPUS_RUNNERS.length];
    const cleanInstructions = specialInstructions.trim().slice(0, 240);

    const baseOrder: CampusOrder = {
      id: orderId,
      studentUid: activeUid,
      studentName: profile.displayName.slice(0, 100),
      studentPhone: profile.phone,
      hostelName: profile.hostelName.slice(0, 120),
      roomNumber: roomNumber.trim().slice(0, 30),
      gateLat: Number(orderPin.lat.toFixed(6)),
      gateLng: Number(orderPin.lng.toFixed(6)),
      runnerName: runner.name,
      runnerPhone: runner.phone,
      runnerLat: PHARMACY_ORIGIN.lat,
      runnerLng: PHARMACY_ORIGIN.lng,
      items: cart.map((item) => ({
        kitId: item.kit.id,
        name: item.kit.name,
        quantity: item.quantity,
        price: item.kit.price,
      })),
      subtotal,
      deliveryFee,
      wellnessPassAdded: passApplied,
      totalPayable,
      upiProvider,
      handoverPin,
      trackerStep: 1,
      status: 'queued',
      deliveryMinutes: 16,
      ...(cleanInstructions ? { specialInstructions: cleanInstructions } : {}),
    };

    if (isDemoMode) {
      const nextOrders = [baseOrder, ...orders];
      setOrders(nextOrders);
      writeStorageJson(DEMO_ORDERS_KEY, nextOrders);

      if (!profile.wellnessPassActive && wellnessPassAdded) {
        const updatedProfile = { ...profile, wellnessPassActive: true };
        setProfile(updatedProfile);
        writeStorageJson(`${DEMO_PROFILE_PREFIX}${activeUid}`, updatedProfile);
      }

      setSelectedOrderId(orderId);
      setCart([]);
      setSpecialInstructions('');
      setWellnessPassAdded(false);
      setActiveTab('tracker');
      setSubmittingOrder(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }

    const orderPath = `orders/${orderId}`;
    try {
      await setDoc(doc(db, 'orders', orderId), {
        ...baseOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      publishSharedTracker(baseOrder).catch(() => {
        // Non-blocking best-effort sync for roommate deep-link tracking
      });

      if (!profile.wellnessPassActive && wellnessPassAdded) {
        await updateDoc(doc(db, 'users', activeUid), {
          wellnessPassActive: true,
          updatedAt: serverTimestamp(),
        });
      }

      setSelectedOrderId(orderId);
      setCart([]);
      setSpecialInstructions('');
      setWellnessPassAdded(false);
      setActiveTab('tracker');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } catch (error) {
      setSubmittingOrder(false);
      handleFirestoreError(error, OperationType.CREATE, orderPath);
      return false;
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSubmitFeedback = async (
    order: CampusOrder,
    rating: number,
    comment: string
  ): Promise<void> => {
    const activeUid = currentUser?.uid ?? demoSession?.uid;
    if (!activeUid) return;

    const cleanComment = comment.trim().slice(0, 300);
    const feedbackPayload: OrderFeedback = {
      orderId: order.id,
      studentUid: activeUid,
      studentName: order.studentName.slice(0, 100),
      runnerName: order.runnerName.slice(0, 100),
      hostelName: order.hostelName.slice(0, 120),
      rating: Math.max(1, Math.min(5, Math.round(rating))),
      comment: cleanComment,
    };

    if (isDemoMode) {
      setFeedbackList((prev) => {
        const filtered = prev.filter((f) => f.orderId !== order.id);
        const next = [feedbackPayload, ...filtered];
        writeStorageJson(DEMO_FEEDBACK_KEY, next);
        return next;
      });
      return;
    }

    const feedbackPath = `feedback/${order.id}`;
    try {
      await setDoc(doc(db, 'feedback', order.id), {
        ...feedbackPayload,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, feedbackPath);
    }
  };

  const handlePublishShareTracker = useCallback(
    async (order: CampusOrder): Promise<void> => {
      if (isDemoMode || !currentUser) return;
      try {
        await publishSharedTracker(order);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `sharedTrackers/${order.id}`);
      }
    },
    [isDemoMode, currentUser]
  );

  const handleCancelOrder = useCallback(
    async (order: CampusOrder): Promise<void> => {
      if (order.status === 'delivered' || order.status === 'cancelled') return;

      if (isDemoMode) {
        handleDemoUpdateOrder(order.id, { status: 'cancelled' });
        return;
      }

      const orderPath = `orders/${order.id}`;
      try {
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
        syncSharedTrackerStatus(order.id, { status: 'cancelled' });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, orderPath);
      }
    },
    [handleDemoUpdateOrder, isDemoMode]
  );

  const quotaBanner = quotaExceeded ? (
    <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-950 dark:text-amber-100 hover:text-amber-800"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
    </div>
  ) : null;

  const activeAuthUser = currentUser
    ? {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber,
      }
    : demoSession
    ? {
        uid: demoSession.uid,
        displayName: demoSession.displayName,
        email: demoSession.email || null,
        phoneNumber: demoSession.phone || null,
      }
    : null;

  const renderContent = () => {
    if (sharedTrackId) {
      return (
        <SharedTrackerView
          orderId={sharedTrackId}
          hasOwnOrder={orders.some((o) => o.id === sharedTrackId)}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onExitSharedView={exitSharedTrackView}
          onOpenOwnTracker={() => {
            setSelectedOrderId(sharedTrackId);
            setRoleMode('student');
            setActiveTab('tracker');
            exitSharedTrackView();
          }}
        />
      );
    }

    if (!authReady || (currentUser && roleMode === 'student' && profileLoading)) {
      return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center mx-auto">
              <Cross className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Connecting Quick Care Campus...
            </p>
          </div>
        </div>
      );
    }

    if (!activeAuthUser) {
      return (
        <LoginScreen
          onSelectRoleIntent={setRoleMode}
          onPrefillVerifiedPhone={setPrefilledPhone}
          onEnterDemoSession={handleEnterDemoSession}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      );
    }

    // ADMIN & RUNNER MODE: Direct route to Operations Control Center
    if (roleMode === 'admin') {
      return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <header className="sticky top-0 z-30 h-14 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-xl text-white border-b border-slate-800/80 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.55)]">
            <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 whitespace-nowrap">
                <div className="w-8 h-8 rounded-xl bg-teal-600 border-b-2 border-teal-800 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-sm sm:text-base font-bold tracking-tight">
                  Quick Care Ops
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span>{curfewTelemetry.pillLabel}</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <motion.button
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                  onClick={toggleTheme}
                  aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  className="min-h-[38px] min-w-[38px] rounded-xl border border-slate-700 border-b-[3px] border-b-slate-950 bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                >
                  {isDarkMode ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-teal-300" />
                  )}
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                  onClick={() => {
                    setRoleMode('student');
                    setActiveTab('order');
                  }}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 border-b-[3px] border-b-slate-950 active:border-b active:translate-y-[1px] text-xs font-semibold text-white flex items-center gap-1.5 whitespace-nowrap transition-all"
                >
                  <Store className="w-3.5 h-3.5 text-teal-400" />
                  <span>Student Store</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                  onClick={() => void handleSignOut()}
                  aria-label="Sign out"
                  className="min-h-[38px] px-2.5 rounded-xl border border-slate-700 border-b-[3px] border-b-slate-950 bg-slate-800 hover:bg-rose-900/60 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </motion.button>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5">
            <OperationsView
              orders={orders}
              kits={kits}
              feedbackList={feedbackList}
              isCampusAdmin={isCampusAdmin}
              isDemoMode={isDemoMode}
              isDarkMode={isDarkMode}
              onDemoUpdateOrder={handleDemoUpdateOrder}
              onLocalKitUpdate={handleLocalKitUpdate}
              onLocalKitAdd={handleLocalKitAdd}
            />
          </main>
        </div>
      );
    }

    // STUDENT MODE: Mandatory profile onboarding on first sign-in
    if (!profile || editingProfile) {
      return (
        <ProfileSetupModal
          user={activeAuthUser}
          existingProfile={profile}
          prefilledPhone={prefilledPhone}
          isDemoMode={isDemoMode}
          isDarkMode={isDarkMode}
          onClose={profile ? () => setEditingProfile(false) : undefined}
          onSaved={(saved) => {
            setProfile(saved);
            setOrderPin({ lat: saved.gateLat, lng: saved.gateLng });
            setRoomNumber(saved.roomNumber);
            setEditingProfile(false);
            if (isDemoMode) {
              writeStorageJson(`${DEMO_PROFILE_PREFIX}${activeAuthUser.uid}`, saved);
            }
          }}
        />
      );
    }

    const activeCount = orders.filter(
      (o) => o.status !== 'delivered' && o.status !== 'cancelled'
    ).length;
    const completedCount = orders.filter((o) => o.status === 'delivered').length;

    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {/* Frosted Glassmorphism Student Top Header with Live Night Curfew Pulse Indicator */}
        <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-[0_6px_20px_-10px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.65)]">
          <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setActiveTab('order')}
                className="flex items-center gap-2 text-left whitespace-nowrap shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-teal-600"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-600 border-b-2 border-teal-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Cross className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Quick Care Campus
                </span>
              </button>

              {/* Live Night Curfew Pulse Indicator */}
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>{curfewTelemetry.pillLabel}</span>
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[220px]">
              <MapPin className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
              <span className="truncate font-medium">
                {profile.hostelName} · Room {profile.roomNumber}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                onClick={() => void handleRequestBrowserNotifications()}
                aria-label={
                  browserNotifStatus === 'granted'
                    ? 'Browser push notifications enabled'
                    : browserNotifStatus === 'denied'
                    ? 'Browser notifications blocked; using in-app toast alerts'
                    : 'Enable browser order status notifications'
                }
                title={
                  browserNotifStatus === 'granted'
                    ? 'Browser Push Alerts On'
                    : browserNotifStatus === 'denied'
                    ? 'Browser alerts blocked — in-app toast alerts active'
                    : 'Enable Browser Push Alerts'
                }
                className={`min-h-[38px] min-w-[38px] rounded-xl border border-b-[3px] flex items-center justify-center transition-all ${
                  browserNotifStatus === 'granted'
                    ? 'border-teal-200 dark:border-teal-700 border-b-teal-300 dark:border-b-teal-900 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                    : 'border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {browserNotifStatus === 'granted' ? (
                  <BellRing className="w-4 h-4" />
                ) : browserNotifStatus === 'denied' || browserNotifStatus === 'unsupported' ? (
                  <BellOff className="w-4 h-4 text-slate-400" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </motion.button>

              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                onClick={toggleTheme}
                aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Night Curfew Dark Mode'}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="min-h-[38px] min-w-[38px] rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-teal-700" />
                )}
              </motion.button>

              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                onClick={() => setRoleMode('admin')}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 hover:border-slate-900 dark:hover:border-teal-500 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 whitespace-nowrap transition-all"
              >
                <Shield className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span className="hidden xs:inline sm:inline">Admin Ops</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                onClick={() => setEditingProfile(true)}
                aria-label="Edit campus profile"
                className="min-h-[38px] min-w-[38px] rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all"
              >
                <UserCog className="w-4 h-4" />
              </motion.button>

              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                onClick={() => void handleSignOut()}
                aria-label="Sign out"
                className="min-h-[38px] min-w-[38px] rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-400 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </header>

        {/* Main Student Workspace */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-4 pb-28 sm:pb-24 space-y-5">
          {/* Curfew Express Status Bar */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm shadow-xs">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium leading-relaxed">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Curfew Express ({curfewTelemetry.subLabel})</span>
              </span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="text-teal-700 dark:text-teal-300 font-semibold">Delivery in ~16 mins</span>
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">•</span>
              <span className="hidden sm:inline text-slate-600 dark:text-slate-300">
                Pin: {profile.hostelName}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-300">
              {profile.phone}
            </span>
          </div>

          {activeTab === 'order' && (
            <EmergencyOrderView
              kits={kits}
              profile={profile}
              cart={cart}
              onAddKit={handleAddKit}
              onUpdateQuantity={handleUpdateQuantity}
              orderPin={orderPin}
              onChangeOrderPin={setOrderPin}
              roomNumber={roomNumber}
              onRoomNumberChange={setRoomNumber}
              specialInstructions={specialInstructions}
              onSpecialInstructionsChange={setSpecialInstructions}
              wellnessPassAdded={wellnessPassAdded}
              onToggleWellnessPass={() => setWellnessPassAdded((prev) => !prev)}
              upiProvider={upiProvider}
              onSelectUpi={setUpiProvider}
              onConfirmOrder={handleConfirmOrder}
              submitting={submittingOrder}
              formError={formError}
              isDarkMode={isDarkMode}
              lastCompletedOrder={lastCompletedOrder}
              onReorderRecent={(order) =>
                handleReorderKits(order, { stayOnStorefront: true })
              }
            />
          )}

          {activeTab === 'tracker' && (
            <LiveTrackerView
              activeOrder={activeOrder}
              existingFeedback={
                activeOrder
                  ? feedbackList.find((f) => f.orderId === activeOrder.id) ?? null
                  : null
              }
              onSubmitFeedback={handleSubmitFeedback}
              isDemoMode={isDemoMode}
              onDemoUpdateOrder={handleDemoUpdateOrder}
              onGoToOrder={() => setActiveTab('order')}
              isDarkMode={isDarkMode}
              browserNotifStatus={browserNotifStatus}
              onRequestBrowserNotifications={handleRequestBrowserNotifications}
            />
          )}

          {activeTab === 'history' && (
            <OrderHistoryView
              orders={orders}
              feedbackList={feedbackList}
              kits={kits}
              onReorderKits={handleReorderKits}
              onOpenInTracker={(orderId) => {
                setSelectedOrderId(orderId);
                setActiveTab('tracker');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onGoToOrder={() => {
                setActiveTab('order');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPublishShareTracker={handlePublishShareTracker}
              onPreviewSharedLink={openSharedTrackPreview}
              onCancelOrder={handleCancelOrder}
            />
          )}
        </main>

        {/* Fixed Frosted Glassmorphism 3-Tab Student Bottom Navigation Bar with Sliding Active Pill */}
        <nav
          aria-label="Customer storefront navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.14)] dark:shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.65)]"
        >
          <LayoutGroup id="student-bottom-nav">
            <div className="max-w-5xl mx-auto grid grid-cols-3 h-16 px-2 sm:px-3 py-1.5 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('order')}
                aria-current={activeTab === 'order' ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 sm:px-2 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
                  activeTab === 'order'
                    ? 'text-teal-700 dark:text-teal-300'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {activeTab === 'order' && (
                  <motion.span
                    layoutId="student-nav-pill"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 420, damping: 34 }
                    }
                    className="absolute inset-0 rounded-2xl bg-teal-500/12 dark:bg-teal-500/20 border border-teal-500/30 dark:border-teal-400/30 shadow-xs"
                  />
                )}
                <PackagePlus className="relative z-10 w-5 h-5" />
                <span className="relative z-10 text-[11px] sm:text-xs font-semibold tracking-tight whitespace-nowrap">
                  Storefront
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tracker')}
                aria-current={activeTab === 'tracker' ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 sm:px-2 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
                  activeTab === 'tracker'
                    ? 'text-teal-700 dark:text-teal-300'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {activeTab === 'tracker' && (
                  <motion.span
                    layoutId="student-nav-pill"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 420, damping: 34 }
                    }
                    className="absolute inset-0 rounded-2xl bg-teal-500/12 dark:bg-teal-500/20 border border-teal-500/30 dark:border-teal-400/30 shadow-xs"
                  />
                )}
                <div className="relative z-10">
                  <MapPin className="w-5 h-5" />
                  {activeCount > 0 && (
                    <motion.span
                      key={activeCount}
                      initial={reduceMotion ? false : { scale: 1.4 }}
                      animate={reduceMotion ? undefined : { scale: 1 }}
                      className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] rounded-full bg-teal-600 text-white text-[10px] font-mono font-bold flex items-center justify-center px-1 tabular-nums"
                    >
                      {activeCount}
                    </motion.span>
                  )}
                </div>
                <span className="relative z-10 text-[11px] sm:text-xs font-semibold tracking-tight whitespace-nowrap">
                  Live Tracker
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                aria-current={activeTab === 'history' ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 sm:px-2 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
                  activeTab === 'history'
                    ? 'text-teal-700 dark:text-teal-300'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {activeTab === 'history' && (
                  <motion.span
                    layoutId="student-nav-pill"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 420, damping: 34 }
                    }
                    className="absolute inset-0 rounded-2xl bg-teal-500/12 dark:bg-teal-500/20 border border-teal-500/30 dark:border-teal-400/30 shadow-xs"
                  />
                )}
                <div className="relative z-10">
                  <History className="w-5 h-5" />
                  {completedCount > 0 && (
                    <motion.span
                      key={completedCount}
                      initial={reduceMotion ? false : { scale: 1.3 }}
                      animate={reduceMotion ? undefined : { scale: 1 }}
                      className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] rounded-full bg-emerald-600 text-white text-[10px] font-mono font-bold flex items-center justify-center px-1 tabular-nums"
                    >
                      {completedCount}
                    </motion.span>
                  )}
                </div>
                <span className="relative z-10 text-[11px] sm:text-xs font-semibold tracking-tight whitespace-nowrap">
                  Order History
                </span>
              </button>
            </div>
          </LayoutGroup>
        </nav>
      </div>
    );
  };

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={['marker', 'routes']}
      language="en"
      region="IN"
    >
      {quotaBanner}
      <OrderStatusToastStack
        toasts={orderToasts}
        onDismiss={dismissOrderToast}
        onTrackOrder={(orderId) => {
          setRoleMode('student');
          setSelectedOrderId(orderId);
          setActiveTab('tracker');
        }}
      />
      {renderContent()}
    </APIProvider>
  );
}
