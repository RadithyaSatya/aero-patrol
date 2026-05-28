import React, { useEffect, useState } from 'react';
import {
    formatFlightDuration,
    formatMissionDistance,
    getEstimatedMissionDurationSeconds,
    getMissionProfileLengthMeters,
} from '../utils/missionMetrics';

const panelStroke = '#D53535';
const dividerStroke = 'linear-gradient(90deg, rgba(163,88,88,0.12) 0%, #A35858 50%, rgba(163,88,88,0.12) 100%)';

const defaultWaypointValues = {
    altitude: 25,
    cameraTilt: 20,
    action: 'video_record',
    action_duration: 10,
};

const actionOptions = [
    { value: 'take_picture', label: 'Take Picture' },
    { value: 'video_record', label: 'Record Video' },
];

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
    onTakeoffAltitudeChange,
    onTakeoffHoldDurationChange,
    onUpdateWaypoint,
    onDeleteWaypoint,
}) {
    const [draftValues, setDraftValues] = useState({});
    const [takeoffAltitudeDraft, setTakeoffAltitudeDraft] = useState(String(takeoffAltitude ?? 0));
    const [takeoffHoldDurationDraft, setTakeoffHoldDurationDraft] = useState(String(takeoffHoldDuration ?? 0));
    const batteryPercent = selectedDrone?.status?.battery_percent;
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
        <div className="font-tomorrow relative grid h-full w-full min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] overflow-hidden border bg-[#222222] p-5 select-none" style={{ borderColor: panelStroke }}>
            {/* Header */}
            <div className="mb-6 flex shrink-0 items-start justify-between">
                <div>
                    <h2 className="text-white text-[18px] font-medium tracking-wide">Waypoint Selection</h2>
                    <p className="text-gray-400 text-[11px] mt-1">Mission length: {formatMissionDistance(missionLengthMeters)}</p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-3.5 border-[1.5px] border-gray-400 rounded-[2px] p-[1.5px] relative flex">
                            <div
                                className="h-full rounded-[1px]"
                                style={{
                                    width: batteryPercent != null ? `${Math.max(0, Math.min(100, batteryPercent))}%` : '0%',
                                    backgroundColor: batteryPercent >= 60 ? '#1ab394' : batteryPercent >= 30 ? '#f0ad4e' : '#ea580c',
                                }}
                            ></div>
                        </div>
                        <span className="text-white text-sm font-medium tracking-wider">{batteryPercent != null ? `${batteryPercent}%` : '--'}</span>
                    </div>
                    <span className="text-gray-400 text-[10px] mt-1">Estimated Mission Time: {formatFlightDuration(estimatedFlightDurationSeconds)}</span>
                </div>
            </div>

            <div className="mb-4 h-px w-full shrink-0" style={{ backgroundImage: dividerStroke }} />

            {/* Global Takeoff Altitude Settings */}
            <div className="mb-4 shrink-0 grid grid-cols-2 gap-3">
                <div>
                    <label className="mb-1 block text-[10px] tracking-wide text-gray-400 uppercase">Takeoff Altitude</label>
                    <div className="flex h-[32px] w-full items-center justify-between border border-[#333333] bg-[#1C1C1C] px-3">
                        <input
                            type="number"
                            className="w-full bg-transparent text-xs text-white outline-none"
                            value={takeoffAltitudeDraft}
                            onChange={(e) => handleTakeoffAltitudeDraftChange(e.target.value)}
                            onFocus={handleNumericFocus}
                            onClick={handleNumericClick}
                        />
                    </div>
                </div>
                <div>
                    <label className="mb-1 block text-[10px] tracking-wide text-gray-400 uppercase">Takeoff Hold (S)</label>
                    <div className="flex h-[32px] w-full items-center justify-between border border-[#333333] bg-[#1C1C1C] px-3">
                        <input
                            type="number"
                            min="0"
                            className="w-full bg-transparent text-xs text-white outline-none"
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
                    <p className="text-gray-500 text-xs italic text-center mt-10">Click on the map to add waypoints</p>
                ) : (
                    waypoints.map((wp, i) => {
                        const data = {
                            ...defaultWaypointValues,
                            ...wp,
                        };
                        return (
                            <div key={wp.id} className="bg-[#222222] border p-3 relative" style={{ borderColor: panelStroke }}>
                                <button
                                    type="button"
                                    onClick={() => onDeleteWaypoint?.(wp.id)}
                                    className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center transition hover:opacity-80"
                                    aria-label={`Delete Point ${i + 1}`}
                                >
                                    <img
                                        src="/src/assets/images/icon_trash_mission.svg"
                                        alt=""
                                        aria-hidden="true"
                                        className="h-4 w-4 object-contain"
                                    />
                                </button>
                                <h3 className="text-white text-xs font-medium mb-3 tracking-wide">Point {i + 1}</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-400 text-[9px] uppercase">Altitude (M)</span>
                                        <div className="h-[28px] bg-[#1C1C1C] border border-[#333333] px-2 flex items-center">
                                            <input
                                                type="number"
                                                className="bg-transparent text-white text-[11px] outline-none w-full"
                                                value={getFieldValue(wp.id, 'altitude', data.altitude)}
                                                onChange={(e) => handleDraftChange(wp.id, 'altitude', e.target.value)}
                                                onBlur={() => handleDraftBlur(wp.id, 'altitude', data.altitude)}
                                                onFocus={handleNumericFocus}
                                                onClick={handleNumericClick}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-400 text-[9px] uppercase">Camera Tilt</span>
                                        <div className="h-[28px] bg-[#1C1C1C] border border-[#333333] px-2 flex items-center">
                                            <input
                                                type="number"
                                                className="bg-transparent text-white text-[11px] outline-none w-full"
                                                value={getFieldValue(wp.id, 'cameraTilt', data.cameraTilt)}
                                                onChange={(e) => handleDraftChange(wp.id, 'cameraTilt', e.target.value)}
                                                onBlur={() => handleDraftBlur(wp.id, 'cameraTilt', data.cameraTilt)}
                                                onFocus={handleNumericFocus}
                                                onClick={handleNumericClick}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-400 text-[9px] uppercase">Action</span>
                                        <div className="flex flex-col gap-2">
                                            <div className="relative h-[28px] bg-[#1C1C1C] border border-[#333333] px-2 flex items-center">
                                                <select
                                                    className="bg-transparent text-white text-[11px] outline-none w-full appearance-none cursor-pointer"
                                                    value={data.action}
                                                    onChange={(e) => handleActionChange(wp.id, e.target.value)}
                                                >
                                                    {actionOptions.map((option) => (
                                                        <option key={option.value} value={option.value} className="bg-[#222222]">
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 pointer-events-none absolute right-4">
                                                    <path d="M6 9l6 6 6-6" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-gray-400 text-[9px] uppercase">Hold (S)</span>
                                                <div className="h-[28px] bg-[#1C1C1C] border border-[#333333] px-2 flex items-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="bg-transparent text-white text-[11px] outline-none w-full"
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
