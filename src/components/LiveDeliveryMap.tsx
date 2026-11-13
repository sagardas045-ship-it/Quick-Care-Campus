import { useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Navigation } from 'lucide-react';
import { PHARMACY_ORIGIN } from '../data/campusData';
import { CampusOrder, LatLngLiteral } from '../types';

interface LiveDeliveryMapProps {
  order: CampusOrder;
  onRoutePathReady?: (path: LatLngLiteral[], distanceMeters: number, durationSeconds: number) => void;
}

function buildFallbackPath(origin: LatLngLiteral, dest: LatLngLiteral, steps = 16): LatLngLiteral[] {
  const pts: LatLngLiteral[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    // Slight realistic curve offset for Dehradun campus roads
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

interface MapsPolylineInstance {
  setOptions: (opts: Record<string, unknown>) => void;
  setMap: (map: unknown | null) => void;
}

interface RouteComputeItem {
  path?: Array<{ lat: () => number; lng: () => number }>;
  distanceMeters?: number;
  durationMillis?: number;
  viewport?: unknown;
  createPolylines?: () => MapsPolylineInstance[];
}

function RoutePolylineLayer({
  origin,
  destination,
  onRoutePathReady,
}: {
  origin: LatLngLiteral;
  destination: LatLngLiteral;
  onRoutePathReady?: (path: LatLngLiteral[], distanceMeters: number, durationSeconds: number) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const mapsLib = useMapsLibrary('maps');
  const coreLib = useMapsLibrary('core');
  const polylinesRef = useRef<MapsPolylineInstance[]>([]);

  useEffect(() => {
    if (!map || !routesLib) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    let cancelled = false;

    const drawFallbackPolyline = () => {
      const fallback = buildFallbackPath(origin, destination);
      if (mapsLib && 'Polyline' in mapsLib) {
        const PolylineCtor = (mapsLib as unknown as {
          Polyline: new (opts: Record<string, unknown>) => MapsPolylineInstance;
        }).Polyline;
        const poly = new PolylineCtor({
          path: fallback,
          geodesic: true,
          strokeColor: '#0D9488',
          strokeOpacity: 0.85,
          strokeWeight: 5,
          map,
        });
        polylinesRef.current = [poly];
      }

      if (coreLib && 'LatLngBounds' in coreLib) {
        const BoundsCtor = (coreLib as unknown as {
          LatLngBounds: new () => { extend: (pt: LatLngLiteral) => void };
        }).LatLngBounds;
        const bounds = new BoundsCtor();
        bounds.extend(origin);
        bounds.extend(destination);
        map.fitBounds(bounds as never, 48);
      }

      onRoutePathReady?.(
        fallback,
        Math.round(haversineMeters(origin, destination) * 1.25),
        960
      );
    };

    const request = {
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    };

    const RouteClass = (routesLib as unknown as {
      Route?: { computeRoutes: (req: unknown) => Promise<{ routes?: RouteComputeItem[] }> };
    }).Route;

    if (RouteClass && typeof RouteClass.computeRoutes === 'function') {
      RouteClass.computeRoutes(request)
        .then((res) => {
          if (cancelled) return;
          const primaryRoute = res?.routes?.[0];
          if (!primaryRoute) {
            drawFallbackPolyline();
            return;
          }

          if (typeof primaryRoute.createPolylines === 'function') {
            const created = primaryRoute.createPolylines();
            created.forEach((polyline) => {
              polyline.setOptions({
                strokeColor: '#0D9488',
                strokeWeight: 5,
                strokeOpacity: 0.92,
              });
              polyline.setMap(map);
            });
            polylinesRef.current = created;
          }

          if (primaryRoute.viewport) {
            map.fitBounds(primaryRoute.viewport as never, 48);
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

          onRoutePathReady?.(normalizedPath, distMeters, durSecs);
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
          drawFallbackPolyline();
        });
    } else {
      drawFallbackPolyline();
    }

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routesLib, mapsLib, coreLib, origin.lat, origin.lng, destination.lat, destination.lng]);

  return null;
}

export function LiveDeliveryMap({ order, onRoutePathReady }: LiveDeliveryMapProps) {
  const [routeError, setRouteError] = useState<string | null>(null);
  const destination: LatLngLiteral = { lat: order.gateLat, lng: order.gateLng };
  const runnerPos: LatLngLiteral = { lat: order.runnerLat, lng: order.runnerLng };

  const midpoint: LatLngLiteral = {
    lat: (PHARMACY_ORIGIN.lat + destination.lat) / 2,
    lng: (PHARMACY_ORIGIN.lng + destination.lng) / 2,
  };

  return (
    <div className="space-y-2">
      <div className="w-full h-[300px] sm:h-[360px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={midpoint}
          defaultZoom={14}
          gestureHandling="greedy"
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          <RoutePolylineLayer
            origin={PHARMACY_ORIGIN}
            destination={destination}
            onRoutePathReady={(pts, dist, dur) => {
              setRouteError(null);
              onRoutePathReady?.(pts, dist, dur);
            }}
          />

          {/* 24/7 Partner Pharmacy Origin */}
          <AdvancedMarker position={PHARMACY_ORIGIN} title="24/7 Partner Pharmacy (Premnagar)">
            <Pin background="#0F172A" borderColor="#FFFFFF" glyphColor="#5EEAD4" glyphText="Rx" />
          </AdvancedMarker>

          {/* Student's Saved Hostel Gate Pin */}
          <AdvancedMarker
            position={destination}
            title={`${order.hostelName} (Room ${order.roomNumber})`}
          >
            <Pin background="#0D9488" borderColor="#0F172A" glyphColor="#FFFFFF" scale={1.15} />
          </AdvancedMarker>

          {/* Live Moving Student Runner Marker */}
          <AdvancedMarker
            position={runnerPos}
            zIndex={20}
            title={`Runner: ${order.runnerName}`}
          >
            <div className="flex items-center gap-1 rounded-full bg-slate-900 border-2 border-amber-400 text-white px-2.5 py-1 shadow-md text-[11px] font-bold whitespace-nowrap">
              <Navigation className="w-3 h-3 text-teal-300 fill-teal-300" />
              <span>{order.runnerName.split(' ')[0]}</span>
            </div>
          </AdvancedMarker>
        </GoogleMap>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1">
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-slate-900">Rx:</strong> 24/7 Pharmacy
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-teal-700">Pin:</strong> {order.hostelName}
          </span>
        </div>
        <span className="font-mono tabular-nums text-[11px] text-slate-500">
          Runner @ {runnerPos.lat.toFixed(4)}, {runnerPos.lng.toFixed(4)}
        </span>
      </div>

      {routeError && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          {routeError}
        </p>
      )}
    </div>
  );
}
