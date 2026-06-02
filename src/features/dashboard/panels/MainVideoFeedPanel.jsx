import React from 'react';
import dummyDroneImage from '../../../assets/img_dummy.png';
import { DRONE_STREAM_URL } from '../../../shared/config/streamConfig';
import WebRtcStream from '../../../shared/components/WebRtcStream';

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
    const hasDroneStream = Boolean(DRONE_STREAM_URL);

    return (
        <div className="font-tomorrow relative h-full w-full overflow-hidden bg-[#1c222c] select-none">
            {/* Video Background Placeholder */}
            {hasDroneStream ? (
                <WebRtcStream
                    src={DRONE_STREAM_URL}
                    title="Drone Cam Stream"
                    autoPlay
                    muted
                    playsInline
                    controls={false}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            ) : (
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${dummyDroneImage})` }}
                />
            )}

            {/* Top Left Badge */}
            <div className={`absolute bg-black/60 uppercase flex items-center justify-center ${compact ? 'left-3 top-3 px-2 py-1' : 'left-4 top-4 px-3 py-1.5'}`}>
                <span className="text-[#F94343] text-[11px] font-bold tracking-widest">DRONE CAM</span>
            </div>

            {/* Bottom Right Compass */}
            <CompassWidget />
        </div>
    );
}
