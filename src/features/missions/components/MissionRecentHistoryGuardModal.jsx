import React, { useEffect } from 'react';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const modalStroke = '#FDB25780';
const actionStroke = '#FBB2557A';
const modalBackground = '#222222';
const dividerGradient = 'linear-gradient(90deg, rgba(253,178,87,0.05) 0%, rgba(253,178,87,0.5) 50%, rgba(253,178,87,0.05) 100%)';

const formatDateTime = (value, timeZone = 'Asia/Jakarta') => {
    if (!value) return '-';

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
    }).format(parsedDate);
};

export default function MissionRecentHistoryGuardModal({
    isOpen,
    guardData,
    isSubmitting = false,
    onClose,
    onConfirm,
}) {
    const { t } = useI18n();
    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !isSubmitting) {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen || !guardData) return null;

    const timeZone = guardData.schedule_timezone || 'Asia/Jakarta';
    const recentHistory = guardData.recent_history || null;
    const detailRows = [
        { label: t('conflict.minimumGap'), value: guardData.minimum_gap_minutes != null ? `${guardData.minimum_gap_minutes} minutes` : null },
        { label: t('conflict.lastMission'), value: recentHistory?.mission_name || null },
        { label: t('conflict.lastActivity'), value: recentHistory?.last_activity_at ? formatDateTime(recentHistory.last_activity_at, timeZone) : null },
        { label: t('conflict.availableAt'), value: recentHistory?.available_at ? formatDateTime(recentHistory.available_at, timeZone) : null },
    ].filter((item) => item.value);

    return (
        <div
            className="font-tomorrow fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[2px]"
            onClick={() => {
                if (!isSubmitting) {
                    onClose?.();
                }
            }}
        >
            <div
                className="relative flex w-full max-w-[680px] flex-col overflow-hidden border shadow-[0_28px_70px_rgba(0,0,0,0.58)]"
                style={{ borderColor: modalStroke, backgroundColor: modalBackground }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />

                <div className="px-6 py-6 sm:px-7 sm:py-7">
                    <h2 className="text-[20px] font-medium uppercase tracking-[0.18em] text-white">{t('conflict.continueMissionCreation')}</h2>

                    <p className="mt-4 text-[13px] leading-6 text-[#F2E1C6]">
                        {t('conflict.minimumGapNotMet')}
                        <br />
                        {t('conflict.continueCreateAnyway')}
                    </p>

                    {detailRows.length > 0 ? (
                        <div
                            className="mt-5 grid gap-3 border px-4 py-4 text-[12px] leading-6 text-[#FFE6C8] sm:grid-cols-2"
                            style={{ borderColor: actionStroke, backgroundColor: 'rgba(87, 54, 20, 0.28)' }}
                        >
                            {detailRows.map((item) => (
                                <div key={item.label}>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#F7C77A]">{item.label}</div>
                                    <div className="mt-1 text-[13px] text-white">{item.value}</div>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div className="mt-5 border border-[#4A3723] bg-[#271f19] px-4 py-4 text-[12px] leading-6 text-[#F7E7D7]">
                        {recentHistory?.available_at
                            ? t('conflict.availableAgainAfter').replace('{value}', formatDateTime(recentHistory.available_at, timeZone))
                            : t('conflict.stillWithinMinimumGap')}
                    </div>

                    <div className="mt-7 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => onClose?.()}
                            disabled={isSubmitting}
                            className="h-[46px] min-w-[160px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ borderColor: '#5E4B2D', background: 'linear-gradient(135deg, #242424 0%, #343434 100%)' }}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={() => onConfirm?.()}
                            disabled={isSubmitting}
                            className="h-[46px] min-w-[190px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ borderColor: actionStroke, background: 'linear-gradient(135deg, #7A4B16 0%, #A36B25 100%)' }}
                        >
                            {isSubmitting ? t('common.submit') : t('common.continue')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
