import { useEffect, useRef, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  KeyRound,
  MapPin,
  MessageCircle,
  PackageCheck,
  Pause,
  Play,
  Send,
  ShieldCheck,
  Star,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CampusOrder, LatLngLiteral, OrderFeedback, OrderStatus } from '../types';
import { LiveDeliveryMap } from './LiveDeliveryMap';
import { syncSharedTrackerStatus } from '../utils/sharedTracker';

interface LiveTrackerViewProps {
  activeOrder: CampusOrder | null;
  existingFeedback: OrderFeedback | null;
  onSubmitFeedback: (order: CampusOrder, rating: number, comment: string) => Promise<void>;
  isDemoMode?: boolean;
  onDemoUpdateOrder?: (orderId: string, patch: Partial<CampusOrder>) => void;
  onGoToOrder: () => void;
  isDarkMode?: boolean;
  browserNotifStatus?: NotificationPermission | 'unsupported';
  onRequestBrowserNotifications?: () => void;
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
    title: 'Arrived at Hostel Gate (Share PIN)',
    detail: 'Runner waiting at hostel security window. Share your 4-digit PIN to collect bag.',
  },
];

function formatCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Below Expectations',
  3: 'Good Delivery',
  4: 'Fast & Helpful',
  5: 'Exceptional Night Rescue',
};

const QUICK_PRAISE_TAGS = [
  'Super fast',
  'Polite at hostel gate',
  'Tamper-proof seal intact',
  'Smooth PIN handover',
];

const DELIVERY_PROGRESS_STAGES = [
  { key: 'queued', label: 'Queued', Icon: Clock },
  { key: 'assigned', label: 'Runner Assigned', Icon: UserCheck },
  { key: 'picked_up', label: 'Picked Up', Icon: PackageCheck },
  { key: 'out_for_delivery', label: 'Out for Delivery', Icon: Truck },
  { key: 'arrived', label: 'Arrived', Icon: MapPin },
] as const;

function getDeliveryProgressState(order: CampusOrder): {
  activeIndex: number;
  allDone: boolean;
  progressPercent: number;
  statusSummary: string;
} {
  switch (order.status) {
    case 'cancelled':
      return {
        activeIndex: 0,
        allDone: false,
        progressPercent: 0,
        statusSummary: 'Order Cancelled before delivery',
      };
    case 'delivered':
      return {
        activeIndex: 5,
        allDone: true,
        progressPercent: 100,
        statusSummary: 'Delivered & PIN Verified',
      };
    case 'arrived':
      return {
        activeIndex: 4,
        allDone: false,
        progressPercent: 100,
        statusSummary: `Arrived at ${order.hostelName}`,
      };
    case 'gate_cleared':
      return {
        activeIndex: 3,
        allDone: false,
        progressPercent: 75,
        statusSummary: `${order.runnerName} is out for delivery`,
      };
    case 'picked_up':
      return {
        activeIndex: 2,
        allDone: false,
        progressPercent: 50,
        statusSummary: `${order.runnerName} picked up your kit`,
      };
    case 'queued':
    default: {
      const hasRunner = Boolean(order.runnerName && order.runnerName.trim().length > 0);
      return {
        activeIndex: hasRunner ? 1 : 0,
        allDone: false,
        progressPercent: hasRunner ? 25 : 6,
        statusSummary: hasRunner
          ? `Runner Assigned: ${order.runnerName}`
          : 'Order queued at 24/7 Pharmacy',
      };
    }
  }
}

