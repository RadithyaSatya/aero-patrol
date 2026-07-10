import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainVideoFeedPanel from '../panels/MainVideoFeedPanel';
import MapViewPanel from '../panels/MapViewPanel';
import MissionListPanel from '../panels/MissionListPanel';
import DroneInfoPanel from '../panels/DroneInfoPanel';
import StreamButtonPanel from '../panels/StreamButtonPanel';
import QuickLaunchDialog from '../components/QuickLaunchDialog';
import QuickLaunchDialogForm from '../components/QuickLaunchDialogForm';
import { missionService, telemetryService, uavService } from '../../../services/api';
import { buildMissionPayload } from '../../missions/utils/missionPayload';
import MissionScheduleConflictModal from '../../missions/components/MissionScheduleConflictModal';
import MissionRecentHistoryGuardModal from '../../missions/components/MissionRecentHistoryGuardModal';
import useTelemetry from '../../../shared/hooks/useTelemetry';
import { useI18n } from '../../../shared/i18n/I18nProvider';
import cameraPanelBorderSvg from '../../../assets/images/image_border_campanel_dashboard.svg?raw';
import expandIcon from '../../../assets/images/icon_expand.svg';
import switchIcon from '../../../assets/images/icon_switch.svg';

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
const HTTP_STREAM_ELIGIBLE_MISSION_STATUSES = new Set(['preparingdock', 'safetofly', 'takeoff', 'inprogress']);
const STREAM_ELIGIBLE_RUNTIME_STATUSES = new Set(['preparing', 'preparingdock', 'safetofly', 'takeoff']);
const STREAM_BLOCKED_RUNTIME_STATUSES = new Set(['landed', 'dockconfirmed', 'completed', 'failed', 'aborted']);
const cameraPanelBorderMarkup = cameraPanelBorderSvg.replace(
    '<svg ',
    '<svg preserveAspectRatio="none" class="h-full w-full" '
);
const streamStylePanelBorder = 'linear-gradient(135deg, #FB5555 0%, #ED0000 18%, rgba(251, 85, 85, 0.42) 40%, rgba(251, 85, 85, 0.12) 56%, rgba(251, 85, 85, 0) 66%)';
const streamStylePanelFill = 'linear-gradient(180deg, #F5F5F5 0%, #EDEDED 100%)';
const ACTION_PANEL_MODE_SWITCH_DELAY_MS = 450;
const ACTION_PANEL_HTTP_POLL_MS = 5000;

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

