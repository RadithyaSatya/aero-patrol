import React from 'react';

const CompassWidget = () => (
    <div className="absolute bottom-6 right-6 w-32 h-32 rounded-full bg-black/40 flex items-center justify-center">
        <div className="relative w-full h-full rounded-full border border-gray-400/50 flex items-center justify-center">
            {/* Compass Marks */}
            <span className="absolute top-2 text-[11px] text-gray-200 font-bold uppercase z-[100] tracking-widest">N</span>
            <span className="absolute right-2 text-[11px] text-gray-200 font-bold uppercase z-[100] tracking-widest">E</span>
            <span className="absolute bottom-2 text-[11px] text-gray-200 font-bold uppercase z-[100] tracking-widest">S</span>
            <span className="absolute left-2 text-[11px] text-gray-200 font-bold uppercase z-[100] tracking-widest">W</span>
            {/* Crosshairs */}
            <div className="absolute w-full h-[1px] bg-gray-500/50"></div>
            <div className="absolute h-full w-[1px] bg-gray-500/50"></div>
            {/* Center Arrow */}
            <img src="/src/assets/images/icon_nav_up.svg" alt="Compass" className="absolute w-8 h-8 z-[100] object-contain" />
            {/* Outer grid circles */}
            <div className="absolute w-[60%] h-[60%] rounded-full border border-gray-500/50"></div>
            <div className="absolute w-[30%] h-[30%] rounded-full border border-gray-500/50"></div>

            {/* Angle markers */}
            {[...Array(12)].map((_, i) => (
                <div key={i} className="absolute w-full h-[2px] flex justify-between px-1" style={{ transform: `rotate(${i * 30}deg)` }}>
                    <div className="w-1.5 h-full bg-gray-400"></div>
                    <div className="w-1.5 h-full bg-gray-400"></div>
                </div>
            ))}
        </div>
    </div>
);

export default function MainVideoFeedPanel({ compact = false }) {
    return (
        <div className="font-tomorrow relative h-full w-full overflow-hidden bg-[#1c222c] select-none">
            {/* Video Background Placeholder */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url('/src/assets/img_dummy.png')` }}
            />

            {/* Top Left Badge */}
            <div className={`absolute bg-black/60 uppercase flex items-center justify-center ${compact ? 'left-3 top-3 px-2 py-1' : 'left-4 top-4 px-3 py-1.5'}`}>
                <span className="text-[#F94343] text-[11px] font-bold tracking-widest">DRONE CAM</span>
            </div>

            {/* Top Center Badge */}
            {!compact && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 border border-[#F94343] px-3 py-1.5 flex items-center justify-center">
                    <div className="flex items-center space-x-2 text-[#F94343]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[11px] font-bold tracking-widest uppercase">ZOOM 2.3X</span>
                    </div>
                </div>
            )}

            {/* Top Right Recording Badge */}
            <div className={`absolute bg-black/50 border border-gray-500 flex items-center justify-center ${compact ? 'right-3 top-3 space-x-2 px-2 py-1' : 'right-4 top-4 space-x-4 px-3 py-1 rounded'}`}>
                <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse mt-[1px]"></div>
                    <span className="text-gray-100 text-[11px] font-bold uppercase tracking-wider">Recording</span>
                </div>
                {!compact && <span className="text-gray-100 text-[11px] font-mono font-bold tracking-widest pt-[2px]">00:10:40</span>}
            </div>

            {/* Bottom Left Status */}
            {!compact && (
                <div className="absolute bottom-5 left-5 flex flex-col items-start bg-black/30 px-2 py-1 rounded">
                    <span className="text-gray-300 text-[10px] uppercase font-bold tracking-wider drop-shadow-md">Camera Status</span>
                    <span className="text-white text-[13px] font-semibold tracking-wide drop-shadow-md mt-0.5">Recording</span>
                </div>
            )}

            {/* Bottom Right Compass */}
            <CompassWidget />
        </div>
    );
}
