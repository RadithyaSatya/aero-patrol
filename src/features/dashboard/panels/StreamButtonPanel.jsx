import React from 'react';
import launchButtonImage from '../../../assets/images/image_launch.svg';
import { useI18n } from '../../../shared/i18n/I18nProvider';

function StreamButtonPanel({
    label,
    onClick,
    isActive = false
}) {
    const { t } = useI18n();
    const resolvedLabel = label || t('dashboard.quickLaunch');

    return (
        <button
            type="button"
            className={`font-inter flex h-full w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[30px] border border-[#FF383C] px-4 py-5 transition-[background-color,border-color,box-shadow] duration-300 active:scale-[0.98] ${isActive ? 'shadow-[0_0_0_1px_rgba(255,56,60,0.18)]' : ''}`}
            style={{ background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }}
            onClick={onClick}
        >
            <div className="flex h-[190px] w-full items-center justify-center">
                <img
                    src={launchButtonImage}
                    alt={resolvedLabel}
                    className={`h-[190px] w-full max-w-[235px] object-contain transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-95'}`}
                />
            </div>
            <h2 className="min-h-[32px] text-[24px] font-medium tracking-[0.06em] text-[#E65858] transition-opacity duration-300">
                {resolvedLabel}
            </h2>
        </button>
    );
}

export default React.memo(StreamButtonPanel);
