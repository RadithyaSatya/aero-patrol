import React, { useState } from 'react';

const panelStroke = '#D53535';
const dividerStroke = 'linear-gradient(90deg, rgba(163,88,88,0.12) 0%, #A35858 50%, rgba(163,88,88,0.12) 100%)';

export default function WaypointSelectionPanel({ waypoints, onDeleteWaypoint }) {
    // Local state for the editable fields
    const [takeoffAltitude, setTakeoffAltitude] = useState(15);
    // This state maps point id -> { altitude, cameraTilt, action }
    const [pointsData, setPointsData] = useState({});

    // Initialize new waypoints with defaults when they appear
    React.useEffect(() => {
        waypoints.forEach(wp => {
            if (!pointsData[wp.id]) {
                setPointsData(prev => ({
                    ...prev,
                    [wp.id]: { altitude: 150, cameraTilt: 20, action: 'Video Record' }
                }));
            }
        });
    }, [waypoints]); // intentionally omitting pointsData from deps to avoid infinite loop

    React.useEffect(() => {
        setPointsData((prev) => {
            const activeIds = new Set(waypoints.map((waypoint) => waypoint.id));
            const next = Object.fromEntries(
                Object.entries(prev).filter(([id]) => activeIds.has(Number(id)))
            );

            return Object.keys(next).length === Object.keys(prev).length ? prev : next;
        });
    }, [waypoints]);

    const handlePointChange = (id, field, value) => {
        setPointsData(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    return (
        <div className="font-tomorrow relative grid h-full w-full min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] overflow-hidden border bg-[#222222] p-5 select-none" style={{ borderColor: panelStroke }}>
            {/* Header */}
            <div className="mb-6 flex shrink-0 items-start justify-between">
                <div>
                    <h2 className="text-white text-[18px] font-medium tracking-wide">Waypoint Selection</h2>
                    <p className="text-gray-400 text-[11px] mt-1">100 meters left</p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-3.5 border-[1.5px] border-gray-400 rounded-[2px] p-[1.5px] relative flex">
                            <div className="h-full bg-[#ea580c] w-[82%] rounded-[1px]"></div>
                        </div>
                        <span className="text-white text-sm font-medium tracking-wider">82%</span>
                    </div>
                    <span className="text-gray-400 text-[10px] mt-1">Estimated Time Flight : 00:30:45</span>
                </div>
            </div>

            <div className="mb-4 h-px w-full shrink-0" style={{ backgroundImage: dividerStroke }} />

            {/* Global Takeoff Altitude Settings */}
            <div className="mb-4 shrink-0">
                <label className="text-gray-400 text-[10px] tracking-wide uppercase block mb-1">Takeoff Altitude</label>
                <div className="w-full h-[32px] bg-[#1C1C1C] border border-[#333333] px-3 flex items-center justify-between">
                    <input
                        type="number"
                        className="bg-transparent text-white text-xs outline-none w-full"
                        value={takeoffAltitude}
                        onChange={(e) => setTakeoffAltitude(e.target.value)}
                    />
                </div>
            </div>

            {/* Waypoints List */}
            <div className="custom-scrollbar min-h-0 overflow-y-auto space-y-4 pr-1 pb-2">
                {waypoints.length === 0 ? (
                    <p className="text-gray-500 text-xs italic text-center mt-10">Click on the map to add waypoints</p>
                ) : (
                    waypoints.map((wp, i) => {
                        const data = pointsData[wp.id] || { altitude: 150, cameraTilt: 20, action: 'Video Record' };
                        return (
                            <div key={wp.id} className="bg-[#222222] border p-3 relative" style={{ borderColor: panelStroke }}>
                                <button
                                    type="button"
                                    onClick={() => onDeleteWaypoint?.(wp.id)}
                                    className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center transition hover:opacity-80"
                                    aria-label={`Delete Point ${i + 1}`}
                                >
                                    <img
                                        src="/src/assets/images/icon_trash_mission.svg"
                                        alt=""
                                        aria-hidden="true"
                                        className="h-4 w-4 object-contain"
                                    />
                                </button>
                                <h3 className="text-white text-xs font-medium mb-3 tracking-wide">Point {i + 1}</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-400 text-[9px] uppercase">Altitude (M)</span>
                                        <div className="h-[28px] bg-[#1C1C1C] border border-[#333333] px-2 flex items-center">
                                            <input
                                                type="number"
                                                className="bg-transparent text-white text-[11px] outline-none w-full"
                                                value={data.altitude}
                                                onChange={(e) => handlePointChange(wp.id, 'altitude', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-400 text-[9px] uppercase">Camera Tilt</span>
                                        <div className="h-[28px] bg-[#1C1C1C] border border-[#333333] px-2 flex items-center">
                                            <input
                                                type="number"
                                                className="bg-transparent text-white text-[11px] outline-none w-full"
                                                value={data.cameraTilt}
                                                onChange={(e) => handlePointChange(wp.id, 'cameraTilt', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-400 text-[9px] uppercase">Action</span>
                                        <div className="relative h-[28px] bg-[#1C1C1C] border border-[#333333] px-2 flex items-center">
                                            <select
                                                className="bg-transparent text-white text-[11px] outline-none w-full appearance-none cursor-pointer"
                                                value={data.action}
                                                onChange={(e) => handlePointChange(wp.id, 'action', e.target.value)}
                                            >
                                                <option value="Video Record" className="bg-[#222222]">Video Record</option>
                                                <option value="Take Photo" className="bg-[#222222]">Take Photo</option>
                                            </select>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 pointer-events-none absolute right-4">
                                                <path d="M6 9l6 6 6-6" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
