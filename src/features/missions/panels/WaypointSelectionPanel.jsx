import React, { useEffect, useState } from 'react';
import deleteMissionIcon from '../../../assets/images/icon_trash_mission.svg';
import lightningIcon from '../../../assets/images/icon_lightning.svg';
import {
    formatFlightDuration,
    formatMissionDistance,
    getEstimatedMissionDurationSeconds,
    getMissionProfileLengthMeters,
} from '../utils/missionMetrics';
import { useI18n } from '../../../shared/i18n/I18nProvider';
import { resolveTelemetryBattery } from '../../../shared/utils/telemetryBattery';

const panelStroke = '#FF383C';
const dividerStroke = 'linear-gradient(90deg, rgba(163,88,88,0.12) 0%, #A35858 50%, rgba(163,88,88,0.12) 100%)';
const panelBackground = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const cardBackground = panelBackground;
const cardStroke = '#D3D3D3';
const takeoffInputStroke = '#D3D3D3';
const inputFill = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const inputStroke = '#D3D3D3';

const defaultWaypointValues = {
    altitude: 25,
    cameraTilt: 20,
    action: 'video_record',
    action_duration: 10,
};

const HorizontalBatteryIcon = ({
    percent = null,
    fillColor = '#B5B5B5',
    shellColor = '#B5B5B5',
    isCharging = false,
}) => {
    const hasValue = Number.isFinite(Number(percent));
    const normalizedPercent = hasValue ? Math.max(0, Math.min(100, Number(percent))) : 0;
    const fillWidth = Math.max(0, Math.round((normalizedPercent / 100) * 26));

    return (
        <div className="relative h-[22px] w-[44px] shrink-0">
            <div className="absolute right-0 top-1/2 h-[8px] w-[4px] -translate-y-1/2 rounded-r-[2px]" style={{ backgroundColor: shellColor }} />
            <div className="absolute inset-y-0 left-0 right-[3px] rounded-[7px]" style={{ backgroundColor: shellColor }} />
            <div className="absolute inset-y-[3px] left-[3px] right-[7px] rounded-[4px] bg-white" />
            <div className="absolute inset-y-[3px] left-[3px] right-[7px] rounded-[4px] bg-[#C5C5C580]" />
            <div
                className="absolute inset-y-[4px] left-[4px] rounded-[3px] transition-all duration-500"
                style={{
                    width: `${Math.min(30, Math.max(hasValue ? 5 : 11, Math.round((normalizedPercent / 100) * 30)))}px`,
                    backgroundColor: hasValue ? fillColor : '#B5B5B5',
                }}
            />
            {isCharging ? (
                <img
                    src={lightningIcon}
                    alt=""
                    aria-hidden="true"
                    className="absolute left-[20px] top-1/2 z-10 h-[12px] w-[9px] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_0_4px_rgba(0,0,0,0.2)]"
                />
            ) : null}
        </div>
    );
};

const parseNumericInput = (value) => {
    if (value === '') {
        return 0;
    }

    const normalizedValue = String(value).replace(/^(-?)0+(?=\d)/, '$1');
    return Number(normalizedValue);
};

const normalizeNumericInputValue = (value, fallback = '0') => {
    if (value === '') {
        return fallback;
    }

    return String(value).replace(/^(-?)0+(?=\d)/, '$1');
};

const handleNumericFocus = (event) => {
    if (String(event.target.value) === '0') {
        event.target.select();
    }
};

const handleNumericClick = (event) => {
    if (String(event.target.value) === '0') {
        event.target.select();
    }
};

