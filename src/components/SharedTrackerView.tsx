import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Cross,
  MapPin,
  Moon,
  PackageCheck,
  ShieldCheck,
  Sun,
  UserCheck,
  Users,
} from 'lucide-react';
import { db } from '../firebase';
import { CampusOrder, OrderStatus, SharedTracker } from '../types';
import { toSharedTrackerPayload } from '../utils/sharedTracker';
import { LiveDeliveryMap } from './LiveDeliveryMap';

const DEMO_ORDERS_KEY = 'qcc_demo_orders_v1';

interface SharedTrackerViewProps {
  orderId: string;
  hasOwnOrder?: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onExitSharedView: () => void;
  onOpenOwnTracker?: () => void;
}

const TRACKER_STEPS: {
  step: 1 | 2 | 3 | 4;
  title: string;
  detail: string;
}[] = [
  {
    step: 1,
    title: 'Order Confirmed at 24/7 Pharmacy',
    detail: 'Licensed pharmacist verified OTC-only pack & sealed tamper-proof pouch.',
  },
  {
    step: 2,
    title: 'Tamper-Proof Bag Picked Up by Gate-Authorized Runner',
    detail: 'Batch-verified runner departed Premnagar 24/7 Pharmacy.',
  },
  {
    step: 3,
    title: 'Main Campus Gate Security Pre-Cleared',
    detail: 'Curfew gate-pass log cleared with main gate guard desk; proceeding to hostel block.',
  },
  {
    step: 4,
    title: 'Arrived at Hostel Gate',
    detail: 'Runner reached hostel security window for PIN-verified handover.',
  },
];

function getStatusHeadline(status: OrderStatus, hostelName: string): {
  badge: string;
  title: string;
  tone: string;
} {
  switch (status) {
    case 'queued':
      return {
        badge: 'Runner Assigned',
        title: `Preparing OTC pack for ${hostelName}`,
        tone: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-200',
      };
    case 'picked_up':
      return {
        badge: 'Picked Up',
        title: `Runner en route from 24/7 Pharmacy to ${hostelName}`,
        tone: 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800/70 text-teal-800 dark:text-teal-200',
      };
    case 'gate_cleared':
      return {
        badge: 'Out for Delivery',
        title: `Main campus gate cleared — heading to ${hostelName}`,
        tone: 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800/70 text-teal-800 dark:text-teal-200',
      };
    case 'arrived':
      return {
        badge: 'At Hostel Gate',
        title: `Runner waiting at ${hostelName} gate`,
        tone: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200',
      };
    case 'delivered':
      return {
        badge: 'Delivered',
        title: `Handover completed at ${hostelName}`,
        tone: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200',
      };
    case 'cancelled':
      return {
        badge: 'Cancelled',
        title: `Order for ${hostelName} was cancelled`,
        tone: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-200',
      };
  }
}

function readDemoSharedTracker(orderId: string): SharedTracker | null {
  try {
    const raw = window.localStorage.getItem(DEMO_ORDERS_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw) as CampusOrder[];
    const match = list.find((o) => o.id === orderId);
    if (!match) return null;
    return toSharedTrackerPayload(match);
  } catch {
    return null;
  }
}