export default function DashboardPage() {
    const { t } = useI18n();
    const translate = (key, fallback, replacements = {}) => Object.entries(replacements).reduce(
        (message, [replacementKey, replacementValue]) => message.replace(`{${replacementKey}}`, replacementValue),
        t(key, fallback)
    );
    const [isLaunchDialogOpen, setIsLaunchDialogOpen] = useState(false);
    const [isLaunchFormOpen, setIsLaunchFormOpen] = useState(false);
    const [selectedLaunchType, setSelectedLaunchType] = useState('ROI');
    const [isMapPrimary, setIsMapPrimary] = useState(true);
    const [isPrimaryPanelExpanded, setIsPrimaryPanelExpanded] = useState(false);
    const [droneTrailById, setDroneTrailById] = useState({});
    const [isCreatingQuickLaunch, setIsCreatingQuickLaunch] = useState(false);
    const [quickLaunchSubmitError, setQuickLaunchSubmitError] = useState('');
    const [missionListRefreshKey, setMissionListRefreshKey] = useState(0);
    const [quickLaunchScheduleConflictState, setQuickLaunchScheduleConflictState] = useState(null);
    const [quickLaunchRecentHistoryGuardState, setQuickLaunchRecentHistoryGuardState] = useState(null);
    const [isAbortingMission, setIsAbortingMission] = useState(false);
    const [abortMissionError, setAbortMissionError] = useState('');
    const [isCameraRecordingCommandPending, setIsCameraRecordingCommandPending] = useState(false);
    const [isCaptureCommandPending, setIsCaptureCommandPending] = useState(false);
    const [isZoomInCommandPending, setIsZoomInCommandPending] = useState(false);
    const [isZoomOutCommandPending, setIsZoomOutCommandPending] = useState(false);
    const [cameraCommandError, setCameraCommandError] = useState('');
    const [actionPanelMode, setActionPanelMode] = useState('quick_launch');
    const [hasHttpStreamMissionSignal, setHasHttpStreamMissionSignal] = useState(false);

    const [selectedDrone, setSelectedDrone] = useState(null);
    const [isDroneLoading, setIsDroneLoading] = useState(true);
    const [droneError, setDroneError] = useState('');
    const trackRequestVersionRef = useRef(0);
    const activeMissionKeyRef = useRef('');
    const navigate = useNavigate();

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
                console.error("Error fetching drone info:", error);
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
    const { telemetry, telemetryStatus, isConnected: isTelemetryConnected } = useTelemetry(uavIds, DASHBOARD_TELEMETRY_METRICS);

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
    const hasMissionTelemetrySignal = Boolean(
        missionStatusHistoryId != null ||
        missionStatusMissionId != null ||
        telemetryHistoryId != null ||
        telemetryRuntimeStatus
    );
    const hasFreshRealtimeSignal = Boolean(
        isLocationFresh ||
        isBatteryFresh ||
        isLinkFresh ||
        isVehicleStateFresh ||
        isCameraStateFresh
    );
    const isDroneOffline = !isDroneInMission && (
        (isVehicleStateFresh && telemetryVehicleState.connected === false) ||
        (!hasFreshRealtimeSignal && !hasMissionTelemetrySignal)
    );
    const isStreamBlockedByRuntimeStatus = STREAM_BLOCKED_RUNTIME_STATUSES.has(normalizedRuntimeStatus);
    const isStreamAllowedByRuntimeStatus = STREAM_ELIGIBLE_RUNTIME_STATUSES.has(normalizedRuntimeStatus);
    const canOpenStreamMode = !isStreamBlockedByRuntimeStatus && (
        hasHttpStreamMissionSignal ||
        isStreamAllowedByRuntimeStatus ||
        isDroneInMission ||
        (hasMissionTelemetrySignal && !telemetryRuntimeStatus)
    );
    const nextActionPanelMode = canOpenStreamMode ? 'stream' : 'quick_launch';
    const selectedLocation = selectedTelemetry?.location || {};
    const selectedHeading = isLocationFresh && selectedLocation.heading != null ? Number(selectedLocation.heading) : 0;
    const selectedTrack = selectedDrone ? (droneTrailById[selectedDrone.id] || EMPTY_ACTIVE_TRACK) : EMPTY_ACTIVE_TRACK;
    const effectiveTrack = isDroneOffline ? EMPTY_ACTIVE_TRACK : selectedTrack;
    const activeMissionHistoryId = missionStatusHistoryId ?? telemetryHistoryId ?? effectiveTrack.historyId ?? null;
    const selectedTrail = effectiveTrack.points.map((point) => [point.latitude, point.longitude]);
    const lastTrackedPoint = effectiveTrack.points[effectiveTrack.points.length - 1] || null;
    const fallbackMapPosition = lastTrackedPoint
        ? [lastTrackedPoint.latitude, lastTrackedPoint.longitude]
        : null;
    const selectedDroneLabel = selectedDrone?.id ? `UAV #${selectedDrone.id}` : 'Selected UAV';
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
        selectedTrack.historyId
    ]);

    useEffect(() => {
        if (!selectedDrone?.id) {
            setHasHttpStreamMissionSignal(false);
            return undefined;
        }

        let isCancelled = false;

        const pollMissionRuns = async () => {
            try {
                const data = await missionService.getMissionRuns({
                    page: 1,
                    limit: 20,
                    uavId: selectedDrone.id,
                    upcoming: 'today',
                });

                if (isCancelled) {
                    return;
                }

                const items = Array.isArray(data?.items) ? data.items : [];
                const hasEligibleMission = items.some((mission) => (
                    HTTP_STREAM_ELIGIBLE_MISSION_STATUSES.has(normalizeRuntimeStatus(mission?.status))
                ));

                setHasHttpStreamMissionSignal(hasEligibleMission);
            } catch (error) {
                if (isCancelled) {
                    return;
                }

                console.error('Error polling mission runs for action panel state:', error);
            }
        };

        pollMissionRuns();
        const intervalId = window.setInterval(pollMissionRuns, ACTION_PANEL_HTTP_POLL_MS);

        return () => {
            isCancelled = true;
            window.clearInterval(intervalId);
        };
    }, [selectedDrone?.id]);

    useEffect(() => {
        if (actionPanelMode === nextActionPanelMode) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            setActionPanelMode(nextActionPanelMode);
        }, ACTION_PANEL_MODE_SWITCH_DELAY_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [actionPanelMode, nextActionPanelMode]);

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
        setMissionListRefreshKey((current) => current + 1);
    }, [
        selectedDrone?.id,
        missionStatusMissionId,
        missionStatusHistoryId,
        telemetryHistoryId,
        telemetryRuntimeStatus,
        selectedTrack.missionId,
        selectedTrack.historyId,
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
                }
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

    const handleActionPanelClick = useCallback(() => {
        if (actionPanelMode === 'stream') {
            navigate('/live-video');
            return;
        }

        setQuickLaunchSubmitError('');
        setQuickLaunchScheduleConflictState(null);
        setQuickLaunchRecentHistoryGuardState(null);
        setIsLaunchDialogOpen(true);
    }, [actionPanelMode, navigate]);

    const handleQuickLaunchTypeConfirm = (launchType) => {
        setSelectedLaunchType(launchType);
        setQuickLaunchSubmitError('');
        setQuickLaunchScheduleConflictState(null);
        setQuickLaunchRecentHistoryGuardState(null);
        setIsLaunchDialogOpen(false);
        setIsLaunchFormOpen(true);
    };

    const handleQuickLaunchBack = () => {
        if (isCreatingQuickLaunch) {
            return;
        }

        setQuickLaunchSubmitError('');
        setQuickLaunchScheduleConflictState(null);
        setQuickLaunchRecentHistoryGuardState(null);
        setIsLaunchFormOpen(false);
        setIsLaunchDialogOpen(true);
    };

    const handleQuickLaunchLaunch = async ({ missionType, takeoffAltitude, takeoffHoldDuration, roi, waypoints }, options = {}) => {
        setQuickLaunchSubmitError('');
        if (!options.keepScheduleConflictModal) {
            setQuickLaunchScheduleConflictState(null);
        }
        if (!options.keepRecentHistoryGuardModal) {
            setQuickLaunchRecentHistoryGuardState(null);
        }
        setIsCreatingQuickLaunch(true);

        try {
            if (!selectedDrone?.id) {
                throw new Error(t('missions.errorNoUavQuickLaunch'));
            }

            const payload = buildMissionPayload({
                formValues: {
                    missionName: translate('dashboard.quickLaunchMissionName', 'Quick Launch {type}', { type: missionType }),
                    takeoffHoldDuration,
                    timeMode: 'now',
                },
                takeoffAltitude,
                roi,
                waypoints,
                confirmRecentHistoryGuard: Boolean(options.confirmRecentHistoryGuard),
                conflictResolutions: options.conflictResolutions,
                omitZeroTakeoffHoldDuration: true,
                translate,
            });

            await missionService.createMission(payload);
            setMissionListRefreshKey((current) => current + 1);
            setQuickLaunchScheduleConflictState(null);
            setQuickLaunchRecentHistoryGuardState(null);
            setIsLaunchFormOpen(false);
            setIsLaunchDialogOpen(false);
        } catch (error) {
            console.error('Error creating quick launch mission:', error);

            if (error?.code === 'mission_schedule_conflict') {
                setQuickLaunchRecentHistoryGuardState(null);
                setQuickLaunchScheduleConflictState({
                    details: error.details || {
                        error: error.message,
                    },
                    retryArgs: {
                        missionType,
                        takeoffAltitude,
                        takeoffHoldDuration,
                        roi,
                        waypoints,
                        confirmRecentHistoryGuard: Boolean(options.confirmRecentHistoryGuard),
                        conflictResolutions: Array.isArray(options.conflictResolutions) ? options.conflictResolutions : [],
                    },
                });
                return;
            }

            if (error?.code === 'mission_recent_history_guard') {
                setQuickLaunchScheduleConflictState(null);
                setQuickLaunchRecentHistoryGuardState({
                    details: error.details || {
                        message: error.message,
                    },
                    retryArgs: {
                        missionType,
                        takeoffAltitude,
                        takeoffHoldDuration,
                        roi,
                        waypoints,
                        confirmRecentHistoryGuard: Boolean(options.confirmRecentHistoryGuard),
                        conflictResolutions: Array.isArray(options.conflictResolutions) ? options.conflictResolutions : [],
                    },
                });
                return;
            }

            setQuickLaunchSubmitError(error.message || t('missions.errorFailedQuickLaunch'));
        } finally {
            setIsCreatingQuickLaunch(false);
        }
    };

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
                    radiusClassName={expanded ? 'rounded-[32px]' : 'rounded-[24px]'}
                />
            )
            : <MainVideoFeedPanel showCompass heading={selectedHeading} radiusClassName={expanded ? 'rounded-[32px]' : 'rounded-[24px]'} />
    );
    const renderSecondaryPanel = () => (
        isMapPrimary
            ? <MainVideoFeedPanel compact lightShell heading={selectedHeading} radiusClassName="rounded-[12px]" />
            : <MapViewPanel telemetry={selectedTelemetry} telemetryStatus={selectedTelemetryStatus} selectedDrone={selectedDrone} trailPositions={selectedTrail} fallbackPosition={fallbackMapPosition} lightShell radiusClassName="rounded-[12px]" />
    );
    const actionLabel = actionPanelMode === 'stream' ? t('dashboard.stream') : t('dashboard.quickLaunch');
    const isActionPanelStreamMode = actionPanelMode === 'stream';

    return (
        <div className="app-page app-page--compact-header relative">
            <div className="app-page__inner relative h-full">
            <div
                className={`grid h-full w-full gap-[clamp(18px,2vw,28px)] ${isPrimaryPanelExpanded ? 'invisible' : ''}`}
                style={{ gridTemplateColumns: 'clamp(340px, 25vw, 470px) minmax(0, 1fr)' }}
            >
                <div className="flex min-h-0 flex-col gap-[clamp(18px,2vw,28px)] overflow-hidden">
                    <div className="min-h-[320px] shrink-0 basis-[clamp(320px,42vh,460px)]">
                        <DroneInfoPanel
                            selectedDrone={selectedDrone}
                            isLoading={isDroneLoading}
                            errorMsg={droneError}
                            telemetry={selectedTelemetry}
                            telemetryStatus={selectedTelemetryStatus}
                            isTelemetryConnected={isTelemetryConnected}
                        />
                    </div>

                    <div
                        className="relative min-h-0 flex-1 overflow-hidden rounded-[30px] p-px"
                        style={{ backgroundImage: streamStylePanelBorder }}
                    >
                        <div
                            className="relative h-full w-full overflow-hidden rounded-[29px] p-3"
                            style={{ background: streamStylePanelFill }}
                        >
                            <div className="relative h-full w-full overflow-hidden rounded-[24px] border-b border-[#FF383C] p-px">
                                {renderSecondaryPanel()}
                                <button
                                    type="button"
                                    aria-label={t('dashboard.switchPanels')}
                                    onClick={() => setIsMapPrimary((value) => !value)}
                                    className="absolute bottom-3 left-3 z-[550] flex h-[44px] w-[44px] items-center justify-center rounded-full bg-black/50 transition-colors hover:bg-black/65"
                                >
                                    <img
                                        src={switchIcon}
                                        alt=""
                                        aria-hidden="true"
                                        className="h-[17px] w-[14px] object-contain"
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex min-h-0 flex-col gap-[clamp(18px,2vw,28px)]">
                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[30px]">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 z-[450] select-none"
                            dangerouslySetInnerHTML={{ __html: cameraPanelBorderMarkup }}
                        />
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

                    <div className="grid h-[clamp(250px,26vh,300px)] shrink-0 grid-cols-[minmax(0,1fr)_clamp(240px,18vw,280px)] gap-[clamp(18px,2vw,28px)]">
                        <div className="min-h-0">
                            <MissionListPanel uavId={selectedDrone?.id} refreshKey={missionListRefreshKey} />
                        </div>
                        <div className="min-h-0">
                            <StreamButtonPanel
                                label={actionLabel}
                                onClick={handleActionPanelClick}
                                isActive={isActionPanelStreamMode}
                            />
                        </div>
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

            <QuickLaunchDialog
                isOpen={isLaunchDialogOpen}
                onClose={() => {
                    if (isCreatingQuickLaunch) {
                        return;
                    }

                    setQuickLaunchSubmitError('');
                    setQuickLaunchScheduleConflictState(null);
                    setQuickLaunchRecentHistoryGuardState(null);
                    setIsLaunchDialogOpen(false);
                }}
                onConfirm={handleQuickLaunchTypeConfirm}
            />

            <QuickLaunchDialogForm
                isOpen={isLaunchFormOpen}
                missionType={selectedLaunchType}
                selectedDrone={selectedDrone}
                telemetry={selectedTelemetry}
                telemetryStatus={selectedTelemetryStatus}
                onClose={handleQuickLaunchBack}
                onLaunch={handleQuickLaunchLaunch}
                isLaunching={isCreatingQuickLaunch}
                submitError={quickLaunchSubmitError}
            />

            <MissionScheduleConflictModal
                isOpen={Boolean(quickLaunchScheduleConflictState)}
                conflictData={quickLaunchScheduleConflictState?.details}
                isSubmitting={isCreatingQuickLaunch}
                onClose={() => setQuickLaunchScheduleConflictState(null)}
                onConfirm={(conflictResolutions) => {
                    if (!quickLaunchScheduleConflictState?.retryArgs) {
                        return;
                    }

                    handleQuickLaunchLaunch(quickLaunchScheduleConflictState.retryArgs, {
                        confirmRecentHistoryGuard: Boolean(quickLaunchScheduleConflictState.retryArgs.confirmRecentHistoryGuard),
                        conflictResolutions,
                        keepScheduleConflictModal: true,
                    });
                }}
            />

            <MissionRecentHistoryGuardModal
                isOpen={Boolean(quickLaunchRecentHistoryGuardState)}
                guardData={quickLaunchRecentHistoryGuardState?.details}
                isSubmitting={isCreatingQuickLaunch}
                onClose={() => setQuickLaunchRecentHistoryGuardState(null)}
                onConfirm={() => {
                    if (!quickLaunchRecentHistoryGuardState?.retryArgs) {
                        return;
                    }

                    handleQuickLaunchLaunch(quickLaunchRecentHistoryGuardState.retryArgs, {
                        confirmRecentHistoryGuard: true,
                        conflictResolutions: quickLaunchRecentHistoryGuardState.retryArgs.conflictResolutions,
                        keepRecentHistoryGuardModal: true,
                    });
                }}
            />
            </div>
        </div>
    );
}
