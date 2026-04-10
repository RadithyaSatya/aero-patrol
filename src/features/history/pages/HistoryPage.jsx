import React, { useState } from 'react';

// Mock Data for the History Table
const historyData = [
    { id: 1, mission: 'Mission 1', schedule: '12/12/2025\n16:34:00', pinPoint: '5 Pin point', task: 'Video Record', duration: '00:15:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 2, mission: 'Mission 10', schedule: '12/12/2025\n16:34:00', pinPoint: '7 Pin point', task: 'Field Research', duration: '02:00:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 3, mission: 'Mission 2', schedule: '12/12/2025\n16:34:00', pinPoint: '10 Pin point', task: 'Image Capture', duration: '00:20:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 4, mission: 'Mission 3', schedule: '12/12/2025\n16:34:00', pinPoint: '8 Pin point', task: 'Audio Record', duration: '00:30:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 5, mission: 'Mission 6', schedule: '12/12/2025\n16:34:00', pinPoint: '6 Pin point', task: 'Data Analysis', duration: '00:45:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 6, mission: 'Mission 7', schedule: '12/12/2025\n16:34:00', pinPoint: '15 Pin point', task: 'Survey Results', duration: '00:25:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 7, mission: 'Mission 11', schedule: '12/12/2025\n16:34:00', pinPoint: '3 Pin point', task: 'Final Review', duration: '01:30:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 8, mission: 'Mission 9', schedule: '12/12/2025\n16:34:00', pinPoint: '4 Pin point', task: 'Presentation Prep', duration: '01:15:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 9, mission: 'Mission 5', schedule: '12/12/2025\n16:34:00', pinPoint: '9 Pin point', task: 'Photo Gallery', duration: '00:10:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 10, mission: 'Mission 4', schedule: '12/12/2025\n16:34:00', pinPoint: '12 Pin point', task: 'Video Live Stream', duration: '01:00:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 11, mission: 'Mission 8', schedule: '12/12/2025\n16:34:00', pinPoint: '11 Pin point', task: 'Document Compilation', duration: '00:50:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 12, mission: 'Mission 12', schedule: '12/12/2025\n16:34:00', pinPoint: '5 Pin point', task: 'Closure Meeting', duration: '00:40:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' },
    { id: 13, mission: 'Mission 1', schedule: '12/12/2025\n16:34:00', pinPoint: '5 Pin point', task: 'Video Record', duration: '00:15:00', mediaStatus: 'Download', mediaSize: '2.4 MB', captureStatus: 'Download', captureInfo: '10+ Media' }
];

const DownloadIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#3b82f6] opacity-80">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
);
                                               
