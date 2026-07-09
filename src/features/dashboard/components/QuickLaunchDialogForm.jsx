import React, { useEffect, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer, GeoJSON, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import droneIconImage from '../../../assets/images/icon_drone.svg';
import cancelQuickLaunchButton from '../../../assets/images/btn_cancel_quicklaunch.svg';
import cancelQuickLaunchButtonId from '../../../assets/images/btn_cancel_quicklaunch_id.svg';
import launchQuickLaunchButton from '../../../assets/images/btn_launch_quicklaunch.svg';
import launchQuickLaunchButtonId from '../../../assets/images/btn_launch_quicklaunch_id.svg';
import { useI18n } from '../../../shared/i18n/I18nProvider';
import geofenceData from '../../../services/geofence.json';
import {
    buildGeofenceMaskGeoJson,
    geofenceAreaPathOptions,
    geofenceMaskPathOptions,
    geofenceRadiusPathOptions,
} from '../../../shared/utils/geofence';
import { IS_GEOFENCE_JSON_ENABLED } from '../../../shared/config/geofenceConfig';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_TAKEOFF_ALTITUDE = 25;
const DEFAULT_FLIGHT_ALTITUDE = 25;
const DEFAULT_TAKEOFF_HOLD_DURATION = '0';
const TAKEOFF_ONLY_MISSION_TYPES = new Set(['Launch', 'Hover']);

const normalizeNumericInputValue = (value, fallback = '0') => {
    if (value === '') {
        return fallback;
    }

    return String(value).replace(/^(-?)0+(?=\d)/, '$1');
};

const handleNumericFocus = (event) => {
    if (String(event.target.value) === '0') {
        event.target.select();
    }
};

const handleNumericClick = (event) => {
    if (String(event.target.value) === '0') {
        event.target.select();
    }
};

const dockIcon = new L.DivIcon({
    className: 'custom-dock-icon',
    html: `<div class="w-6 h-6 rounded-full bg-[#d4af37] text-black text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-[#d4af37]/50">H</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const DRONE_ICON_WIDTH = 68;
const DRONE_ICON_HEIGHT = 96;
const DRONE_ICON_CENTER_X = 34;
const DRONE_ICON_CENTER_Y = 74;

const createDroneIcon = (heading) => new L.DivIcon({
    className: 'custom-drone-icon',
    html: `
        <div style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:flex; align-items:center; justify-content:center; transform: rotate(${heading || 0}deg); transform-origin: ${DRONE_ICON_CENTER_X}px ${DRONE_ICON_CENTER_Y}px; transition: transform 0.3s ease;">
            <img src="${droneIconImage}" alt="Drone" style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:block;" />
        </div>
    `,
    iconSize: [DRONE_ICON_WIDTH, DRONE_ICON_HEIGHT],
    iconAnchor: [DRONE_ICON_CENTER_X, DRONE_ICON_CENTER_Y],
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
    html: `<div style="width:20px; height:20px; border-radius:50%; background:#FD5050; border:1px solid #FD5050; color:white; font-size:10px; font-weight:bold; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 8px rgba(253,80,80,0.35);">${number}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

const geofenceMaskData = buildGeofenceMaskGeoJson(geofenceData);

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

function GradientFieldFrame({ children, className = '' }) {
    return (
        <div className={`relative overflow-hidden bg-[#D2D2D2] ${className}`}>
            <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[rgba(251,85,85,0.2)] to-[#ED0000]" />
            <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-[#ED0000] via-[rgba(251,85,85,0.2)] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-[#ED0000]" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[rgba(251,85,85,0.2)] via-[rgba(251,85,85,0.2)] to-[#ED0000]" />
            {children}
        </div>
    );
}

function CoordinateField({ label, position, accentClass, onClear, emptyLabel }) {
    const { t, language } = useI18n();
    const cancelButtonAsset = language === 'id' ? cancelQuickLaunchButtonId : cancelQuickLaunchButton;
    return (
        <div className="flex flex-col">
            <label className="mb-2 px-2 text-center text-[10px] text-[#000000]">{label}</label>
            <GradientFieldFrame className="flex h-[32px] min-w-[240px] items-center gap-3 px-3">
                {position ? (
                    <>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-[#565656]">LAT</span>
                            <span className={`font-mono text-[12px] ${accentClass}`}>{position.lat.toFixed(6)}</span>
                        </div>
                        <div className="h-4 w-px bg-[#929292]" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-[#565656]">LNG</span>
                            <span className={`font-mono text-[12px] ${accentClass}`}>{position.lng.toFixed(6)}</span>
                        </div>
                        <div className="h-4 w-px bg-[#929292]" />
                        <button
                            type="button"
                            onClick={onClear}
                            className="flex h-5 w-5 items-center justify-center rounded-full border-none bg-red-500/20 p-0 text-red-400 transition-colors hover:bg-red-500/40 hover:text-red-300"
                            aria-label={t('common.clear')}
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <path d="M2 2L8 8M8 2L2 8" />
                            </svg>
                        </button>
                    </>
                ) : (
                    <span className="text-[11px] italic text-[#565656]">{emptyLabel}</span>
                )}
            </GradientFieldFrame>
        </div>
    );
}

export default function QuickLaunchDialogForm({
    isOpen,
    missionType,
    selectedDrone,
    telemetry,
    telemetryStatus = null,
    onClose,
    onLaunch,
    isLaunching = false,
    submitError = '',
}) {
    const { t, language } = useI18n();
    const cancelButtonAsset = language === 'id' ? cancelQuickLaunchButtonId : cancelQuickLaunchButton;
    const launchButtonAsset = language === 'id' ? launchQuickLaunchButtonId : launchQuickLaunchButton;
    const [roiPosition, setRoiPosition] = useState(null);
    const [takeoffAltitude, setTakeoffAltitude] = useState(String(DEFAULT_TAKEOFF_ALTITUDE));
    const [flightAltitude, setFlightAltitude] = useState(String(DEFAULT_FLIGHT_ALTITUDE));
    const [takeoffHoldDuration, setTakeoffHoldDuration] = useState(DEFAULT_TAKEOFF_HOLD_DURATION);
    const [localError, setLocalError] = useState('');

    const [spiralPhase, setSpiralPhase] = useState('settingCenter');
    const [spiralCenter, setSpiralCenter] = useState(null);
    const [spiralRadiusMeters, setSpiralRadiusMeters] = useState(0);
    const [previewRadius, setPreviewRadius] = useState(0);
    const [spiralWaypoints, setSpiralWaypoints] = useState([]);

    const spiralCenterRef = useRef(null);
    const spiralPhaseRef = useRef(spiralPhase);
    const mapInteractionRef = useRef(null);
    const mapRef = useRef(null);

    const isLaunch = TAKEOFF_ONLY_MISSION_TYPES.has(missionType);
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
        setTakeoffHoldDuration(DEFAULT_TAKEOFF_HOLD_DURATION);
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

    const defaultCenter = [-6.2, 106.816666];
    const dockPosition = toLatLng(selectedDrone?.home_latitude, selectedDrone?.home_longitude);
    const telemetryPosition = toLatLng(telemetry?.location?.latitude, telemetry?.location?.longitude);
    const isLocationFresh = Boolean(telemetryStatus?.metrics?.location?.isFresh);
    const dronePosition = isLocationFresh
        ? telemetryPosition
        : (telemetryPosition || dockPosition);
    const droneYaw = Number.isFinite(Number(telemetry?.attitude?.yaw_deg))
        ? Number(telemetry.attitude.yaw_deg)
        : Number(telemetry?.location?.heading ?? 0);
    const center = dockPosition || defaultCenter;
    const initialZoom = 18;
    const parsedFenceRadius = Number(selectedDrone?.max_range_meter);
    const fenceRadius = Number.isFinite(parsedFenceRadius) && parsedFenceRadius > 0 ? parsedFenceRadius : null;
    const launchWaypoint = dockPosition
        ? { lat: dockPosition[0], lng: dockPosition[1] }
        : null;
    const spiralPathPositions = spiralWaypoints.length > 0
        ? [
            ...(launchWaypoint ? [[launchWaypoint.lat, launchWaypoint.lng]] : []),
            ...spiralWaypoints.map((waypoint) => [waypoint.lat, waypoint.lng]),
            ...(launchWaypoint ? [[launchWaypoint.lat, launchWaypoint.lng]] : []),
        ]
        : [];

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
    const dialogTitle = isLaunch ? t('dashboard.configureTakeoff') : t('dashboard.chooseLocation');

    useEffect(() => {
        if (!isOpen || !mapRef.current) {
            return;
        }

        const mapInstance = mapRef.current;
        const timerId = window.setTimeout(() => {
            mapInstance.invalidateSize();
            mapInstance.setView(center, initialZoom, { animate: true });
        }, 0);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [isOpen, initialZoom, center[0], center[1]]);

    if (!isOpen) {
        return null;
    }

    const getMapInstruction = () => {
        if (isLaunch) {
            return launchWaypoint
                ? t('dashboard.quickLaunchHomePosition')
                : t('dashboard.homePositionUnavailable');
        }

        if (isROI) {
            return t('dashboard.clickMapSetRoi');
        }

        if (isSpiral) {
            if (spiralPhase === 'settingCenter') {
                return t('dashboard.clickMapSetSpiralCenter');
            }

            if (spiralPhase === 'settingRadius') {
                return t('dashboard.moveMouseSetRadius');
            }

            if (spiralWaypoints.length === 0) {
                return t('dashboard.circleSetGenerateWaypoints');
            }

            return t('dashboard.waypointsGenerated').replace('{count}', spiralWaypoints.length);
        }

        return t('dashboard.chooseLocation');
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
        const normalizedTakeoffHoldDuration = Number(takeoffHoldDuration);
        const waypointAltitude = isLaunch ? normalizedTakeoffAltitude : normalizedFlightAltitude;

        if (!Number.isFinite(normalizedTakeoffAltitude) || normalizedTakeoffAltitude < 0) {
            setLocalError(t('dashboard.missionErrorTakeoffAltitude'));
            return;
        }

        if (isSpiral && (!Number.isFinite(normalizedFlightAltitude) || normalizedFlightAltitude <= 0)) {
            setLocalError(t('dashboard.missionErrorFlightAltitude'));
            return;
        }

        if (!Number.isFinite(normalizedTakeoffHoldDuration) || normalizedTakeoffHoldDuration < 0) {
            setLocalError(t('dashboard.missionErrorTakeoffHold'));
            return;
        }

        let rawWaypoints = [];
        let roi = undefined;

        if (isLaunch) {
            rawWaypoints = [];
        } else if (isROI) {
            if (!roiPosition) {
                setLocalError(t('dashboard.missionErrorSelectRoi'));
                return;
            }

            roi = roiPosition;
        } else if (isSpiral) {
            if (isSpiralOutOfBounds) {
                setLocalError(t('dashboard.missionErrorSpiralFence'));
                return;
            }

            if (spiralWaypoints.length === 0) {
                setLocalError(t('dashboard.missionErrorGenerateSpiral'));
                return;
            }

            rawWaypoints = spiralWaypoints;
        }

        setLocalError('');

        onLaunch?.({
            missionType,
            takeoffAltitude: normalizedTakeoffAltitude,
            takeoffHoldDuration: String(Math.trunc(normalizedTakeoffHoldDuration)),
            roi,
            waypoints: rawWaypoints.map((waypoint, index) => ({
                id: index + 1,
                lat: waypoint.lat,
                lng: waypoint.lng,
                altitude: waypointAltitude,
                cameraTilt: 20,
                action: 'take_picture',
                action_duration: 0,
            })),
        });
    };

    const effectiveError = localError || submitError;

    return (
        <div className="fixed inset-0 z-[2000] flex select-none items-center justify-center bg-[#0a0f18]/80 p-4 backdrop-blur-sm">
            <div
                className="relative flex w-[840px] flex-col overflow-hidden rounded-[30px] border p-6 shadow-[0_0_50px_rgba(0,0,0,0.35)] backdrop-blur-md"
                style={{ borderColor: '#FF383C', background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }}
            >
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#FF383C] via-[#FF383C]/45 to-transparent" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#FF383C] via-[#FF383C]/45 to-transparent" />

                <div className="relative flex w-full flex-col gap-6">
                    <h2 className="text-center font-inter text-[18px] tracking-widest text-[#000000]">
                        {dialogTitle}
                    </h2>

                    <div className={`relative z-10 h-[400px] w-full overflow-hidden rounded-[12px] border border-[#FF383C] p-px ${isROI || isSpiral ? 'cursor-crosshair' : ''}`}>
                        <div className="pointer-events-none absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#FF383C] via-[#FF383C]/35 to-transparent" />
                        <div className="pointer-events-none absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#FF383C] via-[#FF383C]/35 to-transparent" />
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[#FF383C]" />

                        <div className="relative h-full w-full overflow-hidden rounded-[11px]">
                            <MapContainer
                                center={center}
                                zoom={initialZoom}
                                ref={mapRef}
                                style={{ height: '100%', width: '100%' }}
                                attributionControl={false}
                                zoomControl={false}
                                scrollWheelZoom
                                minZoom={3}
                                maxZoom={18}
                            >
                                <TileLayer
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    attribution='Tiles &copy; Esri'
                                    maxNativeZoom={19}
                                />
                                <MapInteractionHandler onClickRef={mapInteractionRef} />
                                {dockPosition && fenceRadius != null ? (
                                    <Circle center={dockPosition} radius={fenceRadius} pathOptions={geofenceRadiusPathOptions} />
                                ) : null}
                                {IS_GEOFENCE_JSON_ENABLED && Array.isArray(geofenceMaskData?.features) && geofenceMaskData.features.length > 0 ? (
                                    <GeoJSON data={geofenceMaskData} style={geofenceMaskPathOptions} />
                                ) : null}
                                {IS_GEOFENCE_JSON_ENABLED && Array.isArray(geofenceData?.features) && geofenceData.features.length > 0 ? (
                                    <GeoJSON data={geofenceData} style={geofenceAreaPathOptions} />
                                ) : null}
                                {dockPosition ? (
                                    <Marker position={dockPosition} icon={dockIcon} />
                                ) : null}
                                {dronePosition ? (
                                    <Marker position={dronePosition} icon={createDroneIcon(droneYaw)} zIndexOffset={1000} />
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
                                            positions={spiralPathPositions}
                                            pathOptions={{ color: '#BCBCBC', weight: 2, dashArray: '4, 6' }}
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

                            </MapContainer>

                        </div>

                        <div className="pointer-events-none absolute left-0 right-0 top-4 text-center text-[13px] tracking-wide text-[#1F1F1F]">
                            {getMapInstruction()}
                        </div>

                        {isSpiral && spiralPhase === 'settingRadius' && previewRadius > 0 ? (
                            <div className="pointer-events-none absolute left-1/2 top-10 z-[500] -translate-x-1/2 transform">
                                <div className={`flex items-center gap-1.5 rounded-full border bg-[#EBEBEB] px-3 py-1 font-mono text-[11px] ${isSpiralOutOfBounds ? 'border-[#ED0000] text-[#B42323]' : 'border-[#7A0A0C] text-[#682F2F]'}`}>
                                    {isSpiralOutOfBounds ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                            <line x1="12" y1="9" x2="12" y2="13" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                    ) : null}
                                    {previewRadius} m
                                    {isSpiralOutOfBounds ? <span className="text-[9px] opacity-80">{t('dashboard.outOfFence')}</span> : null}
                                </div>
                            </div>
                        ) : null}

                        {isSpiral && spiralPhase === 'complete' ? (
                            <div className="absolute right-16 top-4 z-[500] flex flex-col gap-2">
                                {isSpiralOutOfBounds ? (
                                    <div className="flex items-center gap-2 rounded border border-[#ED0000] bg-[#EBDDDD] px-3 py-2 text-[11px] font-medium text-[#B42323] shadow-lg backdrop-blur-sm">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-400">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                            <line x1="12" y1="9" x2="12" y2="13" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                        <span>{t('dashboard.circleExceedsGeofence')}</span>
                                    </div>
                                ) : null}

                                {spiralWaypoints.length === 0 ? (
                                    <button
                                        type="button"
                                        onClick={handleGenerateWaypoints}
                                        disabled={isSpiralOutOfBounds}
                                        className={`flex items-center gap-2 rounded border px-3 py-1.5 text-[11px] font-medium shadow-lg transition-all ${isSpiralOutOfBounds ? 'cursor-not-allowed border-[#929292] bg-[#D2D2D2] text-[#8C8C8C] opacity-50' : 'border-[#FF383C] bg-[#EBEBEB] text-[#000000] hover:bg-[#E3E3E3]'}`}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                        </svg>
                                        {t('dashboard.generateWaypoints')}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 rounded border border-[#7A0A0C] bg-[#EBEBEB] px-3 py-1.5 text-[11px] font-medium text-[#000000] shadow-lg">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        {t('dashboard.waypointsGenerated').replace('{count}', spiralWaypoints.length)}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleClearSpiral}
                                    className="flex items-center gap-2 rounded border border-[#ED0000] bg-[#571414] px-3 py-1.5 text-[11px] font-medium text-white shadow-lg transition-all hover:opacity-90"
                                >
                                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                        <path d="M2 2L8 8M8 2L2 8" />
                                    </svg>
                                    {t('dashboard.clearCircle')}
                                </button>
                            </div>
                        ) : null}

                        <div className="pointer-events-auto absolute bottom-8 left-1/2 z-[400] -translate-x-1/2 transform">
                            <div className="flex items-end justify-center gap-4">
                                <div className="flex flex-col">
                                    <label className="mb-2 px-2 text-center text-[10px] text-[#000000]">{t('dashboard.takeoffAltitudeMeter')}</label>
                                    <GradientFieldFrame className="h-[32px] w-[160px]">
                                        <input
                                            type="number"
                                            className="h-full w-full bg-transparent px-3 text-left text-[12px] text-[#000000] outline-none placeholder:text-[#565656]"
                                            value={takeoffAltitude}
                                            onChange={(event) => setTakeoffAltitude(normalizeNumericInputValue(event.target.value))}
                                            onFocus={handleNumericFocus}
                                            onClick={handleNumericClick}
                                        />
                                    </GradientFieldFrame>
                                </div>

                                {isSpiral ? (
                                    <div className="flex flex-col">
                                        <label className="mb-2 px-2 text-center text-[10px] text-[#000000]">{t('dashboard.flightAltitude')}</label>
                                        <GradientFieldFrame className="h-[32px] w-[160px]">
                                            <input
                                                type="number"
                                                className="h-full w-full bg-transparent px-3 text-left text-[12px] text-[#000000] outline-none placeholder:text-[#565656]"
                                                value={flightAltitude}
                                                onChange={(event) => setFlightAltitude(normalizeNumericInputValue(event.target.value))}
                                                onFocus={handleNumericFocus}
                                                onClick={handleNumericClick}
                                            />
                                        </GradientFieldFrame>
                                    </div>
                                ) : null}

                                {isROI ? (
                                    <CoordinateField
                                        label={t('dashboard.roiCoordinates')}
                                        position={roiPosition}
                                        accentClass="text-emerald-400"
                                        onClear={() => setRoiPosition(null)}
                                        emptyLabel={t('dashboard.clickMapToSetPoint')}
                                    />
                                ) : null}

                                {isLaunch || isROI ? (
                                    <div className="flex flex-col">
                                        <label className="mb-2 px-2 text-center text-[10px] text-[#000000]">{t('dashboard.takeoffHoldDuration')}</label>
                                        <GradientFieldFrame className="h-[32px] w-[160px]">
                                            <input
                                                type="number"
                                                min="0"
                                                className="h-full w-full bg-transparent px-3 text-left text-[12px] text-[#000000] outline-none placeholder:text-[#565656]"
                                                value={takeoffHoldDuration}
                                                onChange={(event) => setTakeoffHoldDuration(normalizeNumericInputValue(event.target.value))}
                                                onFocus={handleNumericFocus}
                                                onClick={handleNumericClick}
                                            />
                                        </GradientFieldFrame>
                                    </div>
                                ) : null}

                                {isSpiral ? (
                                    <>
                                        <div className="flex flex-col">
                                            <label className="mb-2 px-2 text-center text-[10px] text-[#000000]">{t('dashboard.radiusMeter')}</label>
                                            <GradientFieldFrame className="flex h-[32px] min-w-[100px] items-center px-3">
                                                <span className={`font-mono text-[12px] ${displayRadius > 0 ? 'text-[#682F2F]' : 'text-[11px] italic text-[#565656]'}`}>
                                                    {displayRadius > 0 ? `${displayRadius}` : t('dashboard.draw')}
                                                </span>
                                            </GradientFieldFrame>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="mb-2 px-2 text-center text-[10px] text-[#000000]">{t('dashboard.quickWaypoints')}</label>
                                            <GradientFieldFrame className="h-[32px] w-[80px]">
                                                <input
                                                    type="number"
                                                    className="h-full w-full cursor-not-allowed bg-transparent px-3 text-center text-[12px] text-[#565656] opacity-60 outline-none"
                                                    value={waypointCount}
                                                    disabled
                                                />
                                            </GradientFieldFrame>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {effectiveError ? (
                        <div className="rounded border border-[#7F3434] bg-[#EBDDDD] px-4 py-3 text-[12px] text-[#B42323]">
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
                                src={cancelButtonAsset}
                                alt={t('common.cancel')}
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
                                src={launchButtonAsset}
                                alt={t('dashboard.launch')}
                                className="aspect-[418/76] w-full object-contain transition duration-150 hover:brightness-95 hover:contrast-105"
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
