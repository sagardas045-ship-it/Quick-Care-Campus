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
import {
  Cross,
  LogOut,
  MapPin,
  PackagePlus,
  Shield,
  Store,
  UserCog,
} from 'lucide-react';
import {
  CAMPUS_RUNNERS,
  DELIVERY_FEE,
  PHARMACY_ORIGIN,
  RELIEF_KITS,
  WELLNESS_PASS_PRICE,
} from './data/campusData';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  CampusOrder,
  CartItem,
  DemoSession,
  LatLngLiteral,
  OrderFeedback,
  ReliefKit,
  StudentProfile,
  UpiProvider,
  UserRoleMode,
} from './types';
import { LoginScreen } from './components/LoginScreen';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { EmergencyOrderView } from './components/EmergencyOrderView';
import { LiveTrackerView } from './components/LiveTrackerView';
import { OperationsView } from './components/OperationsView';

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

type CustomerTab = 'order' | 'tracker';

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

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [prefilledPhone, setPrefilledPhone] = useState<string | null>(null);

  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomerTab>('order');
  const [roleMode, setRoleMode] = useState<UserRoleMode>('student');

  // OTC Kits Catalog (synced with Firestore `kits` collection or Demo storage)
  const [kits, setKits] = useState<ReliefKit[]>(RELIEF_KITS);
  const seededKitsRef = useRef(false);

  // Ordering state
  const [cart, setCart] = useState<CartItem[]>([
    { kit: RELIEF_KITS[0], quantity: 1 },
  ]);
  const [orderPin, setOrderPin] = useState<LatLngLiteral>(PHARMACY_ORIGIN);
  const [roomNumber, setRoomNumber] = useState('');
  const [wellnessPassAdded, setWellnessPassAdded] = useState(false);
  const [upiProvider, setUpiProvider] = useState<UpiProvider>('GPay');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Orders & Post-delivery Feedback state
  const [orders, setOrders] = useState<CampusOrder[]>([]);
  const [feedbackList, setFeedbackList] = useState<OrderFeedback[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const isDemoMode = Boolean(demoSession && !currentUser);
  const isCampusAdmin =
    Boolean(currentUser?.emailVerified) &&
    currentUser?.email === CAMPUS_ADMIN_EMAIL;

  // Listen to Tier 1/2 Google Maps Platform quota events
  useEffect(() => {
    const handler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
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
        setFeedbackList([]);
        setSelectedOrderId(null);
        setRoleMode('student');
        setActiveTab('order');
        setPrefilledPhone(null);
        setKits(RELIEF_KITS);
        seededKitsRef.current = false;
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
          if (isCampusAdmin && !seededKitsRef.current) {
            seededKitsRef.current = true;
            for (const kit of RELIEF_KITS) {
              setDoc(doc(db, 'kits', kit.id), {
                ...kit,
                updatedAt: serverTimestamp(),
              }).catch((err) =>
                handleFirestoreError(err, OperationType.CREATE, `kits/${kit.id}`)
              );
            }
          }
          return;
        }

        const loadedKits = snapshot.docs.map((d) => d.data() as ReliefKit);
        const defaultOrder = RELIEF_KITS.map((k) => k.id);
        loadedKits.sort((a, b) => {
          const idxA = defaultOrder.indexOf(a.id);
          const idxB = defaultOrder.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
        setKits(loadedKits);

        setCart((prev) =>
          prev
            .map((item) => {
              const latest = loadedKits.find((k) => k.id === item.kit.id);
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

  // Demo Session Entry Handler (used when domain is unauthorized or +91 Demo OTP is verified)
  const handleEnterDemoSession = useCallback((session: DemoSession) => {
    setDemoSession(session);
    setRoleMode(session.role);
    setActiveTab('order');
    setEditingProfile(false);

    const savedKits = readStorageJson<ReliefKit[]>(DEMO_KITS_KEY, RELIEF_KITS);
    setKits(savedKits);
    const savedOrders = readStorageJson<CampusOrder[]>(DEMO_ORDERS_KEY, []);
    setOrders(savedOrders);
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
    return orders.find((o) => o.status !== 'delivered') ?? orders[0];
  }, [orders, selectedOrderId]);

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

      if (!profile.wellnessPassActive && wellnessPassAdded) {
        await updateDoc(doc(db, 'users', activeUid), {
          wellnessPassActive: true,
          updatedAt: serverTimestamp(),
        });
      }

      setSelectedOrderId(orderId);
      setCart([]);
      setWellnessPassAdded(false);
      setActiveTab('tracker');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } catch (error) {
      setSubmittingOrder(false);
      handleFirestoreError(error, OperationType.CREATE, orderPath);
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

  const quotaBanner = quotaExceeded ? (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-950 hover:text-amber-800"
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
    if (!authReady || (currentUser && roleMode === 'student' && profileLoading)) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center mx-auto">
              <Cross className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-600">
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
        />
      );
    }

    // ADMIN & RUNNER MODE: Direct route to Operations Control Center (hides customer storefront)
    if (roleMode === 'admin') {
      return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <header className="sticky top-0 z-30 h-14 bg-slate-900 text-white border-b border-slate-800">
            <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 whitespace-nowrap">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-sm sm:text-base font-bold tracking-tight">
                  Quick Care Ops
                </span>
                <span className="hidden sm:inline text-xs text-teal-300 font-medium">
                  · Control Center
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setRoleMode('student');
                    setActiveTab('order');
                  }}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <Store className="w-3.5 h-3.5 text-teal-400" />
                  <span>Student Store</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  aria-label="Sign out"
                  className="min-h-[38px] px-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-rose-900/60 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
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

    const activeCount = orders.filter((o) => o.status !== 'delivered').length;

    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Top Student Header */}
        <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('order')}
              className="flex items-center gap-2 text-left whitespace-nowrap shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-teal-600"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                <Cross className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900">
                Quick Care Campus
              </span>
            </button>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 truncate max-w-xs">
              <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span className="truncate font-medium">
                {profile.hostelName} · Room {profile.roomNumber}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setRoleMode('admin')}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-900 text-xs font-semibold text-slate-700 flex items-center gap-1 whitespace-nowrap transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-teal-700" />
                <span>Admin Ops</span>
              </button>

              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                aria-label="Edit campus profile"
                className="min-h-[38px] min-w-[38px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center"
              >
                <UserCog className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Sign out"
                className="min-h-[38px] min-w-[38px] rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 flex items-center justify-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Student Workspace */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-4 pb-28 sm:pb-24 space-y-5">
          {/* Curfew Express Status Bar */}
          <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="font-medium leading-relaxed">
              <span className="text-amber-300 font-semibold">🌙 Curfew Express Active</span>
              <span className="mx-1.5 text-slate-400">•</span>
              <span className="text-teal-300 font-semibold">Delivery in ~16 mins</span>
              <span className="mx-1.5 text-slate-400 hidden sm:inline">•</span>
              <span className="hidden sm:inline text-slate-300">
                Pin: {profile.hostelName}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-300">
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
              wellnessPassAdded={wellnessPassAdded}
              onToggleWellnessPass={() => setWellnessPassAdded((prev) => !prev)}
              upiProvider={upiProvider}
              onSelectUpi={setUpiProvider}
              onConfirmOrder={handleConfirmOrder}
              submitting={submittingOrder}
              formError={formError}
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
            />
          )}
        </main>

        {/* Fixed 2-Tab Student Bottom Navigation Bar */}
        <nav
          aria-label="Customer storefront navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
        >
          <div className="max-w-5xl mx-auto grid grid-cols-2 h-16">
            <button
              type="button"
              onClick={() => setActiveTab('order')}
              aria-current={activeTab === 'order' ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[56px] px-2 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
                activeTab === 'order'
                  ? 'text-teal-700 border-t-2 border-teal-600 -mt-[1px]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <PackagePlus className="w-5 h-5" />
              <span className="text-xs font-semibold tracking-tight whitespace-nowrap">
                Emergency Storefront
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tracker')}
              aria-current={activeTab === 'tracker' ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[56px] px-2 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
                activeTab === 'tracker'
                  ? 'text-teal-700 border-t-2 border-teal-600 -mt-[1px]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-5 h-5" />
              <span className="text-xs font-semibold tracking-tight whitespace-nowrap">
                Live Map Tracker ({activeCount})
              </span>
            </button>
          </div>
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
      {renderContent()}
    </APIProvider>
  );
}
