import React from 'react';
import { DRONE_STREAM_URL } from '../../../shared/config/streamConfig';
import WebRtcStream from '../../../shared/components/WebRtcStream';

export default function DroneCamPanel() {
    return (
        <div className="relative w-full h-full bg-black rounded-[24px] overflow-hidden border border-[#2a3240] shadow-lg">
            <WebRtcStream
                src={DRONE_STREAM_URL}
                title="Drone Cam Stream"
                autoPlay
                muted
                playsInline
                controls={false}
                className="h-full w-full object-cover"
            />
            {/* Dark overlay for realistic screen feel */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#12161c]/60 via-transparent to-transparent"></div>

            {/* Top Left Label */}
            <div className="absolute top-4 left-4 bg-black/40 px-3 py-1 rounded border border-[#ea580c]/50">
                <span className="text-[#ea580c] text-[10px] font-bold tracking-wider">DRONE CAM</span>
            </div>

            {/* Center Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[60px] h-[60px] border border-white/20 rounded-sm relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-[#ea580c]"></div>
                </div>
            </div>
        </div>
    );
}
