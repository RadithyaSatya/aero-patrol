import React from 'react';
import launchButtonImage from '../../../assets/images/image_launch.svg';
import { useI18n } from '../../../shared/i18n/I18nProvider';

export default function StreamButtonPanel({
    label,
    onClick,
    isActive = false
}) {
    const { t } = useI18n();
    const resolvedLabel = label || t('dashboard.quickLaunch');

    return (
        <button
            type="button"
            className="font-inter flex h-full w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[30px] border border-[#FF383C] px-4 py-5 transition-colors active:scale-[0.98]"
            style={{ background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }}
            onClick={onClick}
        >
            <div className="flex h-[190px] w-full items-center justify-center">
                <img src={launchButtonImage} alt={resolvedLabel} className="h-[190px] w-full max-w-[235px] object-contain" />
            </div>
            <h2 className="text-[24px] font-medium tracking-[0.06em] text-[#E65858]">
                {resolvedLabel}
            </h2>
        </button>
    );
}
