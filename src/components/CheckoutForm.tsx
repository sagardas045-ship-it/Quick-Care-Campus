import { useState } from 'react';
import {
  Check,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
} from 'lucide-react';
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

interface CheckoutFormProps {
  profile: StudentProfile;
  cart: CartItem[];
  onUpdateQuantity: (kitId: string, delta: number) => void;
  orderPin: LatLngLiteral;
  onChangeOrderPin: (coords: LatLngLiteral) => void;
  roomNumber: string;
  onRoomNumberChange: (room: string) => void;
  wellnessPassAdded: boolean;
  onToggleWellnessPass: () => void;
  upiProvider: UpiProvider;
  onSelectUpi: (provider: UpiProvider) => void;
  onConfirmOrder: () => void;
  submitting: boolean;
  formError: string | null;
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
  wellnessPassAdded,
  onToggleWellnessPass,
  upiProvider,
  onSelectUpi,
  onConfirmOrder,
  submitting,
  formError,
}: CheckoutFormProps) {
  const [showPinAdjuster, setShowPinAdjuster] = useState(false);

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
          <h3 className="text-sm font-semibold text-slate-900">
            Selected Relief Kits ({totalItems})
          </h3>
          {cart.length > 0 && (
            <span className="text-xs text-slate-500 tabular-nums">
              Est. gate arrival 16 mins
            </span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-600">
              Tap <span className="font-semibold text-slate-900">Add Kit</span> on any OTC kit to begin your 60-second emergency checkout.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {cart.map(({ kit, quantity }) => (
              <div key={kit.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{kit.name}</p>
                  <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                    ₹{kit.price} × {quantity} = ₹{kit.price * quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(kit.id, -1)}
                    aria-label={`Decrease quantity of ${kit.name}`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform focus-visible:outline-2 focus-visible:outline-teal-600"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-mono font-semibold text-slate-900 tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(kit.id, 1)}
                    aria-label={`Increase quantity of ${kit.name}`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform focus-visible:outline-2 focus-visible:outline-teal-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-filled Verified Student Details & Map Pin */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-900">
              {profile.displayName} · <span className="font-mono text-teal-700">{profile.phone}</span>
            </div>
            <div className="text-xs text-slate-600">
              {profile.hostelName}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPinAdjuster((prev) => !prev)}
            className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:border-teal-600 text-xs font-semibold text-teal-700 flex items-center gap-1 shrink-0"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{showPinAdjuster ? 'Hide Pin Map' : 'Adjust Gate Pin'}</span>
          </button>
        </div>

        <div>
          <label htmlFor="checkout-room" className="block text-[11px] font-semibold text-slate-600 mb-1">
            Hostel Room / Wing
          </label>
          <input
            id="checkout-room"
            type="text"
            value={roomNumber}
            onChange={(e) => onRoomNumberChange(e.target.value)}
            className="w-full min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>

        {showPinAdjuster && (
          <div className="pt-2 border-t border-slate-200">
            <HostelPinPickerMap
              pin={orderPin}
              onChangePin={onChangeOrderPin}
              heightClass="h-[220px]"
            />
          </div>
        )}
      </div>

      {/* Semester Wellness Pass Toggle */}
      {profile.wellnessPassActive ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-900 font-medium">
          Semester Wellness Pass Active — ₹0 Curfew Express delivery fee applied.
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggleWellnessPass}
          aria-pressed={wellnessPassAdded}
          className={`w-full min-h-[52px] rounded-xl border p-3.5 text-left transition-colors flex items-start justify-between gap-3 focus-visible:outline-2 focus-visible:outline-teal-600 ${
            wellnessPassAdded
              ? 'border-teal-600 bg-teal-50/70'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-slate-900">
              Add Semester Wellness Pass — ₹129/sem
            </div>
            <p className="text-xs text-slate-600">
              Waives the ₹60 Curfew Express delivery fee on this and all future orders this semester.
            </p>
          </div>
          <div
            className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
              wellnessPassAdded
                ? 'bg-teal-600 border-teal-600 text-white'
                : 'bg-white border-slate-300 text-transparent'
            }`}
          >
            <Check className="w-4 h-4" />
          </div>
        </button>
      )}

      {/* Transparent Pricing Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2 text-sm">
        <div className="flex items-center justify-between text-slate-600">
          <span>Item Subtotal</span>
          <span className="font-mono tabular-nums text-slate-900">₹{subtotal}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Curfew Express Delivery Fee</span>
          {(profile.wellnessPassActive || wellnessPassAdded) && cart.length > 0 ? (
            <span className="font-mono tabular-nums text-teal-700 font-semibold">
              <span className="line-through text-slate-400 mr-1.5 font-normal">₹{DELIVERY_FEE}</span>
              ₹0
            </span>
          ) : (
            <span className="font-mono tabular-nums text-slate-900">₹{deliveryFee}</span>
          )}
        </div>
        {passCost > 0 && (
          <div className="flex items-center justify-between text-teal-700">
            <span>Semester Wellness Pass</span>
            <span className="font-mono tabular-nums font-medium">₹{passCost}</span>
          </div>
        )}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900 text-base">
          <span>Total Payable</span>
          <span className="font-mono tabular-nums text-lg">₹{totalPayable}</span>
        </div>
      </div>

      {/* One-Tap UPI Simulation */}
      <div className="space-y-2">
        <span className="block text-xs font-semibold text-slate-700">
          One-Tap UPI Payment
        </span>
        <div className="grid grid-cols-3 gap-2">
          {UPI_OPTIONS.map((option) => {
            const selected = upiProvider === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectUpi(option.id)}
                className={`min-h-[48px] rounded-xl border px-2 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
                  selected
                    ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-bold leading-tight whitespace-nowrap">{option.label}</div>
                <div className="text-[11px] text-slate-500 whitespace-nowrap">{option.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {formError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
          {formError}
        </div>
      )}

      {/* Primary Dispatch CTA */}
      <button
        type="button"
        disabled={cart.length === 0 || submitting}
        onClick={onConfirmOrder}
        className="w-full min-h-[52px] rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-3 flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">
          {submitting
            ? 'Dispatching to 24/7 Pharmacy...'
            : `Pay ₹${totalPayable} via ${upiProvider} & Dispatch`}
        </span>
      </button>

      {/* Safety Disclaimer */}
      <div className="flex items-start gap-2.5 rounded-xl bg-slate-100/80 p-3 text-xs text-slate-600 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <p>
          Strictly verified OTC essentials from licensed 24/7 partner pharmacies. No prescription-only drugs.
        </p>
      </div>
    </div>
  );
}
