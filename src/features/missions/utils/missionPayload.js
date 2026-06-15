const SCHEDULE_TIMEZONE = 'Asia/Jakarta';
const DEFAULT_MISSION_PRIORITY = 120;
const DEFAULT_MISSION_STATUS = 'Waiting';
const DEFAULT_NOW_OFFSET_MINUTES = (() => {
    const value = Number(import.meta.env.VITE_MISSION_NOW_OFFSET_MINUTES);
    return Number.isFinite(value) && value >= 0 ? value : 2;
})();
const DEFAULT_RECORD_VIDEO_DURATION = 10;
const DEFAULT_TAKEOFF_ALTITUDE = 15;
const JAKARTA_UTC_OFFSET = '+07:00';

const INITIAL_MISSION_FORM_VALUES = {
    missionName: 'Mission1',
    takeoffHoldDuration: '0',
    timeMode: 'recurrent',
    oneTimeDate: '',
    oneTimeStartTime: '',
    recurrentType: 'monthly',
    dailyStartTime: '',
    dailyEndDate: '',
    dailyTimes: [],
    selectedWeekDays: [0],
    weeklyStartTime: '',
    weeklyEndAfterWeeks: '8',
    weeklyTimes: [],
    selectedMonthDates: [],
    monthlyEndAfterMonths: '3',
    monthlyStartTime: '',
    monthlyTimes: [],
};

const timeValuePattern = /^\d{2}:\d{2}$/;

const getTimeZoneDateTimeParts = (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    return formatter.formatToParts(date).reduce((accumulator, part) => {
        if (part.type !== 'literal') {
            accumulator[part.type] = part.value;
        }

        return accumulator;
    }, {});
};

const getDateInTimeZone = (date, timeZone) => {
    const parts = getTimeZoneDateTimeParts(date, timeZone);
    return `${parts.year}-${parts.month}-${parts.day}`;
};

const getTimeInTimeZone = (date, timeZone) => {
    const parts = getTimeZoneDateTimeParts(date, timeZone);
    return `${parts.hour}:${parts.minute}`;
};

const buildJakartaRunAt = (dateValue, timeValue) => `${dateValue}T${timeValue}:00${JAKARTA_UTC_OFFSET}`;

const normalizePositiveInteger = (value, fallbackValue) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 1) {
        return fallbackValue;
    }

    return Math.trunc(numericValue);
};

const normalizeNonNegativeInteger = (value, fallbackValue) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return fallbackValue;
    }

    return Math.trunc(numericValue);
};

const normalizeOptionalNonNegativeInteger = (value) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
        throw new Error('Takeoff hold duration must be 0 or greater.');
    }

    return Math.trunc(numericValue);
};

const normalizeWaypointAngle = (value, fallbackValue = 0) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return fallbackValue;
    }

    return numericValue;
};

const collectUniqueTimes = (...groups) => {
    const uniqueTimes = [];

    groups.flat().forEach((rawValue) => {
        const normalizedValue = String(rawValue ?? '').trim();

        if (!timeValuePattern.test(normalizedValue) || uniqueTimes.includes(normalizedValue)) {
            return;
        }

        uniqueTimes.push(normalizedValue);
    });

    return uniqueTimes;
};

const mapWaypointActionForApi = (value) => (value === 'take_picture' ? 'Take Picture' : 'Record Video');
const mapWeekdayToIso = (value) => Number(value) + 1;

