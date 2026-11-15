import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Clock,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-react';
import {
  DELIVERY_FEE,
  SYMPTOM_FILTERS,
  WELLNESS_PASS_PRICE,
} from '../data/campusData';
import {
  CampusOrder,
  CartItem,
  LatLngLiteral,
  ReliefKit,
  StudentProfile,
  SymptomCategory,
  UpiProvider,
} from '../types';
import { KitImage } from './KitImage';
import { CheckoutForm } from './CheckoutForm';

interface EmergencyOrderViewProps {
  kits: ReliefKit[];
  profile: StudentProfile;
  cart: CartItem[];
  onAddKit: (kit: ReliefKit) => void;
  onUpdateQuantity: (kitId: string, delta: number) => void;
  orderPin: LatLngLiteral;
  onChangeOrderPin: (coords: LatLngLiteral) => void;
  roomNumber: string;
  onRoomNumberChange: (room: string) => void;
  specialInstructions: string;
  onSpecialInstructionsChange: (notes: string) => void;
  wellnessPassAdded: boolean;
  onToggleWellnessPass: () => void;
  upiProvider: UpiProvider;
  onSelectUpi: (provider: UpiProvider) => void;
  onConfirmOrder: () => Promise<boolean>;
  submitting: boolean;
  formError: string | null;
  isDarkMode?: boolean;
  lastCompletedOrder?: CampusOrder | null;
  onReorderRecent?: (order: CampusOrder) => void;
}

function getCurfewStatus(): {
  isActive: boolean;
  label: string;
  countdown: string;
} {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const totalSecToday = hours * 3600 + minutes * 60 + seconds;

  const isCurfewWindow = hours >= 22 || hours < 6;
  let diffSeconds = 0;

  if (isCurfewWindow) {
    const targetSec = hours >= 22 ? 24 * 3600 + 6 * 3600 : 6 * 3600;
    diffSeconds = Math.max(0, targetSec - totalSecToday);
  } else {
    diffSeconds = Math.max(0, 22 * 3600 - totalSecToday);
  }

  const h = Math.floor(diffSeconds / 3600);
  const m = Math.floor((diffSeconds % 3600) / 60);
  const s = diffSeconds % 60;
  const countdown = `${String(h).padStart(2, '0')}:${String(m).padStart(
    2,
    '0'
  )}:${String(s).padStart(2, '0')}`;

  return {
    isActive: isCurfewWindow,
    label: isCurfewWindow
      ? 'Curfew Express Window Ends In'
      : '24/7 Express Standby · Curfew Starts In',
    countdown,
  };
}

