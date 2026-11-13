import { useEffect, useMemo, useState } from 'react';
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
  ClipboardList,
  Cross,
  LogOut,
  MapPin,
  PackagePlus,
  Shield,
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
  AppTab,
  CampusOrder,
  CartItem,
  LatLngLiteral,
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

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('order');
  const [roleMode, setRoleMode] = useState<UserRoleMode>('student');

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

  // Firestore Orders state
  const [orders, setOrders] = useState<CampusOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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
      if (!user) {
        setProfile(null);
        setOrders([]);
        setSelectedOrderId(null);
        setRoleMode('student');
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

  // Firestore Orders listener (orders collection)
  useEffect(() => {
    if (!currentUser || !profile) return;

    const ordersPath = 'orders';
    const ordersQuery =
      roleMode === 'runner' && isCampusAdmin
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

  const activeOrder = useMemo(() => {
    if (orders.length === 0) return null;
    if (selectedOrderId) {
      const found = orders.find((o) => o.id === selectedOrderId);
      if (found) return found;
    }
    return orders.find((o) => o.status !== 'delivered') ?? orders[0];
  }, [orders, selectedOrderId]);

  const handleAddKit = (kit: ReliefKit) => {
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

  const handleConfirmOrder = async (): Promise<boolean> => {
    if (!currentUser || !profile) return false;
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

    const newOrderPayload = {
      id: orderId,
      studentUid: currentUser.uid,
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
      trackerStep: 1 as const,
      status: 'queued' as const,
      deliveryMinutes: 16,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const orderPath = `orders/${orderId}`;
    try {
      await setDoc(doc(db, 'orders', orderId), newOrderPayload);

      if (!profile.wellnessPassActive && wellnessPassAdded) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
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

  const renderContent = () => {
    if (!authReady || (currentUser && profileLoading)) {
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

    if (!currentUser) {
      return <LoginScreen />;
    }

    if (!profile || editingProfile) {
      return (
        <ProfileSetupModal
          user={currentUser}
          existingProfile={profile}
          onClose={profile ? () => setEditingProfile(false) : undefined}
          onSaved={(saved) => {
            setProfile(saved);
            setOrderPin({ lat: saved.gateLat, lng: saved.gateLng });
            setRoomNumber(saved.roomNumber);
            setEditingProfile(false);
          }}
        />
      );
    }

    const activeCount = orders.filter((o) => o.status !== 'delivered').length;

    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Top Header */}
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
                onClick={() => {
                  const next = roleMode === 'student' ? 'runner' : 'student';
                  setRoleMode(next);
                  setActiveTab(next === 'runner' ? 'operations' : 'order');
                }}
                className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition-colors ${
                  roleMode === 'runner'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-teal-600'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{roleMode === 'runner' ? 'Runner Mode' : 'Student'}</span>
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
                onClick={() => void signOut(auth)}
                aria-label="Sign out"
                className="min-h-[38px] min-w-[38px] rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 flex items-center justify-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Scrollable Workspace */}
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
              onGoToOrder={() => setActiveTab('order')}
            />
          )}

          {activeTab === 'operations' && (
            <OperationsView
              orders={orders}
              isCampusAdmin={isCampusAdmin}
              onSelectOrderForTracker={(id) => {
                setSelectedOrderId(id);
                setActiveTab('tracker');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </main>

        {/* Fixed 3-Tab Bottom Navigation Bar */}
        <nav
          aria-label="Primary app navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
        >
          <div className="max-w-5xl mx-auto grid grid-cols-3 h-16">
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
              <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                Emergency Order
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
              <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                Live Map ({activeCount})
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRoleMode('runner');
                setActiveTab('operations');
              }}
              aria-current={activeTab === 'operations' ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[56px] px-2 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
                activeTab === 'operations'
                  ? 'text-teal-700 border-t-2 border-teal-600 -mt-[1px]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                Runner / Admin
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
