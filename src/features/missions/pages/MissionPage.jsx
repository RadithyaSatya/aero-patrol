import React, { useState } from 'react';
import MissionMapPanel from '../panels/MissionMapPanel';
import WaypointSelectionPanel from '../panels/WaypointSelectionPanel';
import MissionListPanel from '../panels/MissionListPanel';
import MissionDetailPanel from '../panels/MissionDetailPanel';
import DockCamPanel from '../../dashboard/panels/DockCamPanel';

export default function MissionPage() {
    const [isAddingMission, setIsAddingMission] = useState(false);
    // Shared state for waypoints between the map and the waypoint list
    const [waypoints, setWaypoints] = useState([]);

    const handleAddWaypoint = (latlng) => {
        if (!isAddingMission) return; // Prevent adding waypoints if not in adding mode
        setWaypoints((prev) => {
            const nextId = prev.length > 0 ? Math.max(...prev.map((waypoint) => waypoint.id)) + 1 : 1;
            return [...prev, { id: nextId, lat: latlng.lat, lng: latlng.lng }];
        });
    };

    const handleCancelMission = () => {
        setWaypoints([]);
        setIsAddingMission(false);
    };

    const handleDeleteWaypoint = (waypointId) => {
        setWaypoints((prev) => prev.filter((waypoint) => waypoint.id !== waypointId));
    };

    return (
        <div className="p-[28px] flex flex-row gap-[28px] w-full h-[calc(100vh-104px)] overflow-hidden">
            {/* Left Column - Map Area & Mission Detail */}
            <div className="flex-1 flex flex-col gap-[28px] min-w-0">
                <div className="flex-1 border border-[#2a3240] overflow-hidden shadow-lg relative bg-[#181d25]">
                    <MissionMapPanel
                        waypoints={waypoints}
                        onAddWaypoint={handleAddWaypoint}
                        onCancelMission={handleCancelMission}
                        isViewMode={!isAddingMission}
                    />
                </div>
            </div>

            {/* Right Column - Controls & Lists */}
            <div className="w-[440px] shrink-0 min-h-0 flex flex-col gap-[28px]">
                {isAddingMission ? (
                    <>
                        {/* Waypoint Selection Form */}
                        <div className="flex-1 bg-[#222222] overflow-hidden shadow-lg min-h-0">
                            <WaypointSelectionPanel
                                waypoints={waypoints}
                                onCancel={handleCancelMission}
                                onDeleteWaypoint={handleDeleteWaypoint}
                            />
                        </div>
                        {/* Mission Detail Panel */}
                        <div className="h-[480px] shrink-0 overflow-hidden shadow-lg">
                            <MissionDetailPanel
                                waypointsCount={waypoints.length}
                                onClearWaypoints={() => setWaypoints([])}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        {/* Dock Cam View */}
                        <div className="h-[280px] shrink-0 overflow-hidden">
                            <DockCamPanel variant="stream" streamBorderClassName="border-[0.5px]" />
                        </div>
                        {/* Mission List */}
                        <div className="flex-1 overflow-hidden min-h-0">
                            <MissionListPanel onAddMission={() => setIsAddingMission(true)} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
