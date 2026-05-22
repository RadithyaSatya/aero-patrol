export const WEATHER_CODE_MAP = {
    0: { label: 'Clear', iconDay: '☀', iconNight: '☾' },
    1: { label: 'Mostly Clear', iconDay: '🌤', iconNight: '☾' },
    2: { label: 'Partly Cloudy', iconDay: '⛅', iconNight: '☁' },
    3: { label: 'Cloudy', iconDay: '☁', iconNight: '☁' },
    45: { label: 'Fog', iconDay: '🌫', iconNight: '🌫' },
    48: { label: 'Fog', iconDay: '🌫', iconNight: '🌫' },
    51: { label: 'Drizzle', iconDay: '🌦', iconNight: '🌧' },
    53: { label: 'Drizzle', iconDay: '🌦', iconNight: '🌧' },
    55: { label: 'Heavy Drizzle', iconDay: '🌧', iconNight: '🌧' },
    56: { label: 'Freezing Drizzle', iconDay: '🌧', iconNight: '🌧' },
    57: { label: 'Freezing Drizzle', iconDay: '🌧', iconNight: '🌧' },
    61: { label: 'Rain', iconDay: '🌧', iconNight: '🌧' },
    63: { label: 'Rain', iconDay: '🌧', iconNight: '🌧' },
    65: { label: 'Heavy Rain', iconDay: '⛈', iconNight: '⛈' },
    66: { label: 'Freezing Rain', iconDay: '🌧', iconNight: '🌧' },
    67: { label: 'Freezing Rain', iconDay: '🌧', iconNight: '🌧' },
    71: { label: 'Snow', iconDay: '🌨', iconNight: '🌨' },
    73: { label: 'Snow', iconDay: '🌨', iconNight: '🌨' },
    75: { label: 'Heavy Snow', iconDay: '❄', iconNight: '❄' },
    77: { label: 'Snow Grains', iconDay: '🌨', iconNight: '🌨' },
    80: { label: 'Rain Shower', iconDay: '🌦', iconNight: '🌧' },
    81: { label: 'Rain Shower', iconDay: '🌦', iconNight: '🌧' },
    82: { label: 'Heavy Shower', iconDay: '⛈', iconNight: '⛈' },
    85: { label: 'Snow Shower', iconDay: '🌨', iconNight: '🌨' },
    86: { label: 'Snow Shower', iconDay: '🌨', iconNight: '🌨' },
    95: { label: 'Thunderstorm', iconDay: '⛈', iconNight: '⛈' },
    96: { label: 'Storm Hail', iconDay: '⛈', iconNight: '⛈' },
    99: { label: 'Storm Hail', iconDay: '⛈', iconNight: '⛈' },
};

export const getWeatherPresentation = (weatherCode, isDay) => {
    const entry = WEATHER_CODE_MAP[weatherCode] || { label: 'Unknown', iconDay: '☁', iconNight: '☁' };

    return {
        label: entry.label,
        icon: isDay === 0 ? entry.iconNight : entry.iconDay,
    };
};

export const formatTemperature = (value) => {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? `${Math.round(parsedValue)}°C` : '--';
};

export const formatWind = (value) => {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? `${parsedValue.toFixed(1)} m/s` : '--';
};

export const formatHumidity = (value) => {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? `${Math.round(parsedValue)}%` : '--';
};

export const formatVisibility = (value) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
        return '--';
    }

    return parsedValue >= 1000 ? `${(parsedValue / 1000).toFixed(1)} km` : `${Math.round(parsedValue)} m`;
};

export const formatHour = (value) => {
    if (!value) {
        return '--:--';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(parsedDate);
};

export const resolveWeatherCoordinates = ({ selectedDrone = null } = {}) => {
    const droneLatitude = Number(selectedDrone?.home_latitude);
    const droneLongitude = Number(selectedDrone?.home_longitude);

    if (Number.isFinite(droneLatitude) && Number.isFinite(droneLongitude)) {
        return {
            latitude: droneLatitude,
            longitude: droneLongitude,
            source: 'home',
        };
    }

    return {
        latitude: null,
        longitude: null,
        source: 'none',
    };
};
