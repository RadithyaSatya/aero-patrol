import React, { useEffect } from 'react';
import warningIcon from '../../../assets/images/icon_warning.svg';
import launchButtonEn from '../../../assets/images/btn_launch.svg';
import launchButtonId from '../../../assets/images/btn_launch_id.svg';
import cancelButtonEn from '../../../assets/images/btn_cancel.svg';
import cancelButtonId from '../../../assets/images/btn_cancel_id.svg';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const modalBackground = 'linear-gradient(135deg, #F6F6F6 0%, #CAC9C9 100%)';

export default function AbortMissionConfirmModal({
    isOpen,
    isSubmitting = false,
    onClose,
    onConfirm,
}) {
    const { t, language } = useI18n();

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

    if (!isOpen) return null;

    const confirmButtonAsset = language === 'id' ? launchButtonId : launchButtonEn;
    const cancelButtonAsset = language === 'id' ? cancelButtonId : cancelButtonEn;

    return (
        <div
            className="font-inter fixed inset-0 z-[2200] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[2px]"
            onClick={() => {
                if (!isSubmitting) {
                    onClose?.();
                }
            }}
        >
            <div
                className="relative w-full max-w-[920px] overflow-hidden rounded-[38px] border border-[#ED0000] px-6 py-8 shadow-[0_28px_70px_rgba(0,0,0,0.45)] sm:px-10 sm:py-10"
                style={{ background: modalBackground }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center">
                    <img
                        src={warningIcon}
                        alt=""
                        aria-hidden="true"
                        className="h-[64px] w-[64px] object-contain sm:h-[72px] sm:w-[72px]"
                    />

                    <h2 className="mt-10 text-[38px] font-bold tracking-[-0.02em] text-[#D39A00] sm:text-[42px]">
                        {t('dashboard.abortMissionModalTitle')}
                    </h2>

                    <p className="mt-6 max-w-[760px] text-[19px] leading-[1.35] text-[#151515] sm:text-[24px]">
                        {t('dashboard.abortMissionModalDescription')}
                    </p>

                    <div className="mt-14 grid w-full max-w-[720px] gap-5 sm:grid-cols-2 sm:gap-10">
                        <button
                            type="button"
                            onClick={() => onClose?.()}
                            disabled={isSubmitting}
                            className="transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <img
                                src={cancelButtonAsset}
                                alt={t('common.cancel')}
                                className="h-auto w-full object-contain drop-shadow-[8px_10px_10px_rgba(0,0,0,0.18)]"
                            />
                        </button>

                        <button
                            type="button"
                            onClick={() => onConfirm?.()}
                            disabled={isSubmitting}
                            className="transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <img
                                src={confirmButtonAsset}
                                alt={t('dashboard.abortMission')}
                                className="h-auto w-full object-contain drop-shadow-[8px_10px_10px_rgba(0,0,0,0.18)]"
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
