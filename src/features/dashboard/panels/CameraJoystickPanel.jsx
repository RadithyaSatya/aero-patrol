import React, { useMemo, useState } from 'react';

function ArrowIcon({ direction, active = false }) {
    const rotationByDirection = {
        up: '180deg',
        right: '-90deg',
        down: '0deg',
        left: '90deg'
    };

    return (
        <span
            aria-hidden="true"
            className="flex h-4.5 w-4.5 items-center justify-center"
            style={{ transform: `rotate(${rotationByDirection[direction]})` }}
        >
            <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
                <polyline
                    points="5 8 12 16 19 8"
                    stroke={active ? '#FC4747' : '#7B7B7B'}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );
}

function ZoomButton({ children, label, active = false, onPressStart, onPressEnd }) {
    return (
        <button
            type="button"
            aria-label={label}
            onPointerDown={onPressStart}
            onPointerUp={onPressEnd}
            onPointerLeave={onPressEnd}
            onPointerCancel={onPressEnd}
            className={`relative flex h-full w-[96px] flex-1 items-center justify-center overflow-hidden text-[34px] font-medium text-white transition-all ${
                active ? 'bg-[#3A1A1A] text-[#FC4747]' : 'bg-[#2A2A2A] hover:bg-[#323232]'
            }`}
        >
            <span className="pointer-events-none absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
            <span className="pointer-events-none absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
            <span className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[#ED0000]" />
            <span className="relative z-10 leading-none">{children}</span>
        </button>
    );
}

function DirectionButton({ direction, active = false, iconClassName = '', style, onPressStart, onPressEnd }) {
    return (
        <button
            type="button"
            aria-label={`Move camera ${direction}`}
            onPointerDown={onPressStart}
            onPointerUp={onPressEnd}
            onPointerLeave={onPressEnd}
            onPointerCancel={onPressEnd}
            className={`absolute inset-0 transition-all ${
                active
                    ? 'bg-[#351818]/90'
                    : 'bg-transparent hover:bg-white/5'
            }`}
            style={{ ...style, zIndex: 1 }}
        >
            <span className={`absolute ${iconClassName}`}>
                <ArrowIcon direction={direction} active={active} />
            </span>
        </button>
    );
}

export default function CameraJoystickPanel() {
    const [activeDirection, setActiveDirection] = useState(null);
    const [activeZoom, setActiveZoom] = useState(null);

    const knobOffset = useMemo(() => {
        const offsetByDirection = {
            up: 'translate(-50%, calc(-50% - 12px))',
            down: 'translate(-50%, calc(-50% + 12px))',
            left: 'translate(calc(-50% - 12px), -50%)',
            right: 'translate(calc(-50% + 12px), -50%)'
        };

        return offsetByDirection[activeDirection] || 'translate(-50%, -50%)';
    }, [activeDirection]);

    return (
        <div className="font-tomorrow flex h-full w-full items-center justify-center overflow-hidden border border-[#D53535] bg-[#222222] p-4 shadow-lg select-none">
            <div className="flex w-full items-center justify-evenly gap-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-48 flex-col gap-4">
                        <ZoomButton
                            label="Zoom in"
                            active={activeZoom === 'in'}
                            onPressStart={() => setActiveZoom('in')}
                            onPressEnd={() => setActiveZoom(null)}
                        >
                            +
                        </ZoomButton>
                        <ZoomButton
                            label="Zoom out"
                            active={activeZoom === 'out'}
                            onPressStart={() => setActiveZoom('out')}
                            onPressEnd={() => setActiveZoom(null)}
                        >
                            −
                        </ZoomButton>
                    </div>
                </div>

                <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-full border border-[#444242] bg-[#373737] shadow-[inset_0_12px_22px_rgba(0,0,0,0.2)]">
                    <DirectionButton
                        direction="up"
                        active={activeDirection === 'up'}
                        iconClassName="left-1/2 top-5 -translate-x-1/2"
                        style={{ clipPath: 'polygon(50% 50%, 0% 0%, 100% 0%)' }}
                        onPressStart={() => setActiveDirection('up')}
                        onPressEnd={() => setActiveDirection(null)}
                    />
                    <DirectionButton
                        direction="down"
                        active={activeDirection === 'down'}
                        iconClassName="bottom-5 left-1/2 -translate-x-1/2"
                        style={{ clipPath: 'polygon(50% 50%, 0% 100%, 100% 100%)' }}
                        onPressStart={() => setActiveDirection('down')}
                        onPressEnd={() => setActiveDirection(null)}
                    />
                    <DirectionButton
                        direction="left"
                        active={activeDirection === 'left'}
                        iconClassName="left-5 top-1/2 -translate-y-1/2"
                        style={{ clipPath: 'polygon(50% 50%, 0% 0%, 0% 100%)' }}
                        onPressStart={() => setActiveDirection('left')}
                        onPressEnd={() => setActiveDirection(null)}
                    />
                    <DirectionButton
                        direction="right"
                        active={activeDirection === 'right'}
                        iconClassName="right-5 top-1/2 -translate-y-1/2"
                        style={{ clipPath: 'polygon(50% 50%, 100% 0%, 100% 100%)' }}
                        onPressStart={() => setActiveDirection('right')}
                        onPressEnd={() => setActiveDirection(null)}
                    />
                    <div
                        className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[74px] w-[74px] rounded-full border shadow-[0_10px_18px_rgba(0,0,0,0.28)] transition-transform duration-150"
                        style={{
                            transform: knobOffset,
                            borderColor: activeDirection ? '#FC4747' : '#444242',
                            background: activeDirection
                                ? 'linear-gradient(180deg, #2B0F0F 0%, #4A2424 100%)'
                                : 'linear-gradient(180deg, #181818 0%, #3A3A3A 100%)'
                        }}
                        aria-hidden="true"
                    />
                </div>
            </div>
        </div>
    );
}