export function LiveTrackerView({
  activeOrder,
  existingFeedback,
  onSubmitFeedback,
  isDemoMode = false,
  onDemoUpdateOrder,
  onGoToOrder,
  isDarkMode = false,
  browserNotifStatus = 'default',
  onRequestBrowserNotifications,
}: LiveTrackerViewProps) {
  const reduceMotion = useReducedMotion();
  const [simulating, setSimulating] = useState(false);
  const [routePath, setRoutePath] = useState<LatLngLiteral[]>([]);
  const [totalDistMeters, setTotalDistMeters] = useState(1800);
  const [secondsRemaining, setSecondsRemaining] = useState(1200);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [quickMessage, setQuickMessage] = useState('');
  const [sentMessages, setSentMessages] = useState<string[]>([]);

  // Post-delivery feedback states
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const simIndexRef = useRef(0);

  // Sync timer & simulation reset when active order changes
  useEffect(() => {
    if (!activeOrder) return;
    if (
      activeOrder.status === 'delivered' ||
      activeOrder.status === 'cancelled' ||
      activeOrder.trackerStep === 4
    ) {
      setSecondsRemaining(0);
      setSimulating(false);
    } else if (activeOrder.trackerStep === 1) {
      setSecondsRemaining(1200);
      simIndexRef.current = 0;
    } else if (activeOrder.trackerStep === 2) {
      setSecondsRemaining(840);
    } else if (activeOrder.trackerStep === 3) {
      setSecondsRemaining(320);
    }

    setQuickMessage(
      `Hi ${activeOrder.runnerName}, I am at ${activeOrder.hostelName} (Room ${activeOrder.roomNumber}) for Order #${activeOrder.id}. Let me know once you reach the gate desk!`
    );
    setSelectedRating(0);
    setHoverRating(0);
    setFeedbackComment('');
    setFeedbackError(null);
  }, [activeOrder?.id]);

  // 1-second ETA countdown
  useEffect(() => {
    if (
      !activeOrder ||
      activeOrder.trackerStep >= 4 ||
      activeOrder.status === 'delivered' ||
      activeOrder.status === 'cancelled'
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeOrder?.id, activeOrder?.trackerStep, activeOrder?.status]);

  // Smooth Runner Movement Simulation writing live coordinates & statuses to Firestore
  useEffect(() => {
    if (!simulating || !activeOrder || routePath.length < 2) return;
    if (
      activeOrder.status === 'delivered' ||
      activeOrder.status === 'cancelled' ||
      activeOrder.trackerStep >= 4
    ) {
      setSimulating(false);
      return;
    }

    const interval = window.setInterval(() => {
      const nextIdx = Math.min(routePath.length - 1, simIndexRef.current + 1);
      simIndexRef.current = nextIdx;
      const point = routePath[nextIdx];
      const progress = nextIdx / (routePath.length - 1);

      let nextStep: 1 | 2 | 3 | 4 = 2;
      let nextStatus: OrderStatus = 'picked_up';
      if (progress >= 0.99) {
        nextStep = 4;
        nextStatus = 'arrived';
      } else if (progress >= 0.55) {
        nextStep = 3;
        nextStatus = 'gate_cleared';
      }

      setSecondsRemaining(Math.max(0, Math.round(1200 * (1 - progress))));

      const patch: Partial<CampusOrder> = {
        runnerLat: Number(point.lat.toFixed(6)),
        runnerLng: Number(point.lng.toFixed(6)),
        trackerStep: nextStep,
        status: nextStatus,
      };

      if (isDemoMode && onDemoUpdateOrder) {
        onDemoUpdateOrder(activeOrder.id, patch);
      } else {
        const orderPath = `orders/${activeOrder.id}`;
        updateDoc(doc(db, 'orders', activeOrder.id), {
          ...patch,
          updatedAt: serverTimestamp(),
        })
          .then(() => {
            syncSharedTrackerStatus(activeOrder.id, {
              runnerLat: patch.runnerLat,
              runnerLng: patch.runnerLng,
              trackerStep: patch.trackerStep,
              status: patch.status,
            });
          })
          .catch((err) => handleFirestoreError(err, OperationType.UPDATE, orderPath));
      }

      if (nextIdx >= routePath.length - 1) {
        setSimulating(false);
      }
    }, 1400);

    return () => window.clearInterval(interval);
  }, [
    simulating,
    isDemoMode,
    onDemoUpdateOrder,
    activeOrder?.id,
    activeOrder?.status,
    activeOrder?.trackerStep,
    routePath,
  ]);

  if (!activeOrder) {
    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4 shadow-sm"
      >
        <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">No Active Night Order Yet</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Place an emergency OTC order from the storefront to watch your gate-authorized runner live on Google Maps.
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={reduceMotion ? undefined : { scale: 0.95 }}
          onClick={onGoToOrder}
          className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 border-b-[3px] border-teal-800 text-white text-sm font-semibold transition-colors"
        >
          Browse Emergency Kits
        </motion.button>
      </motion.div>
    );
  }

  const isCancelled = activeOrder.status === 'cancelled';
  const isArrivedOrDelivered =
    activeOrder.trackerStep === 4 ||
    activeOrder.status === 'arrived' ||
    activeOrder.status === 'delivered' ||
    isCancelled;

  const progressRatio =
    activeOrder.status === 'delivered' || activeOrder.trackerStep === 4
      ? 1
      : activeOrder.trackerStep === 3
      ? 0.65
      : activeOrder.trackerStep === 2
      ? 0.3
      : 0.05;

  const remainingKm = ((totalDistMeters * (1 - progressRatio)) / 1000).toFixed(2);

  const handleSendWhatsAppPreview = () => {
    if (!quickMessage.trim()) return;
    setSentMessages((prev) => [...prev, quickMessage.trim()]);
    setQuickMessage('');
  };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Header & Runner Movement Simulation Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold text-teal-700 dark:text-teal-400">
              Order #{activeOrder.id}
            </span>
            <span aria-hidden="true">·</span>
            <span>Paid via {activeOrder.upiProvider}</span>
            <span aria-hidden="true">·</span>
            <span>{activeOrder.hostelName}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Live Google Maps Delivery Tracking
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRequestBrowserNotifications && (
            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              onClick={onRequestBrowserNotifications}
              className={`min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap border border-b-[3px] transition-all ${
                browserNotifStatus === 'granted'
                  ? 'border-teal-200 dark:border-teal-800 border-b-teal-300 dark:border-b-teal-950 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300'
                  : 'border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-teal-500'
              }`}
            >
              {browserNotifStatus === 'granted' ? (
                <>
                  <BellRing className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Push Alerts On</span>
                </>
              ) : browserNotifStatus === 'denied' || browserNotifStatus === 'unsupported' ? (
                <>
                  <Bell className="w-4 h-4 text-slate-500" />
                  <span>Toast Alerts On</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Enable Push Alerts</span>
                </>
              )}
            </motion.button>
          )}

          <motion.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
            disabled={isArrivedOrDelivered}
            onClick={() => setSimulating((prev) => !prev)}
            className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap border-b-[3px] transition-all focus-visible:outline-2 focus-visible:outline-teal-600 ${
              isArrivedOrDelivered
                ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                : simulating
                ? 'bg-amber-600 hover:bg-amber-500 border-amber-800 text-white shadow-sm'
                : 'bg-teal-600 hover:bg-teal-500 border-teal-800 text-white shadow-[0_8px_18px_-6px_rgba(13,148,136,0.45)]'
            }`}
          >
            {simulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>
              {isCancelled
                ? 'Order Cancelled'
                : isArrivedOrDelivered
                ? 'Runner at Hostel Gate'
                : simulating
                ? 'Pause Runner Simulation'
                : 'Simulate Runner Movement'}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Visual Delivery Progress Stepper Bar */}
      {(() => {
        const progress = getDeliveryProgressState(activeOrder);
        return (
          <section
            aria-label="Delivery Progress"
            className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.14)] dark:shadow-[0_14px_34px_-16px_rgba(0,0,0,0.65)] space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Delivery Progress
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {progress.statusSummary}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-mono font-semibold tabular-nums ${
                  progress.allDone || activeOrder.status === 'arrived'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300'
                    : 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800/70 text-teal-700 dark:text-teal-300'
                }`}
              >
                {progress.allDone
                  ? '5 / 5 · Delivered'
                  : `Step ${progress.activeIndex + 1} / 5`}
              </span>
            </div>

            <div className="relative pt-1">
              {/* Background Track */}
              <div
                aria-hidden="true"
                className="absolute top-[20px] sm:top-[24px] left-[10%] right-[10%] h-1 rounded-full bg-slate-200 dark:bg-slate-800"
              />
              {/* Active Animated Progress Track */}
              <div
                aria-hidden="true"
                className="absolute top-[20px] sm:top-[24px] left-[10%] right-[10%] h-1 rounded-full overflow-hidden"
              >
                <motion.div
                  initial={false}
                  animate={{ width: `${progress.progressPercent}%` }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 260, damping: 28 }
                  }
                  className={`h-full rounded-full ${
                    progress.allDone || activeOrder.status === 'arrived'
                      ? 'bg-emerald-500'
                      : 'bg-teal-600 dark:bg-teal-500'
                  }`}
                />
              </div>

              <ol className="relative z-10 grid grid-cols-5 gap-1 sm:gap-2">
                {DELIVERY_PROGRESS_STAGES.map((stage, idx) => {
                  const isCompleted =
                    progress.allDone || idx < progress.activeIndex;
                  const isCurrent =
                    !progress.allDone && idx === progress.activeIndex;
                  const StageIcon = stage.Icon;

                  return (
                    <li
                      key={stage.key}
                      aria-current={isCurrent ? 'step' : undefined}
                      className="flex flex-col items-center text-center gap-1.5 sm:gap-2"
                    >
                      <motion.div
                        initial={false}
                        animate={
                          reduceMotion
                            ? undefined
                            : isCurrent
                            ? { scale: 1.08 }
                            : { scale: 1 }
                        }
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isCompleted
                            ? activeOrder.status === 'delivered'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'bg-teal-600 border-teal-600 text-white shadow-xs'
                            : isCurrent
                            ? activeOrder.status === 'arrived'
                              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300 ring-4 ring-emerald-500/20'
                              : 'bg-teal-50 dark:bg-teal-950 border-teal-600 dark:border-teal-400 text-teal-700 dark:text-teal-300 ring-4 ring-teal-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.75]" />
                        ) : (
                          <StageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </motion.div>

                      <span
                        className={`text-[10px] sm:text-xs font-semibold leading-tight max-w-[78px] sm:max-w-none ${
                          isCompleted
                            ? 'text-slate-900 dark:text-slate-100'
                            : isCurrent
                            ? activeOrder.status === 'arrived'
                              ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                              : 'text-teal-700 dark:text-teal-300 font-bold'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {stage.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        );
      })()}

      {/* Post-Delivery Runner Feedback System */}
      {activeOrder.status === 'delivered' && (
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
          aria-label="Post-delivery runner feedback"
          className="rounded-3xl border border-teal-200 dark:border-teal-800/70 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm"
        >
          {existingFeedback ? (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Thank you for rating {existingFeedback.runnerName}!
                  </h2>
                </div>
                <div className="flex items-center gap-1" aria-label={`Rated ${existingFeedback.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= existingFeedback.rating
                          ? 'text-amber-500 fill-amber-400'
                          : 'text-slate-200 dark:text-slate-700'
                      }`}
                    />
                  ))}
                  <span className="ml-1.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                    {existingFeedback.rating}/5
                  </span>
                </div>
              </div>
              {existingFeedback.comment ? (
                <p className="rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 italic">
                  &ldquo;{existingFeedback.comment}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your rating has been logged with Campus Operations.
                </p>
              )}
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (selectedRating < 1 || selectedRating > 5) {
                  setFeedbackError('Please select a 1 to 5 star rating for your runner.');
                  return;
                }
                setFeedbackError(null);
                setSubmittingFeedback(true);
                try {
                  await onSubmitFeedback(
                    activeOrder,
                    selectedRating,
                    feedbackComment.trim().slice(0, 300)
                  );
                } finally {
                  setSubmittingFeedback(false);
                }
              }}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                    Delivery Completed · Order #{activeOrder.id}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    Rate Your Runner Experience ({activeOrder.runnerName})
                  </h2>
                </div>
                {(hoverRating || selectedRating) > 0 && (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-lg">
                    {RATING_LABELS[hoverRating || selectedRating]}
                  </span>
                )}
              </div>

              {/* 1-5 Star Selector */}
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Runner star rating">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= (hoverRating || selectedRating);
                  return (
                    <motion.button
                      key={star}
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                      role="radio"
                      aria-checked={selectedRating === star}
                      aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => {
                        setSelectedRating(star);
                        setFeedbackError(null);
                      }}
                      className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
                        active
                          ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/50'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          active
                            ? 'text-amber-500 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </motion.button>
                  );
                })}
                <span className="ml-2 text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                  {selectedRating > 0 ? `${selectedRating} / 5` : 'Tap a star'}
                </span>
              </div>

              {/* Quick Tags */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRAISE_TAGS.map((tag) => (
                  <motion.button
                    key={tag}
                    type="button"
                    whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                    onClick={() =>
                      setFeedbackComment((prev) => {
                        if (prev.includes(tag)) return prev;
                        const next = prev.trim() ? `${prev.trim()}, ${tag}` : tag;
                        return next.slice(0, 300);
                      })
                    }
                    className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-teal-600 dark:hover:border-teal-400 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    + {tag}
                  </motion.button>
                ))}
              </div>

              {/* Short Comment */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="runner-feedback-comment" className="font-semibold text-slate-700 dark:text-slate-300">
                    Short Comment (Optional)
                  </label>
                  <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                    {feedbackComment.length}/300
                  </span>
                </div>
                <textarea
                  id="runner-feedback-comment"
                  rows={2}
                  maxLength={300}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value.slice(0, 300))}
                  placeholder="Share how quickly your runner reached the hostel gate or any helpful note..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-600 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 resize-none"
                />
              </div>

              {feedbackError && (
                <p className="text-xs font-medium text-rose-700 dark:text-rose-400">{feedbackError}</p>
              )}

              <motion.button
                type="submit"
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                disabled={submittingFeedback}
                className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 border-b-[3px] border-teal-800 disabled:bg-slate-400 text-white text-sm font-semibold transition-colors"
              >
                {submittingFeedback ? 'Submitting Feedback...' : 'Submit Runner Rating'}
              </motion.button>
            </form>
          )}
        </motion.section>
      )}

      {/* Interactive Google Map View */}
      <LiveDeliveryMap
        order={activeOrder}
        isDarkMode={isDarkMode}
        secondsRemaining={secondsRemaining}
        onRoutePathReady={(pts, distMeters) => {
          setRoutePath(pts);
          setTotalDistMeters(distMeters);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: ETA Countdown & 4-Step Firestore Status */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl bg-slate-900 dark:bg-slate-900/95 border border-slate-800 text-white p-5 space-y-3 shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-medium text-teal-300">
                  {isCancelled
                    ? 'Order Cancelled'
                    : activeOrder.status === 'delivered'
                    ? 'Order Completed & Verified'
                    : isArrivedOrDelivered
                    ? 'Runner Arrived at Hostel Gate'
                    : 'Live Delivery ETA Countdown'}
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl sm:text-4xl font-mono font-bold tabular-nums tracking-tight">
                    {isArrivedOrDelivered ? '00:00' : formatCountdown(secondsRemaining)}
                  </span>
                  <span className="text-xs font-mono text-slate-300 tabular-nums">
                    {remainingKm} km remaining
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-right shrink-0">
                <div className="text-[11px] text-slate-400">Handover PIN</div>
                <div className="text-xl font-mono font-bold tracking-widest text-amber-300 tabular-nums">
                  {activeOrder.handoverPin}
                </div>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-300"
                style={{ width: `${Math.round(progressRatio * 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Real-Time Gate Milestones (Synced with Firestore)
            </h2>
            <ol className="space-y-5">
              {TRACKER_STEPS.map((item, idx) => {
                const isDone =
                  activeOrder.trackerStep > item.step ||
                  (isArrivedOrDelivered && item.step === 4);
                const isCurrent = activeOrder.trackerStep === item.step && !isArrivedOrDelivered;
                const isLast = idx === TRACKER_STEPS.length - 1;

                return (
                  <li key={item.step} className="relative flex items-start gap-3.5">
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-[15px] top-8 bottom-[-20px] w-0.5 ${
                          isDone ? 'bg-teal-600 dark:bg-teal-500' : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      />
                    )}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-mono font-bold ${
                        isDone
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : isCurrent
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        item.step
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-sm font-semibold leading-snug ${
                            isDone || isCurrent
                              ? 'text-slate-900 dark:text-slate-100'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {item.title}
                        </h3>
                        <span
                          className={`text-[11px] font-semibold ${
                            isDone
                              ? 'text-teal-700 dark:text-teal-400'
                              : isCurrent
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {isDone ? 'Done' : isCurrent ? 'In Progress' : 'Pending'}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          isDone || isCurrent
                            ? 'text-slate-600 dark:text-slate-400'
                            : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {item.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Right: Runner Info, Handover PIN & Order Summary */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeOrder.runnerName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gate-Authorized Student Runner
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                {activeOrder.runnerPhone}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    4-Digit Gate Handover PIN
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Show at {activeOrder.hostelName}
                  </div>
                </div>
              </div>
              <span className="text-lg font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {activeOrder.handoverPin}
              </span>
            </div>

            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              onClick={() => setWhatsAppModalOpen(true)}
              className="w-full min-h-[48px] rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-800 dark:border-slate-700 border-b-[3px] border-b-teal-500 text-white text-sm font-semibold px-4 py-3 flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600"
            >
              <MessageCircle className="w-4 h-4 text-teal-400" />
              <span>Call / WhatsApp Runner</span>
            </motion.button>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 space-y-3 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Sealed Bag Manifest</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-b border-slate-100 dark:border-slate-800">
              {activeOrder.items.map((item) => (
                <div key={item.kitId} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white">
              <span>Total Paid ({activeOrder.upiProvider})</span>
              <span className="font-mono tabular-nums">₹{activeOrder.totalPayable}</span>
            </div>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                Verified OTC seal
              </span>
              <button
                type="button"
                onClick={onGoToOrder}
                className="min-h-[40px] px-3 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300"
              >
                + Place Another Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* In-App Call / WhatsApp Runner Modal */}
      <AnimatePresence>
        {whatsAppModalOpen && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Runner WhatsApp Dispatch"
          >
            <motion.div
              initial={reduceMotion ? false : { y: 40, opacity: 0 }}
              animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
              exit={reduceMotion ? undefined : { y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl"
            >
              <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{activeOrder.runnerName}</div>
                  <div className="text-xs text-teal-300 font-mono">{activeOrder.runnerPhone}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsAppModalOpen(false)}
                  aria-label="Close runner chat"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-950 max-h-72 overflow-y-auto">
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-700 dark:text-slate-300 max-w-[85%]">
                  <span className="font-semibold text-teal-700 dark:text-teal-400 block mb-0.5">
                    {activeOrder.runnerName}
                  </span>
                  En route to {activeOrder.hostelName} for Order #{activeOrder.id}. Keep Handover PIN {activeOrder.handoverPin} ready!
                </div>

                {sentMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="ml-auto rounded-xl bg-teal-600 text-white p-3 text-xs max-w-[85%]"
                  >
                    {msg}
                    <div className="text-[10px] text-teal-100 mt-1 text-right">
                      Sent via Campus WhatsApp Bridge
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={quickMessage}
                  onChange={(e) => setQuickMessage(e.target.value)}
                  placeholder="Type message to runner..."
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                />
                <motion.button
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                  onClick={handleSendWhatsAppPreview}
                  aria-label="Send message"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