export default function WaypointSelectionPanel({
    waypoints,
    takeoffAltitude,
    takeoffHoldDuration = 0,
    selectedDrone,
    telemetry = null,
    telemetryStatus = null,
    onTakeoffAltitudeChange,
    onTakeoffHoldDurationChange,
    onUpdateWaypoint,
    onDeleteWaypoint,
}) {
    const { t } = useI18n();
    const actionOptions = [
        { value: 'take_picture', label: t('missions.takePicture') },
        { value: 'video_record', label: t('missions.recordVideo') },
    ];
    const [draftValues, setDraftValues] = useState({});
    const [takeoffAltitudeDraft, setTakeoffAltitudeDraft] = useState(String(takeoffAltitude ?? 0));
    const [takeoffHoldDurationDraft, setTakeoffHoldDurationDraft] = useState(String(takeoffHoldDuration ?? 0));
    const batteryState = resolveTelemetryBattery(telemetry, telemetryStatus);
    const batteryPercent = batteryState.percent;
    const isBatteryCharging = batteryState.isCharging === true;
    const batteryVisual = (() => {
        if (batteryPercent == null || !Number.isFinite(Number(batteryPercent))) {
            return {
                fillColor: '#B5B5B5',
                shellColor: '#B5B5B5',
            };
        }

        if (Number(batteryPercent) >= 60) {
            return {
                fillColor: '#74C642',
                shellColor: '#74C6424D',
            };
        }

        if (Number(batteryPercent) >= 30) {
            return {
                fillColor: '#F98543',
                shellColor: '#F985434D',
            };
        }

        return {
            fillColor: '#F94343',
            shellColor: '#F943434D',
        };
    })();
    const homePosition = selectedDrone?.home_latitude != null && selectedDrone?.home_longitude != null
        ? { lat: Number(selectedDrone.home_latitude), lng: Number(selectedDrone.home_longitude) }
        : null;
    const missionLengthMeters = getMissionProfileLengthMeters({
        waypoints,
        homePosition,
    });
    const estimatedFlightDurationSeconds = getEstimatedMissionDurationSeconds({
        missionLengthMeters,
        flightSpeed: selectedDrone?.flight_speed,
        takeoffHoldDuration,
        waypoints,
    });

    const handlePointChange = (id, field, value) => {
        onUpdateWaypoint?.(id, { [field]: value });
    };

    const getDraftKey = (id, field) => `${id}:${field}`;

    const getFieldValue = (id, field, fallbackValue) => {
        const draftKey = getDraftKey(id, field);
        if (draftValues[draftKey] != null) {
            return draftValues[draftKey];
        }

        return String(fallbackValue ?? 0);
    };

    const handleDraftChange = (id, field, rawValue) => {
        const normalizedValue = normalizeNumericInputValue(rawValue);
        const draftKey = getDraftKey(id, field);

        setDraftValues((current) => ({
            ...current,
            [draftKey]: normalizedValue,
        }));
        handlePointChange(id, field, parseNumericInput(normalizedValue));
    };

    const handleDraftBlur = (id, field, fallbackValue) => {
        const normalizedValue = normalizeNumericInputValue(
            draftValues[getDraftKey(id, field)] ?? String(fallbackValue ?? 0)
        );
        const draftKey = getDraftKey(id, field);

        setDraftValues((current) => ({
            ...current,
            [draftKey]: normalizedValue,
        }));
        handlePointChange(id, field, parseNumericInput(normalizedValue));
    };

    const handleActionChange = (id, value) => {
        onUpdateWaypoint?.(id, {
            action: value,
            action_duration: value === 'video_record' ? 10 : 0,
        });
    };

    const handleTakeoffAltitudeDraftChange = (rawValue) => {
        const normalizedValue = normalizeNumericInputValue(rawValue);
        setTakeoffAltitudeDraft(normalizedValue);
        onTakeoffAltitudeChange?.(parseNumericInput(normalizedValue));
    };

    const handleTakeoffHoldDurationDraftChange = (rawValue) => {
        const normalizedValue = normalizeNumericInputValue(rawValue);
        setTakeoffHoldDurationDraft(normalizedValue);
        onTakeoffHoldDurationChange?.(parseNumericInput(normalizedValue));
    };

    useEffect(() => {
        setDraftValues((current) => {
            const nextValues = {};

            waypoints.forEach((waypoint) => {
                const data = {
                    ...defaultWaypointValues,
                    ...waypoint,
                };

                nextValues[getDraftKey(waypoint.id, 'altitude')] = current[getDraftKey(waypoint.id, 'altitude')] ?? String(data.altitude ?? 0);
                nextValues[getDraftKey(waypoint.id, 'cameraTilt')] = current[getDraftKey(waypoint.id, 'cameraTilt')] ?? String(data.cameraTilt ?? 0);
                nextValues[getDraftKey(waypoint.id, 'action_duration')] = current[getDraftKey(waypoint.id, 'action_duration')] ?? String(data.action_duration ?? 0);
            });

            return nextValues;
        });
    }, [waypoints]);

    useEffect(() => {
        setTakeoffAltitudeDraft(String(takeoffAltitude ?? 0));
    }, [takeoffAltitude]);

    useEffect(() => {
        setTakeoffHoldDurationDraft(String(takeoffHoldDuration ?? 0));
    }, [takeoffHoldDuration]);

    return (
        <div
            className="font-inter relative grid h-full w-full min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] overflow-hidden rounded-[30px] border p-5 select-none"
            style={{ borderColor: panelStroke, background: panelBackground }}
        >
            {/* Header */}
            <div className="mb-6 flex shrink-0 items-start justify-between">
                <div>
                    <h2 className="text-[#000000] text-[18px] font-medium tracking-wide">{t('missions.waypointSelection')}</h2>
                    <p className="text-[#565656] text-[11px] mt-1">{t('missions.missionLengthLabel').replace('{value}', formatMissionDistance(missionLengthMeters))}</p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                        <HorizontalBatteryIcon
                            percent={batteryPercent}
                            fillColor={batteryVisual.fillColor}
                            shellColor={batteryVisual.shellColor}
                            isCharging={isBatteryCharging}
                        />
                        <span className="font-inter text-sm font-bold tracking-wider text-[#000000]">{batteryPercent != null ? `${batteryPercent}%` : '--'}</span>
                    </div>
                    <span className="text-[#565656] text-[10px] mt-1">{t('missions.estimatedMissionTime').replace('{value}', formatFlightDuration(estimatedFlightDurationSeconds))}</span>
                </div>
            </div>

            <div className="mb-4 h-px w-full shrink-0" style={{ backgroundImage: dividerStroke }} />

            {/* Global Takeoff Altitude Settings */}
            <div className="mb-4 shrink-0 grid grid-cols-2 gap-3">
                <div>
                    <label className="mb-1 block pl-1 text-[11px] font-medium text-[#000000]">{t('missions.takeoffAltitude')}</label>
                    <div className="flex h-[32px] w-full items-center justify-between border px-3" style={{ borderColor: takeoffInputStroke, background: inputFill }}>
                        <input
                            type="number"
                            className="w-full bg-transparent text-[13px] text-[#000000] outline-none"
                            value={takeoffAltitudeDraft}
                            onChange={(e) => handleTakeoffAltitudeDraftChange(e.target.value)}
                            onFocus={handleNumericFocus}
                            onClick={handleNumericClick}
                        />
                    </div>
                </div>
                <div>
                    <label className="mb-1 block pl-1 text-[11px] font-medium text-[#000000]">{t('missions.takeoffHold')}</label>
                    <div className="flex h-[32px] w-full items-center justify-between border px-3" style={{ borderColor: takeoffInputStroke, background: inputFill }}>
                        <input
                            type="number"
                            min="0"
                            className="w-full bg-transparent text-[13px] text-[#000000] outline-none"
                            value={takeoffHoldDurationDraft}
                            onChange={(e) => handleTakeoffHoldDurationDraftChange(e.target.value)}
                            onFocus={handleNumericFocus}
                            onClick={handleNumericClick}
                        />
                    </div>
                </div>
            </div>

            {/* Waypoints List */}
            <div className="custom-scrollbar min-h-0 overflow-y-auto space-y-4 pr-1 pb-2">
                {waypoints.length === 0 ? (
                    <p className="text-[#565656] text-xs italic text-center mt-10">{t('missions.clickMapToAddWaypoints')}</p>
                ) : (
                    waypoints.map((wp, i) => {
                        const data = {
                            ...defaultWaypointValues,
                            ...wp,
                        };
                        return (
                            <div
                                key={wp.id}
                                className="relative rounded-[20px] border p-3"
                                style={{ borderColor: cardStroke, background: cardBackground }}
                            >
                                <button
                                    type="button"
                                    onClick={() => onDeleteWaypoint?.(wp.id)}
                                    className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center transition hover:opacity-80"
                                    aria-label={`${t('common.delete')} ${t('missions.point')} ${i + 1}`}
                                >
                                    <img
                                        src={deleteMissionIcon}
                                        alt=""
                                        aria-hidden="true"
                                        className="h-4 w-4 object-contain"
                                    />
                                </button>
                                <h3 className="mb-3 text-[13px] font-medium text-[#000000]">{t('missions.point')} {i + 1}</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="pl-1 text-[11px] font-medium text-[#000000]">{t('missions.altitudeMeter')}</span>
                                        <div className="flex h-[40px] items-center rounded-[12px] border px-3" style={{ borderColor: inputStroke, background: inputFill }}>
                                            <input
                                                type="number"
                                                className="w-full bg-transparent text-[13px] text-[#000000] outline-none"
                                                value={getFieldValue(wp.id, 'altitude', data.altitude)}
                                                onChange={(e) => handleDraftChange(wp.id, 'altitude', e.target.value)}
                                                onBlur={() => handleDraftBlur(wp.id, 'altitude', data.altitude)}
                                                onFocus={handleNumericFocus}
                                                onClick={handleNumericClick}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="pl-1 text-[11px] font-medium text-[#000000]">{t('missions.cameraTilt')}</span>
                                        <div className="flex h-[40px] items-center rounded-[12px] border px-3" style={{ borderColor: inputStroke, background: inputFill }}>
                                            <input
                                                type="number"
                                                className="w-full bg-transparent text-[13px] text-[#000000] outline-none"
                                                value={getFieldValue(wp.id, 'cameraTilt', data.cameraTilt)}
                                                onChange={(e) => handleDraftChange(wp.id, 'cameraTilt', e.target.value)}
                                                onBlur={() => handleDraftBlur(wp.id, 'cameraTilt', data.cameraTilt)}
                                                onFocus={handleNumericFocus}
                                                onClick={handleNumericClick}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="pl-1 text-[11px] font-medium text-[#000000]">{t('common.action')}</span>
                                        <div className="flex flex-col gap-2">
                                            <div className="relative flex h-[40px] items-center rounded-[12px] border px-3" style={{ borderColor: inputStroke, background: inputFill }}>
                                                <select
                                                    className="w-full appearance-none cursor-pointer bg-transparent text-[13px] text-[#000000] outline-none"
                                                    value={data.action}
                                                    onChange={(e) => handleActionChange(wp.id, e.target.value)}
                                                >
                                                    {actionOptions.map((option) => (
                                                        <option key={option.value} value={option.value} className="bg-[#F5F5F5] text-[#000000]">
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#565656] pointer-events-none absolute right-4">
                                                    <path d="M6 9l6 6 6-6" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="pl-1 text-[11px] font-medium text-[#000000]">{t('missions.holdSecond')}</span>
                                                <div className="flex h-[40px] items-center rounded-[12px] border px-3" style={{ borderColor: inputStroke, background: inputFill }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="w-full bg-transparent text-[13px] text-[#000000] outline-none"
                                                        value={getFieldValue(wp.id, 'action_duration', data.action_duration)}
                                                        onChange={(e) => handleDraftChange(wp.id, 'action_duration', e.target.value)}
                                                        onBlur={() => handleDraftBlur(wp.id, 'action_duration', data.action_duration)}
                                                        onFocus={handleNumericFocus}
                                                        onClick={handleNumericClick}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
