import clearSunnyIcon from '../../assets/images/ic_weather/clear_sunny.svg';
import lightRainIcon from '../../assets/images/ic_weather/light_rain.svg';
import partlyCloudyIcon from '../../assets/images/ic_weather/partly_cloudy.svg';
import thunderstormIcon from '../../assets/images/ic_weather/thunderstorm.svg';

export const WEATHER_CODE_MAP = {
    0: { label: 'Clear', labelKey: 'weather.clear', icon: clearSunnyIcon },
    1: { label: 'Mostly Clear', labelKey: 'weather.mostlyClear', icon: clearSunnyIcon },
    2: { label: 'Partly Cloudy', labelKey: 'weather.partlyCloudy', icon: partlyCloudyIcon },
    3: { label: 'Cloudy', labelKey: 'weather.cloudy', icon: partlyCloudyIcon },
    45: { label: 'Fog', labelKey: 'weather.fog', icon: partlyCloudyIcon },
    48: { label: 'Fog', labelKey: 'weather.fog', icon: partlyCloudyIcon },
    51: { label: 'Drizzle', labelKey: 'weather.drizzle', icon: lightRainIcon },
    53: { label: 'Drizzle', labelKey: 'weather.drizzle', icon: lightRainIcon },
    55: { label: 'Heavy Drizzle', labelKey: 'weather.heavyDrizzle', icon: lightRainIcon },
    56: { label: 'Freezing Drizzle', labelKey: 'weather.freezingDrizzle', icon: lightRainIcon },
    57: { label: 'Freezing Drizzle', labelKey: 'weather.freezingDrizzle', icon: lightRainIcon },
    61: { label: 'Rain', labelKey: 'weather.rain', icon: lightRainIcon },
    63: { label: 'Rain', labelKey: 'weather.rain', icon: lightRainIcon },
    65: { label: 'Heavy Rain', labelKey: 'weather.heavyRain', icon: thunderstormIcon },
    66: { label: 'Freezing Rain', labelKey: 'weather.freezingRain', icon: lightRainIcon },
    67: { label: 'Freezing Rain', labelKey: 'weather.freezingRain', icon: lightRainIcon },
    71: { label: 'Snow', labelKey: 'weather.snow', icon: lightRainIcon },
    73: { label: 'Snow', labelKey: 'weather.snow', icon: lightRainIcon },
    75: { label: 'Heavy Snow', labelKey: 'weather.heavySnow', icon: thunderstormIcon },
    77: { label: 'Snow Grains', labelKey: 'weather.snowGrains', icon: lightRainIcon },
    80: { label: 'Rain Shower', labelKey: 'weather.rainShower', icon: lightRainIcon },
    81: { label: 'Rain Shower', labelKey: 'weather.rainShower', icon: lightRainIcon },
    82: { label: 'Heavy Shower', labelKey: 'weather.heavyShower', icon: thunderstormIcon },
    85: { label: 'Snow Shower', labelKey: 'weather.snowShower', icon: lightRainIcon },
    86: { label: 'Snow Shower', labelKey: 'weather.snowShower', icon: lightRainIcon },
    95: { label: 'Thunderstorm', labelKey: 'weather.thunderstorm', icon: thunderstormIcon },
    96: { label: 'Storm Hail', labelKey: 'weather.stormHail', icon: thunderstormIcon },
    99: { label: 'Storm Hail', labelKey: 'weather.stormHail', icon: thunderstormIcon },
};

export const getWeatherPresentation = (weatherCode, isDay) => {
    const entry = WEATHER_CODE_MAP[weatherCode] || { label: 'Unknown', labelKey: 'weather.unknown', icon: partlyCloudyIcon };

    return {
        label: entry.label,
        labelKey: entry.labelKey,
        icon: entry.icon,
        isNight: isDay === 0,
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
