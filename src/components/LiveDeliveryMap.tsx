import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  ColorScheme,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Compass, Cross, Gauge, LocateFixed, MapPin } from 'lucide-react';
import { PHARMACY_ORIGIN } from '../data/campusData';
import { CampusOrder, LatLngLiteral } from '../types';

interface LiveDeliveryMapProps {
  order: CampusOrder;
  isDarkMode?: boolean;
  secondsRemaining?: number;
  onRoutePathReady?: (path: LatLngLiteral[], distanceMeters: number, durationSeconds: number) => void;
}

function buildFallbackPath(origin: LatLngLiteral, dest: LatLngLiteral, steps = 20): LatLngLiteral[] {
  const pts: LatLngLiteral[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const curveOffset = Math.sin(t * Math.PI) * 0.0012;
    pts.push({
      lat: origin.lat + (dest.lat - origin.lat) * t + curveOffset,
      lng: origin.lng + (dest.lng - origin.lng) * t - curveOffset * 0.6,
    });
  }
  return pts;
}

function haversineMeters(a: LatLngLiteral, b: LatLngLiteral): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng *
      sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function computeBearingDeg(from: LatLngLiteral, to: LatLngLiteral): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function findNearestPathIndex(path: LatLngLiteral[], target: LatLngLiteral): number {
  if (path.length <= 1) return 0;
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < path.length; i += 1) {
    const d = haversineMeters(path[i], target);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

interface MapsPolylineInstance {
  setOptions: (opts: Record<string, unknown>) => void;
  setMap: (map: unknown | null) => void;
  setPath?: (path: LatLngLiteral[]) => void;
}

interface RouteComputeItem {
  path?: Array<{ lat: () => number; lng: () => number }>;
  distanceMeters?: number;
  durationMillis?: number;
  viewport?: unknown;
}

function TwoToneAnimatedRouteLayer({
  origin,
  destination,
  runnerPos,
  isDarkMode,
  autoFollow,
  recenterSignal,
  onRoutePathReady,
}: {
  origin: LatLngLiteral;
  destination: LatLngLiteral;
  runnerPos: LatLngLiteral;
  isDarkMode: boolean;
  autoFollow: boolean;
  recenterSignal: number;
  onRoutePathReady?: (path: LatLngLiteral[], distanceMeters: number, durationSeconds: number) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const mapsLib = useMapsLibrary('maps');
  const coreLib = useMapsLibrary('core');

  const [fullPath, setFullPath] = useState<LatLngLiteral[]>([]);
  const completedPolyRef = useRef<MapsPolylineInstance | null>(null);
  const remainingPolyRef = useRef<MapsPolylineInstance | null>(null);
  const hasFittedBoundsRef = useRef(false);

  // 1. Compute modern Routes API path between Pharmacy & Hostel Gate
  useEffect(() => {
    if (!map || !routesLib) return;

    let cancelled = false;
    hasFittedBoundsRef.current = false;

    const applyPath = (pts: LatLngLiteral[], distMeters: number, durSecs: number) => {
      if (cancelled) return;
      setFullPath(pts);

      if (coreLib && 'LatLngBounds' in coreLib && !hasFittedBoundsRef.current) {
        hasFittedBoundsRef.current = true;
        const BoundsCtor = (coreLib as unknown as {
          LatLngBounds: new () => { extend: (pt: LatLngLiteral) => void };
        }).LatLngBounds;
        const bounds = new BoundsCtor();
        pts.forEach((pt) => bounds.extend(pt));
        bounds.extend(origin);
        bounds.extend(destination);
        map.fitBounds(bounds as never, { top: 44, right: 44, bottom: 112, left: 44 });
      }

      onRoutePathReady?.(pts, distMeters, durSecs);
    };

    const useFallback = () => {
      const fallback = buildFallbackPath(origin, destination);
      applyPath(fallback, Math.round(haversineMeters(origin, destination) * 1.25), 960);
    };

    const RouteClass = (routesLib as unknown as {
      Route?: { computeRoutes: (req: unknown) => Promise<{ routes?: RouteComputeItem[] }> };
    }).Route;

    if (RouteClass && typeof RouteClass.computeRoutes === 'function') {
      RouteClass.computeRoutes({
        origin,
        destination,
        travelMode: 'DRIVING',
        fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
      })
        .then((res) => {
          if (cancelled) return;
          const primaryRoute = res?.routes?.[0];
          if (!primaryRoute) {
            useFallback();
            return;
          }
          const rawPath = primaryRoute.path ?? [];
          const normalizedPath: LatLngLiteral[] =
            rawPath.length >= 2
              ? rawPath.map((pt) => ({ lat: pt.lat(), lng: pt.lng() }))
              : buildFallbackPath(origin, destination);

          const distMeters =
            primaryRoute.distanceMeters ??
            Math.round(haversineMeters(origin, destination) * 1.25);
          const durSecs = primaryRoute.durationMillis
            ? Math.round(primaryRoute.durationMillis / 1000)
            : 960;

          applyPath(normalizedPath, distMeters, durSecs);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('OVER_QUERY_LIMIT') ||
            msg.includes('429')
          ) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          useFallback();
        });
    } else {
      useFallback();
    }

    return () => {
      cancelled = true;
    };
  }, [map, routesLib, coreLib, origin.lat, origin.lng, destination.lat, destination.lng]);

  // 2. Render & animate two-tone route polylines (solid teal completed + animated dashed remaining)
  useEffect(() => {
    if (!map || !mapsLib || !('Polyline' in mapsLib) || fullPath.length < 2) return;

    const PolylineCtor = (mapsLib as unknown as {
      Polyline: new (opts: Record<string, unknown>) => MapsPolylineInstance;
    }).Polyline;

    const splitIdx = findNearestPathIndex(fullPath, runnerPos);
    const completedSegment =
      splitIdx > 0 ? [...fullPath.slice(0, splitIdx + 1), runnerPos] : [origin, runnerPos];
    const remainingSegment = [runnerPos, ...fullPath.slice(splitIdx + 1)];

    if (!completedPolyRef.current) {
      completedPolyRef.current = new PolylineCtor({
        path: completedSegment,
        geodesic: true,
        strokeColor: '#14B8A6',
        strokeOpacity: 0.96,
        strokeWeight: 6,
        zIndex: 3,
        map,
      });
    } else {
      completedPolyRef.current.setOptions({
        path: completedSegment,
        strokeColor: '#14B8A6',
        strokeOpacity: 0.96,
        strokeWeight: 6,
        map,
      });
    }

    const dashColor = isDarkMode ? '#5EEAD4' : '#0F766E';
    if (!remainingPolyRef.current) {
      remainingPolyRef.current = new PolylineCtor({
        path: remainingSegment,
        geodesic: true,
        strokeOpacity: 0,
        strokeWeight: 4,
        zIndex: 2,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.92,
              strokeColor: dashColor,
              scale: 3.2,
            },
            offset: '0px',
            repeat: '16px',
          },
        ],
        map,
      });
    } else {
      remainingPolyRef.current.setOptions({
        path: remainingSegment,
        strokeOpacity: 0,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.92,
              strokeColor: dashColor,
              scale: 3.2,
            },
            offset: '0px',
            repeat: '16px',
          },
        ],
        map,
      });
    }

    let stepOffset = 0;
    const animTimer = window.setInterval(() => {
      stepOffset = (stepOffset + 2) % 16;
      remainingPolyRef.current?.setOptions({
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.92,
              strokeColor: dashColor,
              scale: 3.2,
            },
            offset: `${stepOffset}px`,
            repeat: '16px',
          },
        ],
      });
    }, 110);

    return () => {
      window.clearInterval(animTimer);
    };
  }, [map, mapsLib, fullPath, runnerPos.lat, runnerPos.lng, origin.lat, origin.lng, isDarkMode]);

  // Cleanup polylines when component unmounts
  useEffect(() => {
    return () => {
      completedPolyRef.current?.setMap(null);
      remainingPolyRef.current?.setMap(null);
      completedPolyRef.current = null;
      remainingPolyRef.current = null;
    };
  }, []);

  // 3. Smooth camera auto-pan when runner moves or user clicks Re-center
  useEffect(() => {
    if (!map || !autoFollow) return;
    map.panTo(runnerPos);
  }, [map, autoFollow, runnerPos.lat, runnerPos.lng]);

  useEffect(() => {
    if (!map || recenterSignal === 0 || !coreLib || !('LatLngBounds' in coreLib)) return;
    const BoundsCtor = (coreLib as unknown as {
      LatLngBounds: new () => { extend: (pt: LatLngLiteral) => void };
    }).LatLngBounds;
    const bounds = new BoundsCtor();
    bounds.extend(origin);
    bounds.extend(runnerPos);
    bounds.extend(destination);
    map.fitBounds(bounds as never, { top: 44, right: 44, bottom: 112, left: 44 });
  }, [map, coreLib, recenterSignal]);

  return null;
}

