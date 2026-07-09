import React from 'react';
import storageIcon from '../../../assets/images/icon_storage.svg';
import recordIcon from '../../../assets/images/icon_record.svg';
import captureIcon from '../../../assets/images/icon_capture.svg';
import buttonBorderGreySmall from '../../../assets/images/btn_border_grey_small.svg';
import buttonBorderGrey from '../../../assets/images/btn_border_grey.svg';
import buttonBorderGreyLong from '../../../assets/images/btn_border_grey_long.svg';
import buttonBorderGreyVeryLong from '../../../assets/images/btn_border_grey_very_long.svg';
import switchIcon from '../../../assets/images/icon_switch.svg';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const PANEL_BACKGROUND = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const LIGHT_PANEL_BACKGROUND = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const ACTION_WRAPPER_BORDER_IMAGE = 'linear-gradient(180.75deg, rgba(253, 87, 87, 0.4) 39.34%, #FD5757 69.94%, #FC4747 102.16%)';
const ACTION_BUTTON_BORDER_IMAGE = 'linear-gradient(180.75deg, #FD5757 69.94%, #FC4747 102.16%)';
const SWITCH_PANEL_BORDER_IMAGE = 'linear-gradient(179.72deg, rgba(251, 85, 85, 0) 0.24%, #EA3535 112.6%)';
const BOTTOM_PANEL_BORDER = 'linear-gradient(0deg, #ED0000 0%, #FB5555 51.28%, rgba(251, 85, 85, 0) 100%)';

const StorageCard = ({ value, label, isIndonesian = false }) => (
    <div
        className="h-full overflow-hidden rounded-[12px] p-[0.68px]"
        style={{ backgroundImage: ACTION_WRAPPER_BORDER_IMAGE }}
    >
        <div
            className="flex h-full items-center justify-between rounded-[11.32px] px-3 py-2"
            style={{ background: LIGHT_PANEL_BACKGROUND }}
        >
            <div className="flex min-w-0 items-center gap-2">
                <img
                    src={storageIcon}
                    alt=""
                    aria-hidden="true"
                    className="h-6 w-6 shrink-0 object-contain"
                />
                <span className={`truncate font-medium text-[#1F1F1F] ${isIndonesian ? 'text-[14px] tracking-[0.04em]' : 'text-[14px] tracking-wide'}`}>{label}</span>
            </div>
            <span className="ml-3 shrink-0 text-[16px] font-medium tracking-wide text-[#1F1F1F]">{value}</span>
        </div>
    </div>
);