export default function HistoryPage() {
    return (
        <div className="p-[28px] flex gap-[20px] w-full h-[calc(100vh-104px)] overflow-hidden">
            {/* LEFT PANE: Mission List */}
            <div className="w-[60%] flex flex-col gap-5 rounded-[24px] border border-[#2a3240] shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-[#151a25]/95 backdrop-blur p-6">

                {/* Header/Controls Area */}
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-[45%] text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                placeholder="Search"
                                className="bg-[#1e2532] text-sm text-gray-200 placeholder-gray-500 rounded-[8px] pl-10 pr-4 py-2.5 w-[300px] border border-[#2a3240] focus:outline-none focus:border-orange-500/50 transition-colors"
                            />
                        </div>
                        <button className="h-[42px] px-3.5 bg-[#1e2532] hover:bg-[#252b36] border border-[#2a3240] rounded-[8px] flex items-center justify-center text-gray-300 transition-colors shadow-sm">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                        </button>
                    </div>

                    <button className="h-[42px] px-5 bg-[#1e2532] hover:bg-[#252b36] border border-[#2a3240] rounded-[8px] flex items-center gap-2 text-[13px] font-semibold text-white transition-colors shadow-sm tracking-wide">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                        Export as CSV
                    </button>
                </div>

                {/* Table Container */}
                <div className="flex-1 bg-[#1e2532] rounded-[12px] border border-[#2a3240] overflow-hidden flex flex-col shadow-inner">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1.5fr_1fr_1.5fr_1.5fr] gap-4 px-6 py-4 bg-[#1e2532] border-b border-[#2a3240] text-[13px] font-bold text-gray-100 tracking-wide sticky top-0 z-10">
                        <div>Mission</div>
                        <div>Schedule</div>
                        <div>Pin Point</div>
                        <div>Task</div>
                        <div>Duration</div>
                        <div>Media</div>
                        <div>Capture</div>
                    </div>

                    {/* Table Body (Scrollable) */} 
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
                        {historyData.map((row, index) => (
                            <div key={index} className="grid grid-cols-[1.5fr_1fr_1.2fr_1.5fr_1fr_1.5fr_1.5fr] gap-4 px-6 py-3.5 border-b border-[#2a3240]/50 hover:bg-[#252b36] transition-colors items-center text-[12px] group">
                                <div className="text-gray-200 font-medium">{row.mission}</div>
                                <div className="text-gray-300 leading-tight whitespace-pre-line">{row.schedule}</div>
                                <div className="text-gray-300">{row.pinPoint}</div>
                                <div className="text-gray-300">{row.task}</div>
                                <div className="text-gray-300">{row.duration}</div>

                                {/* Media Column */}
                                <div className="flex items-center gap-2 cursor-pointer group/link hover:opacity-80 transition-opacity">
                                    <DownloadIcon />
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[#3b82f6] underline decoration-[#3b82f6]/40 underline-offset-2">Mission1.mp4</span>
                                        <span className="text-[10px] text-gray-500">{row.mediaSize}</span>
                                    </div>
                                </div>

                                {/* Capture Column */}
                                <div className="flex items-center gap-2 cursor-pointer group/link hover:opacity-80 transition-opacity">
                                    <DownloadIcon />
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[#3b82f6] underline decoration-[#3b82f6]/40 underline-offset-2">Download</span>
                                        <span className="text-[10px] text-gray-500">{row.captureInfo}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT PANE: Trajectory & Media */}
            <div className="flex-1 flex flex-col gap-[20px]">
                {/* Top: Trajectory Map */}
                <div className="flex-1 rounded-[24px] border border-[#2a3240] overflow-hidden shadow-lg bg-[#111827] relative">
                    {/* Mock Map Background */}
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('/src/assets/img_map.png')`, filter: 'brightness(0.7)' }}></div>

                    {/* Map Overlays */}
                    <div className="absolute top-4 left-4 bg-orange-600/90 backdrop-blur-sm px-4 py-1.5 rounded-[8px] text-[12px] font-bold text-white uppercase tracking-wider border border-orange-500 shadow-md">
                        Trajectory
                    </div>

                    {/* Mock Waypoints (CSS Drawn for now) */             }
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="relative w-[60%] h-[60%] -translate-y-[10%]">
                            {/* Path Lines */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible">
                                <line x1="20%" y1="20%" x2="50%" y2="80%" stroke="#682F2F" strokeWidth="1" strokeDasharray="4 4" className="opacity-60" />
                                <line x1="80%" y1="30%" x2="50%" y2="80%" stroke="#682F2F" strokeWidth="1" strokeDasharray="4 4" className="opacity-60" />
                                <line x1="20%" y1="20%" x2="80%" y2="30%" stroke="#682F2F" strokeWidth="1" strokeDasharray="4 4" className="opacity-60" />
                            </svg>
                            {/* Points */}
                            <div className="absolute top-[20%] left-[20%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-[#682F2F] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-[0_0_10px_rgba(104,47,47,0.5)] border border-white/20">1</div>
                            <div className="absolute top-[30%] left-[80%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-[#682F2F] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-[0_0_10px_rgba(104,47,47,0.5)] border border-white/20">2</div>

                            {/* Drone Home / Target */}
                            <div className="absolute top-[80%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500 flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.6)]">
                                <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 22l10-3 10 3L12 2z" /></svg>
                                </div>
                            </div>

                            {/* Home Point */}
                            <div className="absolute top-[95%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-yellow-500 text-black rounded-full flex items-center justify-center text-[10px] font-bold border border-yellow-700">H</div>
                        </div>
                    </div>

                    {/* Bottom Info Card */}
                    <div className="absolute bottom-4 left-4 right-4 bg-[#151a25]/90 backdrop-blur border border-[#2a3240] rounded-[16px] p-4 flex flex-col justify-center h-[72px] shadow-lg">
                        <div className="text-orange-500 font-bold text-[14px]">Patrol on 3 Site</div>
                        <div className="text-gray-400 text-[11px] mt-1">12/12/2025 16:34</div>
                    </div>
                </div>

                {/* Bottom: Media Player */}
                <div className="flex-1 rounded-[24px] border border-[#2a3240] overflow-hidden shadow-lg bg-black relative group">
                    {/* Mock Video Feed */}
                    <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url('/src/assets/dock_cam_placeholder.png')` }}></div>

                    {/* Overlays */}
                    <div className="absolute top-4 left-4 bg-orange-600/90 backdrop-blur-sm px-4 py-1.5 rounded-[8px] text-[12px] font-bold text-white uppercase tracking-wider border border-orange-500 shadow-md">
                        Media
                    </div>

                    {/* Big Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-orange-500/80 group-hover:border-orange-400 transition-all cursor-pointer pointer-events-auto">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="translate-x-0.5"><path d="M5 3l14 9-14 9V3z" /></svg>
                        </div>
                    </div>

                    {/* Custom Progress Bar */}
                    <div className="absolute bottom-6 left-6 right-6 h-1 bg-[#2a3240] rounded-full overflow-visible shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                        {/* Filled Part */}
                        <div className="absolute top-0 left-0 h-full bg-orange-500 rounded-full w-[45%]"></div>
                        {/* Playhead */}
                        <div className="absolute top-1/2 left-[45%] -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)] border-2 border-orange-500"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
