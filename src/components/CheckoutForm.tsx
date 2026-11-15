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
    <div className="space-y-4">
      {/* Cart Items Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Selected Relief Kits ({totalItems})
          </h3>
          {cart.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Est. gate arrival 16 mins
            </span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 p-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tap <span className="font-semibold text-slate-900 dark:text-slate-100">Add Kit</span> on any OTC kit to begin your 60-second emergency checkout.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90">
            {cart.map(({ kit, quantity }) => (
              <div key={kit.id} className="flex items-center justify-between gap-3 p-3">
                <div className="w-16 aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 via-teal-50/50 to-slate-100 dark:from-slate-800 dark:via-teal-950/40 dark:to-slate-900 border border-slate-200/70 dark:border-slate-700/70 shrink-0">
                  <ProductPhoto product={kit} compact={true} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {kit.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                    ₹{kit.price} × {quantity} = ₹{kit.price * quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <motion.button
                    type="button"
                    whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                    onClick={() => onUpdateQuantity(kit.id, -1)}
                    aria-label={`Decrease quantity of ${kit.name}`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600"
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  <span className="w-6 text-center text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {quantity}
                  </span>
                  <motion.button
                    type="button"
                    whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                    onClick={() => onUpdateQuantity(kit.id, 1)}
                    aria-label={`Increase quantity of ${kit.name}`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-filled Verified Student Details & Map Pin */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {profile.displayName} ·{' '}
              <span className="font-mono text-teal-700 dark:text-teal-400">{profile.phone}</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {profile.hostelName}
            </div>
          </div>
          <motion.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
            onClick={() => setShowPinAdjuster((prev) => !prev)}
            className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-600 dark:hover:border-teal-500 text-xs font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-1 shrink-0 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{showPinAdjuster ? 'Hide Pin Map' : 'Adjust Gate Pin'}</span>
          </motion.button>
        </div>

        <div>
          <label
            htmlFor={roomInputId}
            className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
          >
            Hostel Room / Wing
          </label>
          <input
            id={roomInputId}
            type="text"
            value={roomNumber}
            onChange={(e) => onRoomNumberChange(e.target.value)}
            className="w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 dark:focus:border-teal-400 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={instructionsInputId}
              className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400"
            >
              Special Instructions{' '}
              <span className="font-normal text-slate-400 dark:text-slate-500">
                (Optional · Type or dictate)
              </span>
            </label>
            <span className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
              {specialInstructions.length}/240
            </span>
          </div>

          <div className="relative">
            <textarea
              id={instructionsInputId}
              rows={2}
              maxLength={240}
              value={specialInstructions}
              onChange={(e) => onSpecialInstructionsChange(e.target.value.slice(0, 240))}
              placeholder='e.g., "Leave at security gate" or tap the mic to speak'
              className="w-full min-h-[68px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-14 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-600 dark:focus:border-teal-400 focus:outline-none resize-none"
            />
            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              disabled={submitting || specialInstructions.length >= 240}
              onClick={toggleDictation}
              aria-pressed={isListening}
              aria-label={
                isListening
                  ? 'Stop voice dictation'
                  : 'Dictate special delivery instructions using microphone'
              }
              title={
                !isDictationSupported
                  ? 'Voice dictation is not supported in this browser'
                  : isListening
                  ? 'Tap to stop dictating'
                  : 'Tap to dictate instructions'
              }
              className={`absolute right-1.5 bottom-1.5 min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 border-rose-700 text-white shadow-xs'
                  : isMicRequesting
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                  : 'bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300'
              }`}
            >
              {isMicRequesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </motion.button>
          </div>

          {(isMicRequesting || isListening) && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/80 dark:bg-teal-950/40 px-2.5 py-2 flex items-center justify-between gap-2 text-xs text-teal-900 dark:text-teal-200"
            >
              <div className="min-w-0 flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-teal-700 dark:text-teal-300 shrink-0" />
                <span className="truncate">
                  {isMicRequesting
                    ? 'Requesting browser microphone access...'
                    : interimTranscript
                    ? `Hearing: "${interimTranscript}"`
                    : 'Listening — speak your delivery instructions...'}
                </span>
              </div>
              {isListening && (
                <button
                  type="button"
                  onClick={stopDictation}
                  className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 text-[11px] font-semibold text-teal-800 dark:text-teal-200 hover:bg-teal-100/60 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  Stop
                </button>
              )}
            </div>
          )}

          {dictationError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-2 flex items-start justify-between gap-2 text-[11px] text-rose-800 dark:text-rose-200"
            >
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{dictationError}</span>
              </div>
              <button
                type="button"
                onClick={clearDictationError}
                aria-label="Dismiss microphone notice"
                className="text-rose-600 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {showPinAdjuster && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <HostelPinPickerMap
              pin={orderPin}
              onChangePin={onChangeOrderPin}
              heightClass="h-[220px]"
              isDarkMode={isDarkMode}
            />
          </div>
        )}
      </div>

      {/* Semester Wellness Pass Toggle */}
      {profile.wellnessPassActive ? (
        <div className="rounded-xl border border-teal-200 dark:border-teal-800/70 bg-teal-50/70 dark:bg-teal-950/40 p-3 text-xs text-teal-900 dark:text-teal-200 font-medium">
          Semester Wellness Pass Active — ₹0 Curfew Express delivery fee applied.
        </div>
      ) : (
        <motion.button
          type="button"
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          onClick={onToggleWellnessPass}
          aria-pressed={wellnessPassAdded}
          className={`w-full min-h-[52px] rounded-xl border p-3.5 text-left transition-colors flex items-start justify-between gap-3 focus-visible:outline-2 focus-visible:outline-teal-600 ${
            wellnessPassAdded
              ? 'border-teal-600 dark:border-teal-500 bg-teal-50/70 dark:bg-teal-950/40'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Add Semester Wellness Pass — ₹129/sem
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Waives the ₹60 Curfew Express delivery fee on this and all future orders this semester.
            </p>
          </div>
          <div
            className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
              wellnessPassAdded
                ? 'bg-teal-600 border-teal-600 text-white'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent'
            }`}
          >
            <Check className="w-4 h-4" />
          </div>
        </motion.button>
      )}

      {/* Transparent Pricing Breakdown */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 space-y-2 text-sm">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span>Item Subtotal</span>
          <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">₹{subtotal}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span>Curfew Express Delivery Fee</span>
          {(profile.wellnessPassActive || wellnessPassAdded) && cart.length > 0 ? (
            <span className="font-mono tabular-nums text-teal-700 dark:text-teal-400 font-semibold">
              <span className="line-through text-slate-400 dark:text-slate-500 mr-1.5 font-normal">
                ₹{DELIVERY_FEE}
              </span>
              ₹0
            </span>
          ) : (
            <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
              ₹{deliveryFee}
            </span>
          )}
        </div>
        {passCost > 0 && (
          <div className="flex items-center justify-between text-teal-700 dark:text-teal-400">
            <span>Semester Wellness Pass</span>
            <span className="font-mono tabular-nums font-medium">₹{passCost}</span>
          </div>
        )}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold text-slate-900 dark:text-white text-base">
          <span>Total Payable</span>
          <span className="font-mono tabular-nums text-lg">₹{totalPayable}</span>
        </div>
      </div>

      {/* One-Tap UPI Simulation */}
      <div className="space-y-2">
        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          One-Tap UPI Payment
        </span>
        <div className="grid grid-cols-3 gap-2">
          {UPI_OPTIONS.map((option) => {
            const selected = upiProvider === option.id;
            return (
              <motion.button
                key={option.id}
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                onClick={() => onSelectUpi(option.id)}
                className={`min-h-[48px] rounded-2xl border px-2 py-2 text-center transition-all focus-visible:outline-2 focus-visible:outline-teal-600 ${
                  selected
                    ? 'border-teal-600 dark:border-teal-500 border-b-[3px] border-b-teal-700 bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <div className="text-sm font-bold leading-tight whitespace-nowrap">{option.label}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {option.sub}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {formError && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:text-rose-200">
          {formError}
        </div>
      )}

      {/* Primary Tactile 3D Dispatch CTA */}
      <motion.button
        type="button"
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        disabled={cart.length === 0 || submitting}
        onClick={onConfirmOrder}
        className="w-full min-h-[54px] rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:border-slate-400 dark:disabled:border-slate-700 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-3 flex items-center justify-center gap-2 border-b-[4px] border-teal-800 active:border-b-0 active:translate-y-[3px] shadow-[0_10px_20px_-8px_rgba(13,148,136,0.5)] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">
          {submitting
            ? 'Dispatching to 24/7 Pharmacy...'
            : `Pay ₹${totalPayable} via ${upiProvider} & Dispatch`}
        </span>
      </motion.button>

      {/* Safety Disclaimer */}
      <div className="flex items-start gap-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/70 p-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
        <p>
          Strictly verified OTC essentials from licensed 24/7 partner pharmacies. No prescription-only drugs.
        </p>
      </div>
    </div>
  );
}
