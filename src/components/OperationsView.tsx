import { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  CheckCircle2,
  Clock,
  IndianRupee,
  KeyRound,
  MapPin,
  PackageCheck,
  TrendingUp,
  Truck,
} from 'lucide-react';
import {
  BASELINE_PILOT_COMPLETED,
  BREAK_EVEN_ORDERS,
  CONTRIBUTION_MARGIN,
  DELIVERY_FEE,
  PHARMACY_ORIGIN,
  RUNNER_PAYOUT,
} from '../data/campusData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CampusOrder } from '../types';

interface OperationsViewProps {
  orders: CampusOrder[];
  isCampusAdmin: boolean;
  onSelectOrderForTracker: (orderId: string) => void;
}

const STATUS_LABELS: Record<CampusOrder['status'], { text: string; tone: string }> = {
  queued: { text: 'Pending Accept', tone: 'text-amber-700' },
  picked_up: { text: 'Picked Up', tone: 'text-teal-700' },
  gate_cleared: { text: 'Main Gate Cleared', tone: 'text-teal-700' },
  arrived: { text: 'At Hostel Gate', tone: 'text-slate-900' },
  delivered: { text: 'Completed', tone: 'text-slate-500' },
};

export function OperationsView({
  orders,
  isCampusAdmin,
  onSelectOrderForTracker,
}: OperationsViewProps) {
  const [pinModalOrder, setPinModalOrder] = useState<CampusOrder | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const totalPilotCompleted = BASELINE_PILOT_COMPLETED + deliveredCount;
  const breakEvenPct = Math.min(
    100,
    Math.round((totalPilotCompleted / BREAK_EVEN_ORDERS) * 1000) / 10
  );
  const remainingToBreakEven = Math.max(0, BREAK_EVEN_ORDERS - totalPilotCompleted);

  const sessionRevenue = orders.reduce((sum, o) => sum + o.totalPayable, 0);
  const pilotContribution = totalPilotCompleted * CONTRIBUTION_MARGIN;

  const updateOrderStatus = async (
    order: CampusOrder,
    nextStatus: CampusOrder['status'],
    nextStep: 1 | 2 | 3 | 4,
    progressFactor: number
  ) => {
    setUpdatingId(order.id);
    const orderPath = `orders/${order.id}`;
    const runnerLat =
      PHARMACY_ORIGIN.lat + (order.gateLat - PHARMACY_ORIGIN.lat) * progressFactor;
    const runnerLng =
      PHARMACY_ORIGIN.lng + (order.gateLng - PHARMACY_ORIGIN.lng) * progressFactor;

    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: nextStatus,
        trackerStep: nextStep,
        runnerLat: Number(runnerLat.toFixed(6)),
        runnerLng: Number(runnerLng.toFixed(6)),
        deliveryMinutes: nextStatus === 'delivered' ? 16 : order.deliveryMinutes,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, orderPath);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleVerifyPinAndComplete = async () => {
    if (!pinModalOrder) return;
    if (pinInput.trim() !== pinModalOrder.handoverPin) {
      setPinError(`Incorrect Handover PIN. Expected ${pinModalOrder.handoverPin} for demo verification.`);
      return;
    }
    setPinError(null);
    await updateOrderStatus(pinModalOrder, 'delivered', 4, 1);
    setPinModalOrder(null);
    setPinInput('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Firestore Real-Time Dispatch Console</span>
            <span aria-hidden="true">·</span>
            <span>{isCampusAdmin ? 'Campus Admin Scope (All Orders)' : 'Student Demo Scope (Your Orders)'}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            Runner &amp; Admin Dispatch Console
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Incoming Orders Queue */}
        <section className="lg:col-span-7 space-y-3" aria-label="Firestore orders dispatch queue">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Incoming Night Orders ({orders.length})
            </h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {orders.filter((o) => o.status !== 'delivered').length} active
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
              No Firestore orders found yet. Place an emergency order in Tab 1 to test live dispatch &amp; PIN verification.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const statusInfo = STATUS_LABELS[order.status];
                const isBusy = updatingId === order.id;

                return (
                  <article
                    key={order.id}
                    className={`rounded-2xl border p-4 transition-colors ${
                      order.status === 'delivered'
                        ? 'border-slate-200 bg-slate-50/70'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-slate-900">#{order.id}</span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-semibold ${statusInfo.tone}`}>
                            {statusInfo.text}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-slate-600">{order.studentPhone}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">
                          {order.studentName} · {order.hostelName} (Room {order.roomNumber})
                        </h3>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                          ₹{order.totalPayable}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                          PIN {order.handoverPin}
                        </div>
                      </div>
                    </div>

                    <div className="py-2.5 space-y-1 text-xs text-slate-600">
                      <div>
                        {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 text-slate-500 font-mono text-[11px]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-teal-600" />
                          {order.gateLat.toFixed(4)}, {order.gateLng.toFixed(4)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Runner: {order.runnerName}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectOrderForTracker(order.id)}
                        className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap"
                      >
                        View Live Map
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        {order.status === 'queued' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void updateOrderStatus(order, 'picked_up', 2, 0.25)}
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Accept Order</span>
                          </button>
                        )}

                        {order.status === 'picked_up' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void updateOrderStatus(order, 'gate_cleared', 3, 0.65)}
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold whitespace-nowrap"
                          >
                            Picked Up → Main Gate Cleared
                          </button>
                        )}

                        {order.status === 'gate_cleared' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void updateOrderStatus(order, 'arrived', 4, 1)}
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold whitespace-nowrap"
                          >
                            Mark At Hostel Gate
                          </button>
                        )}

                        {order.status !== 'delivered' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setPinModalOrder(order);
                              setPinInput('');
                              setPinError(null);
                            }}
                            className="min-h-[44px] px-4 py-2 rounded-xl border border-teal-600 text-teal-700 hover:bg-teal-50 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Verify PIN &amp; Complete</span>
                          </button>
                        )}

                        {order.status === 'delivered' && (
                          <span className="min-h-[44px] px-3 flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                            <CheckCircle2 className="w-4 h-4" />
                            Verified &amp; Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Unit Economics Summary Widget */}
        <section className="lg:col-span-5 space-y-4" aria-label="Live Unit Economics">
          <div className="rounded-2xl bg-slate-900 text-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-teal-300">
                  172-Order Break-Even Target
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-mono font-bold tabular-nums">
                    {totalPilotCompleted}
                  </span>
                  <span className="text-sm font-mono text-slate-400 tabular-nums">
                    / {BREAK_EVEN_ORDERS} orders
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-teal-400 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${breakEvenPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300 font-mono tabular-nums">
                <span>{breakEvenPct}% achieved</span>
                <span>{remainingToBreakEven} orders left</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  Session Revenue
                </div>
                <div className="text-lg font-mono font-bold tabular-nums mt-0.5">
                  ₹{sessionRevenue.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-teal-400" />
                  Net Margin / Order
                </div>
                <div className="text-lg font-mono font-bold tabular-nums mt-0.5">
                  ₹{CONTRIBUTION_MARGIN}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
            <h2 className="font-bold text-slate-900">Unit Economics Breakdown</h2>
            <div className="divide-y divide-slate-100">
              <div className="py-2 flex justify-between">
                <span className="text-slate-600">Curfew Express Delivery Fee</span>
                <span className="font-mono font-semibold tabular-nums">+₹{DELIVERY_FEE}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-600">Runner Payout</span>
                <span className="font-mono font-semibold text-rose-700 tabular-nums">
                  −₹{RUNNER_PAYOUT}
                </span>
              </div>
              <div className="py-2 flex justify-between font-bold text-slate-900">
                <span>Contribution Margin / Order</span>
                <span className="font-mono text-teal-700 tabular-nums">
                  ₹{CONTRIBUTION_MARGIN}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex justify-between">
              <span>Pilot Contribution Earned</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                ₹{pilotContribution.toLocaleString('en-IN')} / ₹6,020
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Verify 4-Digit Handover PIN Modal */}
      {pinModalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Verify Student Handover PIN"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <PackageCheck className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-bold text-slate-900">
                Verify Handover PIN (#{pinModalOrder.id})
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Ask <strong>{pinModalOrder.studentName}</strong> for their 4-digit gate handover PIN (Demo PIN:{' '}
              <span className="font-mono font-bold">{pinModalOrder.handoverPin}</span>).
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter 4-digit PIN"
              className="w-full min-h-[48px] rounded-xl border border-slate-200 px-3 text-center font-mono text-lg font-bold tracking-widest text-slate-900 focus:border-teal-600 focus:outline-none"
            />
            {pinError && (
              <p className="text-xs text-rose-700 font-medium">{pinError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPinModalOrder(null)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleVerifyPinAndComplete()}
                className="flex-1 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
              >
                Complete Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
