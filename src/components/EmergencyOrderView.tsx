import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Info,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
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
import { filterKitsBySearch } from '../utils/symptomSearch';
import { ProductPhoto } from './ProductPhoto';
import { SymptomSearchBar } from './SymptomSearchBar';
import { CheckoutForm } from './CheckoutForm';

interface EmergencyOrderViewProps {
  kits: ReliefKit[];
  profile: StudentProfile;
  cart: CartItem[];
  onAddKit: (kit: ReliefKit) => void;
  onUpdateQuantity: (kitId: string, delta: number) => void;
  onClearCart?: () => void;
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
  onOpenConsultDoctor?: () => void;
  autoOpenCheckout?: boolean;
  onAutoOpenCheckoutHandled?: () => void;
}

interface QuickSymptomTile {
  id: string;
  emoji: string;
  label: string;
  category?: Exclude<SymptomCategory, 'All Kits'>;
  action?: 'doctor';
}

const QUICK_SYMPTOM_TILES: QuickSymptomTile[] = [
  { id: 'fever', emoji: '🤒', label: 'Fever', category: 'Fever & Cold' },
  { id: 'headache', emoji: '🤕', label: 'Headache', category: 'Headache & Migraine' },
  { id: 'acidity', emoji: '🤢', label: 'Acidity', category: 'Stomach & Acidity' },
  { id: 'first-aid', emoji: '🩹', label: 'First-Aid', category: 'First-Aid & Sprains' },
  { id: 'hydration', emoji: '💧', label: 'Hydration', category: 'Hydration & Energy' },
  { id: 'doctor', emoji: '🩺', label: 'Ask Doctor', action: 'doctor' },
];

function getUsageGuidance(kit: ReliefKit): string {
  switch (kit.category) {
    case 'Fever & Cold':
      return 'Take after light food or warm water. Do not exceed recommended OTC tablet intervals; check body temperature every 4 hours.';
    case 'Headache & Migraine':
      return 'Rest in a dim, quiet room and hydrate well. Apply topical balms/strips gently to forehead avoiding eye contact.';
    case 'Stomach & Acidity':
      return 'Sip slowly after mixing sachets in room-temperature drinking water. Avoid spicy or heavy canteen food until settled.';
    case 'First-Aid & Sprains':
      return 'Clean minor cuts gently before dressing. For sprains, rest, elevate the limb, and wrap snugly without cutting circulation.';
    case 'Hydration & Energy':
      return 'Dissolve full ORS sachet in clean drinking water as printed on pack and sip steadily over 30–60 minutes.';
    case 'Period & Cramp Care':
      return 'Apply heat patch over thin clothing (never directly on bare skin) and hydrate with warm fluids.';
    case 'Eye, Ear & Skin Care':
      return 'Wash hands thoroughly before using drops or ointments. Avoid touching nozzle tips directly to skin, eyes, or ears.';
    case 'Sleep & Wellness':
      return 'Use 20–30 minutes before rest in a calm setting. Avoid screens and caffeine late at night.';
    default:
      return 'Follow sealed pack dosage instructions carefully. If symptoms worsen or persist beyond 24 hours, consult an on-call doctor.';
  }
}

