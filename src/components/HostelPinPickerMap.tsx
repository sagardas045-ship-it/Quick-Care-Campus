import { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  ColorScheme,
  Map as GoogleMap,
  useMap,
} from '@vis.gl/react-google-maps';
import { Cross, Crosshair, MapPin } from 'lucide-react';
import { PHARMACY_ORIGIN } from '../data/campusData';
import { LatLngLiteral } from '../types';

interface HostelPinPickerMapProps {
  pin: LatLngLiteral;
  onChangePin: (coords: LatLngLiteral) => void;
  heightClass?: string;
  isDarkMode?: boolean;
}

function MapCameraSync({ target }: { target: LatLngLiteral }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(target);
  }, [map, target.lat, target.lng]);

  return null;
}

export function HostelPinPickerMap({
  pin,
  onChangePin,
  heightClass = 'h-[260px] sm:h-[300px]',
  isDarkMode = false,
}: HostelPinPickerMapProps) {
  const [locating, setLocating] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setGpsNotice('GPS geolocation is not supported in this browser. Drag the teal pin on the map instead.');
      return;
    }
    setLocating(true);
    setGpsNotice(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onChangePin({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
      },
      () => {
        setLocating(false);
        setGpsNotice('Could not read device GPS. Tap anywhere on the map or drag the teal pin to your hostel gate.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
          <span className="font-mono tabular-nums">
            {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentGps}
          disabled={locating}
          className="min-h-[40px] px-3 py-1.5 rounded-xl border border-teal-600 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>{locating ? 'Locating...' : 'Use My Current GPS Location'}</span>
        </button>
      </div>

      <div className={`w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 relative shadow-inner`}>
        <GoogleMap
          mapId="DEMO_MAP_ID"
          colorScheme={isDarkMode ? ColorScheme.DARK : ColorScheme.LIGHT}
          defaultCenter={pin}
          defaultZoom={15}
          gestureHandling="greedy"
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onClick={(e) => {
            if (e.detail.latLng) {
              onChangePin({
                lat: Number(e.detail.latLng.lat.toFixed(6)),
                lng: Number(e.detail.latLng.lng.toFixed(6)),
              });
            }
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <MapCameraSync target={pin} />

          {/* Partner 24/7 Pharmacy Reference Badge */}
          <AdvancedMarker position={PHARMACY_ORIGIN} title="24/7 Partner Pharmacy (Premnagar)">
            <div className="flex items-center gap-1 rounded-full bg-slate-900 border-2 border-emerald-400 text-white px-2.5 py-1 shadow-lg text-[10px] font-bold">
              <Cross className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
              <span>24/7 Rx</span>
            </div>
          </AdvancedMarker>

          {/* Draggable Hostel Gate Drop Pin */}
          <AdvancedMarker
            position={pin}
            draggable={true}
            title="Drag to your exact Hostel Gate handover point"
            onDragEnd={(e) => {
              if (e.latLng) {
                onChangePin({
                  lat: Number(e.latLng.lat().toFixed(6)),
                  lng: Number(e.latLng.lng().toFixed(6)),
                });
              }
            }}
          >
            <div className="relative flex items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute -inset-2 rounded-full bg-teal-500/30 animate-ping motion-reduce:hidden"
              />
              <div className="relative w-9 h-9 rounded-full bg-teal-600 border-2 border-white dark:border-slate-900 shadow-lg flex items-center justify-center text-white">
                <MapPin className="w-4 h-4 fill-white/25" />
              </div>
            </div>
          </AdvancedMarker>
        </GoogleMap>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Drag the teal pin or tap anywhere on the map to mark your exact hostel security gate handover spot.
      </p>

      {gpsNotice && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          {gpsNotice}
        </div>
      )}
    </div>
  );
}
