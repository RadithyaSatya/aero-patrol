import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const dockIcon = new L.DivIcon({
    className: 'custom-dock-icon',
    html: `<div class="w-6 h-6 rounded-full bg-[#d4af37] text-black text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-[#d4af37]/50">H</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const DRONE_ICON_WIDTH = 68;
const DRONE_ICON_HEIGHT = 96;
const DRONE_ICON_CENTER_X = 34;
const DRONE_ICON_CENTER_Y = 74;

const createDroneIcon = (heading) => new L.DivIcon({
    className: 'custom-drone-icon',
    html: `
        <div style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:flex; align-items:center; justify-content:center; transform: rotate(${heading || 0}deg); transform-origin: ${DRONE_ICON_CENTER_X}px ${DRONE_ICON_CENTER_Y}px; transition: transform 0.3s ease;">
            <img src="/src/assets/images/icon_drone.svg" alt="Drone" style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:block;" />
        </div>
    `,
    iconSize: [DRONE_ICON_WIDTH, DRONE_ICON_HEIGHT],
    iconAnchor: [DRONE_ICON_CENTER_X, DRONE_ICON_CENTER_Y]
});

const createWaypointIcon = (number) => new L.DivIcon({
    className: 'custom-waypoint-icon',
    html: `<div class="w-5 h-5 rounded-full bg-[#682F2F] border border-[#682F2F] text-white text-[10px] font-bold flex items-center justify-center shadow-lg">${number}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const geofencePathOptions = {
    color: '#E1BA95',
    fillColor: '#9616161A',
    fillOpacity: 1,
    weight: 0.3
};

// Component to auto-pan the map to follow the drone
function MapFollower({ position, shouldFollow }) {
    const map = useMap();
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (position && shouldFollow) {
            if (!hasInitialized.current) {
                map.setView(position, 16, { animate: false });
                hasInitialized.current = true;
            } else {
                map.panTo(position, { animate: true, duration: 1 });
            }
        }
    }, [position, shouldFollow, map]);

    return null;
}

const trailPathOptions = {
    color: '#F54E4E',
    weight: 2,
    dashArray: '6, 8',
    opacity: 0.9
};

export default function MapViewPanel({ telemetry, selectedDrone, trailPositions = [] }) {
    const defaultCenter = [-6.200000, 106.816666]; // Jakarta fallback

    // Get drone position from telemetry
    const location = telemetry?.location || {};
    const hasLocation = location.latitude != null && location.longitude != null;
    const dronePosition = hasLocation
        ? [location.latitude, location.longitude]
        : null;
    const heading = location.heading ?? 0;

    // Home position from the selected drone detail
    const homePosition = selectedDrone?.home_latitude && selectedDrone?.home_longitude
        ? [selectedDrone.home_latitude, selectedDrone.home_longitude]
        : null;

    // Map center — use drone position, then home, then default
    const center = dronePosition || homePosition || defaultCenter;

    // Max range circle (use drone max_range or default 1800m)
    const maxRange = selectedDrone?.max_range_meter || 1800;

    return (
        <div className="relative h-full w-full overflow-hidden bg-[#181d25] select-none">
            {/* Telemetry HUD overlay */}
            {hasLocation && (
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 z-[400] text-[9px] font-mono text-gray-300 flex gap-3">
                    <span>ALT {Number(location.altitude ?? 0).toFixed(1)}m</span>
                    <span>SPD {Number(location.ground_speed ?? 0).toFixed(1)}m/s</span>
                    <span>HDG {Number(heading).toFixed(0)}°</span>
                </div>
            )}

            <MapContainer
                center={center}
                zoom={hasLocation ? 16 : 13}
                style={{ height: '100%', width: '100%' }}
                attributionControl={false}
                zoomControl={false}
                scrollWheelZoom={true}
            >
                {/* Dark CartoDB tile layer */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Follow drone position */}
                <MapFollower position={dronePosition} shouldFollow={hasLocation} />

                {/* Max Radius Circle around drone home */}
                {homePosition && (
                    <Circle
                        center={homePosition}
                        radius={maxRange}
                        pathOptions={geofencePathOptions}
                    />
                )}

                {/* Home Marker */}
                {homePosition && (
                    <Marker position={homePosition} icon={dockIcon} />
                )}

                {/* Drone Marker — live from telemetry */}
                {dronePosition && (
                    <Marker
                        position={dronePosition}
                        icon={createDroneIcon(heading)}
                    />
                )}

                {/* Live drone trail */}
                {trailPositions.length > 1 && (
                    <Polyline
                        positions={trailPositions}
                        pathOptions={trailPathOptions}
                    />
                )}
            </MapContainer>
        </div>
    );
}
