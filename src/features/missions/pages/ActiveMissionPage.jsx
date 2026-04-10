import React from 'react';
import MainVideoFeedPanel from '../../dashboard/panels/MainVideoFeedPanel';
import MapViewPanel from '../../dashboard/panels/MapViewPanel';

// Mock components for the right sidebar and controls
const DockCamPanel = () => (
    <div className="relative w-full h-full bg-black">
        {/* Placeholder image/bg for Dock Cam */}
        <div className="absolute inset-0 bg-cover bg-center opacity-70" style={{ backgroundImage: `url('/src/assets/dock_cam_placeholder.png')`, backgroundColor: '#111' }} />
        <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/50 border border-orange-500/30 rounded text-[10px] uppercase font-bold text-orange-500 tracking-wider">
            Dock Cam
        </div>
    </div>
);

const WeatherWidget = () => (
    <div className="p-4 flex flex-col justify-between h-full bg-[#111827]">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
                <div className="text-yellow-400">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5 0 .65.13 1.26.36 1.83C7.14 13.92 7.07 14 7 14a4 4 0 1 0 0 8 4 4 0 1 0 0-8c.07 0 .14.01.21.02C7.38 10.36 9.5 8 12 8c.34 0 .67.04 1 .09V6c0-2.43 1.73-4.44 4-4.9V4a3 3 0 0 0-3 3v1h1a5 5 0 0 1 5 5v5h2v-5a7 7 0 0 0-7-7c-1.66 0-3.14.53-4.34 1.43C10.35 6.55 11.16 7 12 7z" /></svg>
                </div>
                <div>
                    <div className="text-white font-semibold text-sm">Cloudy</div>
                </div>
            </div>
            <div className="text-3xl font-light text-white">31°C</div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-400 mt-2">
            <div className="flex justify-between"><span>Wind Speed</span><span className="text-gray-200">6 m/s</span></div>
            <div className="flex justify-between"><span>Wind Blast</span><span className="text-gray-200">6 m/s</span></div>
            <div className="flex justify-between"><span>Wind Gust</span><span className="text-gray-200">6 m/s</span></div>
            <div className="flex justify-between"><span>Precipitation</span><span className="text-gray-200">6 m/s</span></div>
        </div>

        <div className="flex justify-between mt-3 text-[10px] text-gray-400">
            <div className="flex flex-col items-center gap-1"><span>12:00</span><span className="text-yellow-400">☁️</span><span>28°</span></div>
            <div className="flex flex-col items-center gap-1"><span>14:00</span><span className="text-blue-400">🌧️</span><span>32°</span></div>
            <div className="flex flex-col items-center gap-1"><span>15:00</span><span className="text-gray-400">☁️</span><span>31°</span></div>
            <div className="flex flex-col items-center gap-1"><span>16:00</span><span className="text-yellow-400">🌤️</span><span>28°</span></div>
            <div className="flex flex-col items-center gap-1"><span>17:00</span><span className="text-yellow-400">🌤️</span><span>29°</span></div>
            <div className="flex flex-col items-center gap-1"><span>18:00</span><span className="text-yellow-400">☀️</span><span>30°</span></div>
        </div>
    </div>
);

