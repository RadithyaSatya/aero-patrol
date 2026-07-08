import React, { useEffect } from 'react';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const modalStroke = '#FF383C';
const actionStroke = '#ED0000';
const modalBackground = 'linear-gradient(180deg, #F7F7F7 0%, #ECECEC 100%)';
const cancelBackground = 'linear-gradient(180deg, #FFFFFF 0%, #F3F3F3 100%)';
const confirmBackground = 'linear-gradient(180deg, #FFFFFF 0%, #ECECEC 100%)';
const dividerGradient = 'linear-gradient(90deg, rgba(253,87,87,0.05) 0%, rgba(253,87,87,0.5) 50%, rgba(253,87,87,0.05) 100%)';

export default function DeleteMissionModal({
    isOpen,
    missionName,
    errorMsg,
    isSubmitting,
    onClose,
    onConfirm
}) {
    const { t } = useI18n();
    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="font-inter fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[2px]"
            onClick={() => {
                if (!isSubmitting) onClose();
            }}
        >
            <div
                className="relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] border shadow-[0_28px_70px_rgba(0,0,0,0.58)]"
                style={{ borderColor: modalStroke, background: modalBackground }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />

                <div className="px-6 py-6 sm:px-7 sm:py-7">
                    <div className="mb-5">
                        <h2 className="text-[20px] font-medium uppercase tracking-[0.18em] text-[#000000]">{t('missions.deleteMission')}</h2>
                    </div>

                    <p className="text-[13px] leading-6 text-[#454545]">
                        {t('missions.deleteMissionPrompt').replace('{name}', missionName || t('missions.thisMission'))}
                    </p>

                    {errorMsg ? (
                        <div
                            className="mt-5 rounded-[20px] border px-4 py-3 text-[12px] text-[#B42323]"
                            style={{ borderColor: '#D79C9C', backgroundColor: '#F9EAEA' }}
                        >
                            {errorMsg}
                        </div>
                    ) : null}

                    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="h-[46px] min-w-[140px] rounded-[14px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[#4A4A4A] shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition duration-200 hover:-translate-y-[1px] hover:brightness-[0.99] hover:shadow-[0_12px_22px_rgba(0,0,0,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ borderColor: '#D7D7D7', background: cancelBackground }}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className="h-[46px] min-w-[160px] rounded-[14px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[#B42323] shadow-[0_8px_18px_rgba(180,35,35,0.10)] transition duration-200 hover:-translate-y-[1px] hover:brightness-[0.98] hover:shadow-[0_12px_24px_rgba(180,35,35,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ borderColor: actionStroke, background: confirmBackground }}
                        >
                            {isSubmitting ? t('missions.deleting') : t('missions.deleteMission')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
