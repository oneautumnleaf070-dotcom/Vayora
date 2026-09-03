"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOptimizedRoute = calculateOptimizedRoute;
async function calculateOptimizedRoute(startCoords, endCoords, waypoints = []) {
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTESERVICE_API_KEY not configured on server.');
    }
    const coordinates = [
        [startCoords[1], startCoords[0]],
        ...waypoints.map(([lat, lng]) => [lng, lat]),
        [endCoords[1], endCoords[0]],
    ];
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: apiKey,
        },
        body: JSON.stringify({ coordinates }),
    });
    if (!response.ok) {
        throw new Error(`OpenRouteService error: ${response.statusText}`);
    }
    const geojson = await response.json();
    const feature = geojson.features?.[0];
    return {
        coordinates: feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distanceKm: Math.round((feature.properties.summary.distance / 1000) * 10) / 10,
        durationMins: Math.round(feature.properties.summary.duration / 60),
        steps: feature.properties.segments?.[0]?.steps?.map((s) => s.instruction) || [],
    };
}
//# sourceMappingURL=routeOptimization.js.map