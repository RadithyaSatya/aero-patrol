import React, { useEffect } from 'react';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const modalStroke = '#FF383C';
const actionStroke = '#ED0000';
const modalBackground = 'linear-gradient(180deg, #F7F7F7 0%, #ECECEC 100%)';
const cancelBackground = 'linear-gradient(180deg, #FFFFFF 0%, #F3F3F3 100%)';
const confirmBackground = 'linear-gradient(180deg, #FFFFFF 0%, #ECECEC 100%)';
const dividerGradient = 'linear-gradient(90deg, rgba(253,87,87,0.05) 0%, rgba(253,87,87,0.5) 50%, rgba(253,87,87,0.05) 100%)';

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
            className="font-inter fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[2px]"
            onClick={() => {
                if (!isSubmitting) {
                    onClose?.();
                }
            }}
        >
            <div
                className="relative flex w-full max-w-[680px] flex-col overflow-hidden rounded-[28px] border shadow-[0_28px_70px_rgba(0,0,0,0.58)]"
                style={{ borderColor: modalStroke, background: modalBackground }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />

                <div className="px-6 py-6 sm:px-7 sm:py-7">
                    <h2 className="text-[20px] font-medium uppercase tracking-[0.18em] text-[#000000]">{t('conflict.continueMissionCreation')}</h2>

                    <p className="mt-4 text-[13px] leading-6 text-[#454545]">
                        {t('conflict.minimumGapNotMet')}
                        <br />
                        {t('conflict.continueCreateAnyway')}
                    </p>

                    {detailRows.length > 0 ? (
                        <div
                            className="mt-5 grid gap-3 rounded-[20px] border px-4 py-4 text-[12px] leading-6 text-[#7A4F18] sm:grid-cols-2"
                            style={{ borderColor: '#D59B41', backgroundColor: '#FFF4E4' }}
                        >
                            {detailRows.map((item) => (
                                <div key={item.label}>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#B87917]">{item.label}</div>
                                    <div className="mt-1 text-[13px] text-[#1F1F1F]">{item.value}</div>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div className="mt-5 rounded-[20px] border border-[#D59B41] bg-[#FFF8EF] px-4 py-4 text-[12px] leading-6 text-[#6A4A1C]">
                        {recentHistory?.available_at
                            ? t('conflict.availableAgainAfter').replace('{value}', formatDateTime(recentHistory.available_at, timeZone))
                            : t('conflict.stillWithinMinimumGap')}
                    </div>

                    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => onClose?.()}
                            disabled={isSubmitting}
                            className="h-[46px] min-w-[140px] rounded-[14px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[#4A4A4A] shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition duration-200 hover:-translate-y-[1px] hover:brightness-[0.99] hover:shadow-[0_12px_22px_rgba(0,0,0,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ borderColor: '#D7D7D7', background: cancelBackground }}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={() => onConfirm?.()}
                            disabled={isSubmitting}
                            className="h-[46px] min-w-[160px] rounded-[14px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[#B42323] shadow-[0_8px_18px_rgba(180,35,35,0.10)] transition duration-200 hover:-translate-y-[1px] hover:brightness-[0.98] hover:shadow-[0_12px_24px_rgba(180,35,35,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ borderColor: actionStroke, background: confirmBackground }}
                        >
                            {isSubmitting ? t('common.submit') : t('common.continue')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
