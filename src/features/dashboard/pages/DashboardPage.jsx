import React, { useState, useEffect, useCallback } from 'react';
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
import { uavService } from '../../../services/api';
import useTelemetry from '../../../shared/hooks/useTelemetry';
import cameraPanelBorder from '../../../assets/images/image_border_campanel_dashboard.png';
import switchButtonImage from '../../../assets/images/btn_switch.png';

export default function DashboardPage() {
    const [isLaunchDialogOpen, setIsLaunchDialogOpen] = useState(false);
    const [isLaunchFormOpen, setIsLaunchFormOpen] = useState(false);
    const [selectedLaunchType, setSelectedLaunchType] = useState('ROI');
    const [isMapPrimary, setIsMapPrimary] = useState(false);
    const [isStreamMode, setIsStreamMode] = useState(false);
    const [droneTrailById, setDroneTrailById] = useState({});

    // Drone state (lifted up from DroneInfoPanel)
    const [drones, setDrones] = useState([]);
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [isDronesLoading, setIsDronesLoading] = useState(true);
    const [dronesError, setDronesError] = useState('');

    const loadDroneDetail = useCallback(async (droneSummary) => {
        if (!droneSummary?.id) return null;

        const detail = await uavService.getUavById(droneSummary.id);
        const resolvedDrone = { ...droneSummary, ...detail };
        setSelectedDrone(resolvedDrone);
        return resolvedDrone;
    }, []);

    const handleSelectDrone = useCallback(async (droneSummary) => {
        if (!droneSummary?.id) return;

        setDronesError('');
        setSelectedDrone(droneSummary);

        try {
            await loadDroneDetail(droneSummary);
        } catch (error) {
            console.error("Error fetching selected drone detail:", error);
            setDronesError('Error Loading Drone Detail');
        }
    }, [loadDroneDetail]);

    // Fetch drones
    useEffect(() => {
        const fetchDrones = async () => {
            try {
                const data = await uavService.getMyUavsDropdown();
                if (data && data.length > 0) {
                    setDrones(data);
                    setSelectedDrone(data[0]);
                    await loadDroneDetail(data[0]);
                } else {
                    setDronesError('No UAVs Available');
                }
            } catch (error) {
                console.error("Error fetching drone info:", error);
                if (error.message === 'No authentication token found') {
                    setDronesError('Not Authenticated');
                } else {
                    setDronesError('Error Loading Data');
                }
            } finally {
                setIsDronesLoading(false);
            }
        };
        fetchDrones();
    }, [loadDroneDetail]);

    // Telemetry — subscribe to all drone IDs from the fetched list
    const uavIds = drones.map(d => d.id);
    const { telemetry, isConnected: isTelemetryConnected } = useTelemetry(uavIds);

    // Get telemetry for the selected drone
    const selectedTelemetry = selectedDrone ? telemetry[selectedDrone.id] : null;
    const isDroneInMission =  true;
    const selectedLocation = selectedTelemetry?.location || {};
    const selectedTrail = selectedDrone ? (droneTrailById[selectedDrone.id] || []) : [];

    useEffect(() => {
        if (!selectedDrone?.id) {
            return;
        }

        const latitude = selectedLocation.latitude;
        const longitude = selectedLocation.longitude;

        if (latitude == null || longitude == null) {
            return;
        }

        setDroneTrailById((current) => {
            const previousTrail = current[selectedDrone.id] || [];
            const nextPoint = [latitude, longitude];
            const lastPoint = previousTrail[previousTrail.length - 1];

            if (lastPoint && lastPoint[0] === nextPoint[0] && lastPoint[1] === nextPoint[1]) {
                return current;
            }

            return {
                ...current,
                [selectedDrone.id]: [...previousTrail, nextPoint].slice(-120)
            };
        });
    }, [selectedDrone?.id, selectedLocation.latitude, selectedLocation.longitude]);

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

        setIsLaunchDialogOpen(true);
    };

    const primaryPanel = isMapPrimary
        ? <MapViewPanel telemetry={selectedTelemetry} selectedDrone={selectedDrone} trailPositions={selectedTrail} />
        : <MainVideoFeedPanel />;
    const secondaryPanel = isMapPrimary
        ? <MainVideoFeedPanel compact />
        : <MapViewPanel telemetry={selectedTelemetry} selectedDrone={selectedDrone} trailPositions={selectedTrail} />;
    const actionLabel = isDroneInMission ? 'Stream' : 'Quick Launch';

    return (
        <div className="h-[calc(100vh-104px)] w-full overflow-hidden">
            {isStreamMode ? (
                <div className="flex h-full w-full flex-col gap-[28px] p-[28px]">
                    <div className="grid min-h-0 flex-1 grid-cols-[440px_minmax(0,1fr)] gap-[28px]">
                        <div className="flex min-h-0 flex-col gap-[20px]">
                            <div className="h-[220px] shrink-0">
                                <WeatherPanel variant="stream" />
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
                                    {selectedDrone?.name || 'Selected UAV'}
                                </span>
                            </div>
                            <div className="absolute right-6 top-6 z-[500] rounded-[12px] border border-[#1ab394]/35 bg-black/55 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#1ab394]">
                                In Flight
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
                                drones={drones}
                                selectedDrone={selectedDrone}
                                onSelectDrone={handleSelectDrone}
                                isLoading={isDronesLoading}
                                errorMsg={dronesError}
                                telemetry={selectedTelemetry}
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
                                <MissionListPanel />
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
                onClose={() => setIsLaunchDialogOpen(false)}
                onConfirm={(selectedType) => {
                    setSelectedLaunchType(selectedType);
                    setIsLaunchDialogOpen(false);
                    setIsLaunchFormOpen(true);
                }}
            />

            <QuickLaunchDialogForm
                isOpen={isLaunchFormOpen}
                missionType={selectedLaunchType}
                onClose={() => {
                    setIsLaunchFormOpen(false);
                    setIsLaunchDialogOpen(true);
                }}
                onLaunch={(type) => {
                    console.log('Final Launch confirmed with type:', type);
                    setIsLaunchFormOpen(false);
                }}
            />
        </div>
    );
}
