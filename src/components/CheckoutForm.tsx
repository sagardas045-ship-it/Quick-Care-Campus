import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  Check,
  Loader2,
  MapPin,
  MessageCircle,
  Mic,
  MicOff,
  Minus,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useSpeechDictation } from '../hooks/useSpeechDictation';
import {
  DELIVERY_FEE,
  WELLNESS_PASS_PRICE,
} from '../data/campusData';
import {
  CartItem,
  LatLngLiteral,
  StudentProfile,
  UpiProvider,
} from '../types';
import { HostelPinPickerMap } from './HostelPinPickerMap';
import { ProductPhoto } from './ProductPhoto';

interface CheckoutFormProps {
  profile: StudentProfile;
  cart: CartItem[];
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
  onConfirmOrder: () => void;
  submitting: boolean;
  formError: string | null;
  isDarkMode?: boolean;
}

const UPI_OPTIONS: { id: UpiProvider; label: string; sub: string }[] = [
  { id: 'GPay', label: 'GPay', sub: 'UPI Instant' },
  { id: 'PhonePe', label: 'PhonePe', sub: 'UPI One-Tap' },
  { id: 'Paytm', label: 'Paytm', sub: 'UPI / Wallet' },
];

export function CheckoutForm({
  profile,
  cart,
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
}: CheckoutFormProps) {
  const [showPinAdjuster, setShowPinAdjuster] = useState(false);
  const reduceMotion = useReducedMotion();
  const roomInputId = useId();
  const instructionsInputId = useId();
  const instructionsRef = useRef(specialInstructions);
  instructionsRef.current = specialInstructions;

  const handleDictatedTranscript = useCallback(
    (spokenText: string) => {
      const existing = instructionsRef.current.trimEnd();
      if (existing.length >= 240) return;
      const separator = existing.length > 0 && !/[\s\n]$/.test(existing) ? ' ' : '';
      const updated = `${existing}${separator}${spokenText}`.slice(0, 240);
      onSpecialInstructionsChange(updated);
    },
    [onSpecialInstructionsChange]
  );

  const {
    isSupported: isDictationSupported,
    isRequesting: isMicRequesting,
    isListening,
    interimTranscript,
    error: dictationError,
    toggleDictation,
    stopDictation,
    clearError: clearDictationError,
  } = useSpeechDictation({
    onFinalTranscript: handleDictatedTranscript,
  });

  useEffect(() => {
    if (submitting && isListening) {
      stopDictation();
    }
  }, [isListening, stopDictation, submitting]);

  useEffect(() => {
    if (specialInstructions.length >= 240 && isListening) {
      stopDictation();
    }
  }, [isListening, specialInstructions.length, stopDictation]);

  const subtotal = cart.reduce((sum, item) => sum + item.kit.price * item.quantity, 0);
  const deliveryFee =
    cart.length === 0 ? 0 : profile.wellnessPassActive || wellnessPassAdded ? 0 : DELIVERY_FEE;
  const passCost = !profile.wellnessPassActive && wellnessPassAdded ? WELLNESS_PASS_PRICE : 0;
  const totalPayable = subtotal + deliveryFee + passCost;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-5">
      {/* 1. Cart Items List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
            Your Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </h3>
          {cart.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
                16 Min Delivery
              </span>
              {onClearCart && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="min-h-[36px] px-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 underline underline-offset-2 rounded focus-visible:outline-2 focus-visible:outline-[#0D9488]"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-900 p-5 text-center">
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Tap <span className="font-bold text-[#0F172A] dark:text-white">+ ADD</span> on any OTC kit to start your express checkout.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900">
            {cart.map(({ id, kit, quantity }) => (
              <div key={id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="w-16 aspect-[4/3] rounded-xl overflow-hidden bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shrink-0">
                  <ProductPhoto product={kit} compact={true} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-[15px] font-semibold text-[#0F172A] dark:text-slate-100 line-clamp-1">
                    {kit.name}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                    ₹{kit.price} × {quantity} ={' '}
                    <span className="font-bold text-[#0F172A] dark:text-white">
                      ₹{kit.price * quantity}
                    </span>
                  </p>
                </div>
                <div className="flex items-center rounded-xl border border-[#0D9488] bg-teal-50/60 dark:bg-teal-950/40 overflow-hidden shrink-0">
                  <motion.button
                    type="button"
                    whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                    onClick={() => onUpdateQuantity(kit.id, -1)}
                    aria-label={`Decrease quantity of ${kit.name}`}
                    className="min-h-[44px] min-w-[40px] flex items-center justify-center text-[#0D9488] dark:text-teal-300 hover:bg-teal-100/70 dark:hover:bg-teal-900/50 transition-colors focus-visible:outline-2 focus-visible:outline-[#0D9488]"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </motion.button>
                  <span className="w-7 text-center text-sm font-mono font-bold text-[#0F172A] dark:text-white tabular-nums">
                    {quantity}
                  </span>
                  <motion.button
                    type="button"
                    whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                    onClick={() => onUpdateQuantity(kit.id, 1)}
                    aria-label={`Increase quantity of ${kit.name}`}
                    className="min-h-[44px] min-w-[40px] flex items-center justify-center text-[#0D9488] dark:text-teal-300 hover:bg-teal-100/70 dark:hover:bg-teal-900/50 transition-colors focus-visible:outline-2 focus-visible:outline-[#0D9488]"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Hostel Gate Address & Verified Phone */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/70 p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Delivering to Hostel Gate
            </div>
            <div className="text-base font-bold text-[#0F172A] dark:text-white leading-snug">
              {profile.hostelName}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {profile.displayName} ·{' '}
              <span className="font-mono font-semibold text-[#0D9488] dark:text-teal-300">
                {profile.phone}
              </span>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            onClick={() => setShowPinAdjuster((prev) => !prev)}
            className="min-h-[44px] px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#0D9488] text-xs font-semibold text-[#0D9488] dark:text-teal-300 flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span>{showPinAdjuster ? 'Hide Map' : 'Adjust Pin'}</span>
          </motion.button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={roomInputId}
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Room / Wing Number
            </label>
            <input
              id={roomInputId}
              type="text"
              value={roomNumber}
              onChange={(e) => onRoomNumberChange(e.target.value)}
              placeholder="e.g., B-204"
              className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-base text-[#0F172A] dark:text-slate-100 focus:border-[#0D9488] dark:focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={instructionsInputId}
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Gate Note (Optional)
              </label>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {specialInstructions.length}/240
              </span>
            </div>
            <div className="relative">
              <input
                id={instructionsInputId}
                type="text"
                maxLength={240}
                value={specialInstructions}
                onChange={(e) => onSpecialInstructionsChange(e.target.value.slice(0, 240))}
                placeholder="Call on arrival / guard desk"
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 pl-3.5 pr-12 text-sm text-[#0F172A] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#0D9488] dark:focus:border-teal-400 focus:outline-none"
              />
              <button
                type="button"
                disabled={submitting || specialInstructions.length >= 240}
                onClick={toggleDictation}
                aria-pressed={isListening}
                aria-label={
                  isListening
                    ? 'Stop voice dictation'
                    : 'Dictate delivery note using microphone'
                }
                title={
                  !isDictationSupported
                    ? 'Voice dictation unavailable in this browser'
                    : isListening
                    ? 'Stop dictating'
                    : 'Dictate delivery note'
                }
                className={`absolute right-1 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center transition-colors ${
                  isListening
                    ? 'bg-rose-600 text-white'
                    : isMicRequesting
                    ? 'bg-amber-100 text-amber-800'
                    : 'text-[#0D9488] dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-700'
                }`}
              >
                {isMicRequesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {(isMicRequesting || isListening) && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 px-3 py-2 flex items-center justify-between gap-2 text-xs text-teal-900 dark:text-teal-200"
          >
            <div className="min-w-0 flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
              <span className="truncate">
                {isMicRequesting
                  ? 'Requesting microphone access...'
                  : interimTranscript
                  ? `Hearing: "${interimTranscript}"`
                  : 'Listening — speak your gate delivery note...'}
              </span>
            </div>
            {isListening && (
              <button
                type="button"
                onClick={stopDictation}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 text-xs font-semibold text-teal-800 dark:text-teal-200 shrink-0"
              >
                Stop
              </button>
            )}
          </div>
        )}

        {dictationError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 flex items-start justify-between gap-2 text-xs text-rose-800 dark:text-rose-200"
          >
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{dictationError}</span>
            </div>
            <button
              type="button"
              onClick={clearDictationError}
              aria-label="Dismiss microphone notice"
              className="text-rose-600 hover:text-rose-900 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showPinAdjuster && (
          <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <HostelPinPickerMap
              pin={orderPin}
              onChangePin={onChangeOrderPin}
              heightClass="h-[210px]"
              isDarkMode={isDarkMode}
            />
          </div>
        )}
      </div>

      {/* 3. Semester Wellness Pass */}
      {profile.wellnessPassActive ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200 font-medium">
          Semester Wellness Pass active — ₹0 delivery fee applied.
        </div>
      ) : (
        <motion.button
          type="button"
          whileTap={reduceMotion ? undefined : { scale: 0.99 }}
          onClick={onToggleWellnessPass}
          aria-pressed={wellnessPassAdded}
          className={`w-full min-h-[56px] rounded-2xl border p-4 text-left transition-colors flex items-start justify-between gap-3 focus-visible:outline-2 focus-visible:outline-[#0D9488] ${
            wellnessPassAdded
              ? 'border-[#0D9488] bg-teal-50/60 dark:bg-teal-950/40'
              : 'border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="space-y-0.5">
            <div className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-slate-100">
              Add Semester Wellness Pass — ₹129
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Get ₹0 delivery fee on this and all night orders this semester (saves ₹60 right now).
            </p>
          </div>
          <div
            className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
              wellnessPassAdded
                ? 'bg-[#0D9488] border-[#0D9488] text-white'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent'
            }`}
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
          </div>
        </motion.button>
      )}

      {/* 4. Bill & Delivery Fee Breakdown */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5 text-sm sm:text-base">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span>Items Subtotal</span>
          <span className="font-mono tabular-nums text-[#0F172A] dark:text-slate-100">
            ₹{subtotal}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span>Night Gate Delivery Fee</span>
          {(profile.wellnessPassActive || wellnessPassAdded) && cart.length > 0 ? (
            <span className="font-mono tabular-nums text-[#0D9488] dark:text-teal-400 font-bold">
              <span className="line-through text-slate-400 mr-1.5 font-normal">
                ₹{DELIVERY_FEE}
              </span>
              ₹0
            </span>
          ) : (
            <span className="font-mono tabular-nums text-[#0F172A] dark:text-slate-100">
              ₹{deliveryFee}
            </span>
          )}
        </div>
        {passCost > 0 && (
          <div className="flex items-center justify-between text-[#0D9488] dark:text-teal-400">
            <span>Semester Wellness Pass</span>
            <span className="font-mono tabular-nums font-semibold">₹{passCost}</span>
          </div>
        )}
        <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between font-bold text-[#0F172A] dark:text-white text-base sm:text-lg">
          <span>To Pay</span>
          <span className="font-mono tabular-nums text-xl">₹{totalPayable}</span>
        </div>
      </div>

      {/* 5. UPI Selection */}
      <div className="space-y-2">
        <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
          Choose Instant UPI App
        </span>
        <div className="grid grid-cols-3 gap-2.5">
          {UPI_OPTIONS.map((option) => {
            const selected = upiProvider === option.id;
            return (
              <motion.button
                key={option.id}
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                onClick={() => onSelectUpi(option.id)}
                className={`min-h-[52px] rounded-xl border px-3 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-[#0D9488] ${
                  selected
                    ? 'border-[#0D9488] bg-teal-50/70 dark:bg-teal-950/50 text-[#0D9488] dark:text-teal-200'
                    : 'border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-bold leading-tight whitespace-nowrap">
                  {option.label}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {option.sub}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {formError && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm font-medium text-rose-800 dark:text-rose-200">
          {formError}
        </div>
      )}

      {/* 6. Primary Pay & Dispatch Button */}
      <motion.button
        type="button"
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        disabled={cart.length === 0 || submitting}
        onClick={onConfirmOrder}
        className="w-full min-h-[54px] rounded-2xl bg-[#0D9488] hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold text-base px-5 py-3.5 flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
      >
        <MessageCircle className="w-5 h-5 shrink-0" />
        <span className="whitespace-nowrap">
          {submitting
            ? 'Dispatching to 24/7 Pharmacy...'
            : `Pay ₹${totalPayable} via ${upiProvider} & Dispatch`}
        </span>
      </motion.button>

      {/* Quiet OTC Safety Note */}
      <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
        <ShieldCheck className="w-4 h-4 text-[#0D9488] dark:text-teal-400 shrink-0 mt-0.5" />
        <p>
          Verified sealed OTC essentials from licensed 24/7 partner pharmacies. No prescription-only drugs.
        </p>
      </div>
    </div>
  );
}
