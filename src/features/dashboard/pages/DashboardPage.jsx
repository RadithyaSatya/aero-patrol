import React, { useState, useEffect, useCallback, useRef } from 'react';
import MainVideoFeedPanel from '../panels/MainVideoFeedPanel';
import MapViewPanel from '../panels/MapViewPanel';
import MissionListPanel from '../panels/MissionListPanel';
import DroneInfoPanel from '../panels/DroneInfoPanel';
import StreamButtonPanel from '../panels/StreamButtonPanel';
import WeatherPanel from '../panels/WeatherPanel';
import DockCamPanel from '../panels/DockCamPanel';
import FlightStreamControlPanel from '../panels/FlightStreamControlPanel';
import CameraJoystickPanel from '../panels/CameraJoystickPanel';
import QuickLaunchDialog from '../components/QuickLaunchDialog';
import QuickLaunchDialogForm from '../components/QuickLaunchDialogForm';
import { missionService, telemetryService, uavService } from '../../../services/api';
import { buildMissionPayload } from '../../missions/utils/missionPayload';
import MissionScheduleConflictModal from '../../missions/components/MissionScheduleConflictModal';
import MissionRecentHistoryGuardModal from '../../missions/components/MissionRecentHistoryGuardModal';
import useTelemetry from '../../../shared/hooks/useTelemetry';
import cameraPanelBorder from '../../../assets/images/image_border_campanel_dashboard.png';
import switchButtonImage from '../../../assets/images/btn_switch.png';

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

    if (historyId == null) {
        return {
            ...EMPTY_ACTIVE_TRACK,
            missionId,
            startedAt,
            lastRecordedAt,
        };
    }

    return {
        historyId,
        missionId,
        startedAt,
        lastRecordedAt,
        points,
    };
};

