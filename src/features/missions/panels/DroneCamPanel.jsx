import React from 'react';
import dummyDroneImage from '../../../assets/img_dummy.png';
import { DRONE_STREAM_URL } from '../../../shared/config/streamConfig';

const CompassWidget = () => (
    <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full bg-black/40 flex items-center justify-center scale-75 transform origin-bottom-right">
        <div className="relative w-full h-full rounded-full border border-gray-400/50 flex items-center justify-center">
            {/* Compass Markings */}
            <div className="absolute top-1 text-[10px] font-bold text-gray-300">N</div>
            <div className="absolute bottom-1 text-[10px] font-bold text-gray-300">S</div>
            <div className="absolute left-1 text-[10px] font-bold text-gray-300">W</div>
            <div className="absolute right-1 text-[10px] font-bold text-gray-300">E</div>

            {/* Inner Ring */}
            <div className="w-[60%] h-[60%] rounded-full border border-[#ea580c]/30 flex items-center justify-center">
                {/* Arrow */}
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[18px] border-l-transparent border-r-transparent border-b-[#ea580c] -mt-4"></div>
            </div>

            {/* Degree Ticks Simulation */}
            {[...Array(12)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-[1px] h-2 bg-gray-500/50"
                    style={{
                        top: 2,
                        transformOrigin: '50% 38px',
                        transform: `rotate(${i * 30}deg)`
                    }}
                ></div>
            ))}
        </div>
    </div>
);

export default function DroneCamPanel() {
    const hasDroneStream = Boolean(DRONE_STREAM_URL);

    return (
        <div className="relative w-full h-full bg-black rounded-[24px] overflow-hidden border border-[#2a3240] shadow-lg">
            {/* Main Video Feed (Placeholder Image) */}
            {hasDroneStream ? (
                <video
                    src={DRONE_STREAM_URL}
                    autoPlay
                    muted
                    playsInline
                    controls={false}
                    className="h-full w-full object-cover"
                />
            ) : (
                <img
                    src={dummyDroneImage}
                    alt="Video Feed"
                    className="w-full h-full object-cover opacity-80"
                />
            )}
            {/* Dark overlay for realistic screen feel */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#12161c]/60 via-transparent to-transparent"></div>

            {/* Top Left Label */}
            <div className="absolute top-4 left-4 bg-black/40 px-3 py-1 rounded border border-[#ea580c]/50">
                <span className="text-[#ea580c] text-[10px] font-bold tracking-wider">DRONE CAM</span>
            </div>

            {/* Top Right Recording Status */}
            <div className="absolute top-4 right-4 flex items-center space-x-3 bg-black/40 px-3 py-1.5 rounded">
                <div className="flex items-center space-x-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                    <span className="text-gray-200 text-[10px] font-semibold tracking-wider">Recording</span>
                </div>
                <span className="text-gray-100 text-[11px] font-mono font-bold tracking-widest pt-[1px]">00:10:40</span>
            </div>

            {/* Center Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[60px] h-[60px] border border-white/20 rounded-sm relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-[#ea580c]"></div>
                </div>
            </div>

            {/* Compass */}
            <CompassWidget />
        </div>
    );
}
