import React from 'react';
import launchButtonImage from '../../../assets/images/btn_launch.png';

export default function StreamButtonPanel({
    label = 'Quick Launch',
    onClick,
    isActive = false
}) {
    return (
        <button
            type="button"
            className="font-tomorrow flex h-full w-full flex-col items-center justify-center gap-2.5 border border-[#FF383C] px-4 py-5 transition-colors active:scale-[0.98]"
            style={{ background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }}
            onClick={onClick}
        >
            <div className="flex h-[190px] w-full items-center justify-center">
                <img src={launchButtonImage} alt={label} className="h-[190px] w-full max-w-[235px] object-contain" />
            </div>
            <h2 className="text-[28px] font-medium tracking-[0.06em] text-[#E65858]">
                {label}
            </h2>
        </button>
    );
}
