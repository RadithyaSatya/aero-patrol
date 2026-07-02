import React, { useMemo } from 'react';
import { TopBottomFadeOverlay } from './PanelEdgeOverlay';
import useWeatherForecast from '../../../shared/hooks/useWeatherForecast';
import {
    formatHour,
    formatHumidity,
    formatTemperature,
    formatVisibility,
    formatWind,
    getWeatherPresentation,
} from '../../../shared/utils/weather';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const STREAM_PANEL_FILL = 'linear-gradient(180deg, #F5F5F5 0%, #EDEDED 100%)';
const STREAM_PANEL_BORDER = 'linear-gradient(135deg, #FB5555 0%, #ED0000 18%, rgba(251, 85, 85, 0.42) 40%, rgba(251, 85, 85, 0.12) 56%, rgba(251, 85, 85, 0) 66%)';

const WeatherBadge = ({ label, value }) => (
    <div className="flex items-center justify-between rounded-[12px] border border-[#A8A8A8] bg-[#EBEBEB] px-2 py-1 text-[11px]">
        <span className="text-[#2A2A2A]">{label}</span>
        <span className="font-inter text-[#1F1F1F]">{value}</span>
    </div>
);

export default function WeatherPanel({ className = '', variant = 'default', selectedDrone = null, telemetry = null }) {
    const { t } = useI18n();
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
    const currentWeatherLabel = t(currentPresentation.labelKey, currentPresentation.label);
    const headerLabel = isLoading
        ? t('dashboard.fetchingLiveWeather')
        : weatherError
            ? t('dashboard.liveWeatherUnavailable')
            : t('dashboard.liveDroneWeather');

    return (
        <div
            className={`font-inter relative flex h-full w-full flex-col overflow-hidden rounded-[30px] select-none ${isStream ? 'p-px' : 'border-l border-[#5E0A0A]'} ${isStream ? '' : 'gap-2 p-5'} ${className}`}
            style={isStream ? { backgroundImage: STREAM_PANEL_BORDER } : undefined}
        >
            {!isStream && <TopBottomFadeOverlay startColor="#ED0000" midColor="#5E0A0A" />}
            <div
                className={`relative z-10 flex flex-1 flex-col ${isStream ? 'h-full overflow-hidden rounded-[29px] p-5' : 'rounded-[24px] border border-[#393F44] bg-[rgba(50,50,50,0.5)] p-4'}`}
                style={isStream ? { background: STREAM_PANEL_FILL } : undefined}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <img
                            src={currentPresentation.icon}
                            alt={currentPresentation.label}
                            className="h-10 w-10 shrink-0 object-contain"
                        />
                        <div className="min-w-0">
                            <div className={`truncate font-inter text-xl font-bold tracking-wide ${isStream ? 'text-[#1F1F1F]' : 'text-white'}`}>
                                {isLoading ? t('common.loading') : weatherError ? t('missions.weatherError') : currentWeatherLabel}
                            </div>
                            <div className={`mt-1 text-[10px] uppercase tracking-[0.16em] ${isStream ? 'text-[#5F5F5F]' : 'text-gray-400'}`}>
                                {headerLabel}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className={`font-inter text-2xl uppercase tracking-wider ${isStream ? 'text-[#1F1F1F]' : 'text-white'}`}>
                            {isLoading ? '--' : formatTemperature(currentWeather.temperature_2m)}
                        </span>
                    </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1">
                    <WeatherBadge label={t('dashboard.gust')} value={isLoading ? '--' : formatWind(currentWeather.wind_gusts_10m)} />
                    <WeatherBadge label={t('dashboard.wind')} value={isLoading ? '--' : formatWind(currentWeather.wind_speed_10m)} />
                    <WeatherBadge label={t('dashboard.humid')} value={isLoading ? '--' : formatHumidity(currentWeather.relative_humidity_2m)} />
                    <WeatherBadge label={t('dashboard.visibility')} value={isLoading ? '--' : formatVisibility(currentWeather.visibility)} />
                </div>

                <div className="mt-2 flex-1">
                    {weatherError ? (
                        <div className={`flex h-full items-center justify-center px-3 text-center text-[12px] ${isStream ? 'text-[#B42323]' : 'text-red-300'}`}>
                            {weatherError}
                        </div>
                    ) : hourlyForecast.length === 0 ? (
                        <div className={`flex h-full items-center justify-center px-3 text-center text-[12px] ${isStream ? 'text-[#5F5F5F]' : 'text-gray-400'}`}>
                            {isLoading ? t('dashboard.loadingForecast') : t('dashboard.noHourlyForecast')}
                        </div>
                    ) : (
                        <div className="grid grid-cols-5 gap-2">
                            {hourlyForecast.map((hour) => {
                                const presentation = getWeatherPresentation(hour.weatherCode, hour.isDay);
                                const weatherLabel = t(presentation.labelKey, presentation.label);

                                return (
                                    <div
                                        key={hour.time}
                                        className="flex flex-col items-center justify-center px-1 py-1"
                                    >
                                        <span className={`text-[10px] tracking-wide ${isStream ? 'text-[#5F5F5F]' : 'text-gray-400'}`}>{formatHour(hour.time)}</span>
                                        <img
                                            src={presentation.icon}
                                            alt={weatherLabel}
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
