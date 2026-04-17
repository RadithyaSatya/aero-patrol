import React, { useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import filterHistoryIcon from '../../../assets/images/icon_filter_history.svg';
import downloadHistoryIcon from '../../../assets/images/icon_white_download_history.svg';
import mediaPreviewImage from '../../../assets/img_dummy_active.png';

const trajectoryPresets = [
    {
        center: [-6.1985, 106.8115],
        dockPosition: [-6.195, 106.81],
        dronePosition: [-6.2018, 106.8154],
        waypoints: [
            { id: 1, lat: -6.1967, lng: 106.8078 },
            { id: 2, lat: -6.1994, lng: 106.8119 },
            { id: 3, lat: -6.1978, lng: 106.8161 }
        ]
    },
    {
        center: [-6.2062, 106.8237],
        dockPosition: [-6.2033, 106.8204],
        dronePosition: [-6.2091, 106.8268],
        waypoints: [
            { id: 1, lat: -6.2048, lng: 106.8182 },
            { id: 2, lat: -6.2075, lng: 106.8226 },
            { id: 3, lat: -6.2059, lng: 106.8277 }
        ]
    },
    {
        center: [-6.1894, 106.8042],
        dockPosition: [-6.1865, 106.8016],
        dronePosition: [-6.1923, 106.8085],
        waypoints: [
            { id: 1, lat: -6.1882, lng: 106.7994 },
            { id: 2, lat: -6.1907, lng: 106.8048 },
            { id: 3, lat: -6.1874, lng: 106.8091 }
        ]
    }
];

const baseHistoryData = [
    { id: 1, mission: 'Mission 1', schedule: '12/12/2025\n16:34:00', pinPoint: '5 Pin point', task: 'Video Record', duration: '00:15:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 2, mission: 'Mission 10', schedule: '12/12/2025\n16:34:00', pinPoint: '7 Pin point', task: 'Field Research', duration: '02:00:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 3, mission: 'Mission 2', schedule: '12/12/2025\n16:34:00', pinPoint: '10 Pin point', task: 'Image Capture', duration: '00:20:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 4, mission: 'Mission 3', schedule: '12/12/2025\n16:34:00', pinPoint: '8 Pin point', task: 'Audio Record', duration: '00:30:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 5, mission: 'Mission 6', schedule: '12/12/2025\n16:34:00', pinPoint: '6 Pin point', task: 'Data Analysis', duration: '00:45:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 6, mission: 'Mission 7', schedule: '12/12/2025\n16:34:00', pinPoint: '15 Pin point', task: 'Survey Results', duration: '00:25:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 7, mission: 'Mission 11', schedule: '12/12/2025\n16:34:00', pinPoint: '3 Pin point', task: 'Final Review', duration: '01:30:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 8, mission: 'Mission 9', schedule: '12/12/2025\n16:34:00', pinPoint: '4 Pin point', task: 'Presentation Prep', duration: '01:15:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 9, mission: 'Mission 5', schedule: '12/12/2025\n16:34:00', pinPoint: '9 Pin point', task: 'Photo Gallery', duration: '00:10:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 10, mission: 'Mission 4', schedule: '12/12/2025\n16:34:00', pinPoint: '12 Pin point', task: 'Video Live Stream', duration: '01:00:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 11, mission: 'Mission 8', schedule: '12/12/2025\n16:34:00', pinPoint: '11 Pin point', task: 'Document Compilation', duration: '00:50:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 12, mission: 'Mission 12', schedule: '12/12/2025\n16:34:00', pinPoint: '5 Pin point', task: 'Closure Meeting', duration: '00:40:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' },
    { id: 13, mission: 'Mission 1', schedule: '12/12/2025\n16:34:00', pinPoint: '5 Pin point', task: 'Video Record', duration: '00:15:00', mediaSize: '2.4 MB', captureInfo: '10+ Media' }
];

const historyData = baseHistoryData.map((item, index) => ({
    ...item,
    trajectory: trajectoryPresets[index % trajectoryPresets.length]
}));

const panelStroke = '#FC4747';
const tableStroke = '#5E0A0A';
const overlayDividerStroke = 'linear-gradient(90deg, rgba(252,71,71,0.12) 0%, #FC4747 50%, rgba(252,71,71,0.12) 100%)';
const geofencePathOptions = {
    color: '#E1BA95',
    fillColor: '#9616161A',
    fillOpacity: 1,
    weight: 0.3
};
const trajectoryPathOptions = {
    color: '#682F2F',
    weight: 2,
    dashArray: '4, 6',
    opacity: 1
};

const dockIcon = new L.DivIcon({
    className: 'custom-dock-icon',
    html: '<div class="h-6 w-6 rounded-full border-2 border-[#d4af37]/50 bg-[#d4af37] text-[10px] font-bold text-black flex items-center justify-center shadow-lg">H</div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const DRONE_ICON_WIDTH = 68;
const DRONE_ICON_HEIGHT = 96;
const DRONE_ICON_CENTER_X = 34;
const DRONE_ICON_CENTER_Y = 74;

const droneIcon = new L.DivIcon({
    className: 'custom-drone-icon',
    html: `
        <div style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:flex; align-items:center; justify-content:center; transform-origin:${DRONE_ICON_CENTER_X}px ${DRONE_ICON_CENTER_Y}px;">
            <img src="/src/assets/images/icon_drone.svg" alt="Drone" style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:block;" />
        </div>
    `,
    iconSize: [DRONE_ICON_WIDTH, DRONE_ICON_HEIGHT],
    iconAnchor: [DRONE_ICON_CENTER_X, DRONE_ICON_CENTER_Y]
});

const createWaypointIcon = (number) => new L.DivIcon({
    className: 'custom-waypoint-icon',
    html: `<div class="h-5 w-5 rounded-full border border-[#682F2F] bg-[#682F2F] text-[10px] font-bold text-white flex items-center justify-center shadow-lg">${number}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const PanelShell = ({ children, className = '' }) => (
    <div
        className={`font-tomorrow relative min-h-0 overflow-hidden border bg-[#222222] p-4 shadow-lg select-none ${className}`}
        style={{ borderColor: panelStroke }}
    >
        <div
            className="pointer-events-none absolute left-0 top-0 h-px w-full"
            style={{ backgroundImage: overlayDividerStroke }}
        />
        <div
            className="pointer-events-none absolute bottom-0 left-0 h-px w-full"
            style={{ backgroundImage: overlayDividerStroke }}
        />
        {children}
    </div>
);

const PanelTitleBlock = ({ title, subtitle }) => (
    <div className="flex items-start gap-3">
        <span className="w-[5px] shrink-0 self-stretch bg-[#FC4747]" />
        <div className="min-w-0">
            <p className="text-left text-[16px] font-medium tracking-wide text-white">{title}</p>
            {subtitle ? (
                <p className="mt-1 text-[11px] tracking-[0.08em] text-gray-400">{subtitle}</p>
            ) : null}
        </div>
    </div>
);

const DownloadCell = ({ title, subtitle }) => (
    <button
        type="button"
        className="flex items-center gap-2 text-left text-[#3B82F6] transition-opacity hover:opacity-80"
    >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4 shrink-0">
            <path
                d="M8 12L3 7L4.4 5.55L7 8.15V0H9V8.15L11.6 5.55L13 7L8 12ZM2 16C1.45 16 0.979333 15.8043 0.588 15.413C0.196666 15.0217 0.000666667 14.5507 0 14V11H2V14H14V11H16V14C16 14.55 15.8043 15.021 15.413 15.413C15.0217 15.805 14.5507 16.0007 14 16H2Z"
                fill="currentColor"
            />
        </svg>
        <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-medium text-[#3B82F6]">{title}</span>
            <span className="mt-1 text-[10px] text-gray-400">{subtitle}</span>
        </div>
    </button>
);

const HistoryTrajectoryMap = ({ trajectory }) => {
    const pathPositions = useMemo(
        () => [trajectory.dockPosition, ...trajectory.waypoints.map((point) => [point.lat, point.lng]), trajectory.dronePosition],
        [trajectory]
    );

    return (
        <MapContainer
            key={`${trajectory.center[0]}-${trajectory.center[1]}`}
            center={trajectory.center}
            zoom={15}
            attributionControl={false}
            zoomControl={false}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

            <Circle center={trajectory.dockPosition} radius={1800} pathOptions={geofencePathOptions} />
            <Polyline positions={pathPositions} pathOptions={trajectoryPathOptions} />
            <Marker position={trajectory.dockPosition} icon={dockIcon} />
            <Marker position={trajectory.dronePosition} icon={droneIcon} />
            {trajectory.waypoints.map((point, index) => (
                <Marker key={point.id} position={[point.lat, point.lng]} icon={createWaypointIcon(index + 1)} />
            ))}
        </MapContainer>
    );
};

export default function HistoryPage() {
    const [selectedHistoryId, setSelectedHistoryId] = useState(historyData[0].id);
    const highlightedHistory = historyData.find((item) => item.id === selectedHistoryId) ?? historyData[0];
    const [highlightedDate = '', highlightedTime = ''] = highlightedHistory.schedule.split('\n');
    const highlightedScheduleLabel = [highlightedDate, highlightedTime].filter(Boolean).join(' • ');

    return (
        <div className="grid h-[calc(100vh-104px)] w-full grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)] gap-[28px] p-[28px]">
            <PanelShell className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <svg
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search"
                                className="h-[42px] w-[300px] border border-[#FC4747] bg-[#1C1C1C] pl-10 pr-4 text-[12px] text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#FC4747]"
                            />
                        </div>

                        <button
                            type="button"
                            className="flex h-[42px] w-[42px] items-center justify-center border border-[#FC4747] bg-[#1C1C1C] transition-colors hover:border-[#FC4747] hover:bg-[#262626]"
                            aria-label="Filter history"
                        >
                            <img src={filterHistoryIcon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
                        </button>
                    </div>

                    <button
                        type="button"
                        className="flex h-[42px] items-center gap-2 border border-[#FC4747] bg-[#222222] px-4 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#2B2B2B]"
                    >
                        <img src={downloadHistoryIcon} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                        Export as CSV
                    </button>
                </div>

                <div className="h-px w-full" style={{ backgroundImage: overlayDividerStroke }} />

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[#5E0A0A]">
                    <div className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr_0.9fr_1.2fr_1.2fr] bg-[#5E0A0A] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#ffffff]">
                        <div>Mission</div>
                        <div>Schedule</div>
                        <div>Pin Point</div>
                        <div>Task</div>
                        <div>Duration</div>
                        <div>Media</div>
                        <div>Capture</div>
                    </div>

                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                        {historyData.map((row, index) => (
                            <div
                                key={row.id}
                                role="button"
                                tabIndex={0}
                                aria-pressed={row.id === selectedHistoryId}
                                onClick={() => setSelectedHistoryId(row.id)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        setSelectedHistoryId(row.id);
                                    }
                                }}
                                className={`relative grid grid-cols-[1.2fr_1fr_1fr_1.2fr_0.9fr_1.2fr_1.2fr] items-center gap-4 px-4 py-3 text-[11px] transition-colors ${
                                    row.id === selectedHistoryId ? 'bg-[#311818]' : 'hover:bg-[#292929]'
                                } cursor-pointer focus:outline-none focus-visible:bg-[#311818]`}
                            >
                                {index === 0 && (
                                    <div
                                        className="pointer-events-none absolute left-0 right-0 top-0 h-px"
                                        style={{ backgroundColor: tableStroke }}
                                    />
                                )}
                                <div
                                    className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
                                    style={{ backgroundColor: tableStroke }}
                                />
                                {row.id === selectedHistoryId && (
                                    <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-[3px] bg-[#FC4747]" />
                                )}
                                <div className="font-medium text-white">{row.mission}</div>
                                <div className="whitespace-pre-line leading-tight text-gray-300">{row.schedule}</div>
                                <div className="text-gray-300">{row.pinPoint}</div>
                                <div className="text-gray-300">{row.task}</div>
                                <div className="text-gray-300">{row.duration}</div>
                                <DownloadCell title="Mission1.mp4" subtitle={row.mediaSize} />
                                <DownloadCell title="Download" subtitle={row.captureInfo} />
                            </div>
                        ))}
                    </div>
                </div>
            </PanelShell>

            <div className="flex min-h-0 flex-col gap-[20px]">
                <PanelShell className="flex flex-1 flex-col gap-4">
                    <PanelTitleBlock title="Trajectory" subtitle="Drone Trajectory in one event" />

                    <div className="relative min-h-0 flex-1 overflow-hidden border border-[#5E0A0A] bg-[#181d25]">
                        <HistoryTrajectoryMap trajectory={highlightedHistory.trajectory} />
                        <div className="pointer-events-none absolute inset-x-0 top-0 z-[350] h-16 bg-gradient-to-b from-black/55 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[350] h-24 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        <div className="absolute bottom-4 left-4 right-4 z-[400] border border-[#5E0A0A] bg-[#221111]/90 px-4 py-3 backdrop-blur-sm">
                            <div className="text-[14px] font-medium text-white">{highlightedHistory.mission}</div>
                            <div className="mt-1 text-[11px] text-gray-400">Schedule {highlightedHistory.schedule.replace('\n', ' ')}</div>
                        </div>
                    </div>
                </PanelShell>

                <PanelShell className="flex flex-1 flex-col gap-4">
                    <PanelTitleBlock title="Media" subtitle={highlightedScheduleLabel} />

                    <div className="h-px w-full bg-[#FB5555]" />

                    <div className="relative min-h-0 flex-1 overflow-hidden border border-[#5E0A0A] bg-black">
                        <img
                            src={mediaPreviewImage}
                            alt="History media preview"
                            className="h-full w-full object-cover opacity-75"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                        <button
                            type="button"
                            aria-label="Play history media"
                            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#FC4747] bg-[#2A1212]/85 transition-transform hover:scale-105"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </button>

                        <div className="absolute bottom-5 left-5 right-5">
                            <div className="mb-2 flex items-center justify-between text-[11px] text-white">
                                <span>Mission1.mp4</span>
                                <span>{highlightedHistory.duration}</span>
                            </div>
                            <div className="h-[3px] bg-white/20">
                                <div className="h-full w-[46%] bg-[#FC4747]" />
                            </div>
                        </div>
                    </div>
                </PanelShell>
            </div>
        </div>
    );
}
