import React, { useCallback, useEffect, useRef, useState } from 'react';
import MainVideoFeedPanel from '../../dashboard/panels/MainVideoFeedPanel';
import MapViewPanel from '../../dashboard/panels/MapViewPanel';
import WeatherPanel from '../../dashboard/panels/WeatherPanel';
import TelemetryPanel from '../../dashboard/panels/TelemetryPanel';
import FlightStreamControlPanel from '../../dashboard/panels/FlightStreamControlPanel';
import CameraJoystickPanel from '../../dashboard/panels/CameraJoystickPanel';
import AbortMissionConfirmModal from '../components/AbortMissionConfirmModal';
import { telemetryService, uavService } from '../../../services/api';
import useTelemetry from '../../../shared/hooks/useTelemetry';
import { useI18n } from '../../../shared/i18n/I18nProvider';
import cameraPanelBorderSvg from '../../../assets/images/image_border_campanel_dashboard.svg?raw';
import expandIcon from '../../../assets/images/icon_expand.svg';

const DASHBOARD_TELEMETRY_METRICS = [
    'vehicle_state',
    'location',
    'attitude',
    'battery',
    'docking_status',
    'uav_status',
    'gps',
    'gps2',
    'link',
    'mission_progress',
    'mission_event',
    'mission_status',
    'camera_state',
];

const ABORT_ELIGIBLE_RUNTIME_STATUSES = new Set(['preparing', 'preparingdock', 'safetofly', 'takeoff']);
const STREAM_BLOCKED_RUNTIME_STATUSES = new Set(['landed', 'dockconfirmed', 'completed', 'failed', 'aborted']);
const cameraPanelBorderMarkup = cameraPanelBorderSvg.replace(
    '<svg ',
    '<svg preserveAspectRatio="none" class="h-full w-full" '
);

const EMPTY_ACTIVE_TRACK = Object.freeze({
    historyId: null,
    missionId: null,
    startedAt: null,
    lastRecordedAt: null,
    points: [],
});