export function EmergencyOrderView({
  kits,
  profile,
  cart,
  onAddKit,
  onUpdateQuantity,
  orderPin,
  onChangeOrderPin,
  roomNumber,
  onRoomNumberChange,
  specialInstructions,
  onSpecialInstructionsChange,
  wellnessPassAdded,
  onToggleWellnessPass,
  upiProvider,
  onSelectUpi,
  onConfirmOrder,
  submitting,
  formError,
  isDarkMode = false,
  lastCompletedOrder = null,
  onReorderRecent,
}: EmergencyOrderViewProps) {
  const [selectedSymptom, setSelectedSymptom] =
    useState<SymptomCategory>('All Kits');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedDetailKit, setSelectedDetailKit] = useState<ReliefKit | null>(null);
  const [flyingBadge, setFlyingBadge] = useState<{ key: number; label: string } | null>(null);
  const [reorderedFeedback, setReorderedFeedback] = useState(false);
  const [curfewClock, setCurfewClock] = useState(() => getCurfewStatus());
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!selectedDetailKit) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDetailKit(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDetailKit]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurfewClock(getCurfewStatus());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!flyingBadge) return;
    const t = window.setTimeout(() => setFlyingBadge(null), 1100);
    return () => window.clearTimeout(t);
  }, [flyingBadge]);

  useEffect(() => {
    if (!reorderedFeedback) return;
    const t = window.setTimeout(() => setReorderedFeedback(false), 1800);
    return () => window.clearTimeout(t);
  }, [reorderedFeedback]);

  const recentOrderMeta = useMemo(() => {
    if (!lastCompletedOrder) return null;
    const kitsById = new globalThis.Map<string, ReliefKit>();
    kits.forEach((kit) => kitsById.set(kit.id, kit));

    let availableUnits = 0;
    let availablePrice = 0;
    const availableNames: string[] = [];

    lastCompletedOrder.items.forEach((item) => {
      const catalogKit = kitsById.get(item.kitId);
      if (catalogKit && catalogKit.inStock) {
        availableUnits += item.quantity;
        availablePrice += catalogKit.price * item.quantity;
        availableNames.push(`${item.quantity}× ${catalogKit.name}`);
      }
    });

    return {
      order: lastCompletedOrder,
      availableUnits,
      availablePrice,
      availableNames,
      summaryTitle:
        availableNames.length > 0
          ? `Reorder #${lastCompletedOrder.id}: ${availableNames.join(', ')}`
          : `Items from #${lastCompletedOrder.id} are currently out of stock`,
    };
  }, [kits, lastCompletedOrder]);

  const filteredKits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return kits.filter((kit) => {
      const matchesCat =
        selectedSymptom === 'All Kits' || kit.category === selectedSymptom;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        kit.name.toLowerCase().includes(q) ||
        kit.category.toLowerCase().includes(q) ||
        kit.reliefFor.toLowerCase().includes(q) ||
        kit.sealedCode.toLowerCase().includes(q) ||
        kit.contents.some((item) => item.toLowerCase().includes(q))
      );
    });
  }, [kits, selectedSymptom, searchQuery]);

  const getCartQty = (kitId: string) =>
    cart.find((item) => item.kit.id === kitId)?.quantity ?? 0;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.kit.price * item.quantity,
    0
  );
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryFee =
    cart.length === 0
      ? 0
      : profile.wellnessPassActive || wellnessPassAdded
      ? 0
      : DELIVERY_FEE;
  const passCost =
    !profile.wellnessPassActive && wellnessPassAdded ? WELLNESS_PASS_PRICE : 0;
  const totalPayable = subtotal + deliveryFee + passCost;

  const triggerAddFeedback = (kit: ReliefKit, isFirstAdd: boolean) => {
    setFlyingBadge({ key: Date.now(), label: kit.name });
    onAddKit(kit);
    if (isFirstAdd && window.innerWidth < 1024) {
      setMobileDrawerOpen(true);
    }
  };

  const handleMobileConfirm = async () => {
    const ok = await onConfirmOrder();
    if (ok) {
      setMobileDrawerOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Interactive Clean Clinical Hero Banner */}
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        aria-label="Curfew Express Hero"
        className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-[0_14px_34px_-18px_rgba(15,23,42,0.12)] dark:shadow-[0_24px_48px_-18px_rgba(0,0,0,0.65)] p-5 sm:p-7"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-teal-500/8 dark:bg-teal-500/15 blur-3xl"
        />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-xl bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-400/30 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700 dark:text-teal-300 shrink-0" />
            <span>16-Min Hostel Gate Express</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-slate-900 dark:text-white text-balance max-w-2xl">
            Late-night OTC care delivered straight to your hostel gate
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Licensed 24/7 Dehradun partner pharmacy dispatch for{' '}
            <span className="text-slate-900 dark:text-white font-semibold">{profile.hostelName}</span>
            . Sealed OTC relief kits with live Google Maps GPS tracking.
          </p>

          {/* Live Curfew Countdown & Gate Info Strip */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200 dark:border-white/15 px-3.5 py-2.5 flex items-center gap-3">
              <Clock className="w-4 h-4 text-teal-700 dark:text-teal-300 shrink-0" />
              <div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-teal-200/90">
                  {curfewClock.label}
                </div>
                <div className="text-base sm:text-lg font-mono font-bold tracking-wider tabular-nums text-slate-900 dark:text-white">
                  {curfewClock.countdown}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200 dark:border-white/15 px-3.5 py-2.5 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0" />
              <div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-300">
                  Handover Gate Pin
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {profile.hostelName} · Rm {profile.roomNumber}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Instant Live Search Bar & 8-Category Tactile Selector */}
      <section aria-label="Search and OTC categories" className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Emergency OTC Storefront
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {kits.length} sealed hostel kits across 8 categories
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
            {/* One-Click Reorder Recent Button */}
            <motion.button
              type="button"
              whileTap={
                shouldReduceMotion ||
                !recentOrderMeta ||
                recentOrderMeta.availableUnits === 0
                  ? undefined
                  : { scale: 0.96, y: 1 }
              }
              disabled={
                !recentOrderMeta ||
                recentOrderMeta.availableUnits === 0 ||
                !onReorderRecent
              }
              onClick={() => {
                if (!recentOrderMeta || !onReorderRecent) return;
                onReorderRecent(recentOrderMeta.order);
                setReorderedFeedback(true);
              }}
              title={
                recentOrderMeta
                  ? recentOrderMeta.summaryTitle
                  : 'Available after your first delivered order'
              }
              className={`min-h-[44px] px-3.5 py-2 rounded-2xl border text-xs sm:text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-2 transition-all focus-visible:outline-2 focus-visible:outline-teal-600 ${
                reorderedFeedback
                  ? 'bg-emerald-600 text-white border-emerald-700 border-b-[3px] border-b-emerald-800 shadow-sm'
                  : recentOrderMeta && recentOrderMeta.availableUnits > 0
                  ? 'bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100/80 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700 border-b-[3px] border-b-teal-500 active:border-b active:translate-y-[1px] shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
              }`}
            >
              {reorderedFeedback ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Added to Cart</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>Reorder Recent</span>
                  {recentOrderMeta && recentOrderMeta.availableUnits > 0 && (
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-lg bg-teal-600/12 dark:bg-teal-400/15 text-teal-800 dark:text-teal-200 tabular-nums">
                      {recentOrderMeta.availableUnits} · ₹{recentOrderMeta.availablePrice}
                    </span>
                  )}
                </>
              )}
            </motion.button>

            {/* Instant Live Symptom & Product Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symptoms (fever, acidity, pads)..."
                aria-label="Search OTC kits and symptoms"
                className="w-full min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md pl-10 pr-9 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs focus:border-teal-600 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {SYMPTOM_FILTERS.map((category, idx) => {
            const active = selectedSymptom === category;
            const catCount =
              category === 'All Kits'
                ? kits.length
                : kits.filter((k) => k.category === category).length;
            return (
              <motion.button
                key={category}
                type="button"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  delay: shouldReduceMotion ? 0 : Math.min(idx * 0.025, 0.2),
                }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95, y: 2 }}
                onClick={() => setSelectedSymptom(category)}
                className={`min-h-[44px] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-teal-600 ${
                  active
                    ? 'bg-slate-900 dark:bg-teal-600 text-white border border-slate-900 dark:border-teal-500 border-b-[4px] border-b-teal-500 dark:border-b-teal-800 shadow-[0_8px_18px_-6px_rgba(15,23,42,0.35)]'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-800 hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300 shadow-xs'
                }`}
              >
                {category}{' '}
                <span className="font-mono text-[11px] opacity-75 tabular-nums">
                  ({catCount})
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Product Grid + Sticky Desktop 60-Second Checkout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredKits.length === 0 ? (
            <div className="sm:col-span-2 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No OTC kits matched &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try searching symptoms like fever, acidity, migraine, sprain, pads, or sleep.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSymptom('All Kits');
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
              >
                Show All {kits.length} Kits
              </button>
            </div>
          ) : (
            filteredKits.map((kit, idx) => {
              const qty = getCartQty(kit.id);
              return (
                <motion.article
                  key={kit.id}
                  layout="position"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.24,
                    delay: shouldReduceMotion ? 0 : Math.min(idx * 0.03, 0.24),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={
                    shouldReduceMotion || !kit.inStock ? undefined : { y: -4 }
                  }
                  className={`group rounded-3xl border border-b-[4px] overflow-hidden flex flex-col justify-between transition-shadow ${
                    kit.inStock
                      ? 'border-slate-200 dark:border-slate-800 border-b-slate-300/90 dark:border-b-slate-700 bg-white dark:bg-slate-900 shadow-[0_12px_28px_-14px_rgba(15,23,42,0.16)] dark:shadow-[0_14px_30px_-14px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_36px_-14px_rgba(13,148,136,0.25)]'
                      : 'border-slate-200 dark:border-slate-800 border-b-slate-200 dark:border-b-slate-800 bg-slate-50/80 dark:bg-slate-900/50 opacity-75'
                  }`}
                >
                  <div>
                    {/* Uniform 4:3 Photorealistic Image with Gradient Backdrop, Zoom-on-Hover & Quick View */}
                    <button
                      type="button"
                      onClick={() => setSelectedDetailKit(kit)}
                      aria-label={`View details for ${kit.name}`}
                      className="block relative w-full aspect-[4/3] min-h-36 bg-gradient-to-br from-slate-100 via-teal-50/50 to-slate-100 dark:from-slate-800 dark:via-teal-950/40 dark:to-slate-900 overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-teal-600"
                    >
                      <KitImage
                        src={kit.imagePath}
                        alt={kit.name}
                        code={kit.sealedCode}
                        kitId={kit.id}
                        category={kit.category}
                        showSealBadge={true}
                      />
                    </button>

                    <div className="p-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-teal-700 dark:text-teal-400">
                          {kit.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{kit.etaMinutes} min ETA</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            kit.inStock
                              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                              : 'text-rose-700 dark:text-rose-400 font-semibold'
                          }
                        >
                          {kit.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailKit(kit)}
                          className="text-left text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-300 leading-snug transition-colors"
                        >
                          {kit.name}
                        </button>
                        <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-teal-300 shrink-0">
                          ₹{kit.price}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {kit.reliefFor}
                      </p>

                      <ul className="pt-1 space-y-1">
                        {kit.contents.map((item) => (
                          <li
                            key={item}
                            className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5"
                          >
                            <span
                              className="text-teal-600 dark:text-teal-400 font-bold leading-4"
                              aria-hidden="true"
                            >
                              •
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Tactile Bottom Action Bar */}
                  <div className="px-4 pb-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {kit.sealedCode}
                    </span>

                    {!kit.inStock ? (
                      <button
                        type="button"
                        disabled
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold cursor-not-allowed whitespace-nowrap"
                      >
                        Out of Stock
                      </button>
                    ) : qty === 0 ? (
                      <motion.button
                        type="button"
                        whileTap={
                          shouldReduceMotion ? undefined : { scale: 0.95, y: 2 }
                        }
                        onClick={() =>
                          triggerAddFeedback(kit, cart.length === 0)
                        }
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-semibold border-b-[4px] border-teal-800 active:border-b-0 active:translate-y-[3px] whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all focus-visible:outline-2 focus-visible:outline-teal-600"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Kit</span>
                      </motion.button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
                          onClick={() => onUpdateQuantity(kit.id, -1)}
                          aria-label={`Remove one ${kit.name}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 active:border-b active:translate-y-[2px] transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </motion.button>
                        <motion.span
                          key={qty}
                          initial={shouldReduceMotion ? false : { scale: 1.4 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                          className="w-7 text-center text-sm font-mono font-bold text-slate-900 dark:text-white tabular-nums"
                        >
                          {qty}
                        </motion.span>
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
                          onClick={() => triggerAddFeedback(kit, false)}
                          aria-label={`Add one more ${kit.name}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-teal-600 text-white border-b-[3px] border-teal-800 hover:bg-teal-500 active:border-b-0 active:translate-y-[2px] transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.article>
              );
            })
          )}

          <div className="sm:col-span-2 lg:hidden rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/40 p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 dark:text-amber-100 leading-relaxed">
              <span className="font-semibold">Emergency Protocol:</span> Strictly
              verified OTC essentials from licensed 24/7 partner pharmacies. No
              prescription-only drugs.
            </div>
          </div>
        </div>

        {/* Sticky Desktop 3D Checkout Card */}
        <aside className="hidden lg:block lg:col-span-5 sticky top-20 rounded-3xl border border-slate-200 dark:border-slate-800 border-b-[4px] border-b-slate-300 dark:border-b-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-5 shadow-[0_16px_36px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.65)]">
          <div className="pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                60-Second Checkout
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-filled from your campus profile
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl whitespace-nowrap">
              Curfew Express
            </span>
          </div>

          <CheckoutForm
            profile={profile}
            cart={cart}
            onUpdateQuantity={onUpdateQuantity}
            orderPin={orderPin}
            onChangeOrderPin={onChangeOrderPin}
            roomNumber={roomNumber}
            onRoomNumberChange={onRoomNumberChange}
            specialInstructions={specialInstructions}
            onSpecialInstructionsChange={onSpecialInstructionsChange}
            wellnessPassAdded={wellnessPassAdded}
            onToggleWellnessPass={onToggleWellnessPass}
            upiProvider={upiProvider}
            onSelectUpi={onSelectUpi}
            onConfirmOrder={() => void onConfirmOrder()}
            submitting={submitting}
            formError={formError}
            isDarkMode={isDarkMode}
          />
        </aside>
      </div>

      {/* Flying Cart Badge Feedback Toast */}
      <AnimatePresence>
        {flyingBadge && (
          <motion.div
            key={flyingBadge.key}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.7 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className="pointer-events-none fixed bottom-36 lg:bottom-6 right-4 sm:right-6 z-50"
          >
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white border border-teal-400/50 px-3.5 py-2 shadow-xl text-xs font-semibold">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span className="max-w-[190px] truncate">+1 {flyingBadge.label}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Floating Mobile Cart Bar */}
      <AnimatePresence>
        {totalItems > 0 && !mobileDrawerOpen && (
          <motion.div
            initial={shouldReduceMotion ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="lg:hidden fixed bottom-[72px] left-0 right-0 z-30 px-4"
          >
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              onClick={() => setMobileDrawerOpen(true)}
              className="w-full max-w-md mx-auto min-h-[54px] rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 border-b-[4px] border-b-teal-500 active:border-b-0 active:translate-y-[3px] text-white px-4 py-3 flex items-center justify-between shadow-xl shadow-slate-900/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="w-5 h-5 text-teal-400" />
                  <motion.span
                    key={totalItems}
                    initial={shouldReduceMotion ? false : { scale: 1.55 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-teal-500 text-slate-950 text-[10px] font-mono font-bold flex items-center justify-center px-1 tabular-nums"
                  >
                    {totalItems}
                  </motion.span>
                </div>
                <div className="text-left">
                  <div className="text-xs text-slate-300 tabular-nums">
                    {totalItems} {totalItems === 1 ? 'Kit' : 'Kits'} ·{' '}
                    {profile.hostelName}
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums">
                    Total ₹{totalPayable}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-teal-300 whitespace-nowrap">
                <span>Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smooth Slide-Up Mobile Cart Checkout Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-label="Fast Gate Checkout"
          >
            <motion.div
              initial={shouldReduceMotion ? false : { y: '100%' }}
              animate={{ y: 0 }}
              exit={shouldReduceMotion ? undefined : { y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="w-full max-w-lg max-h-[90vh] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="pt-2.5 pb-3 px-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      60-Second Checkout
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Auto-filled from your campus profile
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    aria-label="Close checkout drawer"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto p-4 pb-8">
                <CheckoutForm
                  profile={profile}
                  cart={cart}
                  onUpdateQuantity={onUpdateQuantity}
                  orderPin={orderPin}
                  onChangeOrderPin={onChangeOrderPin}
                  roomNumber={roomNumber}
                  onRoomNumberChange={onRoomNumberChange}
                  specialInstructions={specialInstructions}
                  onSpecialInstructionsChange={onSpecialInstructionsChange}
                  wellnessPassAdded={wellnessPassAdded}
                  onToggleWellnessPass={onToggleWellnessPass}
                  upiProvider={upiProvider}
                  onSelectUpi={onSelectUpi}
                  onConfirmOrder={() => void handleMobileConfirm()}
                  submitting={submitting}
                  formError={formError}
                  isDarkMode={isDarkMode}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedDetailKit && (() => {
          const modalQty = getCartQty(selectedDetailKit.id);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetailKit(null)}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 backdrop-blur-xs p-0 sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label={`Product details for ${selectedDetailKit.name}`}
            >
              <motion.div
                initial={shouldReduceMotion ? false : { y: 28, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? undefined : { y: 28, opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="relative w-full aspect-[4/3] min-h-36 bg-gradient-to-br from-slate-100 via-teal-50/50 to-slate-100 dark:from-slate-800 dark:via-teal-950/40 dark:to-slate-900 shrink-0">
                  <KitImage
                    src={selectedDetailKit.imagePath}
                    alt={selectedDetailKit.name}
                    code={selectedDetailKit.sealedCode}
                    kitId={selectedDetailKit.id}
                    category={selectedDetailKit.category}
                    showSealBadge={true}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDetailKit(null)}
                    aria-label="Close product detail modal"
                    className="absolute top-3 right-3 min-h-[44px] min-w-[44px] rounded-2xl bg-slate-900/75 hover:bg-slate-900 text-white backdrop-blur-md border border-white/15 flex items-center justify-center shadow-md transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto p-5 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-teal-700 dark:text-teal-400">
                        {selectedDetailKit.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{selectedDetailKit.sealedCode}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{selectedDetailKit.etaMinutes} min ETA</span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                        {selectedDetailKit.name}
                      </h3>
                      <span className="text-xl font-bold font-mono tabular-nums text-teal-700 dark:text-teal-300 shrink-0">
                        ₹{selectedDetailKit.price}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedDetailKit.reliefFor}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Sealed OTC Kit Contents
                    </p>
                    <ul className="space-y-1.5">
                      {selectedDetailKit.contents.map((item) => (
                        <li
                          key={item}
                          className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
                        >
                          <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-1 flex items-center justify-between gap-3">
                    <span
                      className={`text-xs font-semibold ${
                        selectedDetailKit.inStock
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {selectedDetailKit.inStock ? 'In Stock · Ready for Express Dispatch' : 'Currently Out of Stock'}
                    </span>

                    {!selectedDetailKit.inStock ? (
                      <button
                        type="button"
                        disabled
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-semibold cursor-not-allowed"
                      >
                        Out of Stock
                      </button>
                    ) : modalQty === 0 ? (
                      <motion.button
                        type="button"
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                        onClick={() => triggerAddFeedback(selectedDetailKit, cart.length === 0)}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-semibold border-b-[3px] border-teal-800 flex items-center gap-1.5 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Kit · ₹{selectedDetailKit.price}</span>
                      </motion.button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(selectedDetailKit.id, -1)}
                          aria-label={`Remove one ${selectedDetailKit.name}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-7 text-center text-sm font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {modalQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => triggerAddFeedback(selectedDetailKit, false)}
                          aria-label={`Add one more ${selectedDetailKit.name}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-teal-600 text-white border-b-[3px] border-teal-800"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