export function LiveDeliveryMap({
  order,
  isDarkMode = false,
  secondsRemaining,
  onRoutePathReady,
}: LiveDeliveryMapProps) {
  const [routeError, setRouteError] = useState<string | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [headingDeg, setHeadingDeg] = useState<number>(() =>
    computeBearingDeg(PHARMACY_ORIGIN, { lat: order.gateLat, lng: order.gateLng })
  );

  const prevRunnerRef = useRef<LatLngLiteral>({ lat: order.runnerLat, lng: order.runnerLng });

  const destination: LatLngLiteral = { lat: order.gateLat, lng: order.gateLng };
  const runnerPos: LatLngLiteral = { lat: order.runnerLat, lng: order.runnerLng };

  useEffect(() => {
    const prev = prevRunnerRef.current;
    const movedMeters = haversineMeters(prev, runnerPos);
    if (movedMeters > 4) {
      setHeadingDeg(computeBearingDeg(prev, runnerPos));
      prevRunnerRef.current = runnerPos;
    } else if (order.status === 'queued') {
      setHeadingDeg(computeBearingDeg(PHARMACY_ORIGIN, destination));
    }
  }, [runnerPos.lat, runnerPos.lng, order.status, destination.lat, destination.lng]);

  const midpoint: LatLngLiteral = useMemo(
    () => ({
      lat: (PHARMACY_ORIGIN.lat + destination.lat) / 2,
      lng: (PHARMACY_ORIGIN.lng + destination.lng) / 2,
    }),
    [destination.lat, destination.lng]
  );

  const remainingMeters = Math.round(haversineMeters(runnerPos, destination));
  const remainingKmDisplay = (remainingMeters / 1000).toFixed(2);
  const isMoving = order.status === 'picked_up' || order.status === 'gate_cleared';
  const liveSpeedKmh =
    order.status === 'delivered' || order.status === 'arrived'
      ? 0
      : isMoving
      ? 24
      : 0;
  const etaMinsDisplay =
    order.status === 'delivered' || order.status === 'arrived'
      ? 'Arrived'
      : typeof secondsRemaining === 'number'
      ? `${Math.max(1, Math.ceil(secondsRemaining / 60))} min`
      : `~${order.deliveryMinutes} min`;

  return (
    <div className="space-y-2.5">
      <div className="w-full h-[350px] sm:h-[420px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 relative shadow-[0_18px_40px_-16px_rgba(15,23,42,0.28)]">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          colorScheme={isDarkMode ? ColorScheme.DARK : ColorScheme.LIGHT}
          defaultCenter={midpoint}
          defaultZoom={14}
          gestureHandling="greedy"
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onDragstart={() => setAutoFollow(false)}
          style={{ width: '100%', height: '100%' }}
        >
          <TwoToneAnimatedRouteLayer
            origin={PHARMACY_ORIGIN}
            destination={destination}
            runnerPos={runnerPos}
            isDarkMode={isDarkMode}
            autoFollow={autoFollow}
            recenterSignal={recenterSignal}
            onRoutePathReady={(pts, dist, dur) => {
              setRouteError(null);
              onRoutePathReady?.(pts, dist, dur);
            }}
          />

          {/* 1. Custom Glowing 24/7 Pharmacy Cross Badge */}
          <AdvancedMarker
            position={PHARMACY_ORIGIN}
            zIndex={10}
            title="24/7 Partner Pharmacy (Premnagar)"
          >
            <div className="relative flex flex-col items-center">
              <div className="relative flex items-center gap-1.5 rounded-2xl bg-slate-900 border-2 border-emerald-400 text-white px-2.5 py-1.5 shadow-[0_0_18px_rgba(16,185,129,0.5)]">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Cross className="w-3.5 h-3.5 text-emerald-400 stroke-[2.75]" />
                </div>
                <div className="leading-none">
                  <div className="text-[10px] font-bold tracking-tight">24/7 Rx</div>
                  <div className="text-[8px] text-emerald-300 font-medium">Pharmacy</div>
                </div>
              </div>
            </div>
          </AdvancedMarker>

          {/* 2. Pulsing Hostel Gate Radar Pin with Concentric Ripple Rings */}
          <AdvancedMarker
            position={destination}
            zIndex={12}
            title={`${order.hostelName} (Room ${order.roomNumber})`}
          >
            <div className="relative flex flex-col items-center">
              <div className="relative flex items-center justify-center w-12 h-12">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-teal-500/30 animate-ping motion-reduce:hidden"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-1.5 rounded-full border-2 border-teal-400/70"
                />
                <div className="relative w-8 h-8 rounded-full bg-teal-600 border-2 border-white shadow-[0_6px_16px_rgba(13,148,136,0.65)] flex items-center justify-center text-white">
                  <MapPin className="w-4 h-4 fill-white/25" />
                </div>
              </div>
              <span className="mt-0.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-teal-400/40 px-2 py-0.5 text-[10px] font-bold text-white shadow-md whitespace-nowrap max-w-[140px] truncate">
                {order.hostelName}
              </span>
            </div>
          </AdvancedMarker>

          {/* 3. Custom Rotating Runner Scooter/Bike Icon */}
          <AdvancedMarker
            position={runnerPos}
            zIndex={25}
            title={`Runner: ${order.runnerName}`}
          >
            <div className="relative flex flex-col items-center">
              <div className="relative flex items-center justify-center w-12 h-12">
                {order.status !== 'delivered' && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-emerald-400/35 animate-ping motion-reduce:hidden"
                  />
                )}
                <div
                  style={{
                    transform: `rotate(${Math.round(headingDeg)}deg)`,
                    transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className="relative w-10 h-10 rounded-full bg-slate-950 border-2 border-teal-400 shadow-[0_8px_20px_rgba(15,23,42,0.65)] flex items-center justify-center"
                >
                  {/* Custom Delivery Scooter / Bike Top-Down Vector Icon (North = 0 deg) */}
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-teal-300"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 2L15.5 7.5V15.5L14 21H10L8.5 15.5V7.5L12 2Z"
                      fill="currentColor"
                      fillOpacity="0.22"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7.5 8.5H16.5"
                      stroke="#5EEAD4"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <rect
                      x="9.5"
                      y="12.5"
                      width="5"
                      height="4.5"
                      rx="1"
                      fill="#14B8A6"
                    />
                  </svg>
                </div>
              </div>
              <span className="mt-0.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-teal-400/60 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md whitespace-nowrap">
                {order.runnerName.split(' ')[0]} · {liveSpeedKmh > 0 ? `${liveSpeedKmh} km/h` : 'Ready'}
              </span>
            </div>
          </AdvancedMarker>
        </GoogleMap>

        {/* Top-Right Auto-Follow / Re-center Control */}
        <button
          type="button"
          onClick={() => {
            setAutoFollow(true);
            setRecenterSignal((c) => c + 1);
          }}
          className="absolute top-3 right-3 z-10 min-h-[38px] px-3 py-1.5 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-md flex items-center gap-1.5 hover:border-teal-500 transition-colors"
        >
          <LocateFixed className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>{autoFollow ? 'Following Runner' : 'Re-center Route'}</span>
        </button>

        {/* Bottom Floating Glassmorphism Live ETA & Speed Telemetry Card */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10">
          <div className="pointer-events-auto rounded-2xl bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_12px_30px_-10px_rgba(15,23,42,0.35)] px-3.5 py-2.5 grid grid-cols-3 gap-2 items-center">
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Live ETA
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white tabular-nums truncate">
                {etaMinsDisplay}
              </div>
            </div>

            <div className="min-w-0 border-l border-slate-200 dark:border-slate-800 pl-2.5">
              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>Speed</span>
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-teal-700 dark:text-teal-300 tabular-nums truncate">
                {liveSpeedKmh} km/h
              </div>
            </div>

            <div className="min-w-0 border-l border-slate-200 dark:border-slate-800 pl-2.5 text-right">
              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 justify-end">
                <Compass className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Remaining</span>
              </div>
              <div className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white tabular-nums truncate">
                {order.status === 'delivered' || order.status === 'arrived'
                  ? '0.00 km'
                  : `${remainingKmDisplay} km`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 px-1">
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-slate-900 dark:text-slate-200">Solid Teal:</strong> Completed
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-teal-700 dark:text-teal-400">Animated Dashed:</strong> Remaining Route
          </span>
        </div>
        <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
          Runner @ {runnerPos.lat.toFixed(4)}, {runnerPos.lng.toFixed(4)}
        </span>
      </div>

      {routeError && (
        <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
          {routeError}
        </p>
      )}
    </div>
  );
}
