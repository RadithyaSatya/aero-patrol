import React from 'react';

function ArrowIcon({ direction }) {
    const rotationByDirection = {
        up: '180deg',
        right: '-90deg',
        down: '0deg',
        left: '90deg'
    };

    return (
        <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center"
            style={{ transform: `rotate(${rotationByDirection[direction]})` }}
        >
            <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
                <polyline
                    points="5 8 12 16 19 8"
                    stroke="#7B7B7B"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );
}

function ZoomButton({ children, label }) {
    return (
        <button
            type="button"
            aria-label={label}
            className="relative flex h-full w-[96px] flex-1 items-center justify-center overflow-hidden bg-[#2A2A2A] text-[34px] font-medium text-white transition-colors hover:bg-[#323232]"
        >
            <span className="pointer-events-none absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
            <span className="pointer-events-none absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
            <span className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[#ED0000]" />
            <span className="relative z-10 leading-none">{children}</span>
        </button>
    );
}

export default function CameraJoystickPanel() {
    return (
        <div className="font-tomorrow flex h-full w-full items-center justify-center overflow-hidden border border-[#D53535] bg-[#222222] p-4 shadow-lg select-none">
            <div className="flex w-full items-center justify-evenly gap-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-48 flex-col gap-4">
                        <ZoomButton label="Zoom in">+</ZoomButton>
                        <ZoomButton label="Zoom out">−</ZoomButton>
                    </div>
                </div>

                <div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-[#444242] bg-[#373737] shadow-[inset_0_12px_22px_rgba(0,0,0,0.2)]">
                    <div className="absolute left-1/2 top-4 -translate-x-1/2">
                        <ArrowIcon direction="up" />
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <ArrowIcon direction="down" />
                    </div>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <ArrowIcon direction="left" />
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <ArrowIcon direction="right" />
                    </div>
                    <button
                        type="button"
                        className="relative z-10 h-[74px] w-[74px] rounded-full border border-[#444242] shadow-[0_10px_18px_rgba(0,0,0,0.28)] transition-transform hover:scale-105"
                        style={{ background: 'linear-gradient(180deg, #181818 0%, #3A3A3A 100%)' }}
                        aria-label="Camera joystick"
                    />
                </div>
            </div>
        </div>
    );
}
