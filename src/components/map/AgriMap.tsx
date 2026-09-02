import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Info } from 'lucide-react';
import { DeliveryWaypoint } from '../../types';

// Leaflet DivIcons for distinct markers
const pickupIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background-color: #15803d; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; font-weight: bold; font-size: 14px;">🌱</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const waypointIcon = (index: number) =>
  L.divIcon({
    className: 'custom-leaflet-pin',
    html: `<div style="background-color: #0f766e; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.25); border: 2px solid white; font-weight: bold; font-size: 11px;">#${index}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

const deliveryIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background-color: #1d4ed8; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; font-weight: bold; font-size: 14px;">🏢</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const transitIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background-color: #d97706; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(217,119,6,0.5); border: 2px solid white; font-weight: bold; font-size: 15px;">🚚</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

interface ChangeViewProps {
  center: [number, number];
  zoom: number;
}

function ChangeView({ center, zoom }: ChangeViewProps) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export interface AgriMapProps {
  pickupLat?: number;
  pickupLng?: number;
  pickupLabel?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryLabel?: string;
  currentLat?: number;
  currentLng?: number;
  status?: string;
  distanceKm?: number;
  durationMins?: number;
  waypoints?: (DeliveryWaypoint | { lat: number; lng: number; label?: string; order?: number; completed?: boolean; supplierName?: string; quantity?: number; location?: string })[];
  routeCoordinates?: [number, number][];
  currentTruckLat?: number;
  currentTruckLng?: number;
  height?: string;
  className?: string;
  isDemoRoute?: boolean;
}

export const AgriMap: React.FC<AgriMapProps> = ({
  pickupLat = 19.9975,
  pickupLng = 73.7898,
  pickupLabel = 'Origin / Farm Pickup',
  deliveryLat = 19.0760,
  deliveryLng = 72.8777,
  deliveryLabel = 'Buyer Warehouse Terminal',
  currentLat,
  currentLng,
  waypoints = [],
  routeCoordinates,
  currentTruckLat,
  currentTruckLng,
  height = '360px',
  className,
  isDemoRoute = false,
}) => {
  const centerLat = (pickupLat + deliveryLat) / 2;
  const centerLng = (pickupLng + deliveryLng) / 2;
  const center: [number, number] = [centerLat, centerLng];

  // Safely extract coordinates from any waypoint format
  const parsedWaypoints: { lat: number; lng: number; label: string; qty?: number; loc?: string }[] = waypoints.map((w: any, idx: number) => ({
    lat: Number(w.latitude ?? w.lat ?? pickupLat),
    lng: Number(w.longitude ?? w.lng ?? pickupLng),
    label: w.supplierName || w.label || `Waypoint #${idx + 1}`,
    qty: w.quantity,
    loc: w.location,
  }));

  // Compile full route coordinates
  const polylineCoords: [number, number][] =
    routeCoordinates && routeCoordinates.length > 0
      ? routeCoordinates
      : [
          [pickupLat, pickupLng],
          ...parsedWaypoints.map((w) => [w.lat, w.lng] as [number, number]),
          [deliveryLat, deliveryLng],
        ];

  const effectiveTruckLat = currentLat || currentTruckLat || (polylineCoords.length > 0 ? polylineCoords[Math.floor(polylineCoords.length / 2)][0] : centerLat);
  const effectiveTruckLng = currentLng || currentTruckLng || (polylineCoords.length > 0 ? polylineCoords[Math.floor(polylineCoords.length / 2)][1] : centerLng);
  const truckPos: [number, number] = [effectiveTruckLat, effectiveTruckLng];

  return (
    <div
      style={{ height }}
      className={`w-full rounded-3xl overflow-hidden shadow-soft border border-slate-200 relative ${
        className || ''
      }`}
    >
      <MapContainer
        center={center}
        zoom={parsedWaypoints.length > 0 ? 8 : 8}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeView center={center} zoom={parsedWaypoints.length > 0 ? 8 : 8} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Origin Pickup Marker */}
        <Marker position={[pickupLat, pickupLng]} icon={pickupIcon}>
          <Popup>
            <div className="text-xs p-1">
              <strong className="text-emerald-700 block font-bold">Origin / Primary Pickup</strong>
              <span>{pickupLabel}</span>
            </div>
          </Popup>
        </Marker>

        {/* Intermediate Waypoint Markers */}
        {parsedWaypoints.map((wp, idx) => (
          <Marker
            key={idx}
            position={[wp.lat, wp.lng]}
            icon={waypointIcon(idx + 1)}
          >
            <Popup>
              <div className="text-xs p-1">
                <strong className="text-teal-700 block font-bold">{wp.label}</strong>
                {wp.qty && <span>{wp.qty} kg {wp.loc ? `• ${wp.loc}` : ''}</span>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Delivery Destination Marker */}
        <Marker position={[deliveryLat, deliveryLng]} icon={deliveryIcon}>
          <Popup>
            <div className="text-xs p-1">
              <strong className="text-blue-700 block font-bold">Destination / Unloading Bay</strong>
              <span>{deliveryLabel}</span>
            </div>
          </Popup>
        </Marker>

        {/* Moving Truck / In Transit Marker */}
        <Marker position={truckPos} icon={transitIcon}>
          <Popup>
            <div className="text-xs p-1">
              <strong className="text-amber-700 block font-bold">Fleet In-Transit</strong>
              <span>GPS Telemetry Active</span>
            </div>
          </Popup>
        </Marker>

        {/* Polyline Route */}
        <Polyline
          positions={polylineCoords}
          pathOptions={{
            color: '#0f766e',
            weight: 5,
            opacity: 0.85,
            dashArray: '8, 8',
          }}
        />
      </MapContainer>

      {/* Map Status Overlay Badges */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5 items-start">
        <div className="bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-800 shadow-md border border-slate-200 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-teal-700 animate-pulse" />
          <span>OpenStreetMap Active</span>
        </div>

        {isDemoRoute && (
          <div className="bg-amber-50/95 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-xs">
            <Info className="w-3 h-3 text-amber-700" />
            <span>Direct highway corridor</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const MapView = AgriMap;
