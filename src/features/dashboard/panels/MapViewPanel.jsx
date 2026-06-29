import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import navUpIcon from '../../../assets/images/icon_nav_up.svg';
import droneIconImage from '../../../assets/images/icon_drone.svg';
import droneCenterMissionIcon from '../../../assets/images/icon_drone_center_mission.svg';

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
const HOME_MARKER_Z_INDEX = 0;
const DRONE_MARKER_Z_INDEX = 1000;

const createDroneIcon = (heading) => new L.DivIcon({
    className: 'custom-drone-icon',
    html: `
        <div style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:flex; align-items:center; justify-content:center; transform: rotate(${heading || 0}deg); transform-origin: ${DRONE_ICON_CENTER_X}px ${DRONE_ICON_CENTER_Y}px; transition: transform 0.3s ease;">
            <img src="${droneIconImage}" alt="Drone" style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:block;" />
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

const overlayTopStroke = 'linear-gradient(90deg, #E83737 0%, rgba(251,85,85,0.2) 50%, #E83737 100%)';
const overlayBottomStroke = 'linear-gradient(90deg, rgba(251,85,85,0.2) 0%, #E83737 22%, #E83737 100%)';

// Component to auto-pan the map to follow the drone
function MapFollower({ position, shouldFollow, followZoom = 16, recenterRequest = 0, onRecenterComplete }) {
    const map = useMap();
    const hasInitialized = useRef(false);
    const lastRecenterRequest = useRef(recenterRequest);

    useEffect(() => {
        if (position && shouldFollow) {
            if (!hasInitialized.current) {
                map.setView(position, followZoom, { animate: false });
                hasInitialized.current = true;
            } else {
                map.panTo(position, { animate: true, duration: 1 });
            }
        }
    }, [position, shouldFollow, followZoom, map]);

    useEffect(() => {
        if (!position || recenterRequest === lastRecenterRequest.current) {
            return;
        }

        lastRecenterRequest.current = recenterRequest;
        hasInitialized.current = true;
        map.setView(position, map.getZoom(), { animate: true });
        onRecenterComplete?.();
    }, [position, recenterRequest, onRecenterComplete, map]);

    return null;
}

function MapInteractionHandler({ shouldFollow, onUserMove }) {
    useMapEvents({
        dragstart: () => {
            if (shouldFollow) {
                onUserMove();
            }
        },
        zoomstart: () => {
            if (shouldFollow) {
                onUserMove();
            }
        },
    });

    return null;
}

const trailPathOptions = {
    color: '#F54E4E',
    weight: 2,
    dashArray: '6, 8',
    opacity: 0.9
};

function MapControlButton({ children, className = '', ...props }) {
    return (
        <button
            type="button"
            className={`relative flex h-[54px] w-[54px] items-center justify-center overflow-hidden bg-[#222222] shadow-lg transition hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
            {...props}
        >
            <div
                className="pointer-events-none absolute left-0 top-0 h-px w-full"
                style={{ backgroundImage: overlayTopStroke }}
            />
            <div
                className="pointer-events-none absolute bottom-0 left-0 h-px w-full"
                style={{ backgroundImage: overlayBottomStroke }}
            />
            <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-[#E83737]" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-[#E83737]" />
            <span className="relative z-10 flex items-center justify-center">{children}</span>
        </button>
    );
}

function CompassOverlay({ heading = 0 }) {
    const normalizedHeading = Number.isFinite(Number(heading)) ? Number(heading) : 0;

    return (
        <div className="pointer-events-none absolute bottom-6 right-6 z-[450] flex h-32 w-32 items-center justify-center rounded-full bg-black/40">
            <div className="relative flex h-full w-full items-center justify-center rounded-full border border-gray-400/50">
                <span className="absolute top-2 left-1/2 z-[100] -translate-x-1/2 text-[11px] font-bold uppercase tracking-widest text-gray-200">N</span>
                <span className="absolute right-2 top-1/2 z-[100] -translate-y-1/2 text-[11px] font-bold uppercase tracking-widest text-gray-200">E</span>
                <span className="absolute bottom-2 left-1/2 z-[100] -translate-x-1/2 text-[11px] font-bold uppercase tracking-widest text-gray-200">S</span>
                <span className="absolute left-2 top-1/2 z-[100] -translate-y-1/2 text-[11px] font-bold uppercase tracking-widest text-gray-200">W</span>
                <div className="absolute left-0 top-1/2 h-[1px] w-full -translate-y-1/2 bg-gray-500/50" />
                <div className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-1/2 bg-gray-500/50" />
                <div className="absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-500/50" />
                <div className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-500/50" />
                {[...Array(12)].map((_, index) => (
                    <div
                        key={index}
                        className="absolute left-0 top-1/2 flex h-[2px] w-full -translate-y-1/2 justify-between px-1"
                        style={{ transform: `rotate(${index * 30}deg)` }}
                    >
                        <div className="h-full w-1.5 bg-gray-400" />
                        <div className="h-full w-1.5 bg-gray-400" />
                    </div>
                ))}
                <img
                    src={navUpIcon}
                    alt=""
                    aria-hidden="true"
                    className="absolute z-[100] h-8 w-8 object-contain transition-transform duration-300 ease-out"
                    style={{ transform: `rotate(${normalizedHeading}deg)` }}
                />
                <div className="absolute bottom-3 left-1/2 z-[100] -translate-x-1/2 rounded bg-black/45 px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] text-gray-100">
                    {`${Math.round(((normalizedHeading % 360) + 360) % 360)}°`}
                </div>
            </div>
        </div>
    );
}

export default function MapViewPanel({
    telemetry,
    telemetryStatus = null,
    selectedDrone,
    trailPositions = [],
    fallbackPosition = null,
    showCompass = false,
    lightShell = false,
}) {
    const mapRef = useRef(null);
    const defaultCenter = [-6.200000, 106.816666]; // Jakarta fallback
    const [isFollowEnabled, setIsFollowEnabled] = useState(true);
    const [recenterRequest, setRecenterRequest] = useState(0);

    // Get drone position from telemetry
    const location = telemetry?.location || {};
    const isLocationFresh = Boolean(telemetryStatus?.metrics?.location?.isFresh);
    const hasLocation = isLocationFresh && location.latitude != null && location.longitude != null;
    const liveDronePosition = hasLocation
        ? [location.latitude, location.longitude]
        : null;
    const dronePosition = liveDronePosition || fallbackPosition;
    const heading = isLocationFresh && location.heading != null ? location.heading : 0;

    // Home position from the selected drone detail
    const homePosition = selectedDrone?.home_latitude && selectedDrone?.home_longitude
        ? [selectedDrone.home_latitude, selectedDrone.home_longitude]
        : null;

    // Map center — use drone position, then home, then default
    const center = dronePosition || homePosition || defaultCenter;

    const parsedMaxRange = Number(selectedDrone?.max_range_meter);
    const maxRange = Number.isFinite(parsedMaxRange) && parsedMaxRange > 0 ? parsedMaxRange : null;

    useEffect(() => {
        setIsFollowEnabled(true);
        setRecenterRequest(0);
    }, [selectedDrone?.id]);

    const handleDisableFollow = () => {
        setIsFollowEnabled(false);
    };

    const handleRecenter = () => {
        if (!dronePosition) {
            return;
        }

        setIsFollowEnabled(true);
        setRecenterRequest((current) => current + 1);
    };

    const handleZoomIn = () => {
        mapRef.current?.zoomIn();
    };

    const handleZoomOut = () => {
        mapRef.current?.zoomOut();
    };

    return (
        <div
            className={`relative h-full w-full overflow-hidden select-none ${lightShell ? '' : 'bg-[#181d25]'}`}
            style={lightShell
                ? { background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }
                : undefined}
        >
            {/* Telemetry HUD overlay */}
            {hasLocation && (
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 z-[400] text-[9px] font-mono text-gray-300 flex gap-3">
                    <span>ALT {Number(location.altitude ?? 0).toFixed(1)}m</span>
                    <span>SPD {Number(location.ground_speed ?? 0).toFixed(1)}m/s</span>
                    <span>HDG {Number(heading).toFixed(0)}°</span>
                </div>
            )}

            <div className="absolute left-2 top-2 z-[400] flex items-center gap-2">
                <span className={`rounded-lg px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm ${
                    isFollowEnabled
                        ? 'bg-[#12352b]/80 text-[#7ce0b8]'
                        : 'bg-black/60 text-gray-300'
                }`}>
                    {isFollowEnabled ? 'Follow On' : 'Follow Off'}
                </span>
            </div>

            <MapContainer
                center={center}
                zoom={hasLocation ? 16 : 13}
                ref={mapRef}
                style={{ height: '100%', width: '100%', padding: 0 }}
                attributionControl={false}
                zoomControl={false}
                scrollWheelZoom={true}
                minZoom={3}
                maxZoom={18}
            >
                {/* Satellite tile layer */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='Tiles &copy; Esri'
                    maxNativeZoom={19}
                />

                <MapInteractionHandler shouldFollow={isFollowEnabled} onUserMove={handleDisableFollow} />

                {/* Follow drone position */}
                <MapFollower
                    position={dronePosition}
                    shouldFollow={Boolean(liveDronePosition) && isFollowEnabled}
                    recenterRequest={recenterRequest}
                />

                {/* Max Radius Circle around drone home */}
                {homePosition && maxRange != null && (
                    <Circle
                        center={homePosition}
                        radius={maxRange}
                        pathOptions={geofencePathOptions}
                    />
                )}

                {/* Home Marker */}
                {homePosition && (
                    <Marker position={homePosition} icon={dockIcon} zIndexOffset={HOME_MARKER_Z_INDEX} />
                )}

                {/* Drone Marker — live from telemetry */}
                {dronePosition && (
                    <Marker
                        position={dronePosition}
                        icon={createDroneIcon(heading)}
                        zIndexOffset={DRONE_MARKER_Z_INDEX}
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

            <div className="absolute top-[60vh] left-4 z-[450] flex flex-col">
                <div className="flex flex-col gap-1">
                    <MapControlButton onClick={handleRecenter} disabled={!dronePosition} aria-label="Center drone on map">
                        <img
                            src={droneCenterMissionIcon}
                            alt=""
                            aria-hidden="true"
                            className="h-5 w-5 object-contain"
                        />
                    </MapControlButton>
                    <MapControlButton onClick={handleZoomIn} aria-label="Zoom in">
                        <span className="text-[24px] leading-none text-white">+</span>
                    </MapControlButton>
                </div>
                <div className="mt-2">
                    <MapControlButton onClick={handleZoomOut} aria-label="Zoom out">
                        <span className="text-[24px] leading-none text-white">-</span>
                    </MapControlButton>
                </div>
            </div>

            {showCompass ? <CompassOverlay heading={heading} /> : null}
        </div>
    );
}
