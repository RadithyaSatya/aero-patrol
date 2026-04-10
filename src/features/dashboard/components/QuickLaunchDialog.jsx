import React, { useState } from 'react';

// Icons for the Mission Types
const LaunchIcon = () => (
    <img src="/src/assets/icon_launch.png" alt="Launch" width="64" height="64" />
);

const ROIIcon = () => (
    <img src="/src/assets/icon_roi.png" alt="ROI" width="64" height="64" />
);

const SpiralIcon = () => (
    <img src="/src/assets/icon_spiral.png" alt="Spiral" width="64" height="64" />
);


export default function QuickLaunchDialog({ isOpen, onClose, onConfirm }) {
    const [selectedType, setSelectedType] = useState('ROI');

    if (!isOpen) return null;

    const missionTypes = [
        { id: 'Launch', label: 'Launch', icon: <LaunchIcon /> },
        { id: 'ROI', label: 'ROI', icon: <ROIIcon /> },
        { id: 'Spiral', label: 'Spiral', icon: <SpiralIcon /> },
    ];

    return (
        <div className="font-tomorrow fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#0a0f18]/80 backdrop-blur-sm">
            <div className="relative flex w-[780px] flex-col overflow-hidden border-l border-[#5E0A0A] bg-[#222222] p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md">
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />

                {/* Header */}
                <h2 className="text-center text-white text-[18px] tracking-widest font-light mb-8">
                    Select Mission Type
                </h2>

                {/* Mission Type Selection Grid */}
                <div className="flex justify-center gap-6 mb-10">
                    {missionTypes.map((type) => {
                        const isSelected = selectedType === type.id;
                        return (
                            <div
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`
                                    relative flex h-[140px] w-[160px] cursor-pointer flex-col items-center justify-center overflow-hidden transition-all
                                    ${isSelected
                                        ? 'bg-[#1b2029]/40 text-white'
                                        : 'bg-[#1e2532]/50 border-[#374151] hover:border-gray-400 hover:bg-[#252b36]/80 text-gray-400'
                                    }
                                `}
                            >
                                {isSelected && (
                                    <>
                                        <div className="pointer-events-none absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#ED0000]/35 to-transparent" />
                                        <div className="pointer-events-none absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#ED0000]/35 to-transparent" />
                                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[#ED0000]" />
                                        <div className="pointer-events-none absolute inset-x-3 bottom-0 h-6 bg-gradient-to-t from-[#ED0000]/12 to-transparent" />
                                    </>
                                )}
                                <div className={`transition-transform duration-300 ${isSelected ? 'scale-110' : 'scale-100 opacity-70'}`}>
                                    {type.icon}
                                </div>
                                <span className={`text-[16px] font-medium tracking-wider ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                    {type.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Actions */}
                <div className="mt-auto grid grid-cols-2 gap-6">
                    <button
                        onClick={onClose}
                        className="w-full bg-transparent active:scale-[0.98]"
                    >
                        <img
                            src="/src/assets/images/btn_cancel_quicklaunch.png"
                            alt="Cancel"
                            className="aspect-[418/76] w-full object-contain transition duration-150 hover:brightness-110 hover:contrast-110"
                        />
                    </button>
                    <button
                        onClick={() => onConfirm(selectedType)}
                        className="w-full bg-transparent active:scale-[0.98]"
                    >
                        <img
                            src="/src/assets/images/btn_launch_quicklaunch.png"
                            alt="Set Mission"
                            className="aspect-[418/76] w-full object-contain transition duration-150 hover:brightness-110 hover:contrast-110"
                        />
                    </button>
                </div>

            </div>
        </div>
    );
}
