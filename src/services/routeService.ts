import { calculateDistanceKm } from '../utils/helpers';

export interface RouteOptimizationResult {
  coordinates: [number, number][]; // [lat, lng] pairs for Leaflet Polyline
  distanceKm: number;
  durationMins: number;
  summary: string;
  steps: string[];
  isOptimized: boolean;
}

export async function optimizeRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  waypoints: [number, number][] = []
): Promise<RouteOptimizationResult> {
  const orsApiKey = import.meta.env.VITE_OPENROUTESERVICE_API_KEY;

  if (orsApiKey && orsApiKey !== 'your_openrouteservice_api_key_here' && orsApiKey.length > 20) {
    try {
      const allCoords = [
        [startLng, startLat],
        ...waypoints.map(([lat, lng]) => [lng, lat]),
        [endLng, endLat],
      ];

      const response = await fetch(
        'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: orsApiKey,
          },
          body: JSON.stringify({ coordinates: allCoords }),
        }
      );

      if (response.ok) {
        const geojson = await response.json();
        const feature = geojson.features?.[0];
        if (feature) {
          const rawCoords = feature.geometry.coordinates as [number, number][]; // [lng, lat]
          const leafletCoords: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
          const distanceKm = Math.round((feature.properties.summary.distance / 1000) * 10) / 10;
          const durationMins = Math.round(feature.properties.summary.duration / 60);

          const rawSteps = feature.properties.segments?.[0]?.steps || [];
          const stepInstructions: string[] = rawSteps.map((s: { instruction: string }) => s.instruction);

          return {
            coordinates: leafletCoords,
            distanceKm,
            durationMins,
            summary: `OpenRouteService Live Route (${distanceKm} km, ~${durationMins} mins)`,
            steps: stepInstructions.length > 0 ? stepInstructions.slice(0, 5) : [
              'Head towards agricultural corridor',
              'Follow National Highway feeder route',
              'Proceed to destination delivery bay',
            ],
            isOptimized: true,
          };
        }
      }
    } catch (err) {
      console.error('OpenRouteService request error:', err);
    }
  }

  // When OpenRouteService API is unconfigured: display direct geometric points transparently
  const directDistance = calculateDistanceKm(startLat, startLng, endLat, endLng);
  const drivingDistanceKm = Math.round((directDistance * 1.2) * 10) / 10;
  const durationMins = Math.round((drivingDistanceKm / 45) * 60);

  const directPoints: [number, number][] = [
    [startLat, startLng],
    ...waypoints,
    [endLat, endLng],
  ];

  return {
    coordinates: directPoints,
    distanceKm: drivingDistanceKm,
    durationMins,
    summary: `Direct Coordinates • Routing API Not Configured (${drivingDistanceKm} km est.)`,
    steps: [
      'Origin Farm Gate waypoint',
      ...waypoints.map((_, idx) => `Multi-supplier aggregation stop #${idx + 1}`),
      'Destination Unloading Bay',
    ],
    isOptimized: false,
  };
}
