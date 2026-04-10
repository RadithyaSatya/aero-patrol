import React, { useState } from 'react';

export default function WaypointSelectionPanel({ waypoints }) {
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

    const handlePointChange = (id, field, value) => {
        setPointsData(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    return (
        <div className="w-full h-full bg-[#1c222c] p-5 flex flex-col select-none">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-white text-[18px] font-bold tracking-wide">Waypoint Selection</h2>
                    <p className="text-gray-400 text-[11px] mt-1">100 meters left</p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-3.5 border-[1.5px] border-gray-400 rounded-[2px] p-[1.5px] relative flex">
                            <div className="h-full bg-[#ea580c] w-[82%] rounded-[1px]"></div>
                        </div>
                        <span className="text-white text-sm font-bold tracking-wider font-mono">82%</span>
                    </div>
                    <span className="text-gray-400 text-[10px] mt-1">Estimated Time Flight : 00:30:45</span>
                </div>
            </div>

            {/* Global Takeoff Altitude Settings */}
            <div className="mb-4">
                <label className="text-gray-400 text-[10px] font-semibold tracking-wide uppercase block mb-1">Takeoff Altitude</label>
                <div className="w-full h-[32px] bg-[#171c24] border border-[#2a3240] rounded px-3 flex items-center justify-between">
                    <input
                        type="number"
                        className="bg-transparent text-white text-xs outline-none w-full"
                        value={takeoffAltitude}
                        onChange={(e) => setTakeoffAltitude(e.target.value)}
                    />
                </div>
            </div>

            {/* Waypoints List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {waypoints.length === 0 ? (
                    <p className="text-gray-500 text-xs italic text-center mt-10">Click on the map to add waypoints</p>
                ) : (
                    waypoints.map((wp, i) => {
                        const data = pointsData[wp.id] || { altitude: 150, cameraTilt: 20, action: 'Video Record' };
                        return (
                            <div key={wp.id} className="bg-[#171c24] border border-[#2a3240] rounded-lg p-3 relative">
                                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[#682F2F]"></div>
                                <h3 className="text-white text-xs font-bold mb-3 tracking-wide">Point {i + 1}</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-400 text-[9px] uppercase">Altitude (M)</span>
                                        <div className="h-[28px] bg-[#1c222c] border border-[#2a3240] rounded px-2 flex items-center">
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
                                        <div className="h-[28px] bg-[#1c222c] border border-[#2a3240] rounded px-2 flex items-center">
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
                                        <div className="h-[28px] bg-[#1c222c] border border-[#2a3240] rounded px-2 flex items-center">
                                            <select
                                                className="bg-transparent text-white text-[11px] outline-none w-full appearance-none cursor-pointer"
                                                value={data.action}
                                                onChange={(e) => handlePointChange(wp.id, 'action', e.target.value)}
                                            >
                                                <option value="Video Record" className="bg-[#1c222c]">Video Record</option>
                                                <option value="Take Photo" className="bg-[#1c222c]">Take Photo</option>
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
