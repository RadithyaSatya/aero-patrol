import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, GeoJSON, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import droneIconImage from '../../../assets/images/icon_drone.svg';
import droneCenterMissionIcon from '../../../assets/images/icon_drone_center_mission_white.svg';
import detailInformationIcon from '../../../assets/images/icon_detail_information_mission_white.svg';
import droneSingleIcon from '../../../assets/images/icon_drone_single.svg';
import cancelMissionButton from '../../../assets/images/btn_cancel_quicklaunch.svg';
import cancelMissionButtonId from '../../../assets/images/btn_cancel_quicklaunch_id.svg';
import launchMissionButton from '../../../assets/images/btn_launch_quicklaunch.svg';
import launchMissionButtonId from '../../../assets/images/btn_launch_quicklaunch_id.svg';
import useWeatherForecast from '../../../shared/hooks/useWeatherForecast';
import {
    formatHumidity,
    formatTemperature,
    formatWind,
    getWeatherPresentation,
} from '../../../shared/utils/weather';
import { resolveTelemetryBattery } from '../../../shared/utils/telemetryBattery';
import {
    formatFlightDuration,
    formatMissionDistance,
    getEstimatedMissionDurationSeconds,
    getMissionProfileLengthMeters,
} from '../utils/missionMetrics';
import { useI18n } from '../../../shared/i18n/I18nProvider';
import geofenceData from '../../../services/geofence.json';
import {
    buildGeofenceMaskGeoJson,
    geofenceAreaPathOptions,
    geofenceMaskPathOptions,
    geofenceRadiusPathOptions,
} from '../../../shared/utils/geofence';
import { IS_GEOFENCE_JSON_ENABLED } from '../../../shared/config/geofenceConfig';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
            <img src="${droneIconImage}" alt="Drone" style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:block;" />
        </div>
    `,
    iconSize: [DRONE_ICON_WIDTH, DRONE_ICON_HEIGHT],
    iconAnchor: [DRONE_ICON_CENTER_X, DRONE_ICON_CENTER_Y]
});

const createWaypointIcon = (number) => new L.DivIcon({
    className: 'custom-waypoint-icon',
    html: `<div class="w-5 h-5 rounded-full bg-[#FD5050] border border-[#FD5050] text-white text-[10px] font-bold flex items-center justify-center shadow-lg">${number}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const geofenceMaskData = buildGeofenceMaskGeoJson(geofenceData);

const overlayTopStroke = 'linear-gradient(90deg, #ED0000 0%, rgba(237,0,0,0.2) 50%, #ED0000 100%)';
const overlayBottomStroke = 'linear-gradient(90deg, rgba(237,0,0,0.2) 0%, #ED0000 22%, #ED0000 100%)';
const overlayDividerStroke = 'linear-gradient(90deg, rgba(251,85,85,0.18) 0%, #E83737 50%, rgba(251,85,85,0.18) 100%)';
const panelBackground = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const panelBorderImage = 'conic-gradient(from 0deg at 50% 50%, rgba(251,85,85,0) 0deg 22deg, #FB5555 72deg, #ED0000 142deg, #ED0000 196deg, rgba(251,85,85,0) 214deg 252deg, #FB5555 304deg, #ED0000 342deg, rgba(251,85,85,0) 360deg)';
const INITIAL_MAP_ZOOM = 18;

const formatDurationMinutes = (durationSeconds, unitLabel = 'min') => {
    const normalizedDuration = Number(durationSeconds);

    if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) {
        return '--';
    }

    const minutes = normalizedDuration / 60;
    return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} ${unitLabel}`;
};

// Component to handle map clicks for adding waypoints
function MapClickHandler({ onAddWaypoint }) {
    useMapEvents({
        click(e) {
            onAddWaypoint(e.latlng);
        },
    });
    return null;
}

function MissionMapControlButton({ children, className = '', ...props }) {
    return (
        <button
            type="button"
            className={`relative flex h-[54px] w-[54px] items-center justify-center overflow-hidden shadow-lg transition ${className}`}
            style={{ background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }}
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
            <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-[#ED0000]" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-[#ED0000]" />
            <span className="relative z-10 flex items-center justify-center">{children}</span>
        </button>
    );
}

function MissionOverlayPanel({
    children,
    className = '',
    contentClassName = '',
    pointerEvents = 'none',
    onWheelCapture,
    onTouchMoveCapture,
}) {
    return (
        <div
            className={`font-inter absolute rounded-[30px] p-px shadow-lg ${className} ${pointerEvents === 'auto' ? 'pointer-events-auto' : 'pointer-events-none'}`}
            style={{ backgroundImage: panelBorderImage }}
            onWheelCapture={onWheelCapture}
            onTouchMoveCapture={onTouchMoveCapture}
        >
            <div className="relative h-full w-full overflow-hidden rounded-[29px]" style={{ background: panelBackground }}>
                <div className={`relative z-10 ${contentClassName}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}