const mergeTrackState = (currentTrack, nextTrack) => {
    if (!nextTrack || nextTrack.historyId == null) {
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
    const [isLaunchDialogOpen, setIsLaunchDialogOpen] = useState(false);
    const [isLaunchFormOpen, setIsLaunchFormOpen] = useState(false);
    const [selectedLaunchType, setSelectedLaunchType] = useState('ROI');
    const [isMapPrimary, setIsMapPrimary] = useState(false);
    const [isStreamMode, setIsStreamMode] = useState(false);
    const [droneTrailById, setDroneTrailById] = useState({});
    const [isCreatingQuickLaunch, setIsCreatingQuickLaunch] = useState(false);
    const [quickLaunchSubmitError, setQuickLaunchSubmitError] = useState('');
    const [missionListRefreshKey, setMissionListRefreshKey] = useState(0);
    const [quickLaunchScheduleConflictState, setQuickLaunchScheduleConflictState] = useState(null);
    const [quickLaunchRecentHistoryGuardState, setQuickLaunchRecentHistoryGuardState] = useState(null);

    const [selectedDrone, setSelectedDrone] = useState(null);
    const [isDroneLoading, setIsDroneLoading] = useState(true);
    const [droneError, setDroneError] = useState('');
    const trackRequestVersionRef = useRef(0);

    useEffect(() => {
        const fetchDrone = async () => {
            try {
                const data = await uavService.getUav();
                if (data?.id) {
                    setSelectedDrone(data);
                } else {
                    setDroneError('No UAV Available');
                }
            } catch (error) {
                console.error("Error fetching drone info:", error);
                if (error.message === 'No authentication token found') {
                    setDroneError('Not Authenticated');
                } else {
                    setDroneError('Error Loading Data');
                }
            } finally {
                setIsDroneLoading(false);
            }
        };
        fetchDrone();
    }, []);

    const uavIds = selectedDrone?.id ? [selectedDrone.id] : [];
    const { telemetry, telemetryStatus, isConnected: isTelemetryConnected } = useTelemetry(uavIds);

    const selectedTelemetry = selectedDrone ? telemetry[selectedDrone.id] : null;
    const selectedTelemetryStatus = selectedDrone ? telemetryStatus[selectedDrone.id] : null;
    const droneStatus = selectedDrone?.status || {};
    const telemetryVehicleState = selectedTelemetry?.vehicle_state || {};
    const telemetryMissionEvent = selectedTelemetry?.mission_event || {};
    const isVehicleStateFresh = Boolean(selectedTelemetryStatus?.metrics?.vehicle_state?.isFresh);
    const telemetryHistoryId = telemetryMissionEvent.history_id ?? null;
    const isVehicleMissionActive = isVehicleStateFresh && typeof telemetryVehicleState.in_mission === 'boolean'
        ? telemetryVehicleState.in_mission
        : null;
    const isDroneInMission = Boolean(
        isVehicleMissionActive ??
        droneStatus.is_in_flight ??
        (telemetryVehicleState.armed && telemetryVehicleState.landed_state !== 'LANDED')
    );
    const selectedLocation = selectedTelemetry?.location || {};
    const selectedTrack = selectedDrone ? (droneTrailById[selectedDrone.id] || EMPTY_ACTIVE_TRACK) : EMPTY_ACTIVE_TRACK;
    const selectedTrail = selectedTrack.points.map((point) => [point.latitude, point.longitude]);
    const selectedDroneLabel = selectedDrone?.id ? `UAV #${selectedDrone.id}` : 'Selected UAV';
    const streamStatusLabel = isDroneInMission
        ? 'In Flight'
        : droneStatus.is_docked
            ? 'Docked'
            : 'Standby';

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

        if (telemetryHistoryId != null || isDroneInMission || selectedTrack.historyId != null) {
            refreshTrack();
        }
    }, [refreshTrack, selectedDrone?.id, telemetryHistoryId, isDroneInMission, selectedTrack.historyId]);

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
        if (!isDroneInMission) {
            setIsStreamMode(false);
        }
    }, [isDroneInMission, selectedDrone?.id]);

    const handleActionPanelClick = () => {
        if (isDroneInMission) {
            setIsStreamMode((current) => !current);
            return;
        }

        setQuickLaunchSubmitError('');
        setQuickLaunchScheduleConflictState(null);
        setQuickLaunchRecentHistoryGuardState(null);
        setIsLaunchDialogOpen(true);
    };

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

    const handleQuickLaunchLaunch = async ({ missionType, takeoffAltitude, roi, waypoints }, options = {}) => {
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
                throw new Error('No UAV available for quick launch.');
            }

            const payload = buildMissionPayload({
                formValues: {
                    missionName: `Quick Launch ${missionType}`,
                    timeMode: 'now',
                },
                takeoffAltitude,
                roi,
                waypoints,
                confirmRecentHistoryGuard: Boolean(options.confirmRecentHistoryGuard),
                conflictResolutions: options.conflictResolutions,
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
                        roi,
                        waypoints,
                        confirmRecentHistoryGuard: Boolean(options.confirmRecentHistoryGuard),
                        conflictResolutions: Array.isArray(options.conflictResolutions) ? options.conflictResolutions : [],
                    },
                });
                return;
            }

            setQuickLaunchSubmitError(error.message || 'Failed to create quick launch mission');
        } finally {
            setIsCreatingQuickLaunch(false);
        }
    };

    const primaryPanel = isMapPrimary
        ? <MapViewPanel telemetry={selectedTelemetry} telemetryStatus={selectedTelemetryStatus} selectedDrone={selectedDrone} trailPositions={selectedTrail} />
        : <MainVideoFeedPanel />;
    const secondaryPanel = isMapPrimary
        ? <MainVideoFeedPanel compact />
        : <MapViewPanel telemetry={selectedTelemetry} telemetryStatus={selectedTelemetryStatus} selectedDrone={selectedDrone} trailPositions={selectedTrail} />;
    const actionLabel = isDroneInMission ? 'Stream' : 'Quick Launch';

    return (
        <div className="h-[calc(100vh-104px)] w-full overflow-hidden">
            {isStreamMode ? (
                <div className="flex h-full w-full flex-col gap-[28px] p-[28px]">
                    <div className="grid min-h-0 flex-1 grid-cols-[440px_minmax(0,1fr)] gap-[28px]">
                        <div className="flex min-h-0 flex-col gap-[20px]">
                            <div className="h-[220px] shrink-0">
                                <WeatherPanel variant="stream" selectedDrone={selectedDrone} telemetry={selectedTelemetry} />
                            </div>

                            <div className="min-h-0 flex-1">
                                <DockCamPanel variant="stream" />
                            </div>
                        </div>

                        <div className="relative min-h-0 overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                            <img
                                src={cameraPanelBorder}
                                alt=""
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[450] h-full w-full select-none object-fill"
                            />
                            <div className="absolute left-6 top-6 z-[500] flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsStreamMode(false)}
                                    className="rounded-[12px] border border-[#374151] bg-black/55 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-gray-200 transition-colors hover:bg-black/70"
                                >
                                    Overview
                                </button>
                                <span className="bg-black/55 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#FD5757]">
                                    {selectedDroneLabel}
                                </span>
                            </div>
                            <div className="absolute right-6 top-6 z-[500] rounded-[12px] border border-[#1ab394]/35 bg-black/55 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#1ab394]">
                                {streamStatusLabel}
                            </div>
                            <div className="h-full overflow-hidden p-[5px]">
                                {primaryPanel}
                            </div>
                        </div>
                    </div>

                    <div className="grid h-[280px] shrink-0 grid-cols-[minmax(0,1fr)_380px] gap-[28px]">
                        <div className="min-h-0">
                                <FlightStreamControlPanel
                                    secondaryPanel={secondaryPanel}
                                    onSwitchPanel={() => setIsMapPrimary((value) => !value)}
                                    switchButtonImage={switchButtonImage}
                                    telemetry={selectedTelemetry}
                                    telemetryStatus={selectedTelemetryStatus}
                                    isTelemetryConnected={isTelemetryConnected}
                                />
                        </div>
                        <div className="min-h-0">
                            <CameraJoystickPanel />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid h-full w-full grid-cols-[440px_minmax(0,1fr)] gap-[28px] p-[28px]">
                    <div className="flex min-h-0 flex-col gap-[28px]">
                        <div className="min-h-0 flex-1">
                            <DroneInfoPanel
                                selectedDrone={selectedDrone}
                                isLoading={isDroneLoading}
                                errorMsg={droneError}
                                telemetry={selectedTelemetry}
                                telemetryStatus={selectedTelemetryStatus}
                                isTelemetryConnected={isTelemetryConnected}
                            />
                        </div>

                        <div className={`relative aspect-square w-full shrink-0 overflow-hidden border-l border-[#5E0A0A] bg-[#222222] p-3 ${(isLaunchDialogOpen || isLaunchFormOpen) ? 'invisible' : ''}`}>
                            <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
                            <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
                            <div className="relative h-full w-full overflow-hidden border-b border-[#5E0A0A] p-px">
                                <div className="pointer-events-none absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
                                <div className="pointer-events-none absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
                                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[#ED0000]" />
                                {secondaryPanel}
                                <button
                                    type="button"
                                    aria-label="Switch map and camera panels"
                                    onClick={() => setIsMapPrimary((value) => !value)}
                                    className="absolute bottom-3 left-3 z-[550] h-[44px] w-[44px] transition-transform hover:scale-105"
                                >
                                    <img
                                        src={switchButtonImage}
                                        alt=""
                                        aria-hidden="true"
                                        className="h-full w-full object-contain"
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-col gap-[28px]">
                        <div className="relative min-h-0 flex-1 overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                            <img
                                src={cameraPanelBorder}
                                alt=""
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[450] h-full w-full select-none object-fill"
                            />
                            <div className="h-full overflow-hidden p-[5px]">
                                {primaryPanel}
                            </div>
                        </div>

                        <div className="grid h-[300px] shrink-0 grid-cols-[minmax(0,1fr)_280px] gap-[28px]">
                            <div className="min-h-0">
                                <MissionListPanel uavId={selectedDrone?.id} refreshKey={missionListRefreshKey} />
                            </div>
                            <div className="min-h-0">
                                <StreamButtonPanel
                                    label={actionLabel}
                                    onClick={handleActionPanelClick}
                                    isActive={isDroneInMission}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
    );
}
