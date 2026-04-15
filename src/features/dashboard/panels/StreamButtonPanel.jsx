import React from 'react';

export default function StreamButtonPanel({
    label = 'Quick Launch',
    onClick,
    isActive = false
}) {
    return (
        <button
            type="button"
            className={`font-tomorrow flex h-full w-full flex-col items-center justify-center gap-4 border px-4 py-5 shadow-lg transition-colors active:scale-[0.98] ${
                isActive
                    ? 'border-[#FD5757] bg-[#222222] hover:bg-[#252b36]'
                    : 'border-[#D53535] bg-[#222222] hover:bg-[#252b36]'
            }`}
            onClick={onClick}
        >
            <img src="/src/assets/images/btn_launch.png" alt={label} className="h-[170px] w-full max-w-[210px] object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]" />
            <h2 className="text-[#FD5757] text-[22px] font-bold tracking-[0.14em] drop-shadow-[0_2px_10px_rgba(234,88,12,0.3)]">
                {label}
            </h2>
        </button>
    );
}