export function EmergencyOrderView({
  kits,
  profile,
  cart,
  onAddKit,
  onUpdateQuantity,
  onClearCart,
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
  onOpenConsultDoctor,
  autoOpenCheckout = false,
  onAutoOpenCheckoutHandled,
}: EmergencyOrderViewProps) {
  const [selectedSymptom, setSelectedSymptom] =
    useState<SymptomCategory>('All Kits');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutSheetOpen, setCheckoutSheetOpen] = useState(false);
  const [selectedDetailKit, setSelectedDetailKit] = useState<ReliefKit | null>(null);
  const [reorderedFeedback, setReorderedFeedback] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (autoOpenCheckout) {
      setCheckoutSheetOpen(true);
      onAutoOpenCheckoutHandled?.();
    }
  }, [autoOpenCheckout, onAutoOpenCheckoutHandled]);

  useEffect(() => {
    if (!selectedDetailKit && !checkoutSheetOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedDetailKit) setSelectedDetailKit(null);
        else if (checkoutSheetOpen) setCheckoutSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDetailKit, checkoutSheetOpen]);

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

    lastCompletedOrder.items.forEach((item) => {
      const catalogKit = kitsById.get(item.kitId);
      if (catalogKit && catalogKit.inStock) {
        availableUnits += item.quantity;
        availablePrice += catalogKit.price * item.quantity;
      }
    });

    if (availableUnits === 0) return null;
    return {
      order: lastCompletedOrder,
      availableUnits,
      availablePrice,
    };
  }, [kits, lastCompletedOrder]);

  const filteredKits = useMemo(() => {
    const categoryScoped =
      selectedSymptom === 'All Kits'
        ? kits
        : kits.filter((kit) => kit.category === selectedSymptom);
    return filterKitsBySearch(categoryScoped, searchQuery);
  }, [kits, selectedSymptom, searchQuery]);

  const handleSearchQueryChange = (nextValue: string) => {
    if (nextValue.trim().length > 0 && searchQuery.trim().length === 0) {
      setSelectedSymptom('All Kits');
    }
    setSearchQuery(nextValue);
  };

  const isKitInCart = (kitId?: string): boolean => {
    if (typeof kitId !== 'string' || kitId.trim().length === 0) return false;
    return cart.some(
      (item) =>
        typeof item.id === 'string' &&
        item.id.length > 0 &&
        item.id === kitId &&
        item.quantity > 0
    );
  };

  const getCartQty = (kitId?: string): number => {
    if (!isKitInCart(kitId)) return 0;
    const match = cart.find(
      (item) => typeof item.id === 'string' && item.id.length > 0 && item.id === kitId
    );
    return match && Number.isFinite(match.quantity) && match.quantity > 0
      ? match.quantity
      : 0;
  };

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

  const handleCheckoutConfirm = async () => {
    const ok = await onConfirmOrder();
    if (ok) {
      setCheckoutSheetOpen(false);
    }
  };

  const handleQuickTileClick = (tile: QuickSymptomTile) => {
    if (tile.action === 'doctor') {
      onOpenConsultDoctor?.();
      return;
    }
    if (!tile.category) return;
    setSearchQuery('');
    setSelectedSymptom((prev) =>
      prev === tile.category ? 'All Kits' : tile.category!
    );
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Clean Search & Hands-Free Voice Mic Bar */}
      <section aria-label="Search symptoms or medicines">
        <SymptomSearchBar
          value={searchQuery}
          onChange={handleSearchQueryChange}
          onVoiceActivate={() => setSelectedSymptom('All Kits')}
          showQuickChips={false}
          placeholder="Search fever, headache, ORS, pads, sprays..."
          resultCount={filteredKits.length}
          totalCount={kits.length}
        />
      </section>

      {/* Step 2: Quick Symptom Shortcuts (2x3 Mobile Grid / 6-Tile Desktop Row) */}
      <section aria-label="Quick symptom shortcuts" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white tracking-tight">
            What do you need relief for?
          </h2>
          {selectedSymptom !== 'All Kits' && (
            <button
              type="button"
              onClick={() => setSelectedSymptom('All Kits')}
              className="min-h-[36px] px-2.5 text-xs font-semibold text-[#0D9488] dark:text-teal-300 hover:underline whitespace-nowrap"
            >
              Show all
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
          {QUICK_SYMPTOM_TILES.map((tile) => {
            const isSelected =
              Boolean(tile.category) && selectedSymptom === tile.category;
            const isDoctorTile = tile.action === 'doctor';
            return (
              <motion.button
                key={tile.id}
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                onClick={() => handleQuickTileClick(tile)}
                aria-pressed={isSelected}
                className={`min-h-[82px] rounded-2xl border p-3 flex flex-col items-center justify-center gap-1.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-[#0D9488] ${
                  isSelected
                    ? 'bg-teal-50 dark:bg-teal-950/60 border-[#0D9488] text-[#0D9488] dark:text-teal-200'
                    : isDoctorTile
                    ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-[#0F172A] dark:text-teal-100 hover:border-[#0D9488]'
                    : 'bg-white dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-slate-100 hover:border-[#0D9488]'
                }`}
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  {tile.emoji}
                </span>
                <span className="text-xs sm:text-sm font-semibold leading-tight whitespace-nowrap">
                  {tile.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Step 3: Category Filter Row + Clean 2-Column Product Grid */}
      <section aria-label="OTC Emergency Kits Catalog" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white tracking-tight">
              {searchQuery.trim()
                ? `Results for "${searchQuery.trim()}"`
                : selectedSymptom === 'All Kits'
                ? 'Emergency OTC Kits'
                : selectedSymptom}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filteredKits.length} of {kits.length} sealed hostel essentials · 16 min gate delivery
            </p>
          </div>

          {recentOrderMeta && onReorderRecent && (
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              onClick={() => {
                onReorderRecent(recentOrderMeta.order);
                setReorderedFeedback(true);
              }}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
                reorderedFeedback
                  ? 'bg-[#0D9488] text-white border-[#0D9488]'
                  : 'bg-white dark:bg-slate-900 text-[#0D9488] dark:text-teal-300 border-[#E2E8F0] dark:border-slate-700 hover:border-[#0D9488]'
              }`}
            >
              {reorderedFeedback ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Cart</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Reorder Last (₹{recentOrderMeta.availablePrice})</span>
                </>
              )}
            </motion.button>
          )}
        </div>

        {/* Clean Single-Row Horizontal Category Scroller */}
        <div
          role="tablist"
          aria-label="Filter by kit category"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
        >
          {SYMPTOM_FILTERS.map((category) => {
            const active = selectedSymptom === category;
            const catCount =
              category === 'All Kits'
                ? kits.length
                : kits.filter((k) => k.category === category).length;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedSymptom(category)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 border transition-colors focus-visible:outline-2 focus-visible:outline-[#0D9488] ${
                  active
                    ? 'bg-[#0F172A] dark:bg-[#0D9488] text-white border-[#0F172A] dark:border-[#0D9488]'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-[#E2E8F0] dark:border-slate-800 hover:border-[#0D9488] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {category} ({catCount})
              </button>
            );
          })}
        </div>

        {/* Clean 2-Column Mobile / 3–4 Column Desktop Product Grid */}
        {filteredKits.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
              No kits matched &ldquo;{searchQuery}&rdquo;
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Try searching for fever, headache, ORS, pads, Volini, eye drops, or tap below to browse all {kits.length} OTC kits.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSymptom('All Kits');
                }}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white text-sm font-semibold"
              >
                Show All {kits.length} Kits
              </button>
              {onOpenConsultDoctor && (
                <button
                  type="button"
                  onClick={onOpenConsultDoctor}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white text-sm font-semibold"
                >
                  Ask a 24/7 Doctor
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredKits.map((kit) => {
              const qty = getCartQty(kit.id);
              const briefContents = kit.contents.slice(0, 2).join(' • ');
              return (
                <article
                  key={kit.id}
                  className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-colors ${
                    kit.inStock
                      ? 'bg-white dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-[#E2E8F0] dark:border-slate-800 opacity-70'
                  }`}
                >
                  {/* Tappable Photo + Title + Contents Area -> Opens Detail Bottom Sheet */}
                  <button
                    type="button"
                    onClick={() => setSelectedDetailKit(kit)}
                    aria-label={`View full details for ${kit.name}`}
                    className="text-left flex-1 flex flex-col focus-visible:outline-2 focus-visible:outline-[#0D9488]"
                  >
                    <div className="w-full aspect-[4/3] bg-[#F8FAFC] dark:bg-slate-800 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                      <ProductPhoto product={kit} showSealBadge={false} />
                    </div>

                    <div className="p-3.5 sm:p-4 space-y-1.5 flex-1">
                      <h3 className="text-[15px] sm:text-base font-bold text-[#0F172A] dark:text-white leading-snug line-clamp-2">
                        {kit.name}
                      </h3>
                      <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {briefContents}
                      </p>
                    </div>
                  </button>

                  {/* Bottom Price + High-Contrast + ADD / - 1 + Control */}
                  <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-1 flex items-center justify-between gap-2">
                    <div className="font-mono font-bold text-base sm:text-lg text-[#0F172A] dark:text-white tabular-nums">
                      ₹{kit.price}
                    </div>

                    {!kit.inStock ? (
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                        Out of stock
                      </span>
                    ) : !isKitInCart(kit.id) || qty === 0 ? (
                      <motion.button
                        type="button"
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                        onClick={() => onAddKit(kit)}
                        aria-label={`Add ${kit.name} to cart`}
                        className="min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 flex items-center justify-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-[#0D9488]"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>ADD</span>
                      </motion.button>
                    ) : (
                      <div className="flex items-center rounded-xl bg-[#0D9488] text-white overflow-hidden shrink-0">
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                          onClick={() => onUpdateQuantity(kit.id, -1)}
                          aria-label={`Remove one ${kit.name}`}
                          className="min-h-[44px] min-w-[36px] sm:min-w-[40px] flex items-center justify-center hover:bg-teal-700 transition-colors"
                        >
                          <Minus className="w-4 h-4 stroke-[2.5]" />
                        </motion.button>
                        <span className="min-w-[22px] text-center text-sm font-mono font-bold tabular-nums">
                          {qty}
                        </span>
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                          onClick={() => onAddKit(kit)}
                          aria-label={`Add one more ${kit.name}`}
                          className="min-h-[44px] min-w-[36px] sm:min-w-[40px] flex items-center justify-center hover:bg-teal-700 transition-colors"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </motion.button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Sticky Floating Emerald Cart Bar (Mobile & Desktop) */}
      <AnimatePresence>
        {totalItems > 0 && !checkoutSheetOpen && (
          <motion.div
            initial={shouldReduceMotion ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { y: 24, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-[76px] left-0 right-0 z-30 px-4 pointer-events-none"
          >
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => setCheckoutSheetOpen(true)}
              className="pointer-events-auto w-full max-w-2xl mx-auto min-h-[56px] rounded-2xl bg-[#0D9488] hover:bg-teal-700 text-white px-4 sm:px-5 py-3 flex items-center justify-between gap-3 shadow-lg shadow-teal-900/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm sm:text-base font-bold font-mono tabular-nums whitespace-nowrap">
                    {totalItems} {totalItems === 1 ? 'Item' : 'Items'} • ₹{totalPayable}
                  </div>
                  <div className="text-xs text-teal-100 truncate">
                    {deliveryFee === 0
                      ? 'Free gate delivery applied'
                      : `Includes ₹${deliveryFee} night gate delivery`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold whitespace-nowrap shrink-0">
                <span>View Cart &amp; Checkout</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1-Screen Express Checkout Bottom Sheet */}
      <AnimatePresence>
        {checkoutSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setCheckoutSheetOpen(false)}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Express Checkout"
          >
            <motion.div
              initial={shouldReduceMotion ? false : { y: '100%' }}
              animate={{ y: 0 }}
              exit={shouldReduceMotion ? undefined : { y: '100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="pt-3 pb-3.5 px-5 border-b border-[#E2E8F0] dark:border-slate-800 shrink-0">
                <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
                      Express Checkout
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      1-screen hostel gate dispatch · ~16 min arrival
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutSheetOpen(false)}
                    aria-label="Close checkout sheet"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto p-5 pb-8">
                <CheckoutForm
                  profile={profile}
                  cart={cart}
                  onUpdateQuantity={onUpdateQuantity}
                  onClearCart={onClearCart}
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
                  onConfirmOrder={() => void handleCheckoutConfirm()}
                  submitting={submitting}
                  formError={formError}
                  isDarkMode={isDarkMode}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Bottom Sheet Detail Drawer */}
      <AnimatePresence>
        {selectedDetailKit && (() => {
          const modalQty = getCartQty(selectedDetailKit.id);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setSelectedDetailKit(null)}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs p-0 sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label={`Product details for ${selectedDetailKit.name}`}
            >
              <motion.div
                initial={shouldReduceMotion ? false : { y: '100%' }}
                animate={{ y: 0 }}
                exit={shouldReduceMotion ? undefined : { y: '100%' }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="pt-2.5 pb-1 bg-white dark:bg-slate-900 shrink-0 sm:hidden">
                  <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />
                </div>

                <div className="relative w-full aspect-[4/3] bg-[#F8FAFC] dark:bg-slate-800 shrink-0 border-b border-slate-100 dark:border-slate-800">
                  <ProductPhoto product={selectedDetailKit} showSealBadge={true} />
                  <button
                    type="button"
                    onClick={() => setSelectedDetailKit(null)}
                    aria-label="Close product details"
                    className="absolute top-3 right-3 min-h-[44px] min-w-[44px] rounded-xl bg-white/95 dark:bg-slate-900/90 hover:bg-white text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center shadow-sm"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto p-5 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-[#0D9488] dark:text-teal-400">
                        {selectedDetailKit.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {selectedDetailKit.etaMinutes} min delivery
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{selectedDetailKit.sealedCode}</span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-white leading-snug">
                        {selectedDetailKit.name}
                      </h3>
                      <span className="text-xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-white shrink-0">
                        ₹{selectedDetailKit.price}
                      </span>
                    </div>

                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedDetailKit.reliefFor}
                    </p>
                  </div>

                  {/* Full Pack Contents */}
                  <div className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/70 border border-[#E2E8F0] dark:border-slate-800 p-4 space-y-2">
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Inside This Sealed Pack
                    </h4>
                    <ul className="space-y-1.5">
                      {selectedDetailKit.contents.map((item) => (
                        <li
                          key={item}
                          className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"
                        >
                          <Check className="w-4 h-4 text-[#0D9488] dark:text-teal-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Usage Instructions */}
                  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-[#0F172A] dark:text-white">
                      <Info className="w-4 h-4 text-[#0D9488] shrink-0" />
                      <span>Usage Instructions</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {getUsageGuidance(selectedDetailKit)}
                    </p>
                  </div>

                  {/* Safety & Doctor Reassurance */}
                  <div className="flex items-start justify-between gap-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 p-3.5 text-xs sm:text-sm text-emerald-950 dark:text-emerald-100">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                      <span>
                        Tamper-proof sealed OTC pack from licensed 24/7 pharmacy. Unsure about dosage?
                      </span>
                    </div>
                    {onOpenConsultDoctor && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDetailKit(null);
                          onOpenConsultDoctor();
                        }}
                        className="font-bold text-[#0D9488] dark:text-teal-300 hover:underline whitespace-nowrap shrink-0 flex items-center gap-1"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Ask Doctor</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Pinned Bottom Action Bar inside Product Detail Drawer */}
                <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedDetailKit.inStock ? 'In stock · Ready now' : 'Currently unavailable'}
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">
                      ₹{selectedDetailKit.price}
                    </div>
                  </div>

                  {!selectedDetailKit.inStock ? (
                    <button
                      type="button"
                      disabled
                      className="min-h-[48px] px-5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 text-sm font-semibold cursor-not-allowed"
                    >
                      Out of Stock
                    </button>
                  ) : !isKitInCart(selectedDetailKit.id) || modalQty === 0 ? (
                    <motion.button
                      type="button"
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                      onClick={() => onAddKit(selectedDetailKit)}
                      className="min-h-[48px] px-6 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white text-sm sm:text-base font-bold flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Add to Cart</span>
                    </motion.button>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center rounded-xl bg-[#0D9488] text-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(selectedDetailKit.id, -1)}
                          aria-label={`Remove one ${selectedDetailKit.name}`}
                          className="min-h-[48px] min-w-[44px] flex items-center justify-center hover:bg-teal-700"
                        >
                          <Minus className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <span className="min-w-[28px] text-center text-base font-mono font-bold tabular-nums">
                          {modalQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddKit(selectedDetailKit)}
                          aria-label={`Add one more ${selectedDetailKit.name}`}
                          className="min-h-[48px] min-w-[44px] flex items-center justify-center hover:bg-teal-700"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDetailKit(null);
                          setCheckoutSheetOpen(true);
                        }}
                        className="min-h-[48px] px-4 rounded-xl bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] text-sm font-bold whitespace-nowrap"
                      >
                        Checkout
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
