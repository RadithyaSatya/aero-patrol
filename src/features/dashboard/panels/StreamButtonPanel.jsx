import React from 'react';

export default function StreamButtonPanel({ onLaunchClick }) {
    return (
        <div
            className="font-tomorrow flex h-full w-full flex-col items-center justify-center gap-4 border border-[#D53535] bg-[#222222] px-4 py-5 select-none shadow-lg cursor-pointer hover:bg-[#252b36] transition-colors active:scale-[0.98]"
            onClick={onLaunchClick}
        >
            <img src="/src/assets/images/btn_launch.png" alt="Stream" className="h-[170px] w-full max-w-[210px] object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]" />
            <h2 className="text-[#FD5757] text-[22px] font-bold tracking-[0.14em] drop-shadow-[0_2px_10px_rgba(234,88,12,0.3)]">
                Quick Launch
            </h2>
        </div>
    );
}
