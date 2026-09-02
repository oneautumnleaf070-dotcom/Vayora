import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, Building, Sprout, Phone } from 'lucide-react';
import { DeliveryWaypoint } from '../../types';

// Distinct Custom Leaflet DivPins
const startIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background-color: #16a34a; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white; font-size: 15px;">🌱</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

const waypointIcon = (index: number, pickedUp?: boolean) =>
  L.divIcon({
    className: 'custom-leaflet-pin',
    html: `<div style="background-color: ${pickedUp ? '#10b981' : '#0d9488'}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.25); border: 2px solid white; font-weight: 800; font-size: 11px;">#${index}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

const destinationIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background-color: #0284c7; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white; font-size: 15px;">🏢</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

const driverLiveIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background-color: #f59e0b; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(245,158,11,0.6); border: 3px solid white; font-size: 16px; animation: pulse 2s infinite;">🚚</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

interface FitBoundsProps {
  bounds: [number, number][];
}

function AutoFitBounds({ bounds }: FitBoundsProps) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

export interface MapWithRouteProps {
  startLat: number;
  startLng: number;
  startLabel?: string;
  endLat: number;
  endLng: number;
  endLabel?: string;
  waypoints?: DeliveryWaypoint[];
  currentLat?: number;
  currentLng?: number;
  className?: string;
}

export const MapWithRoute: React.FC<MapWithRouteProps> = ({
  startLat,
  startLng,
  startLabel = 'Farm Origin Pickup',
  endLat,
  endLng,
  endLabel = 'Buyer Delivery Destination',
  waypoints = [],
  currentLat,
  currentLng,
  className = 'h-96 w-full rounded-3xl overflow-hidden shadow-soft border border-slate-200',
}) => {
  // Collect all points for polyline and bounding box
  const polylineCoords: [number, number][] = [
    [startLat, startLng],
    ...waypoints.map((w): [number, number] => [w.latitude, w.longitude]),
    [endLat, endLng],
  ];

  const allBounds: [number, number][] = [
    ...polylineCoords,
    ...(currentLat && currentLng ? [[currentLat, currentLng] as [number, number]] : []),
  ];

  const centerLat = (startLat + endLat) / 2 || 19.9975;
  const centerLng = (startLng + endLng) / 2 || 73.7898;

  return (
    <div className={className}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={10}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoFitBounds bounds={allBounds} />

        {/* Start Marker */}
        <Marker position={[startLat, startLng]} icon={startIcon}>
          <Popup>
            <div className="text-xs p-1 space-y-1">
              <span className="font-extrabold text-emerald-800 uppercase text-[10px] block">
                🌱 Origin Pickup
              </span>
              <p className="font-bold text-slate-900">{startLabel}</p>
            </div>
          </Popup>
        </Marker>

        {/* Multi-Supplier Waypoints */}
        {waypoints.map((wp, idx) => (
          <Marker
            key={wp.supplierId || idx}
            position={[wp.latitude, wp.longitude]}
            icon={waypointIcon(idx + 1, wp.pickedUp)}
          >
            <Popup>
              <div className="text-xs p-1 space-y-1">
                <span className="font-extrabold text-teal-800 uppercase text-[10px] block">
                  Stop #{idx + 1}: {wp.supplierName}
                </span>
                <p className="font-bold text-slate-900">
                  {wp.quantity} kg • {wp.location}
                </p>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold block w-fit ${
                    wp.pickedUp ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {wp.pickedUp ? '✓ Picked Up' : 'Pending Loading'}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Destination Marker */}
        <Marker position={[endLat, endLng]} icon={destinationIcon}>
          <Popup>
            <div className="text-xs p-1 space-y-1">
              <span className="font-extrabold text-blue-800 uppercase text-[10px] block">
                🏢 Delivery Destination
              </span>
              <p className="font-bold text-slate-900">{endLabel}</p>
            </div>
          </Popup>
        </Marker>

        {/* Live Driver Marker */}
        {currentLat && currentLng && (
          <Marker position={[currentLat, currentLng]} icon={driverLiveIcon}>
            <Popup>
              <div className="text-xs p-1 space-y-0.5">
                <span className="font-extrabold text-amber-800 uppercase text-[10px] block">
                  🚚 Current Driver GPS Location
                </span>
                <p className="font-mono text-slate-700">
                  {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline */}
        <Polyline
          positions={polylineCoords}
          pathOptions={{
            color: '#16a34a',
            weight: 4.5,
            opacity: 0.85,
            dashArray: '8, 8',
          }}
        />
      </MapContainer>
    </div>
  );
};
