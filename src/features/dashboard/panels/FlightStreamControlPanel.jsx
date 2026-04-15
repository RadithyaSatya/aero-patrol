import React, { useState } from 'react';

const AI_TOOL_OPTIONS = [
    { id: 'people_counting', label: 'People Counting' },
    { id: 'vehicle_detection', label: 'Vehicle Detection' },
    { id: 'perimeter_alert', label: 'Perimeter Alert' },
    { id: 'object_tracking', label: 'Object Tracking' }
];

const SOLID_STROKE_RED = '#FC4747';

const TAPERED_STROKE_STYLE = {
    backgroundImage: `linear-gradient(to top, ${SOLID_STROKE_RED} 0%, rgba(252,71,71,0.28) 72%, rgba(252,71,71,0.08) 100%)`
};

const EdgeFadePanel = ({
    children,
    className = '',
    withTopStroke = false,
    solidStroke = false,
    taperedStroke = false,
    backgroundClassName = 'bg-[#222222]'
}) => (
    <div className={`relative min-h-0 overflow-hidden ${backgroundClassName} ${className}`}>
        {withTopStroke && (
            <div
                className="pointer-events-none absolute left-0 right-0 top-0 h-px"
                style={{ backgroundColor: solidStroke ? 'rgba(252,71,71,0.18)' : 'rgba(237,0,0,0.35)' }}
            />
        )}
        <div
            className={`pointer-events-none absolute bottom-0 left-0 h-full w-px ${solidStroke || taperedStroke ? '' : 'bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent'}`}
            style={solidStroke ? { backgroundColor: SOLID_STROKE_RED } : taperedStroke ? TAPERED_STROKE_STYLE : undefined}
        />
        <div
            className={`pointer-events-none absolute bottom-0 right-0 h-full w-px ${solidStroke || taperedStroke ? '' : 'bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent'}`}
            style={solidStroke ? { backgroundColor: SOLID_STROKE_RED } : taperedStroke ? TAPERED_STROKE_STYLE : undefined}
        />
        <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
            style={{ backgroundColor: solidStroke ? SOLID_STROKE_RED : '#ED0000' }}
        />
        {children}
    </div>
);

const StorageCard = ({ value }) => (
    <EdgeFadePanel
        withTopStroke
        taperedStroke
        backgroundClassName="bg-[#222222]"
        className="flex h-full items-center justify-between px-2.5 py-1.5"
    >
        <div className="flex min-w-0 items-center gap-2">
            <img
                src="/src/assets/images/icon_storage.svg"
                alt=""
                aria-hidden="true"
                className="h-6 w-6 shrink-0 object-contain"
            />
            <span className="truncate text-[16px] font-medium tracking-wide text-white">Storage Capacity</span>
        </div>
        <span className="ml-3 shrink-0 text-[16px] font-semibold tracking-wide text-white">{value}</span>
    </EdgeFadePanel>
);

export default function FlightStreamControlPanel({ secondaryPanel, onSwitchPanel, switchButtonImage }) {
    const [enabledTools, setEnabledTools] = useState(() => ({
        people_counting: true,
        vehicle_detection: false,
        perimeter_alert: true,
        object_tracking: false
    }));

    const toggleTool = (toolId) => {
        setEnabledTools((current) => ({
            ...current,
            [toolId]: !current[toolId]
        }));
    };

    return (
        <div className="font-tomorrow h-full w-full overflow-hidden border border-[#D53535] bg-[#222222] p-3 shadow-lg select-none">
            <div className="grid h-full grid-cols-[460px_minmax(0,1fr)] gap-5">
                <div className="flex min-w-0 flex-col gap-2">
                    <EdgeFadePanel className="flex-1 p-1">
                        <div className="h-full w-full overflow-hidden border-b border-[#5E0A0A]">
                            {secondaryPanel}
                        </div>

                        <button
                            type="button"
                            onClick={onSwitchPanel}
                            aria-label="Switch map and camera panels"
                            className="absolute bottom-3 left-3 z-[550] h-[40px] w-[40px] transition-transform hover:scale-105"
                        >
                            <img
                                src={switchButtonImage}
                                alt=""
                                aria-hidden="true"
                                className="h-full w-full object-contain"
                            />
                        </button>
                    </EdgeFadePanel>
                </div>

                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] gap-5">
                    <div className="flex min-w-0 flex-col gap-3">
                        <EdgeFadePanel
                            withTopStroke
                            taperedStroke
                            backgroundClassName="bg-[#222222]"
                            className="flex-1 p-1"
                        >
                            <div className="grid h-full grid-cols-2 gap-1">
                                <button
                                    type="button"
                                    className="relative h-full transition-colors hover:bg-[#1B2331]/50"
                                >
                                    <div className="absolute inset-[4px] flex items-center justify-center">
                                        <img
                                            src="/src/assets/images/btn_record_dashboard.png"
                                            alt="Record"
                                            className="w-full h-auto object-contain"
                                        />
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    className="relative h-full transition-colors hover:bg-[#1B2331]/50"
                                >
                                    <div className="absolute inset-[4px] flex items-center justify-center">
                                        <img
                                            src="/src/assets/images/btn_capture_dashboard.png"
                                            alt="Capture"
                                            className="w-full h-auto object-contain"
                                        />
                                    </div>
                                </button>
                            </div>
                        </EdgeFadePanel>

                        <div className="min-h-0 flex-1">
                            <StorageCard value="140/100GB" />
                        </div>

                        <button
                            type="button"
                            className="flex min-h-0 flex-1 w-full items-center justify-center px-0 py-0 transition-transform hover:scale-[1.01] active:scale-[0.99]"
                        >
                            <img
                                src="/src/assets/images/btn_abort_mission_dashboard.png"
                                alt="Abort Mission"
                                className="h-full w-full object-contain"
                            />
                        </button>
                    </div>

                    <div className="flex min-w-0 flex-col border border-[#D53535] bg-[#222222] px-3 py-3">
                        <p className="text-center text-[16px] font-medium tracking-wide text-white">AI Tools</p>

                        <div className="mt-3 flex flex-1 flex-col justify-start gap-2.5">
                            {AI_TOOL_OPTIONS.map((tool) => {
                                const checked = enabledTools[tool.id];
                                return (
                                    <label
                                        key={tool.id}
                                        className="flex cursor-pointer items-center justify-between gap-2 text-[16px] font-medium tracking-wide text-white"
                                    >
                                        <span className="min-w-0 whitespace-normal leading-tight text-left">{tool.label}</span>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleTool(tool.id)}
                                            className="h-3.5 w-3.5 shrink-0 accent-white"
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