const toLatLng = (latitude, longitude) => {
    if (latitude == null || longitude == null) {
        return null;
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
        return null;
    }

    return [parsedLatitude, parsedLongitude];
};

const formatDateTime = (value, timeZone) => {
    if (!value) return '-';

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timeZone || undefined,
    }).format(parsedDate);
};

const toTitleCase = (value = '') => value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatScheduleType = (value, t) => (
    !value ? '-' : value === 'one_time' ? t('missions.oneTime') : `${t('missions.recurring')} - ${toTitleCase(value)}`
);

const formatWaypointAction = (value) => {
    if (!value) return '-';
    return toTitleCase(value);
};

const formatCoordinate = (value) => {
    const parsedValue = Number(value);
    return Number.isNaN(parsedValue) ? '-' : parsedValue.toFixed(6);
};

export default function MissionMapPanel({
    waypoints,
    takeoffHoldDuration = '',
    onAddWaypoint,
    onCancelMission,
    onLaunchMission,
    isViewMode = true,
    selectedDrone,
    telemetry = null,
    telemetryStatus = null,
    missionRun,
    missionDetail,
    isMissionDetailLoading = false,
    missionDetailError = '',
    isLaunchingMission = false,
}) {
    const { t, language } = useI18n();
    const cancelMissionButtonAsset = language === 'id' ? cancelMissionButtonId : cancelMissionButton;
    const launchMissionButtonAsset = language === 'id' ? launchMissionButtonId : launchMissionButton;
    const mapRef = useRef(null);
    const defaultCenter = [-6.200000, 106.816666];
    const dockPosition = toLatLng(selectedDrone?.home_latitude, selectedDrone?.home_longitude);
    const homePosition = selectedDrone?.home_latitude != null && selectedDrone?.home_longitude != null
        ? { lat: Number(selectedDrone.home_latitude), lng: Number(selectedDrone.home_longitude) }
        : null;
    const telemetryPosition = toLatLng(telemetry?.location?.latitude, telemetry?.location?.longitude);
    const isLocationFresh = Boolean(telemetryStatus?.metrics?.location?.isFresh);
    const dronePosition = isLocationFresh
        ? telemetryPosition
        : (telemetryPosition || dockPosition);
    const droneYaw = Number.isFinite(Number(telemetry?.attitude?.yaw_deg))
        ? Number(telemetry.attitude.yaw_deg)
        : Number(telemetry?.location?.heading ?? 0);
    const center = dockPosition || defaultCenter;
    const initialZoom = INITIAL_MAP_ZOOM;
    const parsedMaxRange = Number(selectedDrone?.max_range_meter);
    const maxRange = Number.isFinite(parsedMaxRange) && parsedMaxRange > 0 ? parsedMaxRange : null;
    const activeWaypoints = isViewMode
        ? (Array.isArray(missionDetail?.waypoints) ? missionDetail.waypoints : [])
        : waypoints;
    const missionTitle = missionDetail?.mission_name || missionRun?.mission_name || t('missions.missionDetail');
    const missionDateTime = formatDateTime(
        missionRun?.run_at || missionDetail?.schedule,
        missionRun?.schedule_timezone || missionDetail?.schedule_timezone
    );
    const rtlAnchorPosition = dockPosition;
    const linePositions = activeWaypoints
        .map((wp) => toLatLng(wp.latitude ?? wp.lat, wp.longitude ?? wp.lng))
        .filter(Boolean);
    const missionLengthMeters = getMissionProfileLengthMeters({
        waypoints: activeWaypoints,
        homePosition,
    });
    const estimatedFlightDurationSeconds = getEstimatedMissionDurationSeconds({
        missionLengthMeters,
        flightSpeed: selectedDrone?.flight_speed,
        takeoffHoldDuration: isViewMode ? missionDetail?.takeoff_hold_duration : takeoffHoldDuration,
        waypoints: activeWaypoints,
    });
    const batteryState = resolveTelemetryBattery(telemetry, telemetryStatus);
    const topDetailItems = [
        { label: t('missions.flightEstimationMin'), value: formatDurationMinutes(estimatedFlightDurationSeconds, t('missions.minuteAbbreviation')) },
        { label: t('missions.schedule'), value: formatScheduleType(missionRun?.schedule_type || missionDetail?.schedule_type || '', t) },
        { label: t('missions.flightDistance'), value: formatMissionDistance(missionLengthMeters) },
        { label: t('missions.takeoffHold'), value: missionDetail?.takeoff_hold_duration != null ? `${missionDetail.takeoff_hold_duration} s` : '-' },
    ];
    const batteryPercent = batteryState.percent;
    const batteryLabel = batteryPercent != null
        ? `${batteryPercent}% (${batteryPercent >= 60 ? t('missions.good') : batteryPercent >= 30 ? t('missions.moderate') : t('missions.low')})`
        : '--';
    const flightSpeedLabel = Number.isFinite(Number(selectedDrone?.flight_speed))
        ? `${Number(selectedDrone.flight_speed).toFixed(1)} m/s`
        : '--';
    const { weatherData, weatherError, isLoading: isWeatherLoading } = useWeatherForecast({
        selectedDrone,
        telemetry,
        forecastHours: 6,
    });
    const currentWeather = weatherData?.current || {};
    const currentWeatherPresentation = getWeatherPresentation(currentWeather.weather_code, currentWeather.is_day);
    const currentWeatherLabel = t(currentWeatherPresentation.labelKey, currentWeatherPresentation.label);
    const allLines = rtlAnchorPosition && linePositions.length > 0
        ? [rtlAnchorPosition, ...linePositions, rtlAnchorPosition]
        : [];

    const handleCenterDrone = () => {
        if (!mapRef.current) return;

        const targetPosition = dronePosition || dockPosition;
        if (!targetPosition) return;

        mapRef.current.setView(targetPosition, mapRef.current.getZoom(), { animate: true });
    };

    const handleZoomIn = () => {
        mapRef.current?.zoomIn();
    };

    const handleZoomOut = () => {
        mapRef.current?.zoomOut();
    };

    const stopOverlayScrollPropagation = (event) => {
        event.stopPropagation();
    };

    useEffect(() => {
        if (!mapRef.current) {
            return;
        }

        mapRef.current.setView(center, initialZoom, { animate: true });
    }, [
        initialZoom,
        center[0],
        center[1],
    ]);

    return (
        <div className="relative w-full h-full bg-[#181d25]">
            <MapContainer
                center={center}
                zoom={initialZoom}
                ref={mapRef}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                scrollWheelZoom={true}
                maxZoom={INITIAL_MAP_ZOOM}
            >
                {/* Satellite tile layer */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='Tiles &copy; Esri'
                />

                <MapClickHandler onAddWaypoint={onAddWaypoint} />

                {dockPosition && maxRange != null ? (
                    <Circle center={dockPosition} radius={maxRange} pathOptions={geofenceRadiusPathOptions} />
                ) : null}

                {IS_GEOFENCE_JSON_ENABLED && Array.isArray(geofenceMaskData?.features) && geofenceMaskData.features.length > 0 ? (
                    <GeoJSON data={geofenceMaskData} style={geofenceMaskPathOptions} />
                ) : null}

                {IS_GEOFENCE_JSON_ENABLED && Array.isArray(geofenceData?.features) && geofenceData.features.length > 0 ? (
                    <GeoJSON data={geofenceData} style={geofenceAreaPathOptions} />
                ) : null}

                {allLines.length > 1 ? (
                    <Polyline positions={allLines} color="#BCBCBC" weight={2} dashArray="4, 6" />
                ) : null}

                {dockPosition && (
                    <Marker position={dockPosition} icon={dockIcon} />
                )}

                {dronePosition && (
                    <Marker
                        position={dronePosition}
                        icon={createDroneIcon(droneYaw)}
                        zIndexOffset={1000}
                        interactive={false}
                        keyboard={false}
                        bubblingMouseEvents={false}
                    />
                )}

                {activeWaypoints.map((wp, index) => (
                    <Marker
                        key={wp.id}
                        position={[wp.latitude ?? wp.lat, wp.longitude ?? wp.lng]}
                        icon={createWaypointIcon(index + 1)}
                    />
                ))}
            </MapContainer>

            {/* Map Custom Controls (Zoom/Location) */}
            <div className="absolute top-[60vh] left-4 z-[450] flex flex-col gap-1">
                <div className="flex flex-col gap-1">
                    <MissionMapControlButton onClick={handleCenterDrone} aria-label={t('missions.drone')}>
                        <img
                            src={droneCenterMissionIcon}
                            alt=""
                            aria-hidden="true"
                            className="h-5 w-5 object-contain"
                        />
                    </MissionMapControlButton>
                    <MissionMapControlButton onClick={handleZoomIn} aria-label="Zoom in">
                        <span className="text-[24px] leading-none text-black">+</span>
                    </MissionMapControlButton>
                </div>
                <MissionMapControlButton onClick={handleZoomOut} aria-label="Zoom out">
                    <span className="text-[24px] leading-none text-black">−</span>
                </MissionMapControlButton>
            </div>

            {/* Conditionally Render Overlays */}
            {isViewMode ? (
                <>
                    {/* View Mode: Detail Overlay */}
                    <MissionOverlayPanel
                        className="top-4 right-4 z-[450] max-h-[min(320px,calc(100%-2rem))] w-[280px]"
                        contentClassName="flex max-h-full flex-col p-5"
                        pointerEvents="auto"
                        onWheelCapture={stopOverlayScrollPropagation}
                        onTouchMoveCapture={stopOverlayScrollPropagation}
                    >
                        <div className="mb-4 flex shrink-0 items-center space-x-2">
                            <img
                                src={detailInformationIcon}
                                alt=""
                                aria-hidden="true"
                                className="h-[14px] w-[14px] object-contain"
                            />
                            <span className="text-[#1F1F1F] text-[13px] font-medium tracking-wide">{t('missions.detail')}</span>
                        </div>

                        <div
                            className="mb-4 h-px w-full shrink-0"
                            style={{ backgroundImage: overlayDividerStroke }}
                        />

                        {isMissionDetailLoading ? (
                            <div className="text-xs text-[#5F5F5F]">{t('missions.loadingMissionDetail')}</div>
                        ) : missionDetailError ? (
                            <div className="text-xs text-[#B42323]">{missionDetailError}</div>
                        ) : !missionRun ? (
                            <div className="text-xs text-[#5F5F5F]">{t('missions.selectMissionHint')}</div>
                        ) : (
                            <div className="custom-scrollbar min-h-0 overflow-y-auto pr-1" onWheelCapture={stopOverlayScrollPropagation} onTouchMoveCapture={stopOverlayScrollPropagation}>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-5">
                                {topDetailItems.map((item) => (
                                    <div key={item.label} className="flex flex-col">
                                        <span className="mb-1 text-[10px] text-[#454545]">{item.label}</span>
                                        <span className="text-xs text-[#1F1F1F]">{item.value || '-'}</span>
                                    </div>
                                ))}
                                </div>
                            </div>
                        )}
                    </MissionOverlayPanel>

                    {/* View Mode: Mission Waypoints List */}
                    <MissionOverlayPanel
                        className="bottom-4 right-4 z-[450] max-h-[min(420px,calc(100%-2rem))] w-[400px]"
                        contentClassName="flex max-h-full flex-col p-4"
                        pointerEvents="auto"
                        onWheelCapture={stopOverlayScrollPropagation}
                        onTouchMoveCapture={stopOverlayScrollPropagation}
                    >
                        <div className="mb-4 flex shrink-0 items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <img
                                    src={detailInformationIcon}
                                    alt=""
                                    aria-hidden="true"
                                    className="h-[14px] w-[14px] object-contain"
                                />
                                <div>
                                    <h3 className="text-[#1F1F1F] text-[13px]">{missionTitle}</h3>
                                    <p className="mt-0.5 text-[10px] text-[#5F5F5F]">{missionDateTime}</p>
                                </div>
                            </div>
                        </div>

                        <div
                            className="mb-4 h-px w-full shrink-0"
                            style={{ backgroundImage: overlayDividerStroke }}
                        />

                        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto space-y-2 pr-1" onWheelCapture={stopOverlayScrollPropagation} onTouchMoveCapture={stopOverlayScrollPropagation}>
                            {isMissionDetailLoading ? (
                                <div className="px-2 py-3 text-xs text-[#5F5F5F]">{t('missions.loadingWaypoints')}</div>
                            ) : missionDetailError ? (
                                <div className="px-2 py-3 text-xs text-[#B42323]">{missionDetailError}</div>
                            ) : activeWaypoints.length === 0 ? (
                                <div className="px-2 py-3 text-xs text-[#5F5F5F]">
                                    {missionRun ? t('missions.missionNoWaypoints') : t('missions.noMissionSelected')}
                                </div>
                            ) : (
                                activeWaypoints.map((wp, i) => (
                                    <div key={wp.id} className="relative overflow-hidden border border-[#A8A8A8] bg-[#EBEBEB] p-3">
                                        <h4 className="mb-2 text-xs tracking-wide text-[#1F1F1F]">{t('missions.point')} {i + 1}</h4>
                                        <div className="grid grid-cols-[0.9fr_0.9fr_1.2fr] gap-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] uppercase text-[#454545]">{t('missions.altitudeMeter')}</span>
                                                <div className="rounded border border-[#A8A8A8] bg-white/70 px-2 py-1">
                                                    <span className="text-[11px] text-[#1F1F1F]">{wp.altitude ?? '-'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] uppercase text-[#454545]">{t('missions.holdSecond')}</span>
                                                <div className="rounded border border-[#A8A8A8] bg-white/70 px-2 py-1">
                                                    <span className="text-[11px] text-[#1F1F1F]">{wp.action_duration ?? '-'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] uppercase text-[#454545]">{t('common.action')}</span>
                                                <div className="rounded border border-[#A8A8A8] bg-white/70 px-2 py-1">
                                                    <span className="whitespace-nowrap text-[11px] text-[#1F1F1F]">{formatWaypointAction(wp.action)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </MissionOverlayPanel>
                </>
            ) : (
                <>
                    {/* Add Mode: Drone Condition Overlay */}
                    <MissionOverlayPanel
                        className="top-4 left-4 z-[450] w-[280px]"
                        contentClassName="p-4"
                    >
                        <div className="flex items-center space-x-2 mb-4">
                            <img
                                src={detailInformationIcon}
                                alt=""
                                aria-hidden="true"
                                className="h-[14px] w-[14px] object-contain"
                            />
                            <span className="text-[#1F1F1F] text-xs font-medium tracking-wide">{t('missions.droneCondition')}</span>
                        </div>

                        <div
                            className="mb-4 h-px w-full"
                            style={{ backgroundImage: overlayDividerStroke }}
                        />

                        <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-4">
                            <div className="flex flex-col">
                                <span className="text-[#454545] text-[10px] mb-1">{t('missions.batteryLevel')}</span>
                                <span className="text-[#1F1F1F] text-[11px] font-medium">{batteryLabel}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[#454545] text-[10px] mb-1">{t('missions.missionEstimation')}</span>
                                <span className="text-[#1F1F1F] text-[11px]">{formatFlightDuration(estimatedFlightDurationSeconds)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[#454545] text-[10px] mb-1">{t('missions.flightSpeed')}</span>
                                <span className="text-[#1F1F1F] text-[11px] font-medium">{flightSpeedLabel}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[#454545] text-[10px] mb-1">{t('missions.missionLength')}</span>
                                <span className="text-[#1F1F1F] text-[11px]">{formatMissionDistance(missionLengthMeters)}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[#454545] text-[10px]">{t('missions.weatherCondition')}</span>
                            <div className="rounded-lg border border-[#A8A8A8] bg-[#EBEBEB] p-3">
                                <div className="flex items-center space-x-3 mb-3">
                                    <img src={currentWeatherPresentation.icon} alt={currentWeatherLabel} className="h-8 w-8 object-contain" />
                                    <div className="flex-1 flex justify-between items-center">
                                        <span className="text-[#1F1F1F] text-sm font-bold">
                                            {isWeatherLoading ? t('common.loading') : weatherError ? t('missions.weatherError') : currentWeatherLabel}
                                        </span>
                                        <span className="text-[#1F1F1F] text-lg font-bold">
                                            {isWeatherLoading ? '--' : formatTemperature(currentWeather.temperature_2m)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between text-[10px] text-[#454545]">
                                    <div className="flex space-x-1"><span>{t('dashboard.gust')}</span><span className="text-[#1F1F1F]">{isWeatherLoading ? '--' : formatWind(currentWeather.wind_gusts_10m)}</span></div>
                                    <div className="flex space-x-1"><span>{t('dashboard.wind')}</span><span className="text-[#1F1F1F]">{isWeatherLoading ? '--' : formatWind(currentWeather.wind_speed_10m)}</span></div>
                                    <div className="flex space-x-1"><span>{t('dashboard.humid')}</span><span className="text-[#1F1F1F]">{isWeatherLoading ? '--' : formatHumidity(currentWeather.relative_humidity_2m)}</span></div>
                                </div>
                                {weatherError ? <div className="mt-2 text-[10px] text-[#B42323]">{weatherError}</div> : null}
                            </div>
                        </div>
                    </MissionOverlayPanel>

                    {/* Add Mode: Legend Overlay */}
                    <MissionOverlayPanel
                        className="top-4 right-4 z-[450] w-[240px]"
                        contentClassName="p-4"
                    >
                        <div className="flex items-center space-x-2 mb-3">
                            <img
                                src={detailInformationIcon}
                                alt=""
                                aria-hidden="true"
                                className="h-[14px] w-[14px] object-contain"
                            />
                            <span className="text-[#1F1F1F] text-xs font-medium tracking-wide">{t('missions.legend')}</span>
                        </div>

                        <div
                            className="mb-3 h-px w-full"
                            style={{ backgroundImage: overlayDividerStroke }}
                        />

                        <div className="grid grid-cols-2 gap-y-3">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full border border-[#E1BA95] bg-[#9616161A]"></div>
                                <span className="text-[#454545] text-[10px] font-medium">{t('missions.maxRadius')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#d4af37] text-black text-[7px] font-bold flex items-center justify-center">H</div>
                                <span className="text-[#454545] text-[10px] font-medium">{t('missions.dock')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <img src={droneSingleIcon} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                                <span className="text-[#454545] text-[10px] font-medium">{t('missions.drone')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="flex space-x-[2px] text-[#682F2F] text-[10px] font-bold">
                                    <span>1</span><span>/</span><span>2</span><span>/</span><span>3</span>
                                </div>
                                <span className="text-[#454545] text-[10px] font-medium ml-1">{t('missions.waypoint')}</span>
                            </div>
                        </div>
                    </MissionOverlayPanel>

                    {/* Add Mode: Bottom Controls Overlay */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] flex flex-col items-center">
                        <div className="mt-2 flex items-center space-x-5">
                            <button
                                type="button"
                                onClick={onCancelMission}
                                disabled={isLaunchingMission}
                                className="bg-transparent hover:brightness-110 transition flex items-center space-x-2"
                            >
                                <img src={cancelMissionButtonAsset} alt={t('common.cancel')} className="h-[54px] w-auto max-w-none" />
                            </button>
                            <button
                                type="button"
                                onClick={onLaunchMission}
                                disabled={isLaunchingMission}
                                className={`bg-transparent transition ${isLaunchingMission ? 'cursor-not-allowed opacity-60' : 'hover:brightness-110'}`}
                            >
                                <img src={launchMissionButtonAsset} alt={t('dashboard.launch')} className="h-[54px] w-auto max-w-none" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