export function SharedTrackerView({
  orderId,
  hasOwnOrder = false,
  isDarkMode,
  onToggleTheme,
  onExitSharedView,
  onOpenOwnTracker,
}: SharedTrackerViewProps) {
  const reduceMotion = useReducedMotion();
  const [tracker, setTracker] = useState<SharedTracker | null>(() =>
    readDemoSharedTracker(orderId)
  );
  const [loading, setLoading] = useState<boolean>(() => !readDemoSharedTracker(orderId));

  // Subscribe to Firestore sharedTrackers/{orderId} (PII-free live doc)
  useEffect(() => {
    const validId = /^[a-zA-Z0-9_-]{3,64}$/.test(orderId);
    if (!validId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'sharedTrackers', orderId),
      (snapshot) => {
        if (snapshot.exists()) {
          setTracker(snapshot.data() as SharedTracker);
          setLoading(false);
        } else {
          const demoMatch = readDemoSharedTracker(orderId);
          setTracker(demoMatch);
          setLoading(false);
        }
      },
      () => {
        const demoMatch = readDemoSharedTracker(orderId);
        setTracker(demoMatch);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  // Also stay synced with Demo Mode updates across tabs via storage events
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DEMO_ORDERS_KEY) return;
      const demoMatch = readDemoSharedTracker(orderId);
      if (demoMatch) {
        setTracker(demoMatch);
        setLoading(false);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [orderId]);

  const mapOrderAdapter: CampusOrder | null = useMemo(() => {
    if (!tracker) return null;
    return {
      id: tracker.orderId,
      studentUid: 'shared',
      studentName: 'Roommate Order',
      studentPhone: '+910000000000',
      hostelName: tracker.hostelName,
      roomNumber: '-',
      gateLat: tracker.gateLat,
      gateLng: tracker.gateLng,
      runnerName: tracker.runnerName,
      runnerPhone: '+910000000000',
      runnerLat: tracker.runnerLat,
      runnerLng: tracker.runnerLng,
      items: tracker.itemsSummary.map((name, idx) => ({
        kitId: `shared-${idx}`,
        name,
        quantity: 1,
        price: 0,
      })),
      subtotal: 0,
      deliveryFee: 0,
      wellnessPassAdded: false,
      totalPayable: 0,
      upiProvider: 'GPay',
      handoverPin: '0000',
      trackerStep: tracker.trackerStep,
      status: tracker.status,
      deliveryMinutes: tracker.deliveryMinutes,
    };
  }, [tracker]);

  const secondsRemaining = useMemo(() => {
    if (!tracker) return 0;
    if (tracker.status === 'delivered' || tracker.status === 'cancelled' || tracker.trackerStep === 4) {
      return 0;
    }
    if (tracker.trackerStep === 3) return 320;
    if (tracker.trackerStep === 2) return 780;
    return (tracker.deliveryMinutes || 16) * 60;
  }, [tracker]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 h-14 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-600 border-b-2 border-teal-800 text-white flex items-center justify-center shrink-0">
              <Cross className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
                Quick Care Campus
              </div>
              <div className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                <Users className="w-3 h-3 shrink-0" />
                <span>Shared Roommate Tracker</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.92 }}
              onClick={onToggleTheme}
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="min-h-[38px] min-w-[38px] rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-teal-700" />
              )}
            </motion.button>

            {hasOwnOrder && onOpenOwnTracker && (
              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                onClick={onOpenOwnTracker}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold border-b-[3px] border-teal-800 whitespace-nowrap"
              >
                Full Tracker
              </motion.button>
            )}

            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              onClick={onExitSharedView}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Open App</span>
            </motion.button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-5">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Loading live order #{orderId}...
            </p>
          </div>
        ) : !tracker || !mapOrderAdapter ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Tracking Link Unavailable
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Order <span className="font-mono font-semibold">#{orderId}</span> could not be found or has not been shared from the student&apos;s device yet.
              </p>
            </div>
            <button
              type="button"
              onClick={onExitSharedView}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold border-b-[3px] border-teal-800"
            >
              Go to Quick Care Campus
            </button>
          </div>
        ) : (
          <>
            {/* Live Status Summary Card */}
            {(() => {
              const headline = getStatusHeadline(tracker.status, tracker.hostelName);
              return (
                <motion.section
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-[0_14px_34px_-18px_rgba(15,23,42,0.16)] space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          #{tracker.orderId}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${headline.tone}`}
                        >
                          {headline.badge}
                        </span>
                      </div>
                      <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">
                        {headline.title}
                      </h1>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 px-3.5 py-2 flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <div>
                        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {tracker.status === 'delivered' ? 'Completed' : 'Target ETA'}
                        </div>
                        <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          {tracker.status === 'delivered'
                            ? `${tracker.deliveryMinutes || 16} mins`
                            : `~${tracker.deliveryMinutes || 16} mins`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3 space-y-1">
                      <div className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Campus Runner &amp; Gate</span>
                      </div>
                      <p className="text-slate-900 dark:text-white font-semibold">
                        {tracker.runnerName}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        Delivering to {tracker.hostelName}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3 space-y-1">
                      <div className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>OTC Kits in Bag</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                        {tracker.itemsSummary.join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>
                      Privacy-safe roommate view: student phone number and 4-digit handover PIN are hidden.
                    </span>
                  </div>
                </motion.section>
              );
            })()}

            {/* Live Google Maps + 4-Step Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7">
                <LiveDeliveryMap
                  order={mapOrderAdapter}
                  isDarkMode={isDarkMode}
                  secondsRemaining={secondsRemaining}
                />
              </div>

              <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live Delivery Milestones
                </h2>

                <ol className="space-y-4">
                  {TRACKER_STEPS.map((item) => {
                    const done =
                      tracker.status === 'delivered' || tracker.trackerStep >= item.step;
                    const isCurrent =
                      tracker.status !== 'delivered' && tracker.trackerStep === item.step;

                    return (
                      <li key={item.step} className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-xs font-mono font-bold ${
                            done
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          {done ? <CheckCircle2 className="w-4 h-4" /> : item.step}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div
                            className={`text-xs sm:text-sm font-semibold ${
                              isCurrent
                                ? 'text-teal-700 dark:text-teal-300'
                                : done
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {item.title}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {item.detail}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