const buildSchedulePayload = (formValues) => {
    if (formValues.timeMode === 'now') {
        const executionDate = new Date(Date.now() + (DEFAULT_NOW_OFFSET_MINUTES * 60 * 1000));
        const startDate = getDateInTimeZone(executionDate, SCHEDULE_TIMEZONE);
        const startTime = getTimeInTimeZone(executionDate, SCHEDULE_TIMEZONE);

        return {
            schedule_type: 'one_time',
            schedule_timezone: SCHEDULE_TIMEZONE,
            schedule_config: {
                run_at: buildJakartaRunAt(startDate, startTime),
            },
        };
    }

    if (formValues.timeMode === 'one_time') {
        if (!formValues.oneTimeDate || !timeValuePattern.test(formValues.oneTimeStartTime)) {
            throw new Error('One-time mission requires a valid date and start time.');
        }

        return {
            schedule_type: 'one_time',
            schedule_timezone: SCHEDULE_TIMEZONE,
            schedule_config: {
                run_at: buildJakartaRunAt(formValues.oneTimeDate, formValues.oneTimeStartTime),
            },
        };
    }

    if (formValues.timeMode !== 'recurrent') {
        throw new Error('Unsupported mission schedule mode.');
    }

    const today = getDateInTimeZone(new Date(), SCHEDULE_TIMEZONE);

    if (formValues.recurrentType === 'daily') {
        const times = collectUniqueTimes(formValues.dailyTimes, formValues.dailyStartTime);

        if (times.length === 0) {
            throw new Error('Daily mission requires at least one execution time.');
        }

        if (!formValues.dailyEndDate) {
            throw new Error('Daily mission requires an end date.');
        }

        if (formValues.dailyEndDate < today) {
            throw new Error('Daily mission end date cannot be before start date.');
        }

        return {
            schedule_type: 'daily',
            schedule_timezone: SCHEDULE_TIMEZONE,
            schedule_config: {
                start_date: today,
                end_date: formValues.dailyEndDate,
                times,
            },
        };
    }

    if (formValues.recurrentType === 'weekly') {
        const times = collectUniqueTimes(formValues.weeklyTimes, formValues.weeklyStartTime);

        if (times.length === 0) {
            throw new Error('Weekly mission requires at least one execution time.');
        }

        if (!Array.isArray(formValues.selectedWeekDays) || formValues.selectedWeekDays.length === 0) {
            throw new Error('Weekly mission requires at least one selected weekday.');
        }

        const weeksToAdd = normalizePositiveInteger(formValues.weeklyEndAfterWeeks, 8);

        return {
            schedule_type: 'weekly',
            schedule_timezone: SCHEDULE_TIMEZONE,
            schedule_config: {
                weeks: weeksToAdd,
                weekdays: [...formValues.selectedWeekDays]
                    .sort((left, right) => left - right)
                    .map(mapWeekdayToIso),
                times,
            },
        };
    }

    if (formValues.recurrentType === 'monthly') {
        const times = collectUniqueTimes(formValues.monthlyTimes, formValues.monthlyStartTime);

        if (times.length === 0) {
            throw new Error('Monthly mission requires at least one execution time.');
        }

        if (!Array.isArray(formValues.selectedMonthDates) || formValues.selectedMonthDates.length === 0) {
            throw new Error('Monthly mission requires at least one selected date.');
        }

        const monthsToAdd = normalizePositiveInteger(formValues.monthlyEndAfterMonths, 3);

        return {
            schedule_type: 'monthly',
            schedule_timezone: SCHEDULE_TIMEZONE,
            schedule_config: {
                months: monthsToAdd,
                month_days: [...formValues.selectedMonthDates].sort((left, right) => left - right),
                times,
            },
        };
    }

    throw new Error('Unsupported recurrent mission schedule.');
};

const buildMissionPayload = ({
    formValues,
    takeoffAltitude,
    roi,
    waypoints,
    confirmRecentHistoryGuard = false,
    conflictResolutions = [],
}) => {
    const missionName = String(formValues.missionName ?? '').trim();
    const normalizedTakeoffAltitude = Number(takeoffAltitude);
    const normalizedTakeoffHoldDuration = normalizeOptionalNonNegativeInteger(formValues.takeoffHoldDuration);
    const rawPriority = String(formValues.priority ?? '').trim();
    const normalizedPriority = rawPriority ? normalizePositiveInteger(rawPriority, DEFAULT_MISSION_PRIORITY) : null;

    if (!missionName) {
        throw new Error('Mission name is required.');
    }

    if (!Number.isFinite(normalizedTakeoffAltitude) || normalizedTakeoffAltitude < 0) {
        throw new Error('Takeoff altitude must be 0 or greater.');
    }

    const payload = {
        mission_name: missionName,
        takeoff_altitude: normalizedTakeoffAltitude,
        ...buildSchedulePayload(formValues),
        status: DEFAULT_MISSION_STATUS,
        confirm_recent_history_guard: Boolean(confirmRecentHistoryGuard),
        conflict_resolutions: Array.isArray(conflictResolutions) ? conflictResolutions : [],
        waypoints: (Array.isArray(waypoints) ? waypoints : []).map((waypoint, index) => {
            const latitude = Number(waypoint.lat);
            const longitude = Number(waypoint.lng);
            const altitude = Number(waypoint.altitude);
            const cameraTilt = normalizeWaypointAngle(waypoint.cameraTilt, 0);
            const isTakePicture = waypoint.action === 'take_picture';

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                throw new Error(`Waypoint ${index + 1} has invalid coordinates.`);
            }

            return {
                sequence_order: index + 1,
                latitude,
                longitude,
                altitude: Number.isFinite(altitude) ? altitude : 25,
                camera_tilt: cameraTilt,
                camera_yaw: 0,
                action: mapWaypointActionForApi(waypoint.action),
                action_duration: isTakePicture
                    ? normalizeNonNegativeInteger(waypoint.action_duration, 0)
                    : normalizePositiveInteger(waypoint.action_duration, DEFAULT_RECORD_VIDEO_DURATION),
            };
        }),
    };

    if (roi !== undefined) {
        if (roi === null) {
            payload.roi = null;
        } else {
            const latitude = Number(roi.lat ?? roi.latitude);
            const longitude = Number(roi.lng ?? roi.longitude);

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                throw new Error('ROI has invalid coordinates.');
            }

            payload.roi = { latitude, longitude };
        }
    }

    if (normalizedTakeoffHoldDuration != null) {
        payload.takeoff_hold_duration = normalizedTakeoffHoldDuration;
    }

    if (normalizedPriority != null) {
        payload.priority = normalizedPriority;
    }

    return payload;
};

export {
    DEFAULT_RECORD_VIDEO_DURATION,
    DEFAULT_TAKEOFF_ALTITUDE,
    INITIAL_MISSION_FORM_VALUES,
    buildMissionPayload,
};
