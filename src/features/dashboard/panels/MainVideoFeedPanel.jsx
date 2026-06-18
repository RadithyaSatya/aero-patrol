import React from 'react';
import { DRONE_STREAM_URL } from '../../../shared/config/streamConfig';
import WebRtcStream from '../../../shared/components/WebRtcStream';
import navUpIcon from '../../../assets/images/icon_nav_up.svg';

function CompassOverlay() {
    return (
        <div className="pointer-events-none absolute bottom-6 right-6 z-[450] flex h-32 w-32 items-center justify-center rounded-full bg-black/40">
            <div className="relative flex h-full w-full items-center justify-center rounded-full border border-gray-400/50">
                <span className="absolute top-2 z-[100] text-[11px] font-bold uppercase tracking-widest text-gray-200">N</span>
                <span className="absolute right-2 z-[100] text-[11px] font-bold uppercase tracking-widest text-gray-200">E</span>
                <span className="absolute bottom-2 z-[100] text-[11px] font-bold uppercase tracking-widest text-gray-200">S</span>
                <span className="absolute left-2 z-[100] text-[11px] font-bold uppercase tracking-widest text-gray-200">W</span>
                <div className="absolute h-[1px] w-full bg-gray-500/50" />
                <div className="absolute h-full w-[1px] bg-gray-500/50" />
                <img src={navUpIcon} alt="" aria-hidden="true" className="absolute z-[100] h-8 w-8 object-contain" />
                <div className="absolute h-[60%] w-[60%] rounded-full border border-gray-500/50" />
                <div className="absolute h-[30%] w-[30%] rounded-full border border-gray-500/50" />
                {[...Array(12)].map((_, index) => (
                    <div
                        key={index}
                        className="absolute flex h-[2px] w-full justify-between px-1"
                        style={{ transform: `rotate(${index * 30}deg)` }}
                    >
                        <div className="h-full w-1.5 bg-gray-400" />
                        <div className="h-full w-1.5 bg-gray-400" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function MainVideoFeedPanel({ compact = false, showCompass = false, lightShell = false }) {
    return (
        <div
            className="font-tomorrow relative h-full w-full overflow-hidden select-none"
            style={lightShell
                ? { background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }
                : { backgroundColor: '#1c222c' }}
        >
            <WebRtcStream
                src={DRONE_STREAM_URL}
                title="Drone Cam Stream"
                autoPlay
                muted
                playsInline
                controls={false}
                className="absolute inset-0 h-full w-full object-cover"
            />

            {/* Top Left Badge */}
            <div className={`absolute bg-black/60 uppercase flex items-center justify-center ${compact ? 'left-3 top-3 px-2 py-1' : 'left-4 top-4 px-3 py-1.5'}`}>
                <span className="text-[#F94343] text-[11px] font-bold tracking-widest">DRONE CAM</span>
            </div>

            {showCompass ? <CompassOverlay /> : null}
        </div>
    );
}
