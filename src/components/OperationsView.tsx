import { useState } from 'react';
import {
  AdvancedMarker,
  ColorScheme,
  Map as GoogleMap,
  Pin,
} from '@vis.gl/react-google-maps';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { motion, useReducedMotion } from 'motion/react';
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  IndianRupee,
  KeyRound,
  MapPin,
  MessageSquareText,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldAlert,
  Star,
  TrendingUp,
  Truck,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import {
  BASELINE_PILOT_COMPLETED,
  BREAK_EVEN_ORDERS,
  CONTRIBUTION_MARGIN,
  DELIVERY_FEE,
  PHARMACY_ORIGIN,
  RELIEF_KITS,
  RUNNER_PAYOUT,
  SYMPTOM_FILTERS,
} from '../data/campusData';
import { CATEGORY_FALLBACK_ASSETS } from '../data/kitAssets';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CampusOrder, OrderFeedback, ReliefKit, SymptomCategory } from '../types';
import { ProductPhoto } from './ProductPhoto';
import {
  compressImageToDataUrl,
  regenerateStudioPhotoForKit,
  writeCachedPhoto,
} from '../utils/photoCache';
import { syncSharedTrackerStatus } from '../utils/sharedTracker';

interface OperationsViewProps {
  orders: CampusOrder[];
  kits: ReliefKit[];
  feedbackList: OrderFeedback[];
  isCampusAdmin: boolean;
  isDemoMode?: boolean;
  isDarkMode?: boolean;
  onDemoUpdateOrder?: (orderId: string, patch: Partial<CampusOrder>) => void;
  onLocalKitUpdate?: (updatedKit: ReliefKit) => void;
  onLocalKitAdd?: (newKit: ReliefKit) => void;
}

type AdminSectionTab = 'dispatch' | 'inventory' | 'economics';
type KitCategory = Exclude<SymptomCategory, 'All Kits'>;

const KIT_CATEGORIES: KitCategory[] = [
  'Fever & Cold',
  'Headache & Migraine',
  'Stomach & Acidity',
  'First-Aid & Sprains',
  'Hydration & Energy',
  'Period & Cramp Care',
  'Personal Hygiene & Masks',
  'Sleep & Wellness',
];

const STATUS_LABELS: Record<CampusOrder['status'], { text: string; tone: string }> = {
  queued: { text: 'Pending Accept', tone: 'text-amber-700 dark:text-amber-400' },
  picked_up: { text: 'Runner Picked Up', tone: 'text-teal-700 dark:text-teal-400' },
  gate_cleared: { text: 'Main Gate Cleared', tone: 'text-teal-700 dark:text-teal-400' },
  arrived: { text: 'At Hostel Gate', tone: 'text-slate-900 dark:text-white' },
  delivered: { text: 'Verified & Completed', tone: 'text-slate-500 dark:text-slate-400' },
  cancelled: { text: 'Cancelled', tone: 'text-rose-700 dark:text-rose-400' },
};

