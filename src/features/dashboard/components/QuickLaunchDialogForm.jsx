import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMapEvents, useMap } from 'react-leaflet';
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

const droneIcon = new L.DivIcon({
    className: 'custom-drone-icon',
    html: `
        <img src="/src/assets/icon_drone.png" alt="Drone" class="w-24 h-24 object-contain" />
    `,
    iconSize: [96, 96],
    iconAnchor: [48, 48]
});

const createWaypointIcon = (number) => new L.DivIcon({
    className: 'custom-waypoint-icon',
    html: `<div class="w-5 h-5 rounded-full bg-[#3b5374] border border-[#587fae] text-white text-[10px] font-bold flex items-center justify-center shadow-lg">${number}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// ROI marker icon — a pulsing red target
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
    iconAnchor: [16, 16]
});

// Spiral center marker icon
const spiralCenterIcon = new L.DivIcon({
    className: 'custom-spiral-center-icon',
    html: `
        <div style="position:relative; width:24px; height:24px;">
            <div style="position:absolute; inset:0; border-radius:50%; background:rgba(168,85,247,0.3); border: 2px solid #a855f7;"></div>
            <div style="position:absolute; top:7px; left:7px; width:10px; height:10px; border-radius:50%; background:#a855f7; box-shadow: 0 0 6px rgba(168,85,247,0.8);"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Spiral waypoint icon
const createSpiralWaypointIcon = (number) => new L.DivIcon({
    className: 'custom-spiral-wp-icon',
    html: `<div style="width:22px; height:22px; border-radius:50%; background:linear-gradient(135deg, #a855f7, #7c3aed); border: 2px solid rgba(168,85,247,0.5); color:white; font-size:9px; font-weight:bold; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 8px rgba(168,85,247,0.4);">${number}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
});

// Helper: calculate distance between two latlng points in meters (Haversine)
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

// Helper: generate points around a circle
function generateCircleWaypoints(center, radiusMeters, count = 12) {
    const points = [];
    const R = 6371000;
    const lat1 = (center.lat * Math.PI) / 180;
    const lng1 = (center.lng * Math.PI) / 180;
    const d = radiusMeters / R;

    for (let i = 0; i < count; i++) {
        const bearing = ((2 * Math.PI) / count) * i;
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

// Single unified map interaction handler — always mounted, uses refs for fresh state
function MapInteractionHandler({ onClickRef }) {
    useMapEvents({
        click(e) {
            if (onClickRef.current?.__click__) onClickRef.current.__click__(e);
        },
        mousemove(e) {
            if (onClickRef.current?.onMouseMove) onClickRef.current.onMouseMove(e);
        },
    });
    return null;
}

// Component to handle zoom controls
function ZoomControls() {
    const map = useMap();
    return (
        <div className="absolute right-6 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-30">
            <button
                onClick={() => map.zoomIn()}
                className="w-10 h-10 bg-[#1a202c]/90 text-white rounded-md flex items-center justify-center hover:bg-[#2d3748] border border-[#2d3748] text-xl font-bold transition-colors"
            >
                +
            </button>
            <button
                onClick={() => map.zoomOut()}
                className="w-10 h-10 bg-[#1a202c]/90 text-white rounded-md flex items-center justify-center hover:bg-[#2d3748] border border-[#2d3748] text-xl font-bold transition-colors"
            >
                -
            </button>
        </div>
    );
}

export default function QuickLaunchDialogForm({ isOpen, missionType, onClose, onLaunch }) {
    // ROI state
    const [roiPosition, setRoiPosition] = useState(null);

    // Spiral state
    const [spiralPhase, setSpiralPhase] = useState('settingCenter'); // 'settingCenter' | 'settingRadius' | 'complete'
    const [spiralCenter, setSpiralCenter] = useState(null);
    const [spiralRadiusMeters, setSpiralRadiusMeters] = useState(0);
    const [previewRadius, setPreviewRadius] = useState(0);
    const [mousePos, setMousePos] = useState(null);
    const [spiralWaypoints, setSpiralWaypoints] = useState([]);

    // Ref for the spiral center so the click handler can access latest value
    const spiralCenterRef = useRef(null);
    const spiralPhaseRef = useRef(spiralPhase);

    // Keep refs in sync with state
    useEffect(() => { spiralCenterRef.current = spiralCenter; }, [spiralCenter]);
    useEffect(() => { spiralPhaseRef.current = spiralPhase; }, [spiralPhase]);

    // Unified map interaction ref — always up-to-date
    const mapInteractionRef = useRef(null);

    const isSpiral = missionType === 'Spiral';
    const isROI = missionType === 'ROI';

    // Update interaction ref whenever dependencies change
    useEffect(() => {
        mapInteractionRef.current = {
            // click handler
            __call__: true,
            onMouseMove: (e) => {
                if (isSpiral && spiralPhaseRef.current === 'settingRadius' && spiralCenterRef.current) {
                    const pos = { lat: e.latlng.lat, lng: e.latlng.lng };
                    setMousePos(pos);
                    const dist = getDistanceMeters(spiralCenterRef.current, pos);
                    setPreviewRadius(Math.round(dist));
                }
            },
        };
        // Assign click handler
        const ref = mapInteractionRef.current;
        ref.__click__ = (e) => {
            if (isROI) {
                setRoiPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
            } else if (isSpiral) {
                const phase = spiralPhaseRef.current;
                if (phase === 'settingCenter') {
                    const pos = { lat: e.latlng.lat, lng: e.latlng.lng };
                    setSpiralCenter(pos);
                    spiralCenterRef.current = pos;
                    setSpiralPhase('settingRadius');
                    spiralPhaseRef.current = 'settingRadius';
                    setPreviewRadius(0);
                    setSpiralWaypoints([]);
                } else if (phase === 'settingRadius') {
                    const center = spiralCenterRef.current;
                    if (!center) return;
                    const pos = { lat: e.latlng.lat, lng: e.latlng.lng };
                    const dist = getDistanceMeters(center, pos);
                    setSpiralRadiusMeters(Math.round(dist));
                    setSpiralPhase('complete');
                    spiralPhaseRef.current = 'complete';
                    setPreviewRadius(0);
                    setMousePos(null);
                }
            }
        };
    }, [isROI, isSpiral]);

    if (!isOpen) return null;

    const center = [-6.200000, 106.816666]; // Jakarta coordinates
    const dockPosition = [-6.195, 106.81];
    const dronePosition = [-6.198, 106.805];
    const fenceRadius = 1800; // meters — will come from drone params in the future

    const titleLabel = missionType === 'Launch' || missionType === 'ROI' ? 'ROI/Launch' : 'Spiral';

    // === Fence validation for spiral ===
    // Spiral is out of bounds if: distance(dock, spiralCenter) + spiralRadius > fenceRadius
    const isSpiralOutOfBounds = (() => {
        if (!spiralCenter) return false;
        const dockLatLng = { lat: dockPosition[0], lng: dockPosition[1] };
        const distFromDock = getDistanceMeters(dockLatLng, spiralCenter);
        const currentRadius = spiralPhase === 'settingRadius' ? previewRadius : spiralRadiusMeters;
        return (distFromDock + currentRadius) > fenceRadius;
    })();

    // Auto-calculate waypoint count based on radius (~1 waypoint per 50m of circumference, clamped 8–24)
    const waypointCount = (() => {
        const radius = spiralRadiusMeters || previewRadius;
        if (radius <= 0) return 12;
        const circumference = 2 * Math.PI * radius;
        return Math.max(8, Math.min(24, Math.round(circumference / 50)));
    })();

    const handleGenerateWaypoints = () => {
        if (!spiralCenter || spiralRadiusMeters <= 0 || isSpiralOutOfBounds) return;
        const wps = generateCircleWaypoints(spiralCenter, spiralRadiusMeters, waypointCount);
        setSpiralWaypoints(wps);
    };

    const handleClearSpiral = () => {
        setSpiralCenter(null);
        setSpiralRadiusMeters(0);
        setPreviewRadius(0);
        setMousePos(null);
        setSpiralWaypoints([]);
        setSpiralPhase('settingCenter');
    };

    // Determine the current displayed radius (preview while drawing, final when complete)
    const displayRadius = spiralPhase === 'settingRadius' ? previewRadius : spiralRadiusMeters;

    // Map instruction text
    const getMapInstruction = () => {
        if (isROI) return 'Click on the map to set ROI point';
        if (isSpiral) {
            if (spiralPhase === 'settingCenter') return 'Click on the map to set spiral center';
            if (spiralPhase === 'settingRadius') return 'Move mouse and click to set radius';
            if (spiralPhase === 'complete' && spiralWaypoints.length === 0) return 'Circle set! Click "Generate Waypoints" to create flight path';
            if (spiralWaypoints.length > 0) return `${spiralWaypoints.length} waypoints generated`;
        }
        return 'Choose a location';
    };

    // Waypoint polyline (close the loop)
    const waypointPositions = spiralWaypoints.length > 0
        ? [...spiralWaypoints.map(wp => [wp.lat, wp.lng]), [spiralWaypoints[0].lat, spiralWaypoints[0].lng]]
        : [];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0a0f18]/80 backdrop-blur-sm select-none">

            {/* Main Form Container */}
            <div className="w-[840px] flex flex-col relative">

                {/* Floating Title (Top Left) */}
                <div className="absolute -top-7 left-0 text-gray-400 text-[13px] font-medium tracking-wide">
                    {titleLabel}
                </div>

                {/* Dialog Body */}
                <div className="bg-[#151a25]/95 rounded-[12px] border border-[#2a3240] shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6 backdrop-blur-md flex flex-col gap-6 w-full relative">

                    {/* Map Area */}
                    <div className={`relative w-full h-[400px] rounded-lg overflow-hidden border border-[#2a3240] pointer-events-auto z-10 ${(isROI || isSpiral) ? 'cursor-crosshair' : ''}`}>
                        <MapContainer
                            center={center}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                            scrollWheelZoom={true}
                        >
                            {/* Dark CartoDB Matter tile layer */}
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />

                            {/* Unified Map Interaction Handler */}
                            <MapInteractionHandler onClickRef={mapInteractionRef} />

                            {/* Max Radius Circle */}
                            <Circle center={dockPosition} radius={1800} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1, dashArray: '4, 8' }} />

                            {/* Dock Marker */}
                            <Marker position={dockPosition} icon={dockIcon} />

                            {/* Drone Marker */}
                            <Marker position={dronePosition} icon={droneIcon} />

                            {/* === ROI Marker === */}
                            {isROI && roiPosition && (
                                <Marker position={[roiPosition.lat, roiPosition.lng]} icon={roiIcon} />
                            )}

                            {/* === Spiral: Center marker === */}
                            {isSpiral && spiralCenter && (
                                <Marker position={[spiralCenter.lat, spiralCenter.lng]} icon={spiralCenterIcon} />
                            )}

                            {/* === Spiral: Preview circle while drawing === */}
                            {isSpiral && spiralCenter && spiralPhase === 'settingRadius' && previewRadius > 0 && (
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
                            )}

                            {/* === Spiral: Final circle === */}
                            {isSpiral && spiralCenter && spiralPhase === 'complete' && spiralRadiusMeters > 0 && (
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
                            )}

                            {/* === Spiral: Generated waypoints === */}
                            {isSpiral && spiralWaypoints.length > 0 && (
                                <>
                                    {/* Polyline connecting all waypoints (closed loop) */}
                                    <Polyline
                                        positions={waypointPositions}
                                        pathOptions={{ color: '#c084fc', weight: 2, dashArray: '4, 6' }}
                                    />
                                    {/* Waypoint markers */}
                                    {spiralWaypoints.map((wp, i) => (
                                        <Marker
                                            key={i}
                                            position={[wp.lat, wp.lng]}
                                            icon={createSpiralWaypointIcon(i + 1)}
                                        />
                                    ))}
                                </>
                            )}

                            {/* Zoom Controls (inside MapContainer for map access) */}
                            <ZoomControls />
                        </MapContainer>

                        {/* Top Label over Map */}
                        <div className="absolute top-4 left-0 right-0 text-center text-gray-200 text-[13px] tracking-wide pointer-events-none">
                            {getMapInstruction()}
                        </div>

                        {/* Spiral: live radius indicator badge */}
                        {isSpiral && spiralPhase === 'settingRadius' && previewRadius > 0 && (
                            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 pointer-events-none z-[500]">
                                <div className={`bg-[#1a202c]/90 border rounded-full px-3 py-1 text-[11px] font-mono flex items-center gap-1.5 ${isSpiralOutOfBounds ? 'border-red-500/60 text-red-400' : 'border-purple-500/40 text-purple-300'}`}>
                                    {isSpiralOutOfBounds && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                            <line x1="12" y1="9" x2="12" y2="13" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                    )}
                                    {previewRadius} m
                                    {isSpiralOutOfBounds && <span className="text-[9px] opacity-80">OUT OF FENCE</span>}
                                </div>
                            </div>
                        )}

                        {/* Spiral: Generate Waypoints + Clear buttons (top-right of map) */}
                        {isSpiral && spiralPhase === 'complete' && (
                            <div className="absolute top-4 right-16 flex flex-col gap-2 z-[500]">
                                {/* Out of fence warning */}
                                {isSpiralOutOfBounds && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-red-900/80 text-red-200 text-[11px] font-medium rounded border border-red-500/50 shadow-lg backdrop-blur-sm">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                            <line x1="12" y1="9" x2="12" y2="13" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                        <span>Circle exceeds geofence limit</span>
                                    </div>
                                )}

                                {spiralWaypoints.length === 0 ? (
                                    <button
                                        onClick={handleGenerateWaypoints}
                                        disabled={isSpiralOutOfBounds}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-white text-[11px] font-medium rounded border shadow-lg transition-all ${
                                            isSpiralOutOfBounds
                                                ? 'bg-gray-700/80 border-gray-600/30 cursor-not-allowed opacity-50'
                                                : 'bg-purple-600/90 hover:bg-purple-500 border-purple-400/30 hover:shadow-purple-500/30 hover:shadow-xl'
                                        }`}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                        </svg>
                                        Generate Waypoints
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/80 text-white text-[11px] font-medium rounded border border-emerald-400/30 shadow-lg">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        {spiralWaypoints.length} waypoints
                                    </div>
                                )}
                                <button
                                    onClick={handleClearSpiral}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600/70 hover:bg-red-500 text-white text-[11px] font-medium rounded border border-red-400/30 shadow-lg transition-all"
                                >
                                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                        <path d="M2 2L8 8M8 2L2 8" />
                                    </svg>
                                    Clear Circle
                                </button>
                            </div>
                        )}

                        {/* White Brackets (SVG) */}
                        <svg className="absolute inset-4 pointer-events-none w-[calc(100%-32px)] h-[calc(100%-32px)] z-10">
                            {/* Top Left */}
                            <path d="M 12 0 L 6 0 Q 0 0 0 6 L 0 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            {/* Top Right */}
                            <path d="M calc(100% - 12px) 0 L calc(100% - 6px) 0 Q 100% 0 100% 6 L 100% 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            {/* Bottom Left */}
                            <path d="M 0 calc(100% - 12px) L 0 calc(100% - 6px) Q 0 100% 6 100% L 12 100%" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            {/* Bottom Right */}
                            <path d="M 100% calc(100% - 12px) L 100% calc(100% - 6px) Q 100% 100% calc(100% - 6px) 100% L calc(100% - 12px) 100%" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>

                        {/* Conditionally Rendered Parameters Overlay */}
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[400] pointer-events-auto">
                            <div className="flex gap-4 items-end justify-center">
                                {/* Base Takeoff Altitude -> Present in all modes */}
                                <div className="flex flex-col">
                                    <label className="text-gray-400 text-[10px] text-center mb-2 px-2 shadow-black drop-shadow-md">Takeoff Altitude (M)</label>
                                    <input
                                        type="number"
                                        className="w-[180px] h-[32px] bg-[#1a202c]/90 border border-[#2d3748] rounded px-3 text-white text-[12px] outline-none text-left focus:border-gray-400 transition-colors placeholder-gray-500"
                                        placeholder="150"
                                        defaultValue="150"
                                    />
                                </div>

                                {/* ROI Lat/Lng display */}
                                {isROI && (
                                    <div className="flex flex-col">
                                        <label className="text-gray-400 text-[10px] text-center mb-2 px-2 shadow-black drop-shadow-md">ROI Coordinates</label>
                                        <div className="h-[32px] bg-[#1a202c]/90 border border-[#2d3748] rounded px-3 flex items-center gap-3 min-w-[240px]">
                                            {roiPosition ? (
                                                <>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-gray-500 font-medium">LAT</span>
                                                        <span className="text-[12px] text-emerald-400 font-mono">{roiPosition.lat.toFixed(6)}</span>
                                                    </div>
                                                    <div className="w-px h-4 bg-[#2d3748]"></div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-gray-500 font-medium">LNG</span>
                                                        <span className="text-[12px] text-emerald-400 font-mono">{roiPosition.lng.toFixed(6)}</span>
                                                    </div>
                                                    <div className="w-px h-4 bg-[#2d3748]"></div>
                                                    <button
                                                        onClick={() => setRoiPosition(null)}
                                                        className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 transition-colors border-none shadow-none p-0"
                                                        title="Clear ROI"
                                                    >
                                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                                            <path d="M2 2L8 8M8 2L2 8" />
                                                        </svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-[11px] text-gray-500 italic">Click map to set point</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Extra Fields for Spiral Mode */}
                                {isSpiral && (
                                    <>
                                        <div className="flex flex-col">
                                            <label className="text-gray-400 text-[10px] text-center mb-2 px-2 shadow-black drop-shadow-md">Flight Altitude (M)</label>
                                            <input
                                                type="number"
                                                className="w-[140px] h-[32px] bg-[#1a202c]/90 border border-[#2d3748] rounded px-3 text-white text-[12px] outline-none text-left focus:border-gray-400 transition-colors placeholder-gray-500"
                                                placeholder="150"
                                                defaultValue="150"
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-gray-400 text-[10px] text-center mb-2 px-2 shadow-black drop-shadow-md">Radius (M)</label>
                                            <div className="h-[32px] bg-[#1a202c]/90 border border-[#2d3748] rounded px-3 flex items-center min-w-[100px]">
                                                <span className={`text-[12px] font-mono ${displayRadius > 0 ? 'text-purple-400' : 'text-gray-500 italic text-[11px]'}`}>
                                                    {displayRadius > 0 ? `${displayRadius}` : 'Draw...'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-gray-400 text-[10px] text-center mb-2 px-2 shadow-black drop-shadow-md">Waypoints</label>
                                            <input
                                                type="number"
                                                className="w-[80px] h-[32px] bg-[#1a202c]/90 border border-[#2d3748] rounded px-3 text-gray-400 text-[12px] outline-none text-center cursor-not-allowed opacity-60"
                                                value={waypointCount}
                                                disabled
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex gap-6 mt-1">
                        {/* Red Cancel Button */}
                        <button
                            onClick={onClose}
                            className="flex-1 h-[48px] rounded flex items-center justify-center transition-all hover:from-[#dc2626] hover:to-[#991b1b] relative overflow-hidden"
                        >
                            <img src="/src/assets/btn_cancel_mission_2.png" alt="Cancel" />
                        </button>

                        {/* Orange Launch Button */}
                        <button
                            onClick={() => onLaunch(missionType)}
                            className="flex-1 h-[48px] rounded flex items-center justify-center transition-all hover:from-[#f97316] hover:to-[#c2410c] relative overflow-hidden"
                        >
                            <img src="/src/assets/btn_launch_dg.png" alt="Launch" />
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