const DPadControl = () => (
    <div className="h-full flex items-center gap-6 bg-[#151a25]/95 backdrop-blur rounded-[24px] border border-[#2a3240] p-6 shadow-lg shrink-0 justify-center">
        <div className="flex flex-col justify-between h-full py-1">
            <button className="w-12 h-12 rounded-[12px] bg-[#111827] hover:bg-[#1f2937] flex items-center justify-center text-white text-2xl font-light shadow-sm border border-[#374151] active:translate-y-0.5 transition-all">
                +
            </button>
            <button className="w-12 h-12 rounded-[12px] bg-[#111827] hover:bg-[#1f2937] flex items-center justify-center text-white text-3xl font-light shadow-sm border border-[#374151] active:translate-y-0.5 transition-all">
                −
            </button>
        </div>
        <div className="relative w-32 h-32 rounded-full bg-[#111827] border border-[#2a3240] flex items-center justify-center shadow-inner">
            {/* Center stick */}
            <div className="w-14 h-14 rounded-full bg-[#1f2937] border border-[#374151] shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_4px_10px_rgba(0,0,0,0.5)] z-10 cursor-pointer hover:border-orange-500/50 transition-colors"></div>
            {/* Arrows */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-orange-500 text-[12px]">▲</div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-orange-500 text-[12px]">▼</div>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 text-[12px]">◀</div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 text-[12px]">▶</div>
        </div>
    </div>
);

export default function ActiveMissionPage() {
    return (
        <div className="p-[28px] flex flex-col gap-[20px] w-full h-[calc(100vh-104px)] overflow-hidden">
            {/* UPPER AREA: Main Video + Right Sidebar */}
            <div className="flex-1 flex gap-[20px] min-h-0">
                {/* Main Video Feed */}
                <div className="flex-1 rounded-[24px] border border-[#2a3240] overflow-hidden shadow-lg bg-black relative group">
                    <MainVideoFeedPanel />
                    {/* Overlay controls for video */}
                    <div className="absolute top-4 left-4 flex gap-2 z-10">
                        <div className="bg-[#1f2937]/80 rounded-md p-1 border border-gray-600 flex text-[10px] font-bold text-gray-300">
                            <span className="px-3 py-1 bg-orange-500 text-white rounded-sm shadow-sm">Standard</span>
                            <span className="px-3 py-1 cursor-pointer hover:text-white transition-colors">Nightvision</span>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Dock Cam + Weather */}
                <div className="w-[340px] shrink-0 flex flex-col gap-[20px]">
                    {/* Dock Cam */}
                    <div className="h-[220px] rounded-[24px] border border-[#2a3240] overflow-hidden shadow-lg bg-[#111827]">
                        <DockCamPanel />
                    </div>
                    {/* Weather */}
                    <div className="flex-1 rounded-[24px] border border-[#2a3240] overflow-hidden shadow-lg bg-[#111827]/90 backdrop-blur-sm">
                        <WeatherWidget />
                    </div>
                </div>
            </div>

            {/* BOTTOM AREA: Control Bar */}
            <div className="h-[220px] shrink-0 flex gap-[20px] items-stretch">
                {/* 1. Map View (Left) */}
                <div className="w-[380px] shrink-0 rounded-[24px] border border-[#2a3240] overflow-hidden shadow-lg bg-[#111827] relative">
                    <MapViewPanel />
                </div>

                {/* 2. Middle Controls (Center) */}
                <div className="flex-1 rounded-[24px] border border-[#2a3240] bg-[#151a25]/95 backdrop-blur shadow-lg p-6 flex flex-col justify-between">
                    <div className="flex h-full gap-8">
                        {/* Left Side: Camera Controls */}
                        <div className="flex flex-col justify-between w-[45%] pr-8">
                            {/* Record / Photo */}
                            <div className="flex gap-4">
                                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[#111827] border border-red-500/30 text-white text-[13px] font-bold hover:bg-white/5 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                    Record
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[#111827] border border-[#374151] text-white text-[13px] font-bold hover:bg-white/5 transition-colors shadow-sm">
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" /><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" /></svg>
                                    Photo
                                </button>
                            </div>

                            {/* Camera Resolution */}
                            <div className="flex items-center justify-between py-3 border-t border-b border-[#2a3240]">
                                <div className="flex items-center gap-3">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-[13px] text-gray-300 font-medium tracking-wide">Camera Resolution</span>
                                </div>
                                <div className="flex items-center gap-2 text-white font-bold text-[13px] cursor-pointer">
                                    1080p @30fps
                                    <span className="text-orange-500 text-[10px]">▼</span>
                                </div>
                            </div>

                            {/* Abort Mission */}
                            <button className="w-full py-3.5 hover:from-red-500 hover:to-red-700 tracking-[0.05em] text-[14px] rounded-[10px] transition-all active:scale-[0.98]">
                                <img src="/src/assets/btn_abort_mission.png" alt="Abort Mission" />
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="w-[1px] bg-[#2a3240] h-full"></div>

                        {/* Right Side: Object Detection/Tracking */}
                        <div className="flex flex-col justify-between flex-1 pl-4">
                            {/* Headers */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-[11px] font-bold text-gray-400 tracking-[0.1em] uppercase">Object Detection</div>
                                <div className="text-[11px] font-bold text-gray-400 tracking-[0.1em] uppercase">Object Tracking</div>
                            </div>

                            {/* Toggles */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#f97316] rounded-[8px] flex items-center justify-between px-4 py-3 cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:bg-[#f97316]/90 transition-colors">
                                    <span className="text-[13px] font-bold text-black">People Counting</span>
                                    <div className="w-3 h-3 bg-black rounded-[2px] shadow-sm"></div>
                                </div>
                                <div className="bg-transparent border border-[#374151] rounded-[8px] flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#111827] transition-colors">
                                    <span className="text-[13px] font-medium text-gray-400">People Tracking</span>
                                    <div className="w-3 h-3 border-[2px] border-gray-500 rounded-[2px]"></div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#111827] border border-[#2a3240] rounded-[10px] flex flex-col items-center justify-center p-2.5">
                                    <span className="text-[14px] font-medium text-white mb-0.5">People</span>
                                    <span className="text-[20px] font-bold text-gray-400 leading-none">32</span>
                                </div>
                                <div className="bg-[#111827] border border-[#2a3240] rounded-[10px] flex flex-col items-center justify-center p-2.5">
                                    <span className="text-[14px] font-medium text-white mb-0.5">Vehicle</span>
                                    <span className="text-[20px] font-bold text-gray-400 leading-none">32</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. D-Pad (Right) */}
                <DPadControl />
            </div>
        </div>
    );
}