export function OperationsView({
  orders,
  kits,
  feedbackList,
  isCampusAdmin,
  isDemoMode = false,
  isDarkMode = false,
  onDemoUpdateOrder,
  onLocalKitUpdate,
  onLocalKitAdd,
}: OperationsViewProps) {
  const reduceMotion = useReducedMotion();
  const [sectionTab, setSectionTab] = useState<AdminSectionTab>('dispatch');

  // Dispatch queue modals & state
  const [pinModalOrder, setPinModalOrder] = useState<CampusOrder | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [mapModalOrder, setMapModalOrder] = useState<CampusOrder | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Inventory manager state
  const [inventoryCategory, setInventoryCategory] = useState<SymptomCategory>('All Kits');
  const [updatingKitId, setUpdatingKitId] = useState<string | null>(null);
  const [regeneratingKitId, setRegeneratingKitId] = useState<string | null>(null);
  const [uploadingKitId, setUploadingKitId] = useState<string | null>(null);
  const [showAddKitForm, setShowAddKitForm] = useState(false);
  const [newKitName, setNewKitName] = useState('');
  const [newKitCategory, setNewKitCategory] = useState<KitCategory>('Fever & Cold');
  const [newKitPrice, setNewKitPrice] = useState('120');
  const [newKitEta, setNewKitEta] = useState('16');
  const [newKitRelief, setNewKitRelief] = useState('');
  const [newKitContents, setNewKitContents] = useState('');
  const [newKitCode, setNewKitCode] = useState('');
  const [newKitImage, setNewKitImage] = useState(RELIEF_KITS[0].imagePath);
  const [newKitPhotoDataUrl, setNewKitPhotoDataUrl] = useState<string | null>(null);
  const [uploadingNewKitPhoto, setUploadingNewKitPhoto] = useState(false);
  const [kitFormError, setKitFormError] = useState<string | null>(null);
  const [kitNotice, setKitNotice] = useState<string | null>(null);
  const [savingNewKit, setSavingNewKit] = useState(false);

  // Unit economics calculations
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const deliveredCount = deliveredOrders.length;
  const totalPilotCompleted = BASELINE_PILOT_COMPLETED + deliveredCount;
  const breakEvenPct = Math.min(
    100,
    Math.round((totalPilotCompleted / BREAK_EVEN_ORDERS) * 1000) / 10
  );
  const remainingToBreakEven = Math.max(0, BREAK_EVEN_ORDERS - totalPilotCompleted);
  const sessionRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalPayable, 0);
  const pilotContribution = totalPilotCompleted * CONTRIBUTION_MARGIN;
  const avgDeliveryMins =
    deliveredCount > 0
      ? Math.round(
          deliveredOrders.reduce((sum, o) => sum + (o.deliveryMinutes || 16), 0) /
            deliveredCount
        )
      : 16;
  const avgRunnerRating =
    feedbackList.length > 0
      ? (
          feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length
        ).toFixed(1)
      : null;

  const updateOrderStatus = async (
    order: CampusOrder,
    nextStatus: CampusOrder['status'],
    nextStep: 1 | 2 | 3 | 4,
    progressFactor: number
  ) => {
    setUpdatingOrderId(order.id);
    const orderPath = `orders/${order.id}`;
    const runnerLat =
      PHARMACY_ORIGIN.lat + (order.gateLat - PHARMACY_ORIGIN.lat) * progressFactor;
    const runnerLng =
      PHARMACY_ORIGIN.lng + (order.gateLng - PHARMACY_ORIGIN.lng) * progressFactor;

    const patch: Partial<CampusOrder> = {
      status: nextStatus,
      trackerStep: nextStep,
      runnerLat: Number(runnerLat.toFixed(6)),
      runnerLng: Number(runnerLng.toFixed(6)),
      deliveryMinutes: nextStatus === 'delivered' ? 16 : order.deliveryMinutes,
    };

    if (isDemoMode && onDemoUpdateOrder) {
      onDemoUpdateOrder(order.id, patch);
      setUpdatingOrderId(null);
      return;
    }

    try {
      await updateDoc(doc(db, 'orders', order.id), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
      syncSharedTrackerStatus(order.id, {
        status: nextStatus,
        trackerStep: nextStep,
        runnerLat: patch.runnerLat,
        runnerLng: patch.runnerLng,
        deliveryMinutes: patch.deliveryMinutes,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, orderPath);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleVerifyPinAndComplete = async () => {
    if (!pinModalOrder) return;
    if (pinInput.trim() !== pinModalOrder.handoverPin) {
      setPinError(
        `Incorrect Handover PIN. Expected ${pinModalOrder.handoverPin} for verification.`
      );
      return;
    }
    setPinError(null);
    await updateOrderStatus(pinModalOrder, 'delivered', 4, 1);
    setPinModalOrder(null);
    setPinInput('');
  };

  const buildKitFirestoreDoc = (kit: ReliefKit) => {
    const validPhotoDataUrl =
      kit.photoDataUrl &&
      kit.photoDataUrl.startsWith('data:image/') &&
      kit.photoDataUrl.length <= 200000
        ? kit.photoDataUrl
        : null;

    return {
      id: kit.id,
      name: kit.name,
      category: kit.category,
      price: kit.price,
      contents: kit.contents,
      reliefFor: kit.reliefFor,
      imagePath: kit.imagePath,
      ...(validPhotoDataUrl ? { photoDataUrl: validPhotoDataUrl } : {}),
      etaMinutes: kit.etaMinutes,
      sealedCode: kit.sealedCode,
      inStock: kit.inStock,
      updatedAt: serverTimestamp(),
    };
  };

  const handleToggleKitStock = async (kit: ReliefKit) => {
    const nextInStock = !kit.inStock;
    setKitNotice(null);

    if (!isCampusAdmin) {
      onLocalKitUpdate?.({ ...kit, inStock: nextInStock });
      setKitNotice(
        `Preview updated: "${kit.name}" marked ${nextInStock ? 'In Stock' : 'Out of Stock'} for this session. Persistent Firestore catalog writes require an authorized admin account.`
      );
      return;
    }

    setUpdatingKitId(kit.id);
    const kitPath = `kits/${kit.id}`;
    try {
      await setDoc(doc(db, 'kits', kit.id), buildKitFirestoreDoc({ ...kit, inStock: nextInStock }));
      setKitNotice(
        `Firestore catalog updated: "${kit.name}" is now ${nextInStock ? 'In Stock' : 'Out of Stock'}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, kitPath);
    } finally {
      setUpdatingKitId(null);
    }
  };

  const handleRegenerateKitPhoto = async (kit: ReliefKit) => {
    setKitNotice(null);
    setRegeneratingKitId(kit.id);
    try {
      const { imagePath, photoDataUrl } = await regenerateStudioPhotoForKit(kit);
      const updatedKit: ReliefKit = {
        ...kit,
        imagePath,
        photoDataUrl,
      };

      if (!isCampusAdmin) {
        onLocalKitUpdate?.(updatedKit);
        setKitNotice(
          `Refreshed studio photograph for "${kit.name}". Customer storefront preview updated immediately.`
        );
        return;
      }

      const kitPath = `kits/${kit.id}`;
      try {
        await setDoc(doc(db, 'kits', kit.id), buildKitFirestoreDoc(updatedKit));
        setKitNotice(
          `Refreshed and synced studio photograph for "${kit.name}" across Customer Storefront and Admin Inventory.`
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, kitPath);
      }
    } catch {
      setKitNotice(`Unable to regenerate studio photo for "${kit.name}". Please try again.`);
    } finally {
      setRegeneratingKitId(null);
    }
  };

  const handleUploadKitPhoto = async (kit: ReliefKit, file: File) => {
    if (!file.type.startsWith('image/')) {
      setKitNotice('Please choose a valid image file (JPG, PNG, or WebP).');
      return;
    }

    setKitNotice(null);
    setUploadingKitId(kit.id);
    try {
      const photoDataUrl = await compressImageToDataUrl(file, {
        targetWidth: 480,
        targetHeight: 360,
        quality: 0.82,
      });
      if (!photoDataUrl.startsWith('data:image/') || photoDataUrl.length > 200000) {
        setKitNotice('Selected image is too large after compression. Please pick a smaller photo.');
        return;
      }

      writeCachedPhoto(kit.id, photoDataUrl, 'custom-upload');
      const updatedKit: ReliefKit = {
        ...kit,
        photoDataUrl,
      };

      if (!isCampusAdmin) {
        onLocalKitUpdate?.(updatedKit);
        setKitNotice(
          `Uploaded custom photo for "${kit.name}". Customer storefront preview updated immediately.`
        );
        return;
      }

      const kitPath = `kits/${kit.id}`;
      try {
        await setDoc(doc(db, 'kits', kit.id), buildKitFirestoreDoc(updatedKit));
        setKitNotice(
          `Uploaded and synced custom studio photo for "${kit.name}" to live storefront.`
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, kitPath);
      }
    } catch {
      setKitNotice(`Could not process uploaded image for "${kit.name}".`);
    } finally {
      setUploadingKitId(null);
    }
  };

  const handleUploadNewKitPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setKitFormError('Please select a JPG, PNG, or WebP product photo.');
      return;
    }
    setKitFormError(null);
    setUploadingNewKitPhoto(true);
    try {
      const compressed = await compressImageToDataUrl(file, {
        targetWidth: 480,
        targetHeight: 360,
        quality: 0.82,
      });
      if (!compressed.startsWith('data:image/') || compressed.length > 200000) {
        setKitFormError('Uploaded photo is too large. Please pick a smaller image.');
        return;
      }
      setNewKitPhotoDataUrl(compressed);
    } catch {
      setKitFormError('Unable to read the selected image file. Please try another photo.');
    } finally {
      setUploadingNewKitPhoto(false);
    }
  };

  const handleAddEmergencyKit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKitFormError(null);
    setKitNotice(null);

    const trimmedName = newKitName.trim();
    const parsedPrice = Number(newKitPrice);
    const parsedEta = Number(newKitEta);
    const parsedContents = newKitContents
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);

    if (trimmedName.length < 2) {
      setKitFormError('Enter an emergency kit name (at least 2 characters).');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 1 || parsedPrice > 10000) {
      setKitFormError('Enter a valid INR price between ₹1 and ₹10,000.');
      return;
    }
    if (!Number.isFinite(parsedEta) || parsedEta < 1 || parsedEta > 120) {
      setKitFormError('Enter a valid ETA between 1 and 120 minutes.');
      return;
    }
    if (newKitRelief.trim().length < 2) {
      setKitFormError('Describe what symptoms this kit relieves.');
      return;
    }
    if (parsedContents.length === 0) {
      setKitFormError('Add at least one item in Contents (comma-separated).');
      return;
    }

    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32);
    const kitId = `kit-${slug || Date.now()}-${String(Date.now()).slice(-4)}`;
    const sealedCode = (
      newKitCode.trim() || `OTC-${String(kits.length + 1).padStart(2, '0')}`
    )
      .toUpperCase()
      .slice(0, 32);

    const newKit: ReliefKit = {
      id: kitId,
      name: trimmedName.slice(0, 120),
      category: newKitCategory,
      price: Math.round(parsedPrice),
      contents: parsedContents,
      reliefFor: newKitRelief.trim().slice(0, 200),
      imagePath: newKitImage,
      ...(newKitPhotoDataUrl ? { photoDataUrl: newKitPhotoDataUrl } : {}),
      etaMinutes: Math.round(parsedEta),
      sealedCode,
      inStock: true,
    };

    if (newKitPhotoDataUrl) {
      writeCachedPhoto(kitId, newKitPhotoDataUrl, 'custom-upload');
    }

    if (!isCampusAdmin) {
      onLocalKitAdd?.(newKit);
      setKitNotice(
        `Preview added "${newKit.name}". Persistent Firestore catalog creation requires an authorized admin account.`
      );
      setNewKitName('');
      setNewKitRelief('');
      setNewKitContents('');
      setNewKitCode('');
      setNewKitPhotoDataUrl(null);
      setShowAddKitForm(false);
      return;
    }

    setSavingNewKit(true);
    const kitPath = `kits/${kitId}`;
    try {
      await setDoc(doc(db, 'kits', kitId), buildKitFirestoreDoc(newKit));
      setKitNotice(`Added "${newKit.name}" to the live Firestore OTC catalog.`);
      setNewKitName('');
      setNewKitRelief('');
      setNewKitContents('');
      setNewKitCode('');
      setNewKitPhotoDataUrl(null);
      setShowAddKitForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, kitPath);
    } finally {
      setSavingNewKit(false);
    }
  };

  const activeOrderCount = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  ).length;
  const cancelledOrderCount = orders.filter((o) => o.status === 'cancelled').length;
  const inStockCount = kits.filter((k) => k.inStock).length;
  const filteredInventoryKits =
    inventoryCategory === 'All Kits'
      ? kits
      : kits.filter((k) => k.category === inventoryCategory);

  return (
    <div className="space-y-5">
      {/* Control Center Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Operations &amp; Dispatch Control Center</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-teal-700 dark:text-teal-400">
              {isCampusAdmin
                ? 'Authorized Campus Admin (All Campus Orders & Live Inventory)'
                : 'Demo Ops Preview (Your Session Orders)'}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Admin &amp; Runner Command
          </h1>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSectionTab('dispatch')}
            className={`flex-1 sm:flex-initial min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              sectionTab === 'dispatch'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Dispatch ({activeOrderCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSectionTab('inventory')}
            className={`flex-1 sm:flex-initial min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              sectionTab === 'inventory'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Inventory ({inStockCount}/{kits.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSectionTab('economics')}
            className={`flex-1 sm:flex-initial min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              sectionTab === 'economics'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Economics</span>
          </button>
        </div>
      </div>

      {!isCampusAdmin && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            {isDemoMode
              ? 'Demo Operations Mode active — incoming orders, 4-digit PIN handovers, and catalog inventory toggles are synced locally in this browser session.'
              : 'Signed in via Demo Passcode with a non-admin email. You can dispatch and PIN-verify orders you created, view all KPIs, and preview inventory toggles locally.'}
          </span>
        </div>
      )}

      {/* TAB 1: LIVE ORDER DISPATCH QUEUE */}
      {sectionTab === 'dispatch' && (
        <section className="space-y-3" aria-label="Live order dispatch queue">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Live Order Dispatch Queue ({orders.length})
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {activeOrderCount} active · {deliveredCount} completed
              {cancelledOrderCount > 0 ? ` · ${cancelledOrderCount} cancelled` : ''}
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/70 p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No active night orders in queue
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Switch to Student Storefront (or sign in as a student) and place a 60-second order to see incoming dispatch cards, Hostel Gate pins, and 4-digit PIN handovers here in real time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {orders.map((order) => {
                const statusInfo = STATUS_LABELS[order.status];
                const isBusy = updatingOrderId === order.id;

                return (
                  <article
                    key={order.id}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-colors ${
                      order.status === 'delivered' || order.status === 'cancelled'
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              #{order.id}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className={`font-semibold ${statusInfo.tone}`}>
                              {statusInfo.text}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-600 dark:text-slate-400">
                              {order.studentPhone}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                            {order.studentName} · {order.hostelName} (Room {order.roomNumber})
                          </h3>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                            ₹{order.totalPayable}
                          </div>
                          <div className="text-[11px] font-mono font-semibold text-teal-700 dark:text-teal-400 tabular-nums">
                            PIN {order.handoverPin}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                            Gate Pin: {order.gateLat.toFixed(4)}, {order.gateLng.toFixed(4)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Runner: {order.runnerName}</span>
                        </div>

                        {order.specialInstructions && (
                          <div className="mt-1.5 rounded-xl border border-teal-200 dark:border-teal-800/70 bg-teal-50/70 dark:bg-teal-950/40 px-3 py-2 flex items-start gap-2 text-xs text-teal-950 dark:text-teal-100">
                            <MessageSquareText className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
                            <div className="leading-snug">
                              <span className="font-semibold">Special Instructions: </span>
                              <span>{order.specialInstructions}</span>
                            </div>
                          </div>
                        )}

                        {order.status === 'delivered' && (() => {
                          const orderFeedback = feedbackList.find((f) => f.orderId === order.id);
                          if (!orderFeedback) {
                            return (
                              <div className="pt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                Awaiting post-delivery student rating
                              </div>
                            );
                          }
                          return (
                            <div className="mt-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/40 px-3 py-2 space-y-1">
                              <div className="flex items-center gap-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3.5 h-3.5 ${
                                      star <= orderFeedback.rating
                                        ? 'text-amber-500 fill-amber-400'
                                        : 'text-slate-300 dark:text-slate-600'
                                    }`}
                                  />
                                ))}
                                <span className="text-[11px] font-mono font-bold text-amber-900 dark:text-amber-200 tabular-nums">
                                  {orderFeedback.rating}/5
                                </span>
                              </div>
                              {orderFeedback.comment && (
                                <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                                  &ldquo;{orderFeedback.comment}&rdquo;
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <motion.button
                        type="button"
                        whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                        onClick={() => setMapModalOrder(order)}
                        className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>View Gate Pin</span>
                      </motion.button>

                      <div className="flex flex-wrap items-center gap-2">
                        {order.status === 'queued' && (
                          <motion.button
                            type="button"
                            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                            disabled={isBusy}
                            onClick={() =>
                              void updateOrderStatus(order, 'picked_up', 2, 0.25)
                            }
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Accept Order</span>
                          </motion.button>
                        )}

                        {order.status === 'picked_up' && (
                          <motion.button
                            type="button"
                            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                            disabled={isBusy}
                            onClick={() =>
                              void updateOrderStatus(order, 'gate_cleared', 3, 0.65)
                            }
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold whitespace-nowrap"
                          >
                            Mark Picked Up
                          </motion.button>
                        )}

                        {order.status === 'gate_cleared' && (
                          <motion.button
                            type="button"
                            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                            disabled={isBusy}
                            onClick={() =>
                              void updateOrderStatus(order, 'arrived', 4, 1)
                            }
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold whitespace-nowrap"
                          >
                            At Hostel Gate
                          </motion.button>
                        )}

                        {order.status === 'queued' && (
                          <motion.button
                            type="button"
                            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                            disabled={isBusy}
                            onClick={() =>
                              void updateOrderStatus(order, 'cancelled', order.trackerStep, 0)
                            }
                            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </motion.button>
                        )}

                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <motion.button
                            type="button"
                            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                            disabled={isBusy}
                            onClick={() => {
                              setPinModalOrder(order);
                              setPinInput('');
                              setPinError(null);
                            }}
                            className="min-h-[44px] px-4 py-2 rounded-xl border border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Verify PIN &amp; Complete</span>
                          </motion.button>
                        )}

                        {order.status === 'delivered' && (
                          <span className="min-h-[44px] px-3 flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
                            <CheckCircle2 className="w-4 h-4" />
                            Completed
                          </span>
                        )}

                        {order.status === 'cancelled' && (
                          <span className="min-h-[44px] px-3 flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                            <XCircle className="w-4 h-4" />
                            Cancelled
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
      )}

      {/* TAB 2: INVENTORY & KIT MANAGER */}
      {sectionTab === 'inventory' && (
        <section className="space-y-4" aria-label="OTC inventory and kit manager">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                OTC Relief Kits Catalog ({filteredInventoryKits.length} of {kits.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toggle stock availability across all 8 categories in real time or add new emergency wellness kits.
              </p>
            </div>

            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              onClick={() => {
                setShowAddKitForm((prev) => !prev);
                setKitFormError(null);
              }}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 border-b-[4px] border-teal-800 active:border-b-0 active:translate-y-[3px] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all"
            >
              {showAddKitForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showAddKitForm ? 'Close Form' : 'Add Emergency Kit'}</span>
            </motion.button>
          </div>

          {/* 8-Category Inventory Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {SYMPTOM_FILTERS.map((cat) => {
              const active = inventoryCategory === cat;
              const catCount =
                cat === 'All Kits'
                  ? kits.length
                  : kits.filter((k) => k.category === cat).length;
              return (
                <motion.button
                  key={cat}
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  onClick={() => setInventoryCategory(cat)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    active
                      ? 'bg-slate-900 dark:bg-teal-600 text-white border border-slate-900 dark:border-teal-500 border-b-[3px] border-b-teal-500 dark:border-b-teal-800 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-950 hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300'
                  }`}
                >
                  {cat} <span className="font-mono opacity-75">({catCount})</span>
                </motion.button>
              );
            })}
          </div>

          {kitNotice && (
            <div className="rounded-xl border border-teal-200 dark:border-teal-800/70 bg-teal-50 dark:bg-teal-950/50 px-3.5 py-2.5 text-xs font-medium text-teal-900 dark:text-teal-200">
              {kitNotice}
            </div>
          )}

          {showAddKitForm && (
            <form
              onSubmit={handleAddEmergencyKit}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add New Emergency OTC Kit
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="kit-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kit Name
                  </label>
                  <input
                    id="kit-name"
                    type="text"
                    value={newKitName}
                    onChange={(e) => setNewKitName(e.target.value)}
                    placeholder="e.g. Eye Strain & Dryness Relief Kit"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="kit-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Symptom Category
                  </label>
                  <select
                    id="kit-category"
                    value={newKitCategory}
                    onChange={(e) => {
                      const nextCat = e.target.value as KitCategory;
                      setNewKitCategory(nextCat);
                      if (!newKitPhotoDataUrl) {
                        setNewKitImage(CATEGORY_FALLBACK_ASSETS[nextCat]);
                      }
                    }}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:border-teal-600 focus:outline-none"
                  >
                    {KIT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="kit-price" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Price (₹)
                  </label>
                  <input
                    id="kit-price"
                    type="number"
                    min={1}
                    max={10000}
                    value={newKitPrice}
                    onChange={(e) => setNewKitPrice(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-mono text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="kit-eta" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ETA (mins)
                    </label>
                    <input
                      id="kit-eta"
                      type="number"
                      min={1}
                      max={120}
                      value={newKitEta}
                      onChange={(e) => setNewKitEta(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-mono text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="kit-code" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sealed Code
                    </label>
                    <input
                      id="kit-code"
                      type="text"
                      value={newKitCode}
                      onChange={(e) => setNewKitCode(e.target.value)}
                      placeholder="OTC-25"
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-mono text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="kit-relief" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Relief For (Symptom Summary)
                </label>
                <input
                  id="kit-relief"
                  type="text"
                  value={newKitRelief}
                  onChange={(e) => setNewKitRelief(e.target.value)}
                  placeholder="e.g. Late-night screen fatigue, dry eyes & mild tension"
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="kit-contents" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kit Contents (comma-separated)
                  </label>
                  <input
                    id="kit-contents"
                    type="text"
                    value={newKitContents}
                    onChange={(e) => setNewKitContents(e.target.value)}
                    placeholder="Lubricating eye drops, Cooling eye mask, ORS sachet"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="kit-image" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Studio Product Photo (Preset or Upload)
                  </label>
                  <div className="flex items-center gap-2.5">
                    <div className="w-16 aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 via-teal-50/50 to-slate-100 dark:from-slate-800 dark:via-teal-950/40 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                      <ProductPhoto
                        product={{
                          name: newKitName || 'New emergency kit preview',
                          category: newKitCategory,
                          sealedCode: newKitCode || 'OTC',
                          imagePath: newKitImage,
                          ...(newKitPhotoDataUrl ? { photoDataUrl: newKitPhotoDataUrl } : {}),
                        }}
                        compact={true}
                      />
                    </div>
                    <select
                      id="kit-image"
                      value={newKitImage}
                      onChange={(e) => {
                        setNewKitImage(e.target.value);
                        setNewKitPhotoDataUrl(null);
                      }}
                      className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:border-teal-600 focus:outline-none"
                    >
                      {RELIEF_KITS.map((preset) => (
                        <option key={preset.id} value={preset.imagePath}>
                          {preset.name} ({preset.category})
                        </option>
                      ))}
                    </select>
                    <label className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>{uploadingNewKitPhoto ? 'Loading...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={uploadingNewKitPhoto}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) void handleUploadNewKitPhoto(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {kitFormError && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-800 dark:text-rose-200 font-medium">
                  {kitFormError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddKitForm(false);
                    setNewKitPhotoDataUrl(null);
                  }}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewKit || uploadingNewKitPhoto}
                  className="min-h-[44px] px-5 rounded-xl bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 border-b-[3px] border-teal-500 dark:border-teal-800 text-white text-xs font-semibold"
                >
                  {savingNewKit ? 'Saving Kit...' : 'Save Emergency Kit'}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInventoryKits.map((kit, index) => {
              const isBusy = updatingKitId === kit.id;
              const isRegenerating = regeneratingKitId === kit.id;
              const isUploading = uploadingKitId === kit.id;
              const isPhotoBusy = isRegenerating || isUploading;

              return (
                <motion.article
                  key={kit.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.2) }}
                  className="group rounded-3xl border border-slate-200 dark:border-slate-800 border-b-[4px] border-b-slate-300 dark:border-b-slate-950 bg-white dark:bg-slate-900 p-4 flex flex-col gap-3 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.14)]"
                >
                  <div className="flex items-center justify-between gap-3.5">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-24 aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 via-teal-50/50 to-slate-100 dark:from-slate-800 dark:via-teal-950/40 dark:to-slate-900 border border-slate-200/70 dark:border-slate-700/70 shrink-0">
                        <ProductPhoto product={kit} compact={true} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-teal-700 dark:text-teal-400">
                            {kit.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{kit.sealedCode}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {kit.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            ₹{kit.price}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              kit.inStock
                                ? 'text-teal-700 dark:text-teal-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {kit.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <motion.button
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                      disabled={isBusy}
                      onClick={() => void handleToggleKitStock(kit)}
                      className={`min-h-[42px] px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap shrink-0 border border-b-[3px] active:border-b active:translate-y-[2px] transition-all ${
                        kit.inStock
                          ? 'border-rose-200 dark:border-rose-800/60 border-b-rose-300 dark:border-b-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                          : 'border-teal-600 border-b-teal-800 bg-teal-600 text-white hover:bg-teal-500'
                      }`}
                    >
                      {isBusy
                        ? 'Saving...'
                        : kit.inStock
                        ? 'Mark Out of Stock'
                        : 'Restock Kit'}
                    </motion.button>
                  </div>

                  {/* Admin Photo Refresh & Custom Upload Bar */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {kit.photoDataUrl ? 'Custom / Cached Studio Photo' : 'Verified Studio Photo'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isPhotoBusy}
                        onClick={() => void handleRegenerateKitPhoto(kit)}
                        className="min-h-[34px] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 text-teal-600 dark:text-teal-400 ${
                            isRegenerating ? 'animate-spin' : ''
                          }`}
                        />
                        <span>{isRegenerating ? 'Refreshing...' : 'Regenerate Photo'}</span>
                      </button>

                      <label
                        className={`min-h-[34px] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isPhotoBusy ? 'opacity-60 pointer-events-none' : ''
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={isPhotoBusy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void handleUploadKitPhoto(kit, file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 3: VENTURE UNIT ECONOMICS DASHBOARD */}
      {sectionTab === 'economics' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" aria-label="Venture unit economics dashboard">
          <div className="lg:col-span-7 rounded-2xl bg-slate-900 dark:bg-slate-900/95 border border-slate-800 text-white p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-teal-300">
                  Monthly Fixed Cost Break-Even Target (₹6,020 ÷ ₹35)
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
              <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${breakEvenPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300 font-mono tabular-nums">
                <span>{breakEvenPct}% break-even achieved</span>
                <span>{remainingToBreakEven} orders remaining</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800">
              <div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-teal-400" />
                  Gross Session Revenue
                </div>
                <div className="text-xl font-mono font-bold tabular-nums mt-1">
                  ₹{sessionRevenue.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                  Contribution / Order
                </div>
                <div className="text-xl font-mono font-bold tabular-nums mt-1">
                  ₹{CONTRIBUTION_MARGIN}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  Avg. Delivery / Rating
                </div>
                <div className="text-xl font-mono font-bold tabular-nums mt-1">
                  {avgDeliveryMins} mins
                </div>
                <div className="text-[11px] text-teal-300 tabular-nums">
                  {avgRunnerRating
                    ? `${avgRunnerRating} ★ (${feedbackList.length} rated)`
                    : 'Target < 20 mins'}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-sm">
            <h2 className="font-bold text-slate-900 dark:text-white">Per-Order Economics Model</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Curfew Express Delivery Fee</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                  +₹{DELIVERY_FEE}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Student Runner Payout</span>
                <span className="font-mono font-semibold text-rose-700 dark:text-rose-400 tabular-nums">
                  −₹{RUNNER_PAYOUT}
                </span>
              </div>
              <div className="py-2.5 flex justify-between font-bold text-slate-900 dark:text-white">
                <span>Net Contribution Margin</span>
                <span className="font-mono text-teal-700 dark:text-teal-400 tabular-nums">
                  ₹{CONTRIBUTION_MARGIN}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3.5 text-xs text-slate-600 dark:text-slate-300 flex justify-between items-center">
              <span>Cumulative Pilot Contribution</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                ₹{pilotContribution.toLocaleString('en-IN')} / ₹6,020
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Verify 4-Digit Handover PIN Modal */}
      {pinModalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Verify Student Handover PIN"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <PackageCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Verify Handover PIN (#{pinModalOrder.id})
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Ask <strong className="text-slate-900 dark:text-white">{pinModalOrder.studentName}</strong> for their 4-digit gate handover PIN (Order PIN:{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {pinModalOrder.handoverPin}
              </span>).
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter 4-digit PIN"
              className="w-full min-h-[48px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-center font-mono text-lg font-bold tracking-widest text-slate-900 dark:text-white focus:border-teal-600 focus:outline-none"
            />
            {pinError && (
              <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">{pinError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPinModalOrder(null)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleVerifyPinAndComplete()}
                className="flex-1 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
              >
                Complete Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hostel Gate Pin Google Map Modal */}
      {mapModalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Student Hostel Gate Pin Location"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-teal-300 font-mono">
                  #{mapModalOrder.id} · {mapModalOrder.studentPhone}
                </div>
                <h3 className="text-sm sm:text-base font-bold">
                  {mapModalOrder.hostelName} (Room {mapModalOrder.roomNumber})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMapModalOrder(null)}
                aria-label="Close gate pin map"
                className="min-h-[40px] min-w-[40px] rounded-xl text-slate-300 hover:bg-slate-800 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="w-full h-[300px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  colorScheme={isDarkMode ? ColorScheme.DARK : ColorScheme.LIGHT}
                  defaultCenter={{
                    lat: mapModalOrder.gateLat,
                    lng: mapModalOrder.gateLng,
                  }}
                  defaultZoom={15}
                  gestureHandling="greedy"
                  streetViewControl={false}
                  mapTypeControl={false}
                  fullscreenControl={false}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                >
                  <AdvancedMarker
                    position={PHARMACY_ORIGIN}
                    title="24/7 Partner Pharmacy"
                  >
                    <Pin
                      background="#0F172A"
                      borderColor="#FFFFFF"
                      glyphColor="#5EEAD4"
                      glyphText="Rx"
                    />
                  </AdvancedMarker>
                  <AdvancedMarker
                    position={{
                      lat: mapModalOrder.gateLat,
                      lng: mapModalOrder.gateLng,
                    }}
                    title={`${mapModalOrder.studentName} Hostel Gate Drop Pin`}
                  >
                    <Pin
                      background="#0D9488"
                      borderColor="#0F172A"
                      glyphColor="#FFFFFF"
                      scale={1.2}
                    />
                  </AdvancedMarker>
                </GoogleMap>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span>
                  Student: <strong className="text-slate-900 dark:text-white">{mapModalOrder.studentName}</strong>
                </span>
                <span className="font-mono tabular-nums">
                  {mapModalOrder.gateLat.toFixed(5)}, {mapModalOrder.gateLng.toFixed(5)}
                </span>
              </div>

              {mapModalOrder.specialInstructions && (
                <div className="rounded-xl border border-teal-200 dark:border-teal-800/70 bg-teal-50/70 dark:bg-teal-950/40 px-3 py-2 flex items-start gap-2 text-xs text-teal-950 dark:text-teal-100">
                  <MessageSquareText className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Special Instructions: </span>
                    <span>{mapModalOrder.specialInstructions}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
