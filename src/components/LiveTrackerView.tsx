import { useEffect, useRef, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  CheckCircle2,
  Clock,
  KeyRound,
  MapPin,
  MessageCircle,
  Pause,
  Play,
  Send,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CampusOrder, LatLngLiteral, OrderStatus } from '../types';
import { LiveDeliveryMap } from './LiveDeliveryMap';

interface LiveTrackerViewProps {
  activeOrder: CampusOrder | null;
  isDemoMode?: boolean;
  onDemoUpdateOrder?: (orderId: string, patch: Partial<CampusOrder>) => void;
  onGoToOrder: () => void;
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

export function LiveTrackerView({
  activeOrder,
  isDemoMode = false,
  onDemoUpdateOrder,
  onGoToOrder,
}: LiveTrackerViewProps) {
  const [simulating, setSimulating] = useState(false);
  const [routePath, setRoutePath] = useState<LatLngLiteral[]>([]);
  const [totalDistMeters, setTotalDistMeters] = useState(1800);
  const [secondsRemaining, setSecondsRemaining] = useState(1200); // 20:00 ETA countdown
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [quickMessage, setQuickMessage] = useState('');
  const [sentMessages, setSentMessages] = useState<string[]>([]);

  const simIndexRef = useRef(0);

  // Sync timer & simulation reset when active order changes
  useEffect(() => {
    if (!activeOrder) return;
    if (activeOrder.status === 'delivered' || activeOrder.trackerStep === 4) {
      setSecondsRemaining(0);
      setSimulating(false);
    } else if (activeOrder.trackerStep === 1) {
      setSecondsRemaining(1200); // 20 mins
      simIndexRef.current = 0;
    } else if (activeOrder.trackerStep === 2) {
      setSecondsRemaining(840);
    } else if (activeOrder.trackerStep === 3) {
      setSecondsRemaining(320);
    }

    setQuickMessage(
      `Hi ${activeOrder.runnerName}, I am at ${activeOrder.hostelName} (Room ${activeOrder.roomNumber}) for Order #${activeOrder.id}. Let me know once you reach the gate desk!`
    );
  }, [activeOrder?.id]);

  // 1-second ETA countdown
  useEffect(() => {
    if (!activeOrder || activeOrder.trackerStep >= 4 || activeOrder.status === 'delivered') {
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
    if (activeOrder.status === 'delivered' || activeOrder.trackerStep >= 4) {
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
        }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, orderPath));
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
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h1 className="text-lg font-bold text-slate-900">No Active Night Order Yet</h1>
          <p className="text-sm text-slate-600">
            Place an emergency OTC order from the storefront to watch your gate-authorized runner live on Google Maps.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToOrder}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
        >
          Browse Emergency Kits
        </button>
      </div>
    );
  }

  const isArrivedOrDelivered =
    activeOrder.trackerStep === 4 ||
    activeOrder.status === 'arrived' ||
    activeOrder.status === 'delivered';

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
    <div className="space-y-5">
      {/* Header & Runner Movement Simulation Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-semibold text-teal-700">Order #{activeOrder.id}</span>
            <span aria-hidden="true">·</span>
            <span>Paid via {activeOrder.upiProvider}</span>
            <span aria-hidden="true">·</span>
            <span>{activeOrder.hostelName}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            Live Google Maps Delivery Tracking
          </h1>
        </div>

        <button
          type="button"
          disabled={isArrivedOrDelivered}
          onClick={() => setSimulating((prev) => !prev)}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
            isArrivedOrDelivered
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : simulating
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}
        >
          {simulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>
            {isArrivedOrDelivered
              ? 'Runner at Hostel Gate'
              : simulating
              ? 'Pause Runner Simulation'
              : 'Simulate Runner Movement'}
          </span>
        </button>
      </div>

      {/* Interactive Google Map View */}
      <LiveDeliveryMap
        order={activeOrder}
        onRoutePathReady={(pts, distMeters) => {
          setRoutePath(pts);
          setTotalDistMeters(distMeters);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: ETA Countdown & 4-Step Firestore Status */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-slate-900 text-white p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-medium text-teal-300">
                  {activeOrder.status === 'delivered'
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-4">
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
                          isDone ? 'bg-teal-600' : 'bg-slate-200'
                        }`}
                      />
                    )}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-mono font-bold ${
                        isDone
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : isCurrent
                          ? 'bg-amber-50 border-amber-500 text-amber-700'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
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
                            isDone || isCurrent ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {item.title}
                        </h3>
                        <span
                          className={`text-[11px] font-semibold ${
                            isDone
                              ? 'text-teal-700'
                              : isCurrent
                              ? 'text-amber-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {isDone ? 'Done' : isCurrent ? 'In Progress' : 'Pending'}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          isDone || isCurrent ? 'text-slate-600' : 'text-slate-400'
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{activeOrder.runnerName}</h2>
                  <p className="text-xs text-slate-500">Gate-Authorized Student Runner</p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-700 tabular-nums">
                {activeOrder.runnerPhone}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-teal-700 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    4-Digit Gate Handover PIN
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Show at {activeOrder.hostelName}
                  </div>
                </div>
              </div>
              <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                {activeOrder.handoverPin}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setWhatsAppModalOpen(true)}
              className="w-full min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-3 flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600"
            >
              <MessageCircle className="w-4 h-4 text-teal-400" />
              <span>Call / WhatsApp Runner</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Sealed Bag Manifest</h2>
            <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
              {activeOrder.items.map((item) => (
                <div key={item.kitId} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900">
              <span>Total Paid ({activeOrder.upiProvider})</span>
              <span className="font-mono tabular-nums">₹{activeOrder.totalPayable}</span>
            </div>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                Verified OTC seal
              </span>
              <button
                type="button"
                onClick={onGoToOrder}
                className="min-h-[40px] px-3 text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                + Place Another Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* In-App Call / WhatsApp Runner Modal */}
      {whatsAppModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Runner WhatsApp Dispatch"
        >
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white overflow-hidden shadow-2xl">
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

            <div className="p-4 space-y-3 bg-slate-50 max-h-72 overflow-y-auto">
              <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-700 max-w-[85%]">
                <span className="font-semibold text-teal-700 block mb-0.5">
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

            <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={quickMessage}
                onChange={(e) => setQuickMessage(e.target.value)}
                placeholder="Type message to runner..."
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendWhatsAppPreview}
                aria-label="Send message"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
