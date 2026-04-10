import React, { useState } from 'react';
import MissionMapPanel from '../panels/MissionMapPanel';
import WaypointSelectionPanel from '../panels/WaypointSelectionPanel';
import MissionListPanel from '../panels/MissionListPanel';
import DroneCamPanel from '../panels/DroneCamPanel';
import MissionDetailPanel from '../panels/MissionDetailPanel';

export default function MissionPage() {
    const [isAddingMission, setIsAddingMission] = useState(false);
    // Shared state for waypoints between the map and the waypoint list
    const [waypoints, setWaypoints] = useState([]);

    const handleAddWaypoint = (latlng) => {
        if (!isAddingMission) return; // Prevent adding waypoints if not in adding mode
        setWaypoints((prev) => [...prev, { id: prev.length + 1, lat: latlng.lat, lng: latlng.lng }]);
    };

    return (
        <div className="p-[28px] flex flex-row gap-[28px] w-full h-[calc(100vh-104px)] overflow-hidden">
            {/* Left Column - Map Area & Mission Detail */}
            <div className="flex-1 flex flex-col gap-[28px] min-w-0">
                <div className="flex-1 rounded-[24px] border border-[#2a3240] overflow-hidden shadow-lg relative bg-[#181d25]">
                    <MissionMapPanel waypoints={waypoints} onAddWaypoint={handleAddWaypoint} isViewMode={!isAddingMission} />
                </div>
            </div>

            {/* Right Column - Controls & Lists */}
            <div className="w-[440px] shrink-0 flex flex-col gap-[28px]">
                {isAddingMission ? (
                    <>
                        {/* Waypoint Selection Form */}
                        <div className="flex-1 bg-[#27313D] rounded-[24px] border border-[#2a3240] overflow-hidden shadow-lg min-h-0">
                            <WaypointSelectionPanel waypoints={waypoints} onCancel={() => setIsAddingMission(false)} />
                        </div>
                        {/* Mission Detail Panel */}
                        <div className="h-[480px] shrink-0 rounded-[24px] border border-[#2a3240] overflow-hidden shadow-lg">
                            <MissionDetailPanel
                                waypointsCount={waypoints.length}
                                onClearWaypoints={() => setWaypoints([])}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        {/* Drone Cam View */}
                        <div className="h-[280px] shrink-0 rounded-[24px] overflow-hidden">
                            <DroneCamPanel />
                        </div>
                        {/* Mission List */}
                        <div className="flex-1 bg-[#27313D] rounded-[24px] border border-[#2a3240] overflow-hidden shadow-lg min-h-0">
                            <MissionListPanel onAddMission={() => setIsAddingMission(true)} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
