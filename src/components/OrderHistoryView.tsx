import { useMemo, useState } from 'react';
import { AnimatePresence, motion, type Variants, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cross,
  ExternalLink,
  FileDown,
  Link2,
  MapPin,
  MessageCircle,
  PackageCheck,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Star,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { CampusOrder, OrderFeedback, OrderStatus, ReliefKit } from '../types';
import { buildSharedTrackerUrl } from '../utils/sharedTracker';

type OrderStatusFilter = 'active' | 'delivered' | 'cancelled';

interface OrderHistoryViewProps {
  orders: CampusOrder[];
  feedbackList: OrderFeedback[];
  kits: ReliefKit[];
  onReorderKits: (order: CampusOrder) => void;
  onOpenInTracker: (orderId: string) => void;
  onGoToOrder: () => void;
  onPublishShareTracker?: (order: CampusOrder) => Promise<void>;
  onPreviewSharedLink?: (orderId: string) => void;
  onCancelOrder?: (order: CampusOrder) => Promise<void>;
}

const ACTIVE_STATUS_BADGE: Record<OrderStatus, { label: string; style: string }> = {
  queued: {
    label: 'Runner Assigned',
    style:
      'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-300',
  },
  picked_up: {
    label: 'Picked Up',
    style:
      'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800/70 text-teal-800 dark:text-teal-300',
  },
  gate_cleared: {
    label: 'Out for Delivery',
    style:
      'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800/70 text-teal-800 dark:text-teal-300',
  },
  arrived: {
    label: 'At Hostel Gate',
    style:
      'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300',
  },
  delivered: {
    label: 'Delivered',
    style:
      'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300',
  },
  cancelled: {
    label: 'Cancelled',
    style:
      'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300',
  },
};

const ORDER_LIST_VARIANTS: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

const ORDER_CARD_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.985,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.34,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

function formatOrderDate(order: CampusOrder): string {
  const timestamp = order.updatedAt ?? order.createdAt;
  if (timestamp && typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      if (order.status === 'cancelled') return 'Cancelled Order';
      return order.status === 'delivered' ? 'Completed Delivery' : 'Active Delivery';
    }
  }
  if (order.status === 'cancelled') return 'Cancelled Campus Order';
  return order.status === 'delivered' ? 'Completed Campus Delivery' : 'Live Campus Delivery';
}

function getOrderSearchDateText(order: CampusOrder): string {
  const formatted = formatOrderDate(order).toLowerCase();
  const timestamp = order.updatedAt ?? order.createdAt;
  if (timestamp && typeof timestamp.toDate === 'function') {
    try {
      const date = timestamp.toDate();
      const isoDate = date.toISOString().slice(0, 10);
      const longMonth = date
        .toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        .toLowerCase();
      const slashDate = date.toLocaleDateString('en-IN').toLowerCase();
      return `${formatted} ${isoDate} ${longMonth} ${slashDate}`;
    } catch {
      return formatted;
    }
  }
  return formatted;
}

function matchesOrderSearch(order: CampusOrder, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const normalizedIdQuery = q.startsWith('#') ? q.slice(1) : q;
  const matchesId =
    order.id.toLowerCase().includes(q) ||
    (normalizedIdQuery.length > 0 && order.id.toLowerCase().includes(normalizedIdQuery));
  const matchesItem = order.items.some((item) => item.name.toLowerCase().includes(q));
  const matchesDate = getOrderSearchDateText(order).includes(q);
  const matchesHostel = order.hostelName.toLowerCase().includes(q);
  const matchesRunner = order.runnerName.toLowerCase().includes(q);
  return matchesId || matchesItem || matchesDate || matchesHostel || matchesRunner;
}

