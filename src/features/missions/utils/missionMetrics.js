const EARTH_RADIUS_METERS = 6371000;

const toFiniteNumber = (value) => {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
};

const toWaypointCoordinate = (waypoint) => {
    if (!waypoint) {
        return null;
    }

    const latitude = toFiniteNumber(waypoint.latitude ?? waypoint.lat);
    const longitude = toFiniteNumber(waypoint.longitude ?? waypoint.lng);

    if (latitude == null || longitude == null) {
        return null;
    }

    return { lat: latitude, lng: longitude };
};

export const getDistanceMeters = (pointA, pointB) => {
    if (!pointA || !pointB) {
        return 0;
    }

    const dLat = ((pointB.lat - pointA.lat) * Math.PI) / 180;
    const dLng = ((pointB.lng - pointA.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((pointA.lat * Math.PI) / 180) *
        Math.cos((pointB.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * c;
};

export const getMissionLengthMeters = (waypoints = []) => {
    const waypointCoordinates = (Array.isArray(waypoints) ? waypoints : [])
        .map(toWaypointCoordinate)
        .filter(Boolean);

    if (waypointCoordinates.length < 2) {
        return 0;
    }

    return waypointCoordinates.slice(1).reduce((totalDistance, waypoint, index) => {
        return totalDistance + getDistanceMeters(waypointCoordinates[index], waypoint);
    }, 0);
};

export const getMissionProfileLengthMeters = ({
    waypoints = [],
    homePosition = null,
} = {}) => {
    const waypointCoordinates = (Array.isArray(waypoints) ? waypoints : [])
        .map((waypoint) => ({
            position: toWaypointCoordinate(waypoint),
        }))
        .filter((waypoint) => waypoint.position);
    const hasHomePosition = homePosition
        && toFiniteNumber(homePosition.lat) != null
        && toFiniteNumber(homePosition.lng) != null;
    const normalizedHomePosition = hasHomePosition
        ? {
            lat: Number(homePosition.lat),
            lng: Number(homePosition.lng),
        }
        : null;

    let totalDistanceMeters = 0;

    if (waypointCoordinates.length === 0) {
        return totalDistanceMeters;
    }

    if (normalizedHomePosition) {
        const firstWaypoint = waypointCoordinates[0];
        totalDistanceMeters += getDistanceMeters(normalizedHomePosition, firstWaypoint.position);
    }

    waypointCoordinates.slice(1).forEach((waypoint, index) => {
        const previousWaypoint = waypointCoordinates[index];
        totalDistanceMeters += getDistanceMeters(previousWaypoint.position, waypoint.position);
    });

    if (normalizedHomePosition) {
        const lastWaypoint = waypointCoordinates[waypointCoordinates.length - 1];
        totalDistanceMeters += getDistanceMeters(lastWaypoint.position, normalizedHomePosition);
    }

    return totalDistanceMeters;
};

export const getEstimatedFlightDurationSeconds = (missionLengthMeters, flightSpeed) => {
    const normalizedDistance = toFiniteNumber(missionLengthMeters);
    const normalizedSpeed = toFiniteNumber(flightSpeed);

    if (normalizedDistance == null || normalizedDistance <= 0 || normalizedSpeed == null || normalizedSpeed <= 0) {
        return null;
    }

    return normalizedDistance / normalizedSpeed;
};

export const getMissionHoldDurationSeconds = ({
    takeoffHoldDuration = null,
    waypoints = [],
} = {}) => {
    const normalizedTakeoffHoldDuration = toFiniteNumber(takeoffHoldDuration);
    const totalWaypointHoldDuration = (Array.isArray(waypoints) ? waypoints : []).reduce((total, waypoint) => {
        const duration = toFiniteNumber(waypoint?.action_duration);
        return total + Math.max(0, duration ?? 0);
    }, 0);

    return Math.max(0, normalizedTakeoffHoldDuration ?? 0) + totalWaypointHoldDuration;
};

export const getEstimatedMissionDurationSeconds = ({
    missionLengthMeters,
    flightSpeed,
    takeoffHoldDuration = null,
    waypoints = [],
} = {}) => {
    const flightDuration = getEstimatedFlightDurationSeconds(missionLengthMeters, flightSpeed) ?? 0;
    const holdDuration = getMissionHoldDurationSeconds({ takeoffHoldDuration, waypoints });

    if (flightDuration <= 0 && holdDuration <= 0) {
        return null;
    }

    return flightDuration + holdDuration;
};

export const formatMissionDistance = (distanceMeters) => {
    const normalizedDistance = toFiniteNumber(distanceMeters);

    if (normalizedDistance == null || normalizedDistance <= 0) {
        return '0 m';
    }

    if (normalizedDistance >= 1000) {
        return `${(normalizedDistance / 1000).toFixed(2)} km`;
    }

    return `${Math.round(normalizedDistance)} m`;
};

export const formatFlightDuration = (durationSeconds) => {
    const normalizedDuration = toFiniteNumber(durationSeconds);

    if (normalizedDuration == null || normalizedDuration <= 0) {
        return '--';
    }

    const totalSeconds = Math.max(1, Math.round(normalizedDuration));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
        .map((value) => String(value).padStart(2, '0'))
        .join(':');
};
