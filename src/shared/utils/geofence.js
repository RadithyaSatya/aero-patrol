const WORLD_RING = [
    [-180, -90],
    [180, -90],
    [180, 90],
    [-180, 90],
    [-180, -90],
];

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const normalizeRing = (ring) => {
    if (!Array.isArray(ring)) {
        return [];
    }

    return ring
        .filter((point) => Array.isArray(point) && point.length >= 2 && isFiniteNumber(point[0]) && isFiniteNumber(point[1]))
        .map(([longitude, latitude]) => [Number(longitude), Number(latitude)]);
};

const normalizePolygonCoordinates = (coordinates) => {
    if (!Array.isArray(coordinates)) {
        return [];
    }

    return coordinates
        .map(normalizeRing)
        .filter((ring) => ring.length >= 4);
};

export const geofenceAreaPathOptions = {
    color: '#E1BA95',
    fillColor: 'transparent',
    fillOpacity: 0,
    weight: 1.2,
};

export const geofenceRadiusPathOptions = {
    color: '#E1BA95',
    fillColor: 'transparent',
    fillOpacity: 0,
    weight: 0.3,
};

export const geofenceMaskPathOptions = {
    stroke: false,
    fillColor: '#081019',
    fillOpacity: 0.48,
    interactive: false,
};

export const buildGeofenceMaskGeoJson = (geoJson) => {
    const features = Array.isArray(geoJson?.features) ? geoJson.features : [];

    const maskFeatures = features.flatMap((feature) => {
        const geometry = feature?.geometry;

        if (!geometry) {
            return [];
        }

        if (geometry.type === 'Polygon') {
            const holes = normalizePolygonCoordinates(geometry.coordinates);
            if (holes.length === 0) {
                return [];
            }

            return [{
                type: 'Feature',
                properties: {
                    isMask: true,
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [WORLD_RING, ...holes],
                },
            }];
        }

        if (geometry.type === 'MultiPolygon') {
            const polygons = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
            const normalizedPolygons = polygons
                .map(normalizePolygonCoordinates)
                .filter((polygon) => polygon.length > 0);

            if (normalizedPolygons.length === 0) {
                return [];
            }

            return [{
                type: 'Feature',
                properties: {
                    isMask: true,
                },
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: normalizedPolygons.map((polygon) => [WORLD_RING, ...polygon]),
                },
            }];
        }

        return [];
    });

    return {
        type: 'FeatureCollection',
        features: maskFeatures,
    };
};
