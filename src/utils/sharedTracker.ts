import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CampusOrder, SharedTracker } from '../types';

export function buildSharedTrackerUrl(orderId: string): string {
  if (typeof window === 'undefined') return `/?track=${encodeURIComponent(orderId)}`;
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('track', orderId);
  return url.toString();
}

export function toSharedTrackerPayload(
  order: CampusOrder
): Omit<SharedTracker, 'updatedAt'> {
  return {
    orderId: order.id.slice(0, 64),
    hostelName: order.hostelName.slice(0, 120),
    gateLat: order.gateLat,
    gateLng: order.gateLng,
    runnerName: order.runnerName.slice(0, 100),
    runnerLat: order.runnerLat,
    runnerLng: order.runnerLng,
    itemsSummary: order.items
      .slice(0, 10)
      .map((item) => `${item.name} ×${item.quantity}`),
    trackerStep: order.trackerStep,
    status: order.status,
    deliveryMinutes: order.deliveryMinutes,
  };
}

export async function publishSharedTracker(order: CampusOrder): Promise<void> {
  const payload = toSharedTrackerPayload(order);
  await setDoc(doc(db, 'sharedTrackers', order.id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export function syncSharedTrackerStatus(
  orderId: string,
  patch: Partial<
    Pick<
      CampusOrder,
      'status' | 'trackerStep' | 'runnerLat' | 'runnerLng' | 'deliveryMinutes'
    >
  >
): void {
  updateDoc(doc(db, 'sharedTrackers', orderId), {
    ...patch,
    updatedAt: serverTimestamp(),
  }).catch(() => {
    // Ignore if shared tracker document has not been published for legacy orders
  });
}