export function OrderHistoryView({
  orders,
  feedbackList,
  kits,
  onReorderKits,
  onOpenInTracker,
  onGoToOrder,
  onPublishShareTracker,
  onPreviewSharedLink,
  onCancelOrder,
}: OrderHistoryViewProps) {
  const reduceMotion = useReducedMotion();
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>(() => {
    if (orders.some((o) => o.status !== 'delivered' && o.status !== 'cancelled')) {
      return 'active';
    }
    if (orders.some((o) => o.status === 'delivered')) {
      return 'delivered';
    }
    if (orders.some((o) => o.status === 'cancelled')) {
      return 'cancelled';
    }
    return 'delivered';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [shareOrder, setShareOrder] = useState<CampusOrder | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<CampusOrder | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [publishingShare, setPublishingShare] = useState(false);
  const [confirmCancelOrderId, setConfirmCancelOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled'),
    [orders]
  );

  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === 'delivered'),
    [orders]
  );

  const cancelledOrders = useMemo(
    () => orders.filter((order) => order.status === 'cancelled'),
    [orders]
  );

  const feedbackByOrderId = useMemo(() => {
    const map = new globalThis.Map<string, OrderFeedback>();
    feedbackList.forEach((entry) => {
      map.set(entry.orderId, entry);
    });
    return map;
  }, [feedbackList]);

  const kitsById = useMemo(() => {
    const map = new globalThis.Map<string, ReliefKit>();
    kits.forEach((kit) => {
      map.set(kit.id, kit);
    });
    return map;
  }, [kits]);

  const currentTabOrders = useMemo(() => {
    if (statusFilter === 'active') return activeOrders;
    if (statusFilter === 'cancelled') return cancelledOrders;
    return completedOrders;
  }, [activeOrders, cancelledOrders, completedOrders, statusFilter]);

  const filteredOrders = useMemo(
    () => currentTabOrders.filter((order) => matchesOrderSearch(order, searchQuery)),
    [currentTabOrders, searchQuery]
  );

  const summaryStats = useMemo(() => {
    const totalPaid = completedOrders.reduce((sum, order) => sum + order.totalPayable, 0);
    const totalItems = completedOrders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    return {
      count: completedOrders.length,
      totalPaid,
      totalItems,
    };
  }, [completedOrders]);

  const copyToClipboard = async (text: string, orderId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedOrderId(orderId);
      window.setTimeout(() => {
        setCopiedOrderId((prev) => (prev === orderId ? null : prev));
      }, 2200);
    } catch {
      // Fallback: ignore if clipboard API unavailable
    }
  };

  const handleOpenShareModal = async (order: CampusOrder) => {
    setShareOrder(order);
    setCopiedOrderId(null);
    if (onPublishShareTracker) {
      setPublishingShare(true);
      try {
        await onPublishShareTracker(order);
      } finally {
        setPublishingShare(false);
      }
    }
    const deepLink = buildSharedTrackerUrl(order.id);
    await copyToClipboard(deepLink, order.id);
  };

  const handleNativeShare = async (order: CampusOrder, url: string) => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Quick Care Campus Live Tracker #${order.id}`,
          text: `Track my emergency OTC delivery to ${order.hostelName} live:`,
          url,
        });
      } catch {
        // User dismissed share sheet
      }
    } else {
      await copyToClipboard(url, order.id);
    }
  };

  const shareUrl = shareOrder ? buildSharedTrackerUrl(shareOrder.id) : '';
  const whatsappShareUrl = shareOrder
    ? `https://wa.me/?text=${encodeURIComponent(
        `Track my Quick Care Campus order (#${shareOrder.id}) to ${shareOrder.hostelName} live: ${shareUrl}`
      )}`
    : '#';

  const handleConfirmCancelOrder = async (order: CampusOrder) => {
    if (!onCancelOrder) return;
    setCancellingOrderId(order.id);
    try {
      await onCancelOrder(order);
      setConfirmCancelOrderId(null);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const filterTabs: {
    id: OrderStatusFilter;
    label: string;
    count: number;
    Icon: typeof Clock;
  }[] = [
    { id: 'active', label: 'Active', count: activeOrders.length, Icon: Clock },
    { id: 'delivered', label: 'Delivered', count: completedOrders.length, Icon: CheckCircle2 },
    { id: 'cancelled', label: 'Cancelled', count: cancelledOrders.length, Icon: XCircle },
  ];

  const activeFilterLabel =
    statusFilter === 'active'
      ? 'active'
      : statusFilter === 'cancelled'
      ? 'cancelled'
      : 'delivered';

  return (
    <section aria-label="Order history and live tracking shares" className="space-y-5">
      {/* Header, Status Filter Bar & Search Card */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.16)] dark:shadow-[0_14px_34px_-16px_rgba(0,0,0,0.65)] space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Campus Pharmacy Orders
            </p>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Order History
            </h1>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 px-3 py-2">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Delivered
              </p>
              <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {summaryStats.count}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 px-3 py-2">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Kits Bought
              </p>
              <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {summaryStats.totalItems}
              </p>
            </div>
            <div className="rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 px-3 py-2">
              <p className="text-[11px] font-medium text-teal-800 dark:text-teal-300">
                Total Paid
              </p>
              <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-teal-700 dark:text-teal-300">
                ₹{summaryStats.totalPaid}
              </p>
            </div>
          </div>
        </div>

        {/* Active / Delivered / Cancelled Filter Toggle */}
        <div
          role="tablist"
          aria-label="Filter orders by status"
          className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 p-1.5"
        >
          {filterTabs.map(({ id, label, count, Icon }) => {
            const isSelected = statusFilter === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setStatusFilter(id);
                  setConfirmCancelOrderId(null);
                }}
                className={`min-h-[44px] px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-teal-600 ${
                  isSelected
                    ? id === 'cancelled'
                      ? 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 shadow-xs border border-rose-200/70 dark:border-rose-800/50'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                    isSelected
                      ? id === 'cancelled'
                        ? 'text-rose-600 dark:text-rose-400'
                        : id === 'delivered'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-teal-600 dark:text-teal-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>{label}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded-md ${
                    isSelected
                      ? id === 'cancelled'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                      : 'text-slate-500 dark:text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="space-y-1.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeFilterLabel} orders by items, date (e.g. Nov 15), or order ID...`}
              aria-label="Search orders by items, date, or order ID"
              className="w-full min-h-[44px] pl-10 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery.trim().length > 0 && (
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1 tabular-nums">
              Showing {filteredOrders.length} of {currentTabOrders.length} {activeFilterLabel}{' '}
              {currentTabOrders.length === 1 ? 'order' : 'orders'}
            </p>
          )}
        </div>
      </motion.div>

      {/* Empty State for Selected Status Filter */}
      {currentTabOrders.length === 0 ? (
        <motion.div
          key={`empty-${statusFilter}`}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-10 text-center shadow-[0_14px_34px_-18px_rgba(15,23,42,0.16)] dark:shadow-[0_16px_38px_-16px_rgba(0,0,0,0.65)] space-y-4"
        >
          <div
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto ${
              statusFilter === 'cancelled'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200/80 dark:border-rose-800/70 text-rose-700 dark:text-rose-300'
                : 'bg-teal-50 dark:bg-teal-950/60 border-teal-200/80 dark:border-teal-800/70 text-teal-700 dark:text-teal-300'
            }`}
          >
            {statusFilter === 'cancelled' ? (
              <XCircle className="w-7 h-7" />
            ) : statusFilter === 'active' ? (
              <Clock className="w-7 h-7" />
            ) : (
              <ReceiptText className="w-7 h-7" />
            )}
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {statusFilter === 'active'
                ? 'No Active Dispatches Right Now'
                : statusFilter === 'cancelled'
                ? 'No Cancelled Orders'
                : 'No Delivered Orders Yet'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {statusFilter === 'active'
                ? 'Orders currently en route to your hostel gate will appear here with live roommate tracking links.'
                : statusFilter === 'cancelled'
                ? 'Any order cancelled before pharmacy pickup appears here so you can review or reorder kits quickly.'
                : 'Past OTC medicine orders appear here automatically once your hostel gate handover is verified with your 4-digit PIN.'}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {statusFilter !== 'delivered' && completedOrders.length > 0 && (
              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                onClick={() => setStatusFilter('delivered')}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold inline-flex items-center gap-2 transition-all"
              >
                <span>View Delivered ({completedOrders.length})</span>
              </motion.button>
            )}
            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              onClick={onGoToOrder}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold border-b-[3px] border-teal-800 active:border-b active:translate-y-[1px] inline-flex items-center gap-2 transition-all"
            >
              <span>Browse Emergency Kits</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            No {activeFilterLabel} orders match &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
          >
            Reset search filter
          </button>
        </div>
      ) : (
        <motion.div
          key={`${statusFilter}-${searchQuery.trim().toLowerCase() || 'all'}`}
          variants={ORDER_LIST_VARIANTS}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
          className="space-y-4"
        >
          {filteredOrders.map((order) => {
            const statusBadge = ACTIVE_STATUS_BADGE[order.status];
            const feedback = feedbackByOrderId.get(order.id) ?? null;
            const passFeeAmount = Math.max(
              0,
              order.totalPayable - order.subtotal - order.deliveryFee
            );
            const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const inStockMatchCount = order.items.filter((item) => {
              const catalogKit = kitsById.get(item.kitId);
              return catalogKit ? catalogKit.inStock : false;
            }).length;

            if (statusFilter === 'active') {
              const isConfirmingCancel = confirmCancelOrderId === order.id;
              const isCancelling = cancellingOrderId === order.id;
              return (
                <motion.article
                  key={order.id}
                  variants={ORDER_CARD_VARIANTS}
                  layout="position"
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800/70 p-4 sm:p-5 shadow-[0_12px_28px_-18px_rgba(13,148,136,0.18)] space-y-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          #{order.id}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusBadge.style}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatOrderDate(order)}</span>
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>
                            {order.hostelName} · Room {order.roomNumber}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Total Payable
                      </p>
                      <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-teal-300">
                        ₹{order.totalPayable}
                      </p>
                      <p className="text-[11px] font-medium text-teal-700 dark:text-teal-400">
                        PIN {order.handoverPin} · {order.upiProvider}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span>
                        {totalUnits} {totalUnits === 1 ? 'Kit' : 'Kits'} in Dispatch
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Runner: {order.runnerName}</span>
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                      {order.items.map((item) => `${item.name} ×${item.quantity}`).join(', ')}
                    </p>
                    {order.specialInstructions && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/70 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Note:</span>{' '}
                        {order.specialInstructions}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <motion.button
                        type="button"
                        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                        onClick={() => void handleOpenShareModal(order)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold border-b-[3px] border-teal-800 active:border-b active:translate-y-[1px] inline-flex items-center gap-1.5 transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Live Link</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                        onClick={() => onOpenInTracker(order.id)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                      >
                        <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Live Tracker</span>
                      </motion.button>
                    </div>

                    {order.status === 'queued' && onCancelOrder && (
                      <div className="flex items-center gap-2">
                        {isConfirmingCancel ? (
                          <>
                            <button
                              type="button"
                              disabled={isCancelling}
                              onClick={() => void handleConfirmCancelOrder(order)}
                              className="min-h-[44px] px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{isCancelling ? 'Cancelling...' : 'Confirm Cancel'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={isCancelling}
                              onClick={() => setConfirmCancelOrderId(null)}
                              className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              Keep
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelOrderId(order.id)}
                            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel Order</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.article>
              );
            }

            if (statusFilter === 'cancelled') {
              return (
                <motion.article
                  key={order.id}
                  variants={ORDER_CARD_VARIANTS}
                  layout="position"
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.12)] space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white">
                          #{order.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusBadge.style}`}
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Cancelled</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatOrderDate(order)}</span>
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {order.hostelName} · Room {order.roomNumber}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Order Total
                      </p>
                      <p className="text-xl font-bold font-mono tabular-nums text-slate-700 dark:text-slate-300 line-through decoration-rose-500/60">
                        ₹{order.totalPayable}
                      </p>
                      <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400">
                        Cancelled before delivery
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Cancelled Items ({totalUnits} {totalUnits === 1 ? 'unit' : 'units'})
                    </p>
                    <ul className="divide-y divide-slate-200/70 dark:divide-slate-800">
                      {order.items.map((item) => (
                        <li
                          key={`${order.id}-${item.kitId}`}
                          className="py-1.5 first:pt-0.5 last:pb-0.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {item.name} × {item.quantity}
                          </span>
                          <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400 shrink-0">
                            ₹{item.price * item.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {order.specialInstructions && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/70 dark:border-slate-800">
                        <span className="font-semibold">Note:</span> {order.specialInstructions}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <motion.button
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                      onClick={() => onOpenInTracker(order.id)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                    >
                      <span>View Details</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                      disabled={inStockMatchCount === 0}
                      onClick={() => onReorderKits(order)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold border-b-[3px] border-teal-800 disabled:border-slate-400 dark:disabled:border-slate-900 active:border-b active:translate-y-[1px] inline-flex items-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{inStockMatchCount === 0 ? 'Out of Stock' : 'Reorder Kits'}</span>
                    </motion.button>
                  </div>
                </motion.article>
              );
            }

            return (
              <motion.article
                key={order.id}
                variants={ORDER_CARD_VARIANTS}
                layout="position"
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.16)] dark:shadow-[0_14px_34px_-16px_rgba(0,0,0,0.65)] space-y-4"
              >
                {/* Order Header: ID, Timestamp, Status & Total Paid */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white">
                        #{order.id}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Delivered</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatOrderDate(order)}</span>
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>
                          {order.hostelName} · Room {order.roomNumber}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Total Paid
                    </p>
                    <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      ₹{order.totalPayable}
                    </p>
                    <p className="text-[11px] font-medium text-teal-700 dark:text-teal-400">
                      Paid via {order.upiProvider}
                    </p>
                  </div>
                </div>

                {/* Items Purchased Summary */}
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>
                        Items Purchased ({totalUnits} {totalUnits === 1 ? 'unit' : 'units'})
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Runner: {order.runnerName}</span>
                    </span>
                  </div>

                  <ul className="divide-y divide-slate-200/70 dark:divide-slate-800">
                    {order.items.map((item) => {
                      const lineTotal = item.price * item.quantity;
                      return (
                        <li
                          key={`${order.id}-${item.kitId}`}
                          className="py-2 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-xs sm:text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                              Qty {item.quantity} × ₹{item.price}
                            </p>
                          </div>
                          <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-white shrink-0">
                            ₹{lineTotal}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Bill Breakdown Footer */}
                  <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Items Subtotal</span>
                      <span className="font-mono tabular-nums">₹{order.subtotal}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Curfew Express Fee</span>
                      <span className="font-mono tabular-nums">
                        {order.deliveryFee === 0
                          ? '₹0 (Wellness Pass)'
                          : `₹${order.deliveryFee}`}
                      </span>
                    </div>
                    {passFeeAmount > 0 && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Semester Wellness Pass</span>
                        <span className="font-mono tabular-nums">₹{passFeeAmount}</span>
                      </div>
                    )}
                    <div className="pt-1 flex items-center justify-between font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      <span>Total Amount Paid</span>
                      <span className="font-mono tabular-nums text-teal-700 dark:text-teal-300">
                        ₹{order.totalPayable}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating & Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
                  {feedback ? (
                    <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 rounded-xl px-3 py-2">
                      <div
                        className="flex items-center gap-0.5 shrink-0 pt-0.5"
                        aria-label={`Rated ${feedback.rating} out of 5 stars`}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= feedback.rating
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="leading-snug">
                        <span className="font-semibold">Your review:</span>{' '}
                        {feedback.comment ? (
                          <span className="italic">&ldquo;{feedback.comment}&rdquo;</span>
                        ) : (
                          <span>Rated {feedback.rating}/5</span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Delivered in ~{order.deliveryMinutes || 16} mins · Runner rating pending
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!feedback && (
                      <motion.button
                        type="button"
                        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                        onClick={() => onOpenInTracker(order.id)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 border-b-[3px] border-b-amber-400 dark:border-b-amber-900 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Rate Runner</span>
                      </motion.button>
                    )}

                    <motion.button
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                      onClick={() => void handleOpenShareModal(order)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-teal-200 dark:border-teal-800 border-b-[3px] border-b-teal-300 dark:border-b-teal-950 bg-teal-50/70 dark:bg-teal-950/40 hover:bg-teal-100/80 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Link</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                      onClick={() => setReceiptOrder(order)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                    >
                      <FileDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Download Receipt</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                      onClick={() => onOpenInTracker(order.id)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                    >
                      <span>View Details</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                      disabled={inStockMatchCount === 0}
                      onClick={() => onReorderKits(order)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold border-b-[3px] border-teal-800 disabled:border-slate-400 dark:disabled:border-slate-900 active:border-b active:translate-y-[1px] inline-flex items-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{inStockMatchCount === 0 ? 'Out of Stock' : 'Reorder Kits'}</span>
                    </motion.button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}

      {/* Shareable Roommate Deep-Link Modal */}
      <AnimatePresence>
        {shareOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Share tracking link for order ${shareOrder.id}`}
          >
            <motion.div
              initial={reduceMotion ? false : { y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { y: 24, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/70 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Share Live Tracking Link
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Order <span className="font-mono font-semibold">#{shareOrder.id}</span> ·{' '}
                      {ACTIVE_STATUS_BADGE[shareOrder.status].label}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShareOrder(null)}
                  aria-label="Close share dialog"
                  className="min-h-[40px] min-w-[40px] rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>Roommate Deep-Link</span>
                  {publishingShare ? (
                    <span className="text-teal-600 dark:text-teal-400">Syncing live status...</span>
                  ) : copiedOrderId === shareOrder.id ? (
                    <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                      <Check className="w-3 h-3" /> Copied to clipboard
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    aria-label="Shareable order tracking URL"
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-600"
                  />
                  <motion.button
                    type="button"
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    onClick={() => void copyToClipboard(shareUrl, shareOrder.id)}
                    className="min-h-[40px] px-3 rounded-xl bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                  >
                    {copiedOrderId === shareOrder.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold border-b-[3px] border-emerald-800 inline-flex items-center justify-center gap-2 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send on WhatsApp</span>
                </a>

                <motion.button
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  onClick={() => void handleNativeShare(shareOrder, shareUrl)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all"
                >
                  <Share2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Share via Device</span>
                </motion.button>
              </div>

              {onPreviewSharedLink && (
                <button
                  type="button"
                  onClick={() => {
                    const id = shareOrder.id;
                    setShareOrder(null);
                    onPreviewSharedLink(id);
                  }}
                  className="w-full min-h-[40px] rounded-xl border border-dashed border-teal-300 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-xs font-semibold text-teal-800 dark:text-teal-300 inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview Roommate View</span>
                </button>
              )}

              <div className="flex items-start gap-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/70 p-3 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
                <span>
                  Roommates opening this link see live runner GPS, milestone status, and hostel block—your phone number and 4-digit handover PIN stay private.
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print-Friendly PDF Receipt View Modal */}
      <AnimatePresence>
        {receiptOrder && (() => {
          const receiptPassFee = Math.max(
            0,
            receiptOrder.totalPayable - receiptOrder.subtotal - receiptOrder.deliveryFee
          );
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 backdrop-blur-xs p-0 sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label={`Printable PDF receipt for order ${receiptOrder.id}`}
            >
              <motion.div
                initial={reduceMotion ? false : { y: 24, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { y: 24, opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="w-full max-w-xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-2xl"
              >
                {/* Modal Action Header (hidden in print) */}
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 print:hidden">
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      Order Receipt · #{receiptOrder.id}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Print-friendly white receipt layout — choose &ldquo;Save as PDF&rdquo; in print dialog
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <motion.button
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                      onClick={() => window.print()}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold border-b-[3px] border-teal-800 inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print / Save PDF</span>
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => setReceiptOrder(null)}
                      aria-label="Close receipt preview"
                      className="min-h-[40px] min-w-[40px] rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Printable White Paper Receipt Body */}
                <div className="overflow-y-auto p-4 sm:p-6 bg-slate-100/80 dark:bg-slate-950/60">
                  <div
                    id="qcc-printable-receipt"
                    className="rounded-2xl bg-white text-slate-900 border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5"
                  >
                    {/* Pharmacy Header */}
                    <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                          <Cross className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                          <div className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                            Quick Care Campus
                          </div>
                          <p className="text-xs text-slate-600">
                            24/7 Partner Pharmacy · Premnagar &amp; Hostel Clusters, Dehradun
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            OTC Emergency Wellness Fulfillment Receipt
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="inline-block rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Paid &amp; Delivered
                        </span>
                        <div className="text-sm font-mono font-bold text-slate-900 mt-1">
                          #{receiptOrder.id}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatOrderDate(receiptOrder)}
                        </div>
                      </div>
                    </div>

                    {/* Customer & Fulfillment Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-b border-slate-200 pb-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Billed To &amp; Hostel Drop
                        </p>
                        <p className="font-bold text-slate-900">{receiptOrder.studentName}</p>
                        <p className="text-slate-600 font-mono">{receiptOrder.studentPhone}</p>
                        <p className="text-slate-700">
                          {receiptOrder.hostelName} · Room {receiptOrder.roomNumber}
                        </p>
                      </div>

                      <div className="space-y-1 sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Fulfillment &amp; Payment
                        </p>
                        <p className="font-semibold text-slate-900">
                          Runner: {receiptOrder.runnerName}
                        </p>
                        <p className="text-slate-600">
                          Payment: UPI ({receiptOrder.upiProvider})
                        </p>
                        <p className="text-slate-600 font-mono tabular-nums">
                          Gate Handover PIN: {receiptOrder.handoverPin} · ~{receiptOrder.deliveryMinutes || 16} mins
                        </p>
                      </div>
                    </div>

                    {receiptOrder.specialInstructions && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                        <span className="font-bold text-slate-900">Special Instructions: </span>
                        <span>{receiptOrder.specialInstructions}</span>
                      </div>
                    )}

                    {/* Itemized Kits Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                            <th className="py-2 pr-3 font-semibold">OTC Relief Kit</th>
                            <th className="py-2 px-2 font-semibold text-right">Qty</th>
                            <th className="py-2 px-2 font-semibold text-right">Rate</th>
                            <th className="py-2 pl-2 font-semibold text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {receiptOrder.items.map((item) => (
                            <tr key={`receipt-${receiptOrder.id}-${item.kitId}`}>
                              <td className="py-2.5 pr-3 font-semibold text-slate-900">
                                {item.name}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700">
                                ₹{item.price}
                              </td>
                              <td className="py-2.5 pl-2 text-right font-mono font-bold tabular-nums text-slate-900">
                                ₹{item.price * item.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Summary */}
                    <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Items Subtotal</span>
                        <span className="font-mono tabular-nums text-slate-900">
                          ₹{receiptOrder.subtotal}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Curfew Express Delivery Fee</span>
                        <span className="font-mono tabular-nums text-slate-900">
                          {receiptOrder.deliveryFee === 0
                            ? '₹0 (Semester Wellness Pass)'
                            : `₹${receiptOrder.deliveryFee}`}
                        </span>
                      </div>
                      {receiptPassFee > 0 && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Semester Wellness Pass</span>
                          <span className="font-mono tabular-nums text-slate-900">
                            ₹{receiptPassFee}
                          </span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-base font-bold text-slate-900">
                        <span>Total Amount Paid</span>
                        <span className="font-mono tabular-nums text-teal-700 text-lg">
                          ₹{receiptOrder.totalPayable}
                        </span>
                      </div>
                    </div>

                    {/* Receipt Footer */}
                    <div className="pt-3 border-t border-dashed border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                      <span>Strictly verified OTC wellness items. No Rx drugs.</span>
                      <span className="font-mono">Thank you for choosing Quick Care Campus</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </section>
  );
}
