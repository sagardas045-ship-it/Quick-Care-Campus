import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  MapPin,
  PackageCheck,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import { CampusOrder, OrderStatus } from '../types';

export interface OrderStatusNotification {
  id: string;
  orderId?: string;
  status: OrderStatus;
  stageLabel: string;
  title: string;
  message: string;
  timestampLabel: string;
}

export function buildOrderStatusCopy(order: CampusOrder): {
  stageLabel: string;
  title: string;
  message: string;
} {
  switch (order.status) {
    case 'queued':
      return {
        stageLabel: 'Runner Assigned',
        title: `Runner Assigned · #${order.id}`,
        message: `${order.runnerName} assigned at 24/7 Premnagar Pharmacy. Packing your sealed OTC kit.`,
      };
    case 'picked_up':
      return {
        stageLabel: 'Picked Up',
        title: `Picked Up · #${order.id}`,
        message: `${order.runnerName} picked up your sealed bag from the pharmacy.`,
      };
    case 'gate_cleared':
      return {
        stageLabel: 'Out for Delivery',
        title: `Out for Delivery · #${order.id}`,
        message: `Campus gate cleared! ${order.runnerName} is heading to ${order.hostelName}.`,
      };
    case 'arrived':
      return {
        stageLabel: 'At Hostel Gate',
        title: `Arrived at Gate · #${order.id}`,
        message: `${order.runnerName} is at ${order.hostelName}. Share PIN ${order.handoverPin} to collect.`,
      };
    case 'delivered':
      return {
        stageLabel: 'Delivered',
        title: `Order Delivered · #${order.id}`,
        message: `Handover complete! Tap to rate your delivery with ${order.runnerName}.`,
      };
  }
}

function getStatusAccent(status: OrderStatus) {
  switch (status) {
    case 'queued':
      return {
        iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70',
        labelText: 'text-amber-700 dark:text-amber-300',
        Icon: UserCheck,
      };
    case 'picked_up':
      return {
        iconBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/70',
        labelText: 'text-teal-700 dark:text-teal-300',
        Icon: PackageCheck,
      };
    case 'gate_cleared':
      return {
        iconBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/70',
        labelText: 'text-teal-700 dark:text-teal-300',
        Icon: Truck,
      };
    case 'arrived':
      return {
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70',
        labelText: 'text-emerald-700 dark:text-emerald-300',
        Icon: MapPin,
      };
    case 'delivered':
      return {
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70',
        labelText: 'text-emerald-700 dark:text-emerald-300',
        Icon: CheckCircle2,
      };
  }
}

interface OrderStatusToastStackProps {
  toasts: OrderStatusNotification[];
  onDismiss: (id: string) => void;
  onTrackOrder: (orderId: string) => void;
}

export function OrderStatusToastStack({
  toasts,
  onDismiss,
  onTrackOrder,
}: OrderStatusToastStackProps) {
  const reduceMotion = useReducedMotion();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Order status notifications"
      className="fixed top-16 right-3 sm:right-5 left-3 sm:left-auto z-50 flex flex-col gap-2.5 sm:w-96 pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const { iconBg, labelText, Icon } = getStatusAccent(toast.status);
          const orderId = toast.orderId;
          return (
            <motion.div
              key={toast.id}
              layout="position"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 32, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              role="status"
              className="pointer-events-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-3.5 shadow-[0_18px_40px_-14px_rgba(15,23,42,0.24)] dark:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.75)] flex items-start gap-3"
            >
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${labelText}`}>
                    <BellRing className="w-3 h-3 shrink-0" />
                    <span>{toast.stageLabel}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                    {toast.timestampLabel}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug truncate">
                  {toast.title}
                </p>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {toast.message}
                </p>

                {orderId && (
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onTrackOrder(orderId);
                        onDismiss(toast.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 whitespace-nowrap"
                    >
                      <span>View Live Tracker</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="min-h-[32px] min-w-[32px] rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
