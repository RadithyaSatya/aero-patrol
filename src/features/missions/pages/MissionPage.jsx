import React, { useEffect, useState } from 'react';
import MissionMapPanel from '../panels/MissionMapPanel';
import WaypointSelectionPanel from '../panels/WaypointSelectionPanel';
import MissionListPanel from '../panels/MissionListPanel';
import MissionDetailPanel from '../panels/MissionDetailPanel';
import MissionScheduleConflictModal from '../components/MissionScheduleConflictModal';
import MissionRecentHistoryGuardModal from '../components/MissionRecentHistoryGuardModal';
import DockCamPanel from '../../dashboard/panels/DockCamPanel';
import { missionService, uavService } from '../../../services/api';
import useTelemetry from '../../../shared/hooks/useTelemetry';
import {
    DEFAULT_TAKEOFF_ALTITUDE,
    INITIAL_MISSION_FORM_VALUES,
    buildMissionPayload,
} from '../utils/missionPayload';

export default function MissionPage() {
    const [isAddingMission, setIsAddingMission] = useState(false);
    const [waypoints, setWaypoints] = useState([]);
    const [takeoffAltitude, setTakeoffAltitude] = useState(DEFAULT_TAKEOFF_ALTITUDE);
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [selectedMissionRun, setSelectedMissionRun] = useState(null);
    const [selectedMissionDetail, setSelectedMissionDetail] = useState(null);
    const [isMissionDetailLoading, setIsMissionDetailLoading] = useState(false);
    const [missionDetailError, setMissionDetailError] = useState('');
    const [missionFormValues, setMissionFormValues] = useState(INITIAL_MISSION_FORM_VALUES);
    const [isCreatingMission, setIsCreatingMission] = useState(false);
    const [createMissionError, setCreateMissionError] = useState('');
    const [scheduleConflictState, setScheduleConflictState] = useState(null);
    const [recentHistoryGuardState, setRecentHistoryGuardState] = useState(null);

    useEffect(() => {
        const fetchDrone = async () => {
            try {
                const data = await uavService.getUav();
                if (data?.id) {
                    setSelectedDrone(data);
                }
            } catch (error) {
                console.error('Error fetching drone info for mission map:', error);
            }
        };

        fetchDrone();
    }, []);

    const uavIds = selectedDrone?.id ? [selectedDrone.id] : [];
    const { telemetry } = useTelemetry(uavIds);
    const selectedTelemetry = selectedDrone ? telemetry[selectedDrone.id] : null;

    useEffect(() => {
        let isCancelled = false;

        const fetchMissionDetail = async () => {
            if (!selectedMissionRun?.mission_id) {
                setSelectedMissionDetail(null);
                setMissionDetailError('');
                setIsMissionDetailLoading(false);
                return;
            }

            setIsMissionDetailLoading(true);
            setMissionDetailError('');
            setSelectedMissionDetail(null);

            try {
                const data = await missionService.getMissionById(selectedMissionRun.mission_id);
                if (isCancelled) return;

                setSelectedMissionDetail(data);
            } catch (error) {
                if (isCancelled) return;

                console.error('Error fetching mission detail:', error);
                setSelectedMissionDetail(null);
                setMissionDetailError(error.message);
            } finally {
                if (!isCancelled) {
                    setIsMissionDetailLoading(false);
                }
            }
        };

        fetchMissionDetail();

        return () => {
            isCancelled = true;
        };
    }, [selectedMissionRun?.mission_id]);

    const handleAddWaypoint = (latlng) => {
        if (!isAddingMission) return;
        setWaypoints((prev) => {
            const nextId = prev.length > 0 ? Math.max(...prev.map((waypoint) => waypoint.id)) + 1 : 1;
            return [
                ...prev,
                {
                    id: nextId,
                    lat: latlng.lat,
                    lng: latlng.lng,
                    altitude: 25,
                    cameraTilt: 20,
                    action: 'video_record',
                    action_duration: 10,
                }
            ];
        });
    };

    const handleCancelMission = () => {
        setWaypoints([]);
        setTakeoffAltitude(DEFAULT_TAKEOFF_ALTITUDE);
        setIsAddingMission(false);
        setMissionFormValues(INITIAL_MISSION_FORM_VALUES);
        setIsCreatingMission(false);
        setCreateMissionError('');
        setScheduleConflictState(null);
        setRecentHistoryGuardState(null);
    };

    const handleDeleteWaypoint = (waypointId) => {
        setWaypoints((prev) => prev.filter((waypoint) => waypoint.id !== waypointId));
    };

    const handleUpdateWaypoint = (waypointId, updates) => {
        setWaypoints((prev) => prev.map((waypoint) => {
            if (waypoint.id !== waypointId) {
                return waypoint;
            }

            const nextWaypoint = { ...waypoint, ...updates };

            if (nextWaypoint.action === 'take_picture') {
                nextWaypoint.action_duration = null;
            } else if (nextWaypoint.action === 'video_record' && (nextWaypoint.action_duration == null || nextWaypoint.action_duration === '')) {
                nextWaypoint.action_duration = 10;
            }

            return nextWaypoint;
        }));
    };

    const selectedMissionKey = selectedMissionRun
        ? `${selectedMissionRun.mission_id}-${selectedMissionRun.run_at}`
        : '';

    const handleCreateMission = async (formValues, options = {}) => {
        setCreateMissionError('');
        if (!options.keepScheduleConflictModal) {
            setScheduleConflictState(null);
        }
        if (!options.keepRecentHistoryGuardModal) {
            setRecentHistoryGuardState(null);
        }
        setIsCreatingMission(true);

        try {
            const payload = buildMissionPayload({
                formValues,
                takeoffAltitude,
                waypoints,
                confirmRecentHistoryGuard: Boolean(options.confirmRecentHistoryGuard),
                conflictResolutions: options.conflictResolutions,
            });

            await missionService.createMission(payload);

            setWaypoints([]);
            setTakeoffAltitude(DEFAULT_TAKEOFF_ALTITUDE);
            setIsAddingMission(false);
            setSelectedMissionRun(null);
            setSelectedMissionDetail(null);
            setScheduleConflictState(null);
            setRecentHistoryGuardState(null);
        } catch (error) {
            console.error('Error creating mission:', error);

            if (error?.code === 'mission_schedule_conflict') {
                setRecentHistoryGuardState(null);
                setScheduleConflictState({
                    details: error.details || {
                        error: error.message,
                    },
                    retryArgs: {
                        formValues,
                        confirmRecentHistoryGuard: Boolean(options.confirmRecentHistoryGuard),
                        conflictResolutions: Array.isArray(options.conflictResolutions) ? options.conflictResolutions : [],
                    },
                });
                return;
            }

            if (error?.code === 'mission_recent_history_guard') {
                setScheduleConflictState(null);
                setRecentHistoryGuardState({
                    details: error.details || {
                        message: error.message,
                    },
                    retryArgs: {
                        formValues,
                        confirmRecentHistoryGuard: Boolean(options.confirmRecentHistoryGuard),
                        conflictResolutions: Array.isArray(options.conflictResolutions) ? options.conflictResolutions : [],
                    },
                });
                return;
            }

            setCreateMissionError(error.message || 'Failed to create mission');
        } finally {
            setIsCreatingMission(false);
        }
    };

    return (
        <>
            <div className="p-[28px] flex flex-row gap-[28px] w-full h-[calc(100vh-104px)] overflow-hidden">
                <div className="flex-1 flex flex-col gap-[28px] min-w-0">
                    <div className="flex-1 border border-[#2a3240] overflow-hidden shadow-lg relative bg-[#181d25]">
                        <MissionMapPanel
                            waypoints={waypoints}
                            onAddWaypoint={handleAddWaypoint}
                            onCancelMission={handleCancelMission}
                            onLaunchMission={() => handleCreateMission(missionFormValues)}
                            isViewMode={!isAddingMission}
                            selectedDrone={selectedDrone}
                            telemetry={selectedTelemetry}
                            missionRun={selectedMissionRun}
                            missionDetail={selectedMissionDetail}
                            isMissionDetailLoading={isMissionDetailLoading}
                            missionDetailError={missionDetailError}
                            isLaunchingMission={isCreatingMission}
                        />
                    </div>
                </div>

                <div className="w-[440px] shrink-0 min-h-0 flex flex-col gap-[28px]">
                    {isAddingMission ? (
                        <>
                            <div className="flex-1 bg-[#222222] overflow-hidden shadow-lg min-h-0">
                                <WaypointSelectionPanel
                                    waypoints={waypoints}
                                    takeoffAltitude={takeoffAltitude}
                                    selectedDrone={selectedDrone}
                                    onTakeoffAltitudeChange={setTakeoffAltitude}
                                    onUpdateWaypoint={handleUpdateWaypoint}
                                    onCancel={handleCancelMission}
                                    onDeleteWaypoint={handleDeleteWaypoint}
                                />
                            </div>
                            <div className="h-[560px] shrink-0 overflow-hidden shadow-lg">
                                <MissionDetailPanel
                                    waypointsCount={waypoints.length}
                                    onClearWaypoints={() => setWaypoints([])}
                                    onFormChange={setMissionFormValues}
                                    submitError={createMissionError}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="h-[280px] shrink-0 overflow-hidden">
                                <DockCamPanel variant="stream" streamBorderClassName="border-[0.5px]" />
                            </div>
                            <div className="flex-1 overflow-hidden min-h-0">
                                <MissionListPanel
                                    onAddMission={() => {
                                        setMissionFormValues(INITIAL_MISSION_FORM_VALUES);
                                        setTakeoffAltitude(DEFAULT_TAKEOFF_ALTITUDE);
                                        setCreateMissionError('');
                                        setScheduleConflictState(null);
                                        setRecentHistoryGuardState(null);
                                        setIsAddingMission(true);
                                    }}
                                    uavId={selectedDrone?.id}
                                    selectedMissionKey={selectedMissionKey}
                                    onSelectMission={setSelectedMissionRun}
                                    onMissionDeleted={(missionId) => {
                                        if (selectedMissionRun?.mission_id === missionId) {
                                            setSelectedMissionRun(null);
                                            setSelectedMissionDetail(null);
                                        }
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <MissionScheduleConflictModal
                isOpen={Boolean(scheduleConflictState)}
                conflictData={scheduleConflictState?.details}
                isSubmitting={isCreatingMission}
                onClose={() => setScheduleConflictState(null)}
                onConfirm={(conflictResolutions) => {
                    if (!scheduleConflictState?.retryArgs) {
                        return;
                    }

                    handleCreateMission(scheduleConflictState.retryArgs.formValues, {
                        confirmRecentHistoryGuard: Boolean(scheduleConflictState.retryArgs.confirmRecentHistoryGuard),
                        conflictResolutions,
                        keepScheduleConflictModal: true,
                    });
                }}
            />

            <MissionRecentHistoryGuardModal
                isOpen={Boolean(recentHistoryGuardState)}
                guardData={recentHistoryGuardState?.details}
                isSubmitting={isCreatingMission}
                onClose={() => setRecentHistoryGuardState(null)}
                onConfirm={() => {
                    if (!recentHistoryGuardState?.retryArgs) {
                        return;
                    }

                    handleCreateMission(recentHistoryGuardState.retryArgs.formValues, {
                        confirmRecentHistoryGuard: true,
                        conflictResolutions: recentHistoryGuardState.retryArgs.conflictResolutions,
                        keepRecentHistoryGuardModal: true,
                    });
                }}
            />
        </>
    );
}
