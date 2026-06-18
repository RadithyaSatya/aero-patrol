import React, { useState } from 'react';
import launchIcon from '../../../assets/images/icon_launch.svg';
import roiIcon from '../../../assets/images/icon_roi.svg';
import spiralIcon from '../../../assets/images/icon_spiral.svg';
import cancelQuickLaunchButton from '../../../assets/images/btn_cancel_quicklaunch_white.svg';
import launchQuickLaunchButton from '../../../assets/images/btn_launch_quicklaunch_white.svg';

// Icons for the Mission Types
const LaunchIcon = () => (
    <img src={launchIcon} alt="Launch" width="64" height="64" />
);

const ROIIcon = () => (
    <img src={roiIcon} alt="ROI" width="64" height="64" />
);

const SpiralIcon = () => (
    <img src={spiralIcon} alt="Spiral" width="64" height="64" />
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
            <div
                className="relative flex w-[780px] flex-col overflow-hidden border p-8 shadow-[0_0_50px_rgba(0,0,0,0.35)] backdrop-blur-md"
                style={{ borderColor: '#FF383C', background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }}
            >
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#FF383C] via-[#FF383C]/45 to-transparent" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#FF383C] via-[#FF383C]/45 to-transparent" />

                {/* Header */}
                <h2 className="mb-8 text-center text-[18px] font-light tracking-widest text-[#000000]">
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
                                    group relative flex h-[140px] w-[160px] cursor-pointer flex-col items-center justify-center overflow-hidden border transition-all
                                    ${isSelected
                                        ? 'bg-[#F3D9D9] text-[#000000]'
                                        : 'bg-[#EBEBEB] text-[#000000] hover:bg-[#E3E3E3]'
                                    }
                                `}
                                style={{ borderColor: '#FF383C' }}
                            >
                                {isSelected && (
                                    <>
                                        <div className="pointer-events-none absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#FF383C] via-[#FF383C]/35 to-transparent" />
                                        <div className="pointer-events-none absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#FF383C] via-[#FF383C]/35 to-transparent" />
                                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[#FF383C]" />
                                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#FF383C]/12 to-transparent" />
                                    </>
                                )}
                                <div className={`transition-transform duration-300 ${isSelected ? 'scale-110' : 'scale-100 opacity-80'}`}>
                                    {type.icon}
                                </div>
                                <span className={`text-[16px] tracking-wider ${isSelected ? 'text-[#951616]' : 'text-[#000000] group-hover:text-[#951616]'}`}>
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
                            src={cancelQuickLaunchButton}
                            alt="Cancel"
                            className="aspect-[418/76] w-full object-contain transition duration-150 hover:brightness-110 hover:contrast-110"
                        />
                    </button>
                    <button
                        onClick={() => onConfirm(selectedType)}
                        className="w-full bg-transparent active:scale-[0.98]"
                    >
                        <img
                            src={launchQuickLaunchButton}
                            alt="Set Mission"
                            className="aspect-[418/76] w-full object-contain transition duration-150 hover:brightness-110 hover:contrast-110"
                        />
                    </button>
                </div>

            </div>
        </div>
    );
}