export default function FlightStreamControlPanel({
    secondaryPanel,
    onSwitchPanel,
    compact = false,
    onAbortMission = null,
    isAbortDisabled = false,
    isAbortingMission = false,
    abortMissionError = '',
    onTakePicture = null,
    onStartRecording = null,
    isCaptureDisabled = false,
    isRecordDisabled = false,
    cameraCommandError = '',
}) {
    const { t, language } = useI18n();
    const isIndonesian = language === 'id';
    const actionLabelClassName = isIndonesian
        ? 'text-[13px] tracking-[0.08em]'
        : 'text-[16px] tracking-[0.16em]';
    const outerGapClassName = compact ? 'gap-4' : 'gap-5';
    const panelPaddingClassName = compact ? 'p-2.5' : 'p-3';
    const rightColumnClassName = 'grid-rows-[repeat(3,minmax(0,1fr))]';
    const rightColumnGapClassName = compact ? 'gap-2.5' : 'gap-3';
    const panelColumns = compact
        ? 'minmax(220px, 0.72fr) minmax(280px, 1.28fr)'
        : 'minmax(280px, 0.9fr) minmax(0, 1.1fr)';
    const switchButtonClassName = compact
        ? 'absolute bottom-2.5 left-2.5 z-[550] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-black/50 transition-colors hover:bg-black/65'
        : 'absolute bottom-3 left-3 z-[550] flex h-[40px] w-[40px] items-center justify-center rounded-full bg-black/50 transition-colors hover:bg-black/65';
    const abortLabelClassName = compact
        ? 'absolute inset-[5px] flex items-center justify-center px-7 py-2 text-center text-[14px] font-medium tracking-[0.05em] text-[#DA0000]'
        : 'absolute inset-[6px] flex items-center justify-center px-8 py-2.5 text-center text-[15px] font-medium tracking-[0.06em] text-[#DA0000]';

    return (
        <div className="font-inter relative h-full w-full overflow-hidden rounded-[30px] p-px select-none" style={{ backgroundImage: BOTTOM_PANEL_BORDER }}>
            <div
                className={`grid h-full overflow-hidden rounded-[29px] ${outerGapClassName} ${panelPaddingClassName}`}
                style={{
                    background: PANEL_BACKGROUND,
                    gridTemplateColumns: panelColumns,
                }}
            >
                <div className={`flex min-w-0 flex-col gap-2 ${compact ? 'p-1.5' : 'p-2'}`}>
                    <div
                        className="relative flex-1 overflow-hidden rounded-[12px] p-px"
                        style={{ backgroundImage: SWITCH_PANEL_BORDER_IMAGE }}
                    >
                        <div className="h-full w-full overflow-hidden rounded-[12px] bg-transparent">
                            {secondaryPanel}
                        </div>

                        <button
                            type="button"
                            onClick={onSwitchPanel}
                            aria-label={t('dashboard.switchPanels')}
                            className={switchButtonClassName}
                        >
                            <img
                                src={switchIcon}
                                alt=""
                                aria-hidden="true"
                                className="h-[17px] w-[14px] object-contain"
                            />
                        </button>
                    </div>
                </div>

                <div className={`grid min-w-0 ${rightColumnClassName} ${rightColumnGapClassName}`}>
                    <div
                        className="min-h-0 overflow-hidden rounded-[12px] p-[0.68px]"
                        style={{ backgroundImage: ACTION_WRAPPER_BORDER_IMAGE }}
                    >
                        <div className="grid h-full grid-cols-2 gap-2 rounded-[11.32px] p-1.5" style={{ background: LIGHT_PANEL_BACKGROUND }}>
                            <div className="h-full overflow-hidden rounded-[12px] p-[0.68px]" style={{ backgroundImage: ACTION_BUTTON_BORDER_IMAGE }}>
                                <button
                                    type="button"
                                    onClick={onStartRecording}
                                    disabled={isRecordDisabled}
                                    className={`flex h-full min-h-full w-full items-center justify-center gap-3 rounded-[11.32px] transition-[filter,opacity] ${
                                        isRecordDisabled ? 'cursor-not-allowed' : 'hover:brightness-[0.98]'
                                    }`}
                                    style={{ background: LIGHT_PANEL_BACKGROUND }}
                                >
                                    <img
                                        src={recordIcon}
                                        alt={t('dashboard.record')}
                                        className={`h-7 w-7 object-contain ${isRecordDisabled ? 'opacity-60' : ''}`}
                                    />
                                    <span className={`${actionLabelClassName} font-medium ${isRecordDisabled ? 'text-[#7B7B7B]' : 'text-[#000000]'}`}>{t('dashboard.record')}</span>
                                </button>
                            </div>
                            <div className="h-full overflow-hidden rounded-[12px] p-[0.68px]" style={{ backgroundImage: ACTION_BUTTON_BORDER_IMAGE }}>
                                <button
                                    type="button"
                                    onClick={onTakePicture}
                                    disabled={isCaptureDisabled}
                                    className={`flex h-full min-h-full w-full items-center justify-center gap-3 rounded-[11.32px] transition-[filter,opacity] ${
                                        isCaptureDisabled ? 'cursor-not-allowed' : 'hover:brightness-[0.98]'
                                    }`}
                                    style={{ background: LIGHT_PANEL_BACKGROUND }}
                                >
                                    <img
                                        src={captureIcon}
                                        alt={t('dashboard.capture')}
                                        className={`h-8 w-8 object-contain ${isCaptureDisabled ? 'opacity-60' : ''}`}
                                    />
                                    <span className={`${actionLabelClassName} font-medium ${isCaptureDisabled ? 'text-[#7B7B7B]' : 'text-[#000000]'}`}>{t('dashboard.capture')}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-0">
                        <StorageCard value="140/100GB" label={t('dashboard.storageCapacity')} isIndonesian={isIndonesian} />
                    </div>

                    <div className="min-h-0 h-full">
                        <button
                            type="button"
                            onClick={onAbortMission}
                            disabled={isAbortDisabled || isAbortingMission}
                            className={`relative h-full w-full items-center justify-center overflow-hidden px-0 py-0 transition-transform ${
                                isAbortDisabled || isAbortingMission
                                    ? 'cursor-not-allowed opacity-60'
                                    : 'hover:scale-[1.01] active:scale-[0.99]'
                            }`}
                        >
                            <picture className="absolute inset-0">
                                <source media="(min-width: 1920px)" srcSet={buttonBorderGreyVeryLong} />
                                <source media="(min-width: 1680px)" srcSet={buttonBorderGreyLong} />
                                <source media="(min-width: 1470px)" srcSet={buttonBorderGrey} />
                                <img
                                    src={buttonBorderGreySmall}
                                    alt=""
                                    aria-hidden="true"
                                    className="h-full w-full object-fill"
                                />
                            </picture>
                            <span className={abortLabelClassName}>
                                {isAbortingMission ? t('dashboard.abortingMission') : t('dashboard.abortMission')}
                            </span>
                        </button>
                    </div>
                    {abortMissionError ? (
                        <p className="text-[11px] tracking-wide text-[#7A0A0C]">{abortMissionError}</p>
                    ) : null}
                    {cameraCommandError ? (
                        <p className="text-[11px] tracking-wide text-[#7A0A0C]">{cameraCommandError}</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
