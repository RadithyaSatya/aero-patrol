import React, { useMemo } from 'react';
import useWeatherForecast from '../../../shared/hooks/useWeatherForecast';
import {
    formatHour,
    formatHumidity,
    formatTemperature,
    formatVisibility,
    formatWind,
    getWeatherPresentation,
} from '../../../shared/utils/weather';

const WeatherBadge = ({ label, value }) => (
    <div className="flex items-center justify-between rounded-[12px] border border-[#A8A8A8] bg-[#EBEBEB] px-2 py-1 text-[11px]">
        <span className="text-[#2A2A2A]">{label}</span>
        <span className="font-tomorrow text-[#1F1F1F]">{value}</span>
    </div>
);

export default function WeatherPanel({ className = '', variant = 'default', selectedDrone = null, telemetry = null }) {
    const isStream = variant === 'stream';
    const { weatherData, weatherError, isLoading } = useWeatherForecast({
        selectedDrone,
        telemetry,
        forecastHours: isStream ? 6 : 8,
    });

    const currentWeather = weatherData?.current || {};
    const hourlyWeather = weatherData?.hourly || {};

    const hourlyForecast = useMemo(() => {
        const times = Array.isArray(hourlyWeather.time) ? hourlyWeather.time : [];
        const temperatures = Array.isArray(hourlyWeather.temperature_2m) ? hourlyWeather.temperature_2m : [];
        const weatherCodes = Array.isArray(hourlyWeather.weather_code) ? hourlyWeather.weather_code : [];
        const dayFlags = Array.isArray(hourlyWeather.is_day) ? hourlyWeather.is_day : [];
        const currentTime = currentWeather?.time ? Date.parse(currentWeather.time) : Date.now();

        return times
            .map((time, index) => ({
                time,
                timestamp: Date.parse(time),
                temperature: temperatures[index],
                weatherCode: weatherCodes[index],
                isDay: dayFlags[index],
            }))
            .filter((item) => Number.isFinite(item.timestamp) && item.timestamp > currentTime)
            .slice(0, 5);
    }, [currentWeather?.time, hourlyWeather.is_day, hourlyWeather.temperature_2m, hourlyWeather.time, hourlyWeather.weather_code]);

    const currentPresentation = getWeatherPresentation(currentWeather.weather_code, currentWeather.is_day);
    const headerLabel = isLoading
        ? 'Fetching live weather'
        : weatherError
            ? 'Live weather unavailable'
            : 'Live drone weather';

    return (
        <div
            className={`font-tomorrow relative flex h-full w-full flex-col overflow-hidden shadow-lg select-none ${isStream ? 'border border-[#FF383C]' : 'border-l border-[#5E0A0A]'} ${isStream ? '' : 'gap-2 p-5'} ${className}`}
            style={isStream ? { background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' } : undefined}
        >
            {!isStream && <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />}
            {!isStream && <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />}

            <div
                className={`flex flex-1 flex-col ${isStream ? 'h-full border border-[#A8A8A8] p-4' : 'border border-[#393F44] bg-[rgba(50,50,50,0.5)] p-4'}`}
                style={isStream ? { background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' } : undefined}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <img
                            src={currentPresentation.icon}
                            alt={currentPresentation.label}
                            className="h-10 w-10 shrink-0 object-contain"
                        />
                        <div className="min-w-0">
                            <div className={`truncate font-tomorrow text-xl font-bold tracking-wide ${isStream ? 'text-[#1F1F1F]' : 'text-white'}`}>
                                {isLoading ? 'Loading...' : weatherError ? 'Weather Error' : currentPresentation.label}
                            </div>
                            <div className={`mt-1 text-[10px] uppercase tracking-[0.16em] ${isStream ? 'text-[#5F5F5F]' : 'text-gray-400'}`}>
                                {headerLabel}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className={`font-tomorrow text-2xl uppercase tracking-wider ${isStream ? 'text-[#1F1F1F]' : 'text-white'}`}>
                            {isLoading ? '--' : formatTemperature(currentWeather.temperature_2m)}
                        </span>
                    </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1">
                    <WeatherBadge label="Gust" value={isLoading ? '--' : formatWind(currentWeather.wind_gusts_10m)} />
                    <WeatherBadge label="Wind" value={isLoading ? '--' : formatWind(currentWeather.wind_speed_10m)} />
                    <WeatherBadge label="Humid" value={isLoading ? '--' : formatHumidity(currentWeather.relative_humidity_2m)} />
                    <WeatherBadge label="Visibility" value={isLoading ? '--' : formatVisibility(currentWeather.visibility)} />
                </div>

                <div className="mt-2 flex-1">
                    {weatherError ? (
                        <div className={`flex h-full items-center justify-center px-3 text-center text-[12px] ${isStream ? 'text-[#B42323]' : 'text-red-300'}`}>
                            {weatherError}
                        </div>
                    ) : hourlyForecast.length === 0 ? (
                        <div className={`flex h-full items-center justify-center px-3 text-center text-[12px] ${isStream ? 'text-[#5F5F5F]' : 'text-gray-400'}`}>
                            {isLoading ? 'Loading forecast...' : 'No hourly forecast available.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-5 gap-2">
                            {hourlyForecast.map((hour) => {
                                const presentation = getWeatherPresentation(hour.weatherCode, hour.isDay);

                                return (
                                    <div
                                        key={hour.time}
                                        className="flex flex-col items-center justify-center px-1 py-1"
                                    >
                                        <span className={`text-[10px] tracking-wide ${isStream ? 'text-[#5F5F5F]' : 'text-gray-400'}`}>{formatHour(hour.time)}</span>
                                        <img
                                            src={presentation.icon}
                                            alt={presentation.label}
                                            className="mt-1 h-7 w-7 object-contain"
                                        />
                                        <span className={`mt-1 text-[11px] font-medium tracking-wide ${isStream ? 'text-[#1F1F1F]' : 'text-white'}`}>
                                            {formatTemperature(hour.temperature)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
