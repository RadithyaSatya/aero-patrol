import React, { useState, useEffect, useCallback } from 'react';
import MainVideoFeedPanel from '../panels/MainVideoFeedPanel';
import MapViewPanel from '../panels/MapViewPanel';
import MissionListPanel from '../panels/MissionListPanel';
import DroneInfoPanel from '../panels/DroneInfoPanel';
import StreamButtonPanel from '../panels/StreamButtonPanel';
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
    const primaryPanel = isMapPrimary
        ? <MapViewPanel telemetry={selectedTelemetry} selectedDrone={selectedDrone} />
        : <MainVideoFeedPanel />;
    const secondaryPanel = isMapPrimary
        ? <MainVideoFeedPanel compact />
        : <MapViewPanel telemetry={selectedTelemetry} selectedDrone={selectedDrone} />;

    return (
        <div className="grid h-[calc(100vh-104px)] w-full grid-cols-[440px_minmax(0,1fr)] gap-[28px] p-[28px] overflow-hidden">
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
                        <StreamButtonPanel onLaunchClick={() => setIsLaunchDialogOpen(true)} />
                    </div>
                </div>
            </div>

            {/* Dialogs */}
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