const toFiniteNumber = (value) => {
    if (value == null || value === '') {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeRuntimeStatus = (value = '') => String(value).replace(/[\s_-]+/g, '').toLowerCase();

const normalizeRecordedAt = (value) => {
    if (value == null || value === '') {
        return null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        const epochMs = value > 1e12 ? value : value * 1000;
        const parsedDate = new Date(epochMs);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};

const normalizeTrackPoint = (rawPoint) => {
    if (!rawPoint) {
        return null;
    }

    const latitude = toFiniteNumber(rawPoint.latitude ?? rawPoint.lat);
    const longitude = toFiniteNumber(rawPoint.longitude ?? rawPoint.lng ?? rawPoint.lon);

    if (latitude == null || longitude == null) {
        return null;
    }

    return {
        latitude,
        longitude,
        altitude: toFiniteNumber(rawPoint.altitude ?? rawPoint.alt),
        heading: toFiniteNumber(rawPoint.heading ?? rawPoint.course ?? rawPoint.yaw),
        recordedAt: normalizeRecordedAt(rawPoint.recorded_at ?? rawPoint.timestamp ?? rawPoint.ts),
    };
};

const compareTrackPoints = (pointA, pointB) => {
    const timeA = pointA.recordedAt ? Date.parse(pointA.recordedAt) : Number.POSITIVE_INFINITY;
    const timeB = pointB.recordedAt ? Date.parse(pointB.recordedAt) : Number.POSITIVE_INFINITY;

    if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
        return timeA - timeB;
    }

    if (Number.isFinite(timeA) !== Number.isFinite(timeB)) {
        return Number.isFinite(timeA) ? -1 : 1;
    }

    return 0;
};

const buildTrackPointKey = (point) => {
    const recordedAt = point.recordedAt || 'no-time';
    return `${recordedAt}:${point.latitude}:${point.longitude}`;
};

const dedupeTrackPoints = (points) => {
    const sortedPoints = [...points].sort(compareTrackPoints);
    const seen = new Set();
    const dedupedPoints = [];

    sortedPoints.forEach((point) => {
        const key = buildTrackPointKey(point);
        if (seen.has(key)) {
            return;
        }

        const previousPoint = dedupedPoints[dedupedPoints.length - 1];
        if (
            previousPoint &&
            previousPoint.latitude === point.latitude &&
            previousPoint.longitude === point.longitude &&
            previousPoint.recordedAt === point.recordedAt
        ) {
            return;
        }

        seen.add(key);
        dedupedPoints.push(point);
    });

    return dedupedPoints;
};

const normalizeTrackResponse = (response) => {
    const historyId = response?.history_id ?? null;
    const missionId = response?.mission_id ?? null;
    const startedAt = normalizeRecordedAt(response?.started_at);
    const lastRecordedAt = normalizeRecordedAt(response?.last_recorded_at);
    const points = Array.isArray(response?.points)
        ? dedupeTrackPoints(response.points.map(normalizeTrackPoint).filter(Boolean))
        : [];

    return {
        historyId,
        missionId,
        startedAt,
        lastRecordedAt,
        points,
    };
};

const mergeTrackState = (currentTrack, nextTrack) => {
    if (!nextTrack) {
        return { ...EMPTY_ACTIVE_TRACK };
    }

    if (
        nextTrack.historyId == null &&
        (!Array.isArray(nextTrack.points) || nextTrack.points.length === 0)
    ) {
        return { ...EMPTY_ACTIVE_TRACK };
    }

    if (!currentTrack || currentTrack.historyId !== nextTrack.historyId) {
        return {
            ...nextTrack,
            points: dedupeTrackPoints(nextTrack.points || []),
        };
    }

    return {
        historyId: nextTrack.historyId,
        missionId: nextTrack.missionId ?? currentTrack.missionId,
        startedAt: nextTrack.startedAt ?? currentTrack.startedAt,
        lastRecordedAt: nextTrack.lastRecordedAt ?? currentTrack.lastRecordedAt,
        points: dedupeTrackPoints([...(currentTrack.points || []), ...(nextTrack.points || [])]),
    };
};

export default function LiveVideoPage() {
    const { t } = useI18n();
    const translate = (key, fallback, replacements = {}) => Object.entries(replacements).reduce(
        (message, [replacementKey, replacementValue]) => message.replace(`{${replacementKey}}`, replacementValue),
        t(key, fallback)
    );
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [isDroneLoading, setIsDroneLoading] = useState(true);
    const [droneError, setDroneError] = useState('');
    const [droneTrailById, setDroneTrailById] = useState({});
    const [isMapPrimary, setIsMapPrimary] = useState(false);
    const [primaryVideoSource, setPrimaryVideoSource] = useState('drone');
    const [, setPrimaryVideoStatus] = useState('checking');
    const [isPrimaryPanelExpanded, setIsPrimaryPanelExpanded] = useState(false);
    const [isAbortingMission, setIsAbortingMission] = useState(false);
    const [isAbortConfirmOpen, setIsAbortConfirmOpen] = useState(false);
    const [abortMissionError, setAbortMissionError] = useState('');
    const [isCameraRecordingCommandPending, setIsCameraRecordingCommandPending] = useState(false);
    const [isCaptureCommandPending, setIsCaptureCommandPending] = useState(false);
    const [isZoomInCommandPending, setIsZoomInCommandPending] = useState(false);
    const [isZoomOutCommandPending, setIsZoomOutCommandPending] = useState(false);
    const [cameraCommandError, setCameraCommandError] = useState('');
    const trackRequestVersionRef = useRef(0);
    const activeMissionKeyRef = useRef('');

    useEffect(() => {
        const fetchDrone = async () => {
            try {
                const data = await uavService.getUav();
                if (data?.id) {
                    setSelectedDrone(data);
                } else {
                    setDroneError(t('dashboard.errorNoUavAvailable'));
                }
            } catch (error) {
                console.error('Error fetching drone info:', error);
                if (error.message === 'No authentication token found') {
                    setDroneError(t('dashboard.errorNotAuthenticated'));
                } else {
                    setDroneError(t('dashboard.errorLoadingData'));
                }
            } finally {
                setIsDroneLoading(false);
            }
        };

        fetchDrone();
    }, [t]);

    const uavIds = selectedDrone?.id ? [selectedDrone.id] : [];
    const { telemetry, telemetryStatus } = useTelemetry(uavIds, DASHBOARD_TELEMETRY_METRICS);
    const selectedTelemetry = selectedDrone ? telemetry[selectedDrone.id] : null;
    const selectedTelemetryStatus = selectedDrone ? telemetryStatus[selectedDrone.id] : null;
    const droneStatus = selectedDrone?.status || {};
    const telemetryVehicleState = selectedTelemetry?.vehicle_state || {};
    const telemetryMissionEvent = selectedTelemetry?.mission_event || {};
    const telemetryMissionStatus = selectedTelemetry?.mission_status || {};
    const telemetryCameraState = selectedTelemetry?.camera_state || {};
    const isVehicleStateFresh = Boolean(selectedTelemetryStatus?.metrics?.vehicle_state?.isFresh);
    const isCameraStateFresh = Boolean(selectedTelemetryStatus?.metrics?.camera_state?.isFresh);
    const isLocationFresh = Boolean(selectedTelemetryStatus?.metrics?.location?.isFresh);
    const isBatteryFresh = Boolean(selectedTelemetryStatus?.metrics?.battery?.isFresh);
    const isLinkFresh = Boolean(selectedTelemetryStatus?.metrics?.link?.isFresh);
    const telemetryHistoryId = telemetryMissionEvent.history_id ?? null;
    const missionStatusHistoryId = telemetryMissionStatus.history_id ?? null;
    const missionStatusMissionId = telemetryMissionStatus.mission_id ?? null;
    const telemetryRuntimeStatus = telemetryMissionStatus.runtime_status ?? '';
    const normalizedRuntimeStatus = normalizeRuntimeStatus(telemetryRuntimeStatus);
    const isVehicleMissionActive = isVehicleStateFresh && typeof telemetryVehicleState.in_mission === 'boolean'
        ? telemetryVehicleState.in_mission
        : null;
    const isDroneInMission = Boolean(
        isVehicleMissionActive ??
        droneStatus.is_in_flight ??
        (telemetryVehicleState.armed && telemetryVehicleState.landed_state !== 'LANDED')
    );
    const isDroneActiveForStream = Boolean(
        (isVehicleStateFresh && telemetryVehicleState.connected === true) ||
        isCameraStateFresh ||
        isLocationFresh ||
        isBatteryFresh ||
        isLinkFresh ||
        isDroneInMission ||
        telemetryVehicleState.armed === true ||
        droneStatus.is_in_flight
    );
    const canOpenStreamMode = isDroneActiveForStream;
    const selectedLocation = selectedTelemetry?.location || {};
    const selectedHeading = isLocationFresh && selectedLocation.heading != null ? Number(selectedLocation.heading) : 0;
    const selectedTrack = selectedDrone ? (droneTrailById[selectedDrone.id] || EMPTY_ACTIVE_TRACK) : EMPTY_ACTIVE_TRACK;
    const activeMissionHistoryId = missionStatusHistoryId ?? telemetryHistoryId ?? selectedTrack.historyId ?? null;
    const selectedTrail = selectedTrack.points.map((point) => [point.latitude, point.longitude]);
    const lastTrackedPoint = selectedTrack.points[selectedTrack.points.length - 1] || null;
    const fallbackMapPosition = lastTrackedPoint
        ? [lastTrackedPoint.latitude, lastTrackedPoint.longitude]
        : null;
    const canAbortMission = Boolean(
        selectedDrone?.id &&
        activeMissionHistoryId != null &&
        ABORT_ELIGIBLE_RUNTIME_STATUSES.has(normalizedRuntimeStatus)
    );
    const currentCameraZoomLevel = Number(telemetryCameraState.zoom_level);
    const hasCameraZoomLevel = isCameraStateFresh && Number.isFinite(currentCameraZoomLevel);
    const isCameraConnected = isCameraStateFresh && telemetryCameraState.connected === true;
    const isCameraRecording = isCameraStateFresh && (
        telemetryCameraState.recording_state === 1
        || String(telemetryCameraState.recording_label || '').toLowerCase() === 'on'
    );

    const refreshTrack = useCallback(async () => {
        if (!selectedDrone?.id) {
            return;
        }

        const requestVersion = trackRequestVersionRef.current + 1;
        trackRequestVersionRef.current = requestVersion;

        try {
            const response = await telemetryService.getTrack();
            const normalizedTrack = normalizeTrackResponse(response);

            setDroneTrailById((current) => {
                if (trackRequestVersionRef.current !== requestVersion) {
                    return current;
                }

                const previousTrack = current[selectedDrone.id] || EMPTY_ACTIVE_TRACK;

                return {
                    ...current,
                    [selectedDrone.id]: mergeTrackState(previousTrack, normalizedTrack),
                };
            });
        } catch (error) {
            console.error('Error fetching active telemetry track:', error);
        }
    }, [selectedDrone?.id]);

    useEffect(() => {
        if (!selectedDrone?.id) {
            return;
        }

        refreshTrack();
    }, [refreshTrack, selectedDrone?.id]);

    useEffect(() => {
        if (!selectedDrone?.id) {
            return;
        }

        if (
            telemetryHistoryId != null ||
            missionStatusHistoryId != null ||
            missionStatusMissionId != null ||
            telemetryRuntimeStatus ||
            isDroneInMission ||
            selectedTrack.historyId != null
        ) {
            refreshTrack();
        }
    }, [
        refreshTrack,
        selectedDrone?.id,
        telemetryHistoryId,
        missionStatusHistoryId,
        missionStatusMissionId,
        telemetryRuntimeStatus,
        isDroneInMission,
        selectedTrack.historyId,
    ]);

    useEffect(() => {
        if (!selectedDrone?.id) {
            activeMissionKeyRef.current = '';
            return;
        }

        const nextMissionKey = [
            missionStatusMissionId ?? selectedTrack.missionId ?? 'none',
            missionStatusHistoryId ?? telemetryHistoryId ?? selectedTrack.historyId ?? 'none',
            telemetryRuntimeStatus || 'none',
        ].join(':');

        if (nextMissionKey === activeMissionKeyRef.current) {
            return;
        }

        activeMissionKeyRef.current = nextMissionKey;

        if (nextMissionKey === 'none:none:none') {
            return;
        }

        refreshTrack();
    }, [
        selectedDrone?.id,
        missionStatusMissionId,
        missionStatusHistoryId,
        telemetryHistoryId,
        selectedTrack.missionId,
        selectedTrack.historyId,
        telemetryRuntimeStatus,
        refreshTrack,
    ]);

    useEffect(() => {
        if (!selectedDrone?.id) {
            return;
        }

        const livePoint = normalizeTrackPoint(selectedLocation);

        if (!livePoint) {
            return;
        }

        setDroneTrailById((current) => {
            const previousTrack = current[selectedDrone.id] || EMPTY_ACTIVE_TRACK;
            const activeHistoryId = telemetryHistoryId ?? previousTrack.historyId;

            if (activeHistoryId == null) {
                return current;
            }

            const baseTrack = previousTrack.historyId === activeHistoryId
                ? previousTrack
                : {
                    ...EMPTY_ACTIVE_TRACK,
                    historyId: activeHistoryId,
                };
            const previousPoint = baseTrack.points[baseTrack.points.length - 1];

            if (
                previousPoint &&
                previousPoint.latitude === livePoint.latitude &&
                previousPoint.longitude === livePoint.longitude &&
                previousPoint.recordedAt === livePoint.recordedAt
            ) {
                return current;
            }

            const nextLastRecordedAt = livePoint.recordedAt ?? baseTrack.lastRecordedAt;

            return {
                ...current,
                [selectedDrone.id]: {
                    ...baseTrack,
                    historyId: activeHistoryId,
                    lastRecordedAt: nextLastRecordedAt,
                    points: dedupeTrackPoints([...(baseTrack.points || []), livePoint]),
                },
            };
        });
    }, [
        selectedDrone?.id,
        selectedLocation.latitude,
        selectedLocation.lat,
        selectedLocation.longitude,
        selectedLocation.lng,
        selectedLocation.lon,
        selectedLocation.recorded_at,
        selectedLocation.timestamp,
        selectedLocation.ts,
        selectedLocation.altitude,
        selectedLocation.alt,
        selectedLocation.heading,
        selectedLocation.course,
        selectedLocation.yaw,
        telemetryHistoryId,
    ]);

    useEffect(() => {
        setIsPrimaryPanelExpanded(false);
    }, [selectedDrone?.id]);

    const handleAbortMission = useCallback(async () => {
        if (!selectedDrone?.id) {
            setAbortMissionError(t('dashboard.errorNoUavAbort'));
            return;
        }

        if (activeMissionHistoryId == null) {
            setAbortMissionError(t('dashboard.errorNoMissionHistory'));
            return;
        }

        setAbortMissionError('');
        setIsAbortConfirmOpen(true);
    }, [activeMissionHistoryId, selectedDrone?.id, t]);

    const handleConfirmAbortMission = useCallback(async () => {
        if (!selectedDrone?.id) {
            setAbortMissionError(t('dashboard.errorNoUavAbort'));
            setIsAbortConfirmOpen(false);
            return;
        }

        if (activeMissionHistoryId == null) {
            setAbortMissionError(t('dashboard.errorNoMissionHistory'));
            setIsAbortConfirmOpen(false);
            return;
        }

        setAbortMissionError('');
        setIsAbortConfirmOpen(false);
        setIsAbortingMission(true);

        try {
            await telemetryService.publishMetric({
                uavId: selectedDrone.id,
                metric: 'mission_event',
                payload: {
                    history_id: activeMissionHistoryId,
                    event: 'mission_aborted',
                    message: 'frontend_abort_request',
                },
            });

            refreshTrack();
        } catch (error) {
            console.error('Error aborting mission:', error);
            setAbortMissionError(error.message || t('dashboard.errorAbortMission'));
        } finally {
            setIsAbortingMission(false);
        }
    }, [activeMissionHistoryId, refreshTrack, selectedDrone?.id, t]);

    const publishCameraCommand = useCallback(async (payload) => {
        if (!selectedDrone?.id) {
            throw new Error('No UAV available for camera command.');
        }

        await telemetryService.publishMetric({
            uavId: selectedDrone.id,
            metric: 'camera_command',
            payload,
        });
    }, [selectedDrone?.id]);

    const handleTakePicture = useCallback(async () => {
        setCameraCommandError('');
        setIsCaptureCommandPending(true);

        try {
            await publishCameraCommand({
                command: 'take_photo',
            });
        } catch (error) {
            console.error('Error taking photo:', error);
            setCameraCommandError(error.message || t('dashboard.errorTakePicture'));
        } finally {
            setIsCaptureCommandPending(false);
        }
    }, [publishCameraCommand, t]);

    const handleStartRecording = useCallback(async () => {
        if (isCameraRecording) {
            return;
        }

        setCameraCommandError('');
        setIsCameraRecordingCommandPending(true);

        try {
            await publishCameraCommand({
                command: 'set_recording',
                enabled: true,
            });
        } catch (error) {
            console.error('Error starting recording:', error);
            setCameraCommandError(error.message || t('dashboard.errorStartRecording'));
        } finally {
            setIsCameraRecordingCommandPending(false);
        }
    }, [isCameraRecording, publishCameraCommand, t]);

    const handleZoomStep = useCallback(async (direction) => {
        if (!hasCameraZoomLevel) {
            setCameraCommandError(t('dashboard.errorZoomUnavailable'));
            return;
        }

        const nextZoomLevel = direction === 'in'
            ? currentCameraZoomLevel + 1
            : Math.max(0, currentCameraZoomLevel - 1);
        const setPending = direction === 'in'
            ? setIsZoomInCommandPending
            : setIsZoomOutCommandPending;

        setCameraCommandError('');
        setPending(true);

        try {
            await publishCameraCommand({
                command: 'set_zoom_level',
                zoom_level: Number(nextZoomLevel.toFixed(1)),
            });
        } catch (error) {
            console.error(`Error zooming ${direction}:`, error);
            setCameraCommandError(error.message || translate('dashboard.errorZoom', 'Failed to zoom {direction}', { direction }));
        } finally {
            setPending(false);
        }
    }, [currentCameraZoomLevel, hasCameraZoomLevel, publishCameraCommand, t, translate]);

    const shouldShowPrimaryStreamSwitch = !isMapPrimary;

    const renderPrimaryPanel = ({ expanded = false } = {}) => (
        isMapPrimary
            ? (
                <MapViewPanel
                    telemetry={selectedTelemetry}
                    telemetryStatus={selectedTelemetryStatus}
                    selectedDrone={selectedDrone}
                    trailPositions={selectedTrail}
                    fallbackPosition={fallbackMapPosition}
                    showCompass
                    showControls={false}
                    radiusClassName={expanded ? 'rounded-[32px]' : 'rounded-[24px]'}
                />
            )
            : (
                <MainVideoFeedPanel
                    showCompass
                    heading={selectedHeading}
                    radiusClassName={expanded ? 'rounded-[32px]' : 'rounded-[24px]'}
                    streamSource={primaryVideoSource}
                    onStreamStatusChange={setPrimaryVideoStatus}
                />
            )
    );

    const renderSecondaryPanel = () => (
        isMapPrimary
            ? (
                <MainVideoFeedPanel
                    compact
                    lightShell
                    heading={selectedHeading}
                    radiusClassName="rounded-[12px]"
                    streamSource={primaryVideoSource}
                />
            )
            : <MapViewPanel telemetry={selectedTelemetry} telemetryStatus={selectedTelemetryStatus} selectedDrone={selectedDrone} trailPositions={selectedTrail} fallbackPosition={fallbackMapPosition} showControls={false} lightShell radiusClassName="rounded-[12px]" />
    );
    const availabilityMessage = isDroneLoading
        ? t('loading', 'Loading...')
        : (droneError || t('dashboard.liveVideoRequiresDroneOn'));
    const isStreamInteractionDisabled = !canOpenStreamMode;

    return (
        <div className="app-page relative">
            <div className="app-page__inner relative h-full">
            <div
                className={`grid h-full w-full grid-rows-[minmax(0,1fr)_clamp(200px,24vh,216px)] gap-[clamp(18px,2vw,28px)] ${isPrimaryPanelExpanded ? 'invisible' : ''}`}
                style={{ gridTemplateColumns: 'clamp(300px, 22vw, 420px) minmax(0, 1fr)' }}
            >
                <div className="row-span-2 flex min-h-0 flex-col gap-[clamp(18px,1.8vw,20px)]">
                    <div className="h-[clamp(220px,24vh,260px)] shrink-0">
                        <WeatherPanel variant="stream" selectedDrone={selectedDrone} telemetry={selectedTelemetry} />
                    </div>

                    <div className="min-h-0 flex-1">
                        <TelemetryPanel
                            telemetry={selectedTelemetry}
                            telemetryStatus={selectedTelemetryStatus}
                        />
                    </div>
                </div>

                <div className="relative min-h-0 overflow-hidden rounded-[30px]">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-[450] select-none"
                        dangerouslySetInnerHTML={{ __html: cameraPanelBorderMarkup }}
                    />
                    {shouldShowPrimaryStreamSwitch ? (
                        <div className="absolute left-6 right-6 top-6 z-[520] flex items-center justify-between gap-4">
                            <div className="flex items-center rounded-[14px] border border-white/12 bg-black/58 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm">
                                <button
                                    type="button"
                                    onClick={() => setPrimaryVideoSource('drone')}
                                    className={`min-w-[108px] rounded-[10px] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                                        primaryVideoSource === 'drone'
                                            ? 'bg-white text-[#C20000]'
                                            : 'bg-transparent text-white hover:bg-white/10'
                                    }`}
                                >
                                    Drone
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPrimaryVideoSource('cctv')}
                                    className={`min-w-[108px] rounded-[10px] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                                        primaryVideoSource === 'cctv'
                                            ? 'bg-white text-[#C20000]'
                                            : 'bg-transparent text-white hover:bg-white/10'
                                    }`}
                                >
                                    CCTV
                                </button>
                            </div>
                            {isStreamInteractionDisabled ? (
                                <div className="rounded-[12px] border border-[#B0B0B0] bg-black/55 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#D7D7D7]">
                                    {availabilityMessage}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    {!shouldShowPrimaryStreamSwitch && isStreamInteractionDisabled ? (
                        <div className="absolute left-6 top-6 z-[500] rounded-[12px] border border-[#B0B0B0] bg-black/55 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#D7D7D7]">
                            {availabilityMessage}
                        </div>
                    ) : null}
                    <div className="h-full overflow-hidden p-[5px]">
                        {renderPrimaryPanel()}
                    </div>
                    <button
                        type="button"
                        aria-label={isPrimaryPanelExpanded ? 'Collapse panel' : 'Expand panel'}
                        onClick={() => setIsPrimaryPanelExpanded((current) => !current)}
                        className="absolute bottom-6 left-6 z-[550] flex h-[44px] w-[44px] items-center justify-center rounded-full bg-black/50 transition-colors hover:bg-black/65"
                    >
                        <img
                            src={expandIcon}
                            alt=""
                            aria-hidden="true"
                            className={`h-[15px] w-[15px] object-contain transition-transform ${isPrimaryPanelExpanded ? 'rotate-180' : ''}`}
                        />
                    </button>
                </div>

                <div
                    className="grid min-h-0 gap-[clamp(30px,2.6vw,44px)]"
                    style={{ gridTemplateColumns: 'minmax(460px, 1fr) clamp(250px, 18vw, 340px)' }}
                >
                    <div className="min-h-0">
                        <div className="h-full">
                            <FlightStreamControlPanel
                                secondaryPanel={renderSecondaryPanel()}
                                onSwitchPanel={() => setIsMapPrimary((value) => !value)}
                                compact
                                onAbortMission={handleAbortMission}
                                isAbortDisabled={isStreamInteractionDisabled || !canAbortMission}
                                isAbortingMission={isAbortingMission}
                                abortMissionError={abortMissionError}
                                onTakePicture={handleTakePicture}
                                onStartRecording={handleStartRecording}
                                isCaptureDisabled={isStreamInteractionDisabled || !isCameraConnected || isCaptureCommandPending}
                                isRecordDisabled={isStreamInteractionDisabled || !isCameraConnected || isCameraRecording || isCameraRecordingCommandPending}
                                cameraCommandError={cameraCommandError}
                            />
                        </div>
                    </div>
                    <div className="min-h-0">
                        <CameraJoystickPanel
                            uavId={isStreamInteractionDisabled ? null : (selectedDrone?.id ?? null)}
                            onZoomIn={() => handleZoomStep('in')}
                            onZoomOut={() => handleZoomStep('out')}
                            isZoomInDisabled={isStreamInteractionDisabled || !isCameraConnected || !hasCameraZoomLevel || isZoomInCommandPending}
                            isZoomOutDisabled={isStreamInteractionDisabled || !isCameraConnected || !hasCameraZoomLevel || isZoomOutCommandPending}
                        />
                    </div>
                </div>
            </div>

            {isPrimaryPanelExpanded ? (
                <div className="absolute inset-0 z-[800]">
                    <div className="relative h-full overflow-hidden rounded-[30px]">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 z-[450] select-none"
                            dangerouslySetInnerHTML={{ __html: cameraPanelBorderMarkup }}
                        />
                        {shouldShowPrimaryStreamSwitch ? (
                            <div className="absolute left-6 right-6 top-6 z-[520] flex items-center justify-between gap-4">
                                <div className="flex items-center rounded-[14px] border border-white/12 bg-black/58 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm">
                                    <button
                                        type="button"
                                        onClick={() => setPrimaryVideoSource('drone')}
                                        className={`min-w-[108px] rounded-[10px] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                                            primaryVideoSource === 'drone'
                                                ? 'bg-white text-[#C20000]'
                                                : 'bg-transparent text-white hover:bg-white/10'
                                        }`}
                                    >
                                        Drone
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPrimaryVideoSource('cctv')}
                                        className={`min-w-[108px] rounded-[10px] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                                            primaryVideoSource === 'cctv'
                                                ? 'bg-white text-[#C20000]'
                                                : 'bg-transparent text-white hover:bg-white/10'
                                        }`}
                                    >
                                        CCTV
                                    </button>
                                </div>
                                {isStreamInteractionDisabled ? (
                                    <div className="rounded-[12px] border border-[#B0B0B0] bg-black/55 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#D7D7D7]">
                                        {availabilityMessage}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        {!shouldShowPrimaryStreamSwitch && isStreamInteractionDisabled ? (
                            <div className="absolute left-6 top-6 z-[500] rounded-[12px] border border-[#B0B0B0] bg-black/55 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#D7D7D7]">
                                {availabilityMessage}
                            </div>
                        ) : null}
                        <div className="h-full overflow-hidden rounded-[30px] p-[9px]">
                            <div className="h-full overflow-hidden rounded-[32px]">
                                {renderPrimaryPanel({ expanded: true })}
                            </div>
                        </div>
                        <button
                            type="button"
                            aria-label="Collapse panel"
                            onClick={() => setIsPrimaryPanelExpanded(false)}
                            className="absolute bottom-6 left-6 z-[550] flex h-[44px] w-[44px] items-center justify-center rounded-full bg-black/50 transition-colors hover:bg-black/65"
                        >
                            <img
                                src={expandIcon}
                                alt=""
                                aria-hidden="true"
                                className="h-[15px] w-[15px] rotate-180 object-contain"
                            />
                        </button>
                    </div>
                </div>
            ) : null}

            <AbortMissionConfirmModal
                isOpen={isAbortConfirmOpen}
                isSubmitting={isAbortingMission}
                onClose={() => setIsAbortConfirmOpen(false)}
                onConfirm={handleConfirmAbortMission}
            />
            </div>
        </div>
    );
}
