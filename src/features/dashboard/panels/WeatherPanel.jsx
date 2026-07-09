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
    <div className="flex items-center justify-between rounded-[12px] border border-[#A8A8A8] bg-[#EBEBEB] px-[clamp(8px,0.9vw,12px)] py-[clamp(5px,0.55vw,7px)] text-[clamp(9px,0.72vw,11px)]">
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
        const forecastItemLimit = 5;

        return times
            .map((time, index) => ({
                time,
                timestamp: Date.parse(time),
                temperature: temperatures[index],
                weatherCode: weatherCodes[index],
                isDay: dayFlags[index],
            }))
            .filter((item) => Number.isFinite(item.timestamp) && item.timestamp > currentTime)
            .slice(0, forecastItemLimit);
    }, [currentWeather?.time, hourlyWeather.is_day, hourlyWeather.temperature_2m, hourlyWeather.time, hourlyWeather.weather_code, isStream]);

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
                className={`relative z-10 flex flex-1 flex-col ${isStream ? 'h-full overflow-hidden rounded-[29px] px-[clamp(12px,1.15vw,18px)] py-[clamp(10px,1vw,16px)]' : 'rounded-[24px] border border-[#393F44] bg-[rgba(50,50,50,0.5)] p-4'}`}
                style={isStream ? { background: STREAM_PANEL_FILL } : undefined}
            >
                <div className="flex items-start justify-between gap-[clamp(8px,0.9vw,12px)]">
                    <div className="flex min-w-0 items-center gap-[clamp(8px,0.9vw,12px)]">
                        <img
                            src={currentPresentation.icon}
                            alt={currentPresentation.label}
                            className="h-[clamp(28px,2.1vw,34px)] w-[clamp(28px,2.1vw,34px)] shrink-0 object-contain"
                        />
                        <div className="min-w-0">
                            <div className={`truncate font-inter text-[clamp(16px,1.45vw,20px)] font-bold tracking-wide ${isStream ? 'text-[#1F1F1F]' : 'text-white'}`}>
                                {isLoading ? t('common.loading') : weatherError ? t('missions.weatherError') : currentWeatherLabel}
                            </div>
                            <div className={`mt-1 text-[clamp(8px,0.65vw,10px)] uppercase tracking-[0.16em] ${isStream ? 'text-[#5F5F5F]' : 'text-gray-400'}`}>
                                {headerLabel}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className={`font-inter text-[clamp(18px,1.5vw,22px)] uppercase tracking-wider ${isStream ? 'text-[#1F1F1F]' : 'text-white'}`}>
                            {isLoading ? '--' : formatTemperature(currentWeather.temperature_2m)}
                        </span>
                    </div>
                </div>

                <div className="mt-[clamp(6px,0.75vw,10px)] grid grid-cols-2 gap-[clamp(5px,0.55vw,7px)]">
                    <WeatherBadge label={t('dashboard.gust')} value={isLoading ? '--' : formatWind(currentWeather.wind_gusts_10m)} />
                    <WeatherBadge label={t('dashboard.wind')} value={isLoading ? '--' : formatWind(currentWeather.wind_speed_10m)} />
                    <WeatherBadge label={t('dashboard.humid')} value={isLoading ? '--' : formatHumidity(currentWeather.relative_humidity_2m)} />
                    <WeatherBadge label={t('dashboard.visibility')} value={isLoading ? '--' : formatVisibility(currentWeather.visibility)} />
                </div>

                <div className="mt-[clamp(6px,0.75vw,10px)] flex-1 min-h-0 overflow-hidden">
                    {weatherError ? (
                        <div className={`flex h-full items-center justify-center px-3 text-center text-[12px] ${isStream ? 'text-[#B42323]' : 'text-red-300'}`}>
                            {weatherError}
                        </div>
                    ) : hourlyForecast.length === 0 ? (
                        <div className={`flex h-full items-center justify-center px-3 text-center text-[12px] ${isStream ? 'text-[#5F5F5F]' : 'text-gray-400'}`}>
                            {isLoading ? t('dashboard.loadingForecast') : t('dashboard.noHourlyForecast')}
                        </div>
                    ) : (
                        <div className={`grid h-full grid-cols-5 ${isStream ? 'gap-[clamp(2px,0.32vw,6px)]' : 'gap-[clamp(4px,0.6vw,10px)]'}`}>
                            {hourlyForecast.map((hour) => {
                                const presentation = getWeatherPresentation(hour.weatherCode, hour.isDay);
                                const weatherLabel = t(presentation.labelKey, presentation.label);

                                return (
                                    <div
                                        key={hour.time}
                                        className={`flex min-w-0 flex-col items-center justify-center px-[1px] py-[2px] ${isStream ? 'gap-[1px]' : ''}`}
                                    >
                                        <span className={`text-[clamp(8px,0.68vw,10px)] tracking-wide ${isStream ? 'text-[#5F5F5F]' : 'text-gray-400'}`}>{formatHour(hour.time)}</span>
                                        <img
                                            src={presentation.icon}
                                            alt={weatherLabel}
                                            className={`object-contain ${isStream ? 'h-[clamp(15px,1.05vw,20px)] w-[clamp(15px,1.05vw,20px)]' : 'mt-1 h-[clamp(20px,1.8vw,28px)] w-[clamp(20px,1.8vw,28px)]'}`}
                                        />
                                        <span className={`text-[clamp(8px,0.7vw,11px)] font-medium tracking-wide ${isStream ? 'text-[#1F1F1F]' : 'mt-1 text-white'}`}>
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
