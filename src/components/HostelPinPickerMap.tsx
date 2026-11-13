import { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import { Crosshair, MapPin } from 'lucide-react';
import { PHARMACY_ORIGIN } from '../data/campusData';
import { LatLngLiteral } from '../types';

interface HostelPinPickerMapProps {
  pin: LatLngLiteral;
  onChangePin: (coords: LatLngLiteral) => void;
  heightClass?: string;
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
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span className="font-mono tabular-nums">
            {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentGps}
          disabled={locating}
          className="min-h-[40px] px-3 py-1.5 rounded-xl border border-teal-600 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>{locating ? 'Locating...' : 'Use My Current GPS Location'}</span>
        </button>
      </div>

      <div className={`w-full ${heightClass} rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative`}>
        <GoogleMap
          mapId="DEMO_MAP_ID"
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

          {/* Partner 24/7 Pharmacy Reference Pin */}
          <AdvancedMarker position={PHARMACY_ORIGIN} title="24/7 Partner Pharmacy (Premnagar)">
            <Pin background="#0F172A" borderColor="#FFFFFF" glyphColor="#5EEAD4" glyphText="Rx" />
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
            <Pin background="#0D9488" borderColor="#0F172A" glyphColor="#FFFFFF" scale={1.2} />
          </AdvancedMarker>
        </GoogleMap>
      </div>

      <p className="text-[11px] text-slate-500">
        Drag the teal pin or tap anywhere on the map to mark your exact hostel security gate handover spot.
      </p>

      {gpsNotice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {gpsNotice}
        </div>
      )}
    </div>
  );
}
