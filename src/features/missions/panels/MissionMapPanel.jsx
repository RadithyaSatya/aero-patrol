import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icon for Drone and Dock (Optional visually for now, keeping it basic)
const dockIcon = new L.DivIcon({
    className: 'custom-dock-icon',
    html: `<div class="w-6 h-6 rounded-full bg-[#d4af37] text-black text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-[#d4af37]/50">H</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const droneIcon = new L.DivIcon({
    className: 'custom-drone-icon',
    html: `
        <img src="/src/assets/images/icon_drone.svg" alt="Drone" class="w-24 h-24" />
    `,
    iconSize: [96, 96],
    iconAnchor: [48, 48]
});

const createWaypointIcon = (number) => new L.DivIcon({
    className: 'custom-waypoint-icon',
    html: `<div class="w-5 h-5 rounded-full bg-[#682F2F] border border-[#682F2F] text-white text-[10px] font-bold flex items-center justify-center shadow-lg">${number}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const geofencePathOptions = {
    color: '#E1BA95',
    fillColor: '#9616161A',
    fillOpacity: 1,
    weight: 0.3
};

const overlayTopStroke = 'linear-gradient(90deg, #E83737 0%, rgba(251,85,85,0.2) 50%, #E83737 100%)';
const overlayBottomStroke = 'linear-gradient(90deg, rgba(251,85,85,0.2) 0%, #E83737 22%, #E83737 100%)';
const overlayDividerStroke = 'linear-gradient(90deg, rgba(251,85,85,0.18) 0%, #E83737 50%, rgba(251,85,85,0.18) 100%)';

// Component to handle map clicks for adding waypoints
function MapClickHandler({ onAddWaypoint }) {
    useMapEvents({
        click(e) {
            onAddWaypoint(e.latlng);
        },
    });
    return null;
}

export default function MissionMapPanel({ waypoints, onAddWaypoint, isViewMode = true }) {
    const center = [-6.200000, 106.816666]; // Jakarta coordinates for dummy data
    const dockPosition = [-6.195, 106.81];
    const dronePosition = [-6.198, 106.805];

    // Extract lat/lng pairs for the polyline connection
    const linePositions = waypoints.map(wp => [wp.lat, wp.lng]);

    // Connect drone to the first waypoint
    const allLines = waypoints.length > 0 ? [dronePosition, ...linePositions] : [];

    return (
        <div className="relative w-full h-full bg-[#181d25]">
            <MapContainer
                center={center}
                zoom={14}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                scrollWheelZoom={true}
            >
                {/* Dark CartoDB Matter tile layer */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <MapClickHandler onAddWaypoint={onAddWaypoint} />

                {/* Max Radius Circle */}
                <Circle center={dockPosition} radius={1800} pathOptions={geofencePathOptions} />

                {/* Draw lines between points */}
                <Polyline positions={allLines} color="#682F2F" weight={2} dashArray="4, 6" />

                {/* Dock Marker */}
                <Marker position={dockPosition} icon={dockIcon} />

                {/* Drone Marker */}
                <Marker position={dronePosition} icon={droneIcon} />

                {/* Waypoints */}
                {waypoints.map((wp, index) => (
                    <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={createWaypointIcon(index + 1)} />
                ))}
            </MapContainer>

            {/* Map Custom Controls (Zoom/Location) */}
            <div className="absolute top-[60vh] left-4 z-[400] flex flex-col bg-[#1c222c]/90 backdrop-blur border border-[#2a3240] rounded-xl overflow-hidden shadow-lg">
                <button className="p-3 hover:bg-[#202834] transition flex items-center justify-center border-b border-[#2a3240]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <polygon points="12 2 15 13 22 13 16 16 18 22 12 18 6 22 8 16 2 13 9 13 12 2" fill="currentColor"></polygon>
                    </svg>
                </button>
                <button className="p-3 hover:bg-[#202834] transition flex items-center justify-center border-b border-[#2a3240]">
                    <span className="text-white text-lg font-mono leading-none">+</span>
                </button>
                <button className="p-3 hover:bg-[#202834] transition flex items-center justify-center">
                    <span className="text-white text-lg font-mono leading-none">-</span>
                </button>
            </div>

            {/* Conditionally Render Overlays */}
            {isViewMode ? (
                <>
                    {/* View Mode: Detail Overlay */}
                    <div className="absolute top-4 right-4 z-[450] w-[280px] overflow-hidden bg-[#222222] p-5 shadow-lg pointer-events-none">
                        <div
                            className="pointer-events-none absolute left-0 top-0 h-px w-full"
                            style={{ backgroundImage: overlayTopStroke }}
                        />
                        <div
                            className="pointer-events-none absolute bottom-0 left-0 h-px w-full"
                            style={{ backgroundImage: overlayBottomStroke }}
                        />
                        <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-[#E83737]" />
                        <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-[#E83737]" />
                        <div className="flex items-center space-x-2 mb-4">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                <path d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                            <span className="text-white text-[13px] font-bold tracking-wide">Detail</span>
                        </div>

                        <div
                            className="mb-4 h-px w-full"
                            style={{ backgroundImage: overlayDividerStroke }}
                        />

                        <div className="grid grid-cols-2 gap-y-5 gap-x-2">
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px] mb-1">Flight Estimation (min)</span>
                                <span className="text-white text-xs font-mono">00:20:30</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px] mb-1">Battery Left (min)</span>
                                <span className="text-white text-xs font-mono">00:20:30</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px] mb-1">Flight Distance (meter)</span>
                                <span className="text-white text-xs font-bold">250 Meter</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px] mb-1">Flight Area</span>
                                <span className="text-white text-xs font-bold">250 Meter</span>
                            </div>
                        </div>
                    </div>

                    {/* View Mode: Mission Waypoints List */}
                    <div className="font-tomorrow absolute bottom-4 right-4 z-[450] w-[400px] overflow-hidden bg-[#222222] p-4 shadow-lg pointer-events-auto">
                        <div
                            className="pointer-events-none absolute left-0 top-0 h-px w-full"
                            style={{ backgroundImage: overlayTopStroke }}
                        />
                        <div
                            className="pointer-events-none absolute bottom-0 left-0 h-px w-full"
                            style={{ backgroundImage: overlayBottomStroke }}
                        />
                        <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-[#E83737]" />
                        <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-[#E83737]" />
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center space-x-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <div>
                                    <h3 className="text-white text-[13px]">Patrol On 3 Site</h3>
                                    <p className="text-gray-400 text-[10px] mt-0.5">12/12/2025  16:34</p>
                                </div>
                            </div>
                        </div>

                        <div
                            className="mb-4 h-px w-full"
                            style={{ backgroundImage: overlayDividerStroke }}
                        />

                        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {(waypoints.length ? waypoints : [{ id: 1 }, { id: 2 }, { id: 3 }]).map((wp, i) => (
                                <div key={wp.id} className="relative overflow-hidden border border-[#393F44] bg-[#222222] p-3">
                                    <h4 className="text-white text-xs font-bold mb-2 tracking-wide">Point {i + 1}</h4>
                                    <div className="grid grid-cols-[0.9fr_0.9fr_1.2fr] gap-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-gray-400 text-[9px] uppercase">Altitude (M)</span>
                                            <div className="border border-[#393F44] bg-[#2C2C2C] px-2 py-1">
                                                <span className="text-white text-[11px] font-mono">150</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-gray-400 text-[9px] uppercase">Camera Tilt</span>
                                            <div className="border border-[#393F44] bg-[#2C2C2C] px-2 py-1">
                                                <span className="text-white text-[11px] font-mono">30</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-gray-400 text-[9px] uppercase">Action</span>
                                            <div className="border border-[#393F44] bg-[#2C2C2C] px-2 py-1">
                                                <span className="whitespace-nowrap text-white text-[11px]">Video Record</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Add Mode: Drone Condition Overlay */}
                    <div className="absolute top-4 left-4 z-[400] bg-[#1c222c]/90 backdrop-blur border border-[#2a3240] rounded-xl p-4 w-[280px] shadow-lg pointer-events-none">
                        <div className="flex items-center space-x-2 mb-4">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            <span className="text-white text-xs font-bold tracking-wide">Drone Condition</span>
                        </div>

                        <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-4">
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px] mb-1">Battery Level</span>
                                <span className="text-white text-[11px] font-semibold">82% (Good)</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px] mb-1">Flight Estimation (min)</span>
                                <span className="text-white text-[11px] font-mono">00:30:45</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px] mb-1">Drone Speed Avg</span>
                                <span className="text-white text-[11px] font-semibold">10 km/h</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px] mb-1">Flight Estimation (min)</span>
                                <span className="text-white text-[11px] font-mono">00:30:45</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-gray-400 text-[10px]">Weather Condition</span>
                            <div className="bg-[#171c24] border border-[#2a3240] rounded-lg p-3">
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-xl shadow-inner shadow-yellow-500/50 relative">☁️</div>
                                    <div className="flex-1 flex justify-between items-center">
                                        <span className="text-white text-sm font-bold">Cloudy</span>
                                        <span className="text-white text-lg font-bold">31°C</span>
                                    </div>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <div className="flex space-x-1"><span>Gust</span><span className="text-white font-mono">6 m/s</span></div>
                                    <div className="flex space-x-1"><span>Wind</span><span className="text-white font-mono">6 m/s</span></div>
                                    <div className="flex space-x-1"><span>Humid</span><span className="text-white font-mono">6 m/s</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Add Mode: Legend Overlay */}
                    <div className="absolute top-4 right-4 z-[400] bg-[#1c222c]/90 backdrop-blur border border-[#2a3240] rounded-xl p-4 w-[240px] shadow-lg pointer-events-none">
                        <div className="flex items-center space-x-2 mb-3">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            <span className="text-white text-xs font-bold tracking-wide">Legend</span>
                        </div>

                        <div className="grid grid-cols-2 gap-y-3">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full border border-[#E1BA95] bg-[#9616161A]"></div>
                                <span className="text-gray-300 text-[10px] font-medium">Max Radius</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#d4af37] text-black text-[7px] font-bold flex items-center justify-center">H</div>
                                <span className="text-gray-300 text-[10px] font-medium">Dock</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#ea580c] flex items-center justify-center"><div className="w-1.5 h-1.5 bg-white rounded-full"></div></div>
                                <span className="text-gray-300 text-[10px] font-medium">Drone</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="flex space-x-[2px] text-[#682F2F] text-[10px] font-bold font-mono">
                                    <span>1</span><span>/</span><span>2</span><span>/</span><span>3</span>
                                </div>
                                <span className="text-gray-300 text-[10px] font-medium ml-1">Waypoint</span>
                            </div>
                        </div>
                    </div>

                    {/* Add Mode: Bottom Controls Overlay */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] flex flex-col items-center">
                        <div className="flex space-x-4 mt-2">
                            <button className="bg-transparent hover:brightness-110 transition flex items-center space-x-2">
                                <img src="/src/assets/btn_cancel_mission.png" alt="" />
                            </button>
                            <button className="bg-transparent hover:brightness-110 transition">
                                <img src="/src/assets/btn_set_schedule.png" alt="" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
