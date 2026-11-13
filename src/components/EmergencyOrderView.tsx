import { useState } from 'react';
import {
  ArrowRight,
  Minus,
  Plus,
  ShieldAlert,
  ShoppingBag,
  X,
} from 'lucide-react';
import {
  DELIVERY_FEE,
  SYMPTOM_FILTERS,
  WELLNESS_PASS_PRICE,
} from '../data/campusData';
import {
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
  wellnessPassAdded: boolean;
  onToggleWellnessPass: () => void;
  upiProvider: UpiProvider;
  onSelectUpi: (provider: UpiProvider) => void;
  onConfirmOrder: () => Promise<boolean>;
  submitting: boolean;
  formError: string | null;
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
  wellnessPassAdded,
  onToggleWellnessPass,
  upiProvider,
  onSelectUpi,
  onConfirmOrder,
  submitting,
  formError,
}: EmergencyOrderViewProps) {
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomCategory>('All Kits');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const filteredKits =
    selectedSymptom === 'All Kits'
      ? kits
      : kits.filter((kit) => kit.category === selectedSymptom);

  const getCartQty = (kitId: string) =>
    cart.find((item) => item.kit.id === kitId)?.quantity ?? 0;

  const subtotal = cart.reduce((sum, item) => sum + item.kit.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryFee =
    cart.length === 0 ? 0 : profile.wellnessPassActive || wellnessPassAdded ? 0 : DELIVERY_FEE;
  const passCost = !profile.wellnessPassActive && wellnessPassAdded ? WELLNESS_PASS_PRICE : 0;
  const totalPayable = subtotal + deliveryFee + passCost;

  const handleMobileConfirm = async () => {
    const ok = await onConfirmOrder();
    if (ok) {
      setMobileDrawerOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      <section aria-label="Symptom filters">
        <div className="flex items-center justify-between mb-2.5">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Emergency OTC Relief Kits
          </h1>
          <span className="text-xs font-medium text-slate-500 tabular-nums whitespace-nowrap">
            {filteredKits.length} of {kits.length} kits
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {SYMPTOM_FILTERS.map((category) => {
            const active = selectedSymptom === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedSymptom(category)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-600 hover:text-teal-700'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          {filteredKits.map((kit) => {
            const qty = getCartQty(kit.id);
            return (
              <article
                key={kit.id}
                className={`rounded-2xl border overflow-hidden transition-colors ${
                  kit.inStock
                    ? 'border-slate-200 bg-white hover:border-slate-300'
                    : 'border-slate-200 bg-slate-50/70 opacity-80'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-12">
                  <div className="sm:col-span-4 aspect-[4/3] sm:aspect-auto sm:h-full bg-slate-100">
                    <KitImage src={kit.imagePath} alt={kit.name} code={kit.sealedCode} />
                  </div>

                  <div className="sm:col-span-8 p-4 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span className="font-medium text-teal-700">{kit.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{kit.etaMinutes} min gate ETA</span>
                        <span aria-hidden="true">·</span>
                        <span className={kit.inStock ? 'text-teal-700 font-medium' : 'text-rose-700 font-semibold'}>
                          {kit.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-base font-bold text-slate-900 leading-snug">
                          {kit.name}
                        </h2>
                        <span className="text-lg font-bold font-mono tabular-nums text-slate-900 shrink-0">
                          ₹{kit.price}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">{kit.reliefFor}</p>

                      <ul className="pt-1 space-y-1">
                        {kit.contents.map((item) => (
                          <li
                            key={item}
                            className="text-xs text-slate-600 flex items-start gap-1.5"
                          >
                            <span className="text-teal-600 font-bold leading-4" aria-hidden="true">
                              •
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 font-mono">
                        {kit.sealedCode}
                      </span>

                      {!kit.inStock ? (
                        <button
                          type="button"
                          disabled
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-200 text-slate-500 text-xs sm:text-sm font-semibold cursor-not-allowed whitespace-nowrap"
                        >
                          Out of Stock
                        </button>
                      ) : qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            onAddKit(kit);
                            if (window.innerWidth < 1024) {
                              setMobileDrawerOpen(true);
                            }
                          }}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-teal-600"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Kit</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(kit.id, -1)}
                            aria-label={`Remove one ${kit.name}`}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 active:scale-95 transition-transform"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-7 text-center text-sm font-mono font-bold text-slate-900 tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(kit.id, 1)}
                            aria-label={`Add one more ${kit.name}`}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-700 active:scale-95 transition-transform"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          <div className="lg:hidden rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 leading-relaxed">
              <span className="font-semibold">Emergency Protocol:</span> Strictly verified OTC essentials from licensed 24/7 partner pharmacies. No prescription-only drugs.
            </div>
          </div>
        </div>

        <aside className="hidden lg:block lg:col-span-5 sticky top-20 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="pb-3.5 mb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">60-Second Checkout</h2>
              <p className="text-xs text-slate-500">Auto-filled from your campus profile</p>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
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
            wellnessPassAdded={wellnessPassAdded}
            onToggleWellnessPass={onToggleWellnessPass}
            upiProvider={upiProvider}
            onSelectUpi={onSelectUpi}
            onConfirmOrder={() => void onConfirmOrder()}
            submitting={submitting}
            formError={formError}
          />
        </aside>
      </div>

      {totalItems > 0 && !mobileDrawerOpen && (
        <div className="lg:hidden fixed bottom-[72px] left-0 right-0 z-30 px-4">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="w-full max-w-md mx-auto min-h-[52px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 flex items-center justify-between shadow-lg shadow-slate-900/20 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-teal-400" />
              <div className="text-left">
                <div className="text-xs text-slate-300 tabular-nums">
                  {totalItems} {totalItems === 1 ? 'Kit' : 'Kits'} · {profile.hostelName}
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
          </button>
        </div>
      )}

      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Fast Gate Checkout"
        >
          <div className="w-full max-w-lg max-h-[90vh] rounded-t-3xl bg-white flex flex-col overflow-hidden shadow-2xl">
            <div className="pt-2.5 pb-3 px-4 border-b border-slate-100 shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">60-Second Checkout</h2>
                  <p className="text-xs text-slate-500">Auto-filled from your campus profile</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close checkout drawer"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
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
                wellnessPassAdded={wellnessPassAdded}
                onToggleWellnessPass={onToggleWellnessPass}
                upiProvider={upiProvider}
                onSelectUpi={onSelectUpi}
                onConfirmOrder={() => void handleMobileConfirm()}
                submitting={submitting}
                formError={formError}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
