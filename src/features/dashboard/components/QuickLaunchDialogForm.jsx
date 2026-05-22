import React, { useEffect, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import droneSingleIconImage from '../../../assets/images/icon_drone_single.svg';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_TAKEOFF_ALTITUDE = 25;
const DEFAULT_FLIGHT_ALTITUDE = 25;

const dockIcon = new L.DivIcon({
    className: 'custom-dock-icon',
    html: `<div class="w-6 h-6 rounded-full bg-[#d4af37] text-black text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-[#d4af37]/50">H</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const DRONE_ICON_SIZE = 28;

const droneIcon = new L.DivIcon({
    className: 'custom-drone-icon',
    html: `
        <div style="width:${DRONE_ICON_SIZE}px; height:${DRONE_ICON_SIZE}px; display:flex; align-items:center; justify-content:center;">
            <img src="${droneSingleIconImage}" alt="Drone" style="width:${DRONE_ICON_SIZE}px; height:${DRONE_ICON_SIZE}px; display:block;" />
        </div>
    `,
    iconSize: [DRONE_ICON_SIZE, DRONE_ICON_SIZE],
    iconAnchor: [DRONE_ICON_SIZE / 2, DRONE_ICON_SIZE / 2],
});

const roiIcon = new L.DivIcon({
    className: 'custom-roi-icon',
    html: `
        <div style="position:relative; width:32px; height:32px;">
            <div style="position:absolute; inset:0; border-radius:50%; background:rgba(239,68,68,0.25); animation: roiPulse 1.5s ease-in-out infinite;"></div>
            <div style="position:absolute; top:4px; left:4px; width:24px; height:24px; border-radius:50%; background:rgba(239,68,68,0.4); border: 2px solid #ef4444;"></div>
            <div style="position:absolute; top:11px; left:11px; width:10px; height:10px; border-radius:50%; background:#ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.8);"></div>
        </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const spiralCenterIcon = new L.DivIcon({
    className: 'custom-spiral-center-icon',
    html: `
        <div style="position:relative; width:24px; height:24px;">
            <div style="position:absolute; inset:0; border-radius:50%; background:rgba(168,85,247,0.3); border: 2px solid #a855f7;"></div>
            <div style="position:absolute; top:7px; left:7px; width:10px; height:10px; border-radius:50%; background:#a855f7; box-shadow: 0 0 6px rgba(168,85,247,0.8);"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const createSpiralWaypointIcon = (number) => new L.DivIcon({
    className: 'custom-spiral-wp-icon',
    html: `<div style="width:22px; height:22px; border-radius:50%; background:#682F2F; border: 2px solid #682F2F; color:white; font-size:9px; font-weight:bold; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 8px rgba(104,47,47,0.4);">${number}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
});

const geofencePathOptions = {
    color: '#E1BA95',
    fillColor: '#9616161A',
    fillOpacity: 1,
    weight: 0.3,
};

function getDistanceMeters(latlng1, latlng2) {
    const R = 6371000;
    const dLat = ((latlng2.lat - latlng1.lat) * Math.PI) / 180;
    const dLng = ((latlng2.lng - latlng1.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((latlng1.lat * Math.PI) / 180) *
        Math.cos((latlng2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function generateCircleWaypoints(center, radiusMeters, count = 12) {
    const points = [];
    const R = 6371000;
    const lat1 = (center.lat * Math.PI) / 180;
    const lng1 = (center.lng * Math.PI) / 180;
    const d = radiusMeters / R;

    for (let index = 0; index < count; index += 1) {
        const bearing = ((2 * Math.PI) / count) * index;
        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
        );
        const lng2 =
            lng1 +
            Math.atan2(
                Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
                Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
            );

        points.push({
            lat: (lat2 * 180) / Math.PI,
            lng: (lng2 * 180) / Math.PI,
        });
    }

    return points;
}

function toLatLng(latitude, longitude) {
    if (latitude == null || longitude == null) {
        return null;
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
        return null;
    }

    return [parsedLatitude, parsedLongitude];
}

function MapInteractionHandler({ onClickRef }) {
    useMapEvents({
        click(event) {
            if (onClickRef.current?.onClick) {
                onClickRef.current.onClick(event);
            }
        },
        mousemove(event) {
            if (onClickRef.current?.onMouseMove) {
                onClickRef.current.onMouseMove(event);
            }
        },
    });

    return null;
}

function ZoomControls() {
    const map = useMap();

    return (
        <div className="absolute right-6 top-1/2 z-30 flex -translate-y-1/2 transform flex-col gap-2">
            <button
                type="button"
                onClick={() => map.zoomIn()}
                className="h-10 w-10 rounded-md border border-[#2d3748] bg-[#1a202c]/90 text-xl font-bold text-white transition-colors hover:bg-[#2d3748]"
            >
                +
            </button>
            <button
                type="button"
                onClick={() => map.zoomOut()}
                className="h-10 w-10 rounded-md border border-[#2d3748] bg-[#1a202c]/90 text-xl font-bold text-white transition-colors hover:bg-[#2d3748]"
            >
                -
            </button>
        </div>
    );
}

function CoordinateField({ label, position, accentClass, onClear, emptyLabel }) {
    return (
        <div className="flex flex-col">
            <label className="mb-2 px-2 text-center text-[10px] text-gray-400 shadow-black drop-shadow-md">{label}</label>
            <div className="flex h-[32px] min-w-[240px] items-center gap-3 rounded border border-[#2d3748] bg-[#1a202c]/90 px-3">
                {position ? (
                    <>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-gray-500">LAT</span>
                            <span className={`font-mono text-[12px] ${accentClass}`}>{position.lat.toFixed(6)}</span>
                        </div>
                        <div className="h-4 w-px bg-[#2d3748]" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-gray-500">LNG</span>
                            <span className={`font-mono text-[12px] ${accentClass}`}>{position.lng.toFixed(6)}</span>
                        </div>
                        <div className="h-4 w-px bg-[#2d3748]" />
                        <button
                            type="button"
                            onClick={onClear}
                            className="flex h-5 w-5 items-center justify-center rounded-full border-none bg-red-500/20 p-0 text-red-400 transition-colors hover:bg-red-500/40 hover:text-red-300"
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <path d="M2 2L8 8M8 2L2 8" />
                            </svg>
                        </button>
                    </>
                ) : (
                    <span className="text-[11px] italic text-gray-500">{emptyLabel}</span>
                )}
            </div>
        </div>
    );
}

export default function QuickLaunchDialogForm({
    isOpen,
    missionType,
    selectedDrone,
    onClose,
    onLaunch,
    isLaunching = false,
    submitError = '',
}) {
    const [roiPosition, setRoiPosition] = useState(null);
    const [takeoffAltitude, setTakeoffAltitude] = useState(String(DEFAULT_TAKEOFF_ALTITUDE));
    const [flightAltitude, setFlightAltitude] = useState(String(DEFAULT_FLIGHT_ALTITUDE));
    const [localError, setLocalError] = useState('');

    const [spiralPhase, setSpiralPhase] = useState('settingCenter');
    const [spiralCenter, setSpiralCenter] = useState(null);
    const [spiralRadiusMeters, setSpiralRadiusMeters] = useState(0);
    const [previewRadius, setPreviewRadius] = useState(0);
    const [spiralWaypoints, setSpiralWaypoints] = useState([]);

    const spiralCenterRef = useRef(null);
    const spiralPhaseRef = useRef(spiralPhase);
    const mapInteractionRef = useRef(null);

    const isLaunch = missionType === 'Launch';
    const isROI = missionType === 'ROI';
    const isSpiral = missionType === 'Spiral';

    useEffect(() => {
        spiralCenterRef.current = spiralCenter;
    }, [spiralCenter]);

    useEffect(() => {
        spiralPhaseRef.current = spiralPhase;
    }, [spiralPhase]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setRoiPosition(null);
        setTakeoffAltitude(String(DEFAULT_TAKEOFF_ALTITUDE));
        setFlightAltitude(String(DEFAULT_FLIGHT_ALTITUDE));
        setLocalError('');
        setSpiralPhase('settingCenter');
        setSpiralCenter(null);
        setSpiralRadiusMeters(0);
        setPreviewRadius(0);
        setSpiralWaypoints([]);
    }, [isOpen, missionType]);

    useEffect(() => {
        mapInteractionRef.current = {
            onMouseMove: (event) => {
                if (isSpiral && spiralPhaseRef.current === 'settingRadius' && spiralCenterRef.current) {
                    const position = { lat: event.latlng.lat, lng: event.latlng.lng };
                    const distance = getDistanceMeters(spiralCenterRef.current, position);
                    setPreviewRadius(Math.round(distance));
                }
            },
            onClick: (event) => {
                const position = { lat: event.latlng.lat, lng: event.latlng.lng };
                setLocalError('');

                if (isROI) {
                    setRoiPosition(position);
                    return;
                }

                if (!isSpiral) {
                    return;
                }

                const phase = spiralPhaseRef.current;

                if (phase === 'settingCenter') {
                    setSpiralCenter(position);
                    spiralCenterRef.current = position;
                    setSpiralPhase('settingRadius');
                    spiralPhaseRef.current = 'settingRadius';
                    setPreviewRadius(0);
                    setSpiralWaypoints([]);
                    return;
                }

                if (phase === 'settingRadius') {
                    const center = spiralCenterRef.current;
                    if (!center) {
                        return;
                    }

                    const distance = getDistanceMeters(center, position);
                    setSpiralRadiusMeters(Math.round(distance));
                    setSpiralPhase('complete');
                    spiralPhaseRef.current = 'complete';
                    setPreviewRadius(0);
                }
            },
        };
    }, [isLaunch, isROI, isSpiral]);

    if (!isOpen) {
        return null;
    }

    const defaultCenter = [-6.2, 106.816666];
    const dockPosition = toLatLng(selectedDrone?.home_latitude, selectedDrone?.home_longitude);
    const dronePosition = dockPosition;
    const center = dronePosition || dockPosition || defaultCenter;
    const initialZoom = dronePosition ? 16 : 13;
    const parsedFenceRadius = Number(selectedDrone?.max_range_meter);
    const fenceRadius = Number.isFinite(parsedFenceRadius) && parsedFenceRadius > 0 ? parsedFenceRadius : null;
    const launchWaypoint = dockPosition
        ? { lat: dockPosition[0], lng: dockPosition[1] }
        : null;

    const isSpiralOutOfBounds = (() => {
        if (!spiralCenter || !dockPosition || fenceRadius == null) {
            return false;
        }

        const dockLatLng = { lat: dockPosition[0], lng: dockPosition[1] };
        const distanceFromDock = getDistanceMeters(dockLatLng, spiralCenter);
        const currentRadius = spiralPhase === 'settingRadius' ? previewRadius : spiralRadiusMeters;

        return (distanceFromDock + currentRadius) > fenceRadius;
    })();

    const waypointCount = (() => {
        const radius = spiralRadiusMeters || previewRadius;
        if (radius <= 0) {
            return 12;
        }

        const circumference = 2 * Math.PI * radius;
        return Math.max(8, Math.min(24, Math.round(circumference / 50)));
    })();

    const displayRadius = spiralPhase === 'settingRadius' ? previewRadius : spiralRadiusMeters;
    const waypointPositions = spiralWaypoints.length > 0
        ? [...spiralWaypoints.map((waypoint) => [waypoint.lat, waypoint.lng]), [spiralWaypoints[0].lat, spiralWaypoints[0].lng]]
        : [];
    const dialogTitle = isLaunch ? 'Configure Takeoff' : 'Choose a location';

    const getMapInstruction = () => {
        if (isLaunch) {
            return launchWaypoint
                ? 'Quick launch will take off from the home position'
                : 'Home position is unavailable';
        }

        if (isROI) {
            return 'Click on the map to set ROI point';
        }

        if (isSpiral) {
            if (spiralPhase === 'settingCenter') {
                return 'Click on the map to set spiral center';
            }

            if (spiralPhase === 'settingRadius') {
                return 'Move mouse and click to set radius';
            }

            if (spiralWaypoints.length === 0) {
                return 'Circle set. Click "Generate Waypoints" to create flight path';
            }

            return `${spiralWaypoints.length} waypoints generated`;
        }

        return 'Choose a location';
    };

    const handleGenerateWaypoints = () => {
        if (!spiralCenter || spiralRadiusMeters <= 0 || isSpiralOutOfBounds) {
            return;
        }

        setLocalError('');
        setSpiralWaypoints(generateCircleWaypoints(spiralCenter, spiralRadiusMeters, waypointCount));
    };

    const handleClearSpiral = () => {
        setLocalError('');
        setSpiralCenter(null);
        setSpiralRadiusMeters(0);
        setPreviewRadius(0);
        setSpiralWaypoints([]);
        setSpiralPhase('settingCenter');
    };

    const handleSubmit = () => {
        const normalizedTakeoffAltitude = Number(takeoffAltitude);
        const normalizedFlightAltitude = Number(flightAltitude);
        const waypointAltitude = isLaunch ? normalizedTakeoffAltitude : normalizedFlightAltitude;

        if (!Number.isFinite(normalizedTakeoffAltitude) || normalizedTakeoffAltitude <= 0) {
            setLocalError('Takeoff altitude must be greater than 0.');
            return;
        }

        if (isSpiral && (!Number.isFinite(normalizedFlightAltitude) || normalizedFlightAltitude <= 0)) {
            setLocalError('Flight altitude must be greater than 0.');
            return;
        }

        let rawWaypoints = [];
        let roi = undefined;

        if (isLaunch) {
            if (!launchWaypoint) {
                setLocalError('Home position is unavailable for quick launch.');
                return;
            }

            rawWaypoints = [launchWaypoint];
        } else if (isROI) {
            if (!roiPosition) {
                setLocalError('Select an ROI point on the map first.');
                return;
            }

            roi = roiPosition;
        } else if (isSpiral) {
            if (isSpiralOutOfBounds) {
                setLocalError('Spiral exceeds geofence limit.');
                return;
            }

            if (spiralWaypoints.length === 0) {
                setLocalError('Generate spiral waypoints first.');
                return;
            }

            rawWaypoints = spiralWaypoints;
        }

        setLocalError('');

        onLaunch?.({
            missionType,
            takeoffAltitude: normalizedTakeoffAltitude,
            roi,
            waypoints: rawWaypoints.map((waypoint, index) => ({
                id: index + 1,
                lat: waypoint.lat,
                lng: waypoint.lng,
                altitude: waypointAltitude,
                cameraTilt: 20,
                action: 'take_picture',
                action_duration: null,
            })),
        });
    };

    const effectiveError = localError || submitError;

    return (
        <div className="fixed inset-0 z-[2000] flex select-none items-center justify-center bg-[#0a0f18]/80 p-4 backdrop-blur-sm">
            <div className="relative flex w-[840px] flex-col overflow-hidden border-l border-[#ED0000] bg-[#222222] p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md">
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#ED0000]/45 to-transparent" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#ED0000]/45 to-transparent" />

                <div className="relative flex w-full flex-col gap-6">
                    <h2 className="text-center font-tomorrow text-[18px] tracking-widest text-white">
                        {dialogTitle}
                    </h2>

                    <div className={`relative z-10 h-[400px] w-full overflow-hidden border-b border-[#ED0000] p-px ${isROI || isSpiral ? 'cursor-crosshair' : ''}`}>
                        <div className="pointer-events-none absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#ED0000]/35 to-transparent" />
                        <div className="pointer-events-none absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#ED0000]/35 to-transparent" />
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[#ED0000]" />

                        <div className="relative h-full w-full overflow-hidden">
                            <MapContainer
                                center={center}
                                zoom={initialZoom}
                                style={{ height: '100%', width: '100%' }}
                                attributionControl={false}
                                zoomControl={false}
                                scrollWheelZoom
                            >
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                <MapInteractionHandler onClickRef={mapInteractionRef} />
                                {dockPosition && fenceRadius != null ? (
                                    <Circle center={dockPosition} radius={fenceRadius} pathOptions={geofencePathOptions} />
                                ) : null}
                                {dockPosition ? (
                                    <Marker position={dockPosition} icon={dockIcon} />
                                ) : null}
                                {dronePosition ? (
                                    <Marker position={dronePosition} icon={droneIcon} />
                                ) : null}

                                {isROI && roiPosition ? (
                                    <Marker position={[roiPosition.lat, roiPosition.lng]} icon={roiIcon} />
                                ) : null}

                                {isSpiral && spiralCenter ? (
                                    <Marker position={[spiralCenter.lat, spiralCenter.lng]} icon={spiralCenterIcon} />
                                ) : null}

                                {isSpiral && spiralCenter && spiralPhase === 'settingRadius' && previewRadius > 0 ? (
                                    <Circle
                                        center={[spiralCenter.lat, spiralCenter.lng]}
                                        radius={previewRadius}
                                        pathOptions={{
                                            color: isSpiralOutOfBounds ? '#ef4444' : '#a855f7',
                                            fillColor: isSpiralOutOfBounds ? '#ef4444' : '#a855f7',
                                            fillOpacity: isSpiralOutOfBounds ? 0.15 : 0.08,
                                            weight: 2,
                                            dashArray: '6, 6',
                                        }}
                                    />
                                ) : null}

                                {isSpiral && spiralCenter && spiralPhase === 'complete' && spiralRadiusMeters > 0 ? (
                                    <Circle
                                        center={[spiralCenter.lat, spiralCenter.lng]}
                                        radius={spiralRadiusMeters}
                                        pathOptions={{
                                            color: isSpiralOutOfBounds ? '#ef4444' : '#a855f7',
                                            fillColor: isSpiralOutOfBounds ? '#ef4444' : '#a855f7',
                                            fillOpacity: isSpiralOutOfBounds ? 0.15 : 0.1,
                                            weight: 2,
                                        }}
                                    />
                                ) : null}

                                {isSpiral && spiralWaypoints.length > 0 ? (
                                    <>
                                        <Polyline
                                            positions={waypointPositions}
                                            pathOptions={{ color: '#682F2F', weight: 2, dashArray: '4, 6' }}
                                        />
                                        {spiralWaypoints.map((waypoint, index) => (
                                            <Marker
                                                key={`${waypoint.lat}-${waypoint.lng}`}
                                                position={[waypoint.lat, waypoint.lng]}
                                                icon={createSpiralWaypointIcon(index + 1)}
                                            />
                                        ))}
                                    </>
                                ) : null}

                                <ZoomControls />
                            </MapContainer>
                        </div>

                        <div className="pointer-events-none absolute left-0 right-0 top-4 text-center text-[13px] tracking-wide text-gray-200">
                            {getMapInstruction()}
                        </div>

                        {isSpiral && spiralPhase === 'settingRadius' && previewRadius > 0 ? (
                            <div className="pointer-events-none absolute left-1/2 top-10 z-[500] -translate-x-1/2 transform">
                                <div className={`flex items-center gap-1.5 rounded-full border bg-[#1a202c]/90 px-3 py-1 font-mono text-[11px] ${isSpiralOutOfBounds ? 'border-red-500/60 text-red-400' : 'border-purple-500/40 text-purple-300'}`}>
                                    {isSpiralOutOfBounds ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                            <line x1="12" y1="9" x2="12" y2="13" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                    ) : null}
                                    {previewRadius} m
                                    {isSpiralOutOfBounds ? <span className="text-[9px] opacity-80">OUT OF FENCE</span> : null}
                                </div>
                            </div>
                        ) : null}

                        {isSpiral && spiralPhase === 'complete' ? (
                            <div className="absolute right-16 top-4 z-[500] flex flex-col gap-2">
                                {isSpiralOutOfBounds ? (
                                    <div className="flex items-center gap-2 rounded border border-red-500/50 bg-red-900/80 px-3 py-2 text-[11px] font-medium text-red-200 shadow-lg backdrop-blur-sm">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-400">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                            <line x1="12" y1="9" x2="12" y2="13" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                        <span>Circle exceeds geofence limit</span>
                                    </div>
                                ) : null}

                                {spiralWaypoints.length === 0 ? (
                                    <button
                                        type="button"
                                        onClick={handleGenerateWaypoints}
                                        disabled={isSpiralOutOfBounds}
                                        className={`flex items-center gap-2 rounded border px-3 py-1.5 text-[11px] font-medium text-white shadow-lg transition-all ${isSpiralOutOfBounds ? 'cursor-not-allowed border-gray-600/30 bg-gray-700/80 opacity-50' : 'border-purple-400/30 bg-purple-600/90 hover:bg-purple-500 hover:shadow-xl hover:shadow-purple-500/30'}`}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                        </svg>
                                        Generate Waypoints
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 rounded border border-emerald-400/30 bg-emerald-600/80 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        {spiralWaypoints.length} waypoints
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleClearSpiral}
                                    className="flex items-center gap-2 rounded border border-red-400/30 bg-red-600/70 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg transition-all hover:bg-red-500"
                                >
                                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                        <path d="M2 2L8 8M8 2L2 8" />
                                    </svg>
                                    Clear Circle
                                </button>
                            </div>
                        ) : null}

                        <svg className="pointer-events-none absolute inset-4 z-10 h-[calc(100%-32px)] w-[calc(100%-32px)]">
                            <path d="M 12 0 L 6 0 Q 0 0 0 6 L 0 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            <path d="M calc(100% - 12px) 0 L calc(100% - 6px) 0 Q 100% 0 100% 6 L 100% 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            <path d="M 0 calc(100% - 12px) L 0 calc(100% - 6px) Q 0 100% 6 100% L 12 100%" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            <path d="M 100% calc(100% - 12px) L 100% calc(100% - 6px) Q 100% 100% calc(100% - 6px) 100% L calc(100% - 12px) 100%" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>

                        <div className="pointer-events-auto absolute bottom-8 left-1/2 z-[400] -translate-x-1/2 transform">
                            <div className="flex items-end justify-center gap-4">
                                <div className="flex flex-col">
                                    <label className="mb-2 px-2 text-center text-[10px] text-gray-400 shadow-black drop-shadow-md">Takeoff Altitude (M)</label>
                                    <input
                                        type="number"
                                        className="h-[32px] w-[160px] rounded border border-[#2d3748] bg-[#1a202c]/90 px-3 text-left text-[12px] text-white outline-none transition-colors placeholder-gray-500 focus:border-gray-400"
                                        value={takeoffAltitude}
                                        onChange={(event) => setTakeoffAltitude(event.target.value)}
                                    />
                                </div>

                                {isSpiral ? (
                                    <div className="flex flex-col">
                                        <label className="mb-2 px-2 text-center text-[10px] text-gray-400 shadow-black drop-shadow-md">Flight Altitude (M)</label>
                                        <input
                                            type="number"
                                            className="h-[32px] w-[160px] rounded border border-[#2d3748] bg-[#1a202c]/90 px-3 text-left text-[12px] text-white outline-none transition-colors placeholder-gray-500 focus:border-gray-400"
                                            value={flightAltitude}
                                            onChange={(event) => setFlightAltitude(event.target.value)}
                                        />
                                    </div>
                                ) : null}

                                {isROI ? (
                                    <CoordinateField
                                        label="ROI Coordinates"
                                        position={roiPosition}
                                        accentClass="text-emerald-400"
                                        onClear={() => setRoiPosition(null)}
                                        emptyLabel="Click map to set point"
                                    />
                                ) : null}

                                {isSpiral ? (
                                    <>
                                        <div className="flex flex-col">
                                            <label className="mb-2 px-2 text-center text-[10px] text-gray-400 shadow-black drop-shadow-md">Radius (M)</label>
                                            <div className="flex h-[32px] min-w-[100px] items-center rounded border border-[#2d3748] bg-[#1a202c]/90 px-3">
                                                <span className={`font-mono text-[12px] ${displayRadius > 0 ? 'text-purple-400' : 'text-[11px] italic text-gray-500'}`}>
                                                    {displayRadius > 0 ? `${displayRadius}` : 'Draw...'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="mb-2 px-2 text-center text-[10px] text-gray-400 shadow-black drop-shadow-md">Waypoints</label>
                                            <input
                                                type="number"
                                                className="h-[32px] w-[80px] cursor-not-allowed rounded border border-[#2d3748] bg-[#1a202c]/90 px-3 text-center text-[12px] text-gray-400 opacity-60 outline-none"
                                                value={waypointCount}
                                                disabled
                                            />
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {effectiveError ? (
                        <div className="rounded border border-red-500/40 bg-red-950/40 px-4 py-3 text-[12px] text-red-300">
                            {effectiveError}
                        </div>
                    ) : null}

                    <div className="mt-1 grid grid-cols-2 gap-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full bg-transparent active:scale-[0.98]"
                        >
                            <img
                                src="/src/assets/images/btn_cancel_quicklaunch.png"
                                alt="Cancel"
                                className="aspect-[418/76] w-full object-contain transition duration-150 hover:brightness-110 hover:contrast-110"
                            />
                        </button>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLaunching}
                            className={`w-full bg-transparent active:scale-[0.98] ${isLaunching ? 'cursor-not-allowed opacity-70' : ''}`}
                        >
                            <img
                                src="/src/assets/images/btn_launch_quicklaunch.png"
                                alt="Launch"
                                className="aspect-[418/76] w-full object-contain transition duration-150 hover:brightness-110 hover:contrast-110"
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
