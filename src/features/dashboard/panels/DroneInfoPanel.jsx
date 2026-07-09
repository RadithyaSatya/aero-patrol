import React from 'react';
import batteryBorderSvg from '../../../assets/images/image_border_battery_dashboard.svg?raw';
import droneImage from '../../../assets/images/image_drone.png';
import lightningIcon from '../../../assets/images/icon_lightning.svg';
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
import { resolveTelemetryBattery } from '../../../shared/utils/telemetryBattery';

const batteryBorderMarkup = batteryBorderSvg.replace(
    '<svg ',
    '<svg preserveAspectRatio="none" class="h-full w-full" '
);

const STREAM_PANEL_FILL = 'linear-gradient(180deg, #F5F5F5 0%, #EDEDED 100%)';
const STREAM_PANEL_BORDER = 'linear-gradient(135deg, #FB5555 0%, #ED0000 18%, rgba(251, 85, 85, 0.42) 40%, rgba(251, 85, 85, 0.12) 56%, rgba(251, 85, 85, 0) 66%)';

const WeatherBadge = ({ label, value }) => (
    <div className="flex items-center justify-between rounded-[12px] border border-[#A8A8A8] bg-[#EBEBEB] px-[clamp(8px,0.9vw,12px)] py-[clamp(6px,0.7vw,8px)] text-[clamp(9px,0.68vw,10px)]">
        <span className="text-[#555555]">{label}</span>
        <span className="font-inter text-[#1F1F1F]">{value}</span>
    </div>
);

const HorizontalBatteryIcon = ({
    percent = null,
    fillColor = '#8294B3',
    shellColor = '#D6DEEB',
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
                    backgroundColor: hasValue ? fillColor : '#D6DEEB',
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

export default function DroneInfoPanel({
    selectedDrone = null,
    isLoading = true,
    errorMsg = '',
    telemetry = null,
    telemetryStatus = null,
    isTelemetryConnected = false
}) {
    const { t } = useI18n();
    // Extract telemetry from metric-keyed structure
    const location = telemetry?.location || {};
    const gps = telemetry?.gps || {};
    const vehicleState = telemetry?.vehicle_state || {};
    const attitude = telemetry?.attitude || {};
    const link = telemetry?.link || {};
    const missionProgress = telemetry?.mission_progress || {};
    const isLocationFresh = Boolean(telemetryStatus?.metrics?.location?.isFresh);
    const batteryState = resolveTelemetryBattery(telemetry, telemetryStatus);
    const isBatteryFresh = batteryState.isBatteryFresh;
    const isGpsFresh = Boolean(telemetryStatus?.metrics?.gps?.isFresh);
    const isVehicleStateFresh = Boolean(telemetryStatus?.metrics?.vehicle_state?.isFresh);
    const isLinkFresh = Boolean(telemetryStatus?.metrics?.link?.isFresh);
    const hasVehicleConnectedState = typeof vehicleState.connected === 'boolean';
    const battery = batteryState.percent;
    const isBatteryCharging = batteryState.isCharging === true;
    const altitude = isLocationFresh ? (location.altitude ?? null) : null;
    const speed = isLocationFresh ? (location.ground_speed ?? null) : null;
    const heading = isLocationFresh ? (location.heading ?? null) : null;
    const climbRate = isLocationFresh ? (location.climb_rate ?? null) : null;
    const latitude = isLocationFresh ? (location.latitude ?? null) : null;
    const longitude = isLocationFresh ? (location.longitude ?? null) : null;
    const satellites = isGpsFresh ? (gps.satellites ?? null) : null;
    const fixLabel = isGpsFresh ? (gps.fix_type_label ?? null) : null;
    const flightMode = isVehicleStateFresh ? (vehicleState.mode ?? null) : null;
    const isArmed = isVehicleStateFresh ? (vehicleState.armed ?? null) : null;
    const landedState = isVehicleStateFresh ? (vehicleState.landed_state ?? null) : null;
    const rssi = isLinkFresh ? (link.rssi ?? null) : null;
    const voltage = batteryState.voltage;
    const { weatherData, weatherError, isLoading: isWeatherLoading } = useWeatherForecast({
        selectedDrone,
        telemetry,
        forecastHours: 8,
    });
    const currentWeather = weatherData?.current || {};
    const currentWeatherPresentation = getWeatherPresentation(currentWeather.weather_code, currentWeather.is_day);
    const currentWeatherLabel = t(currentWeatherPresentation.labelKey, currentWeatherPresentation.label);

    // Determine battery status
    const getBatteryStatus = (level) => {
        if (level === null || level === undefined) return { text: '--', color: 'text-[#8C8C8C]', label: t('dashboard.noData'), width: '0%', barColor: '#B5B5B5', shellColor: '#B5B5B5' };
        if (level >= 60) return { text: `${level}%`, color: 'text-[#74C642]', label: t('dashboard.safeToFly'), width: `${level}%`, barColor: '#74C642', shellColor: '#74C6424D' };
        if (level >= 30) return { text: `${level}%`, color: 'text-[#F98543]', label: t('dashboard.moderate'), width: `${level}%`, barColor: '#F98543', shellColor: '#F985434D' };
        return { text: `${level}%`, color: 'text-[#F94343]', label: t('missions.low'), width: `${level}%`, barColor: '#F94343', shellColor: '#F943434D' };
    };

    const batteryStatus = getBatteryStatus(battery);
    const droneLabel = 'Drone SLR';
    const hasFreshTelemetry = Boolean(
        isLocationFresh || isBatteryFresh || isGpsFresh || isVehicleStateFresh || isLinkFresh
    );
    const isRealtimeOnline = hasVehicleConnectedState
        ? (isVehicleStateFresh && vehicleState.connected)
        : hasFreshTelemetry;
    const connectionLabel = isRealtimeOnline ? t('dashboard.online') : t('dashboard.disconnected');
    const connectionColorClass = isRealtimeOnline ? 'text-[#32BA87]' : 'text-red-500';
    return (
        <div
            className="font-inter relative h-full w-full overflow-hidden rounded-[30px] p-px select-none"
            style={{ backgroundImage: STREAM_PANEL_BORDER }}
        >
            <div
                className="grid h-full w-full grid-rows-[auto_auto_minmax(0,1fr)] gap-[clamp(8px,0.8vw,12px)] overflow-hidden rounded-[29px] px-[clamp(12px,1.1vw,18px)] py-[clamp(12px,1.1vw,18px)] min-[1680px]:gap-[14px] min-[1920px]:gap-[16px]"
                style={{ background: STREAM_PANEL_FILL }}
            >
                {/* Header Section */}
                <div className="relative z-10 flex items-start justify-between">
                    <div className="flex min-w-0 flex-col text-left">
                        {isLoading ? (
                            <h2 className="text-[#1F1F1F] text-[clamp(16px,1.45vw,18px)] font-bold tracking-wide">{t('common.loading')}</h2>
                        ) : errorMsg ? (
                            <h2 className="text-red-500 text-[clamp(14px,1.3vw,18px)] font-bold tracking-wide text-sm">{errorMsg}</h2>
                        ) : (
                            <>
                                <h2 className="truncate text-[#1F1F1F] text-[clamp(16px,1.45vw,18px)] font-semibold tracking-wide">
                                    {droneLabel}
                                </h2>
                                <span className={`mt-[2px] text-[10px] tracking-wider ${connectionColorClass}`}>
                                    {connectionLabel}
                                </span>
                            </>
                        )}
                    </div>
                    <img src={droneImage} alt="Drone" className="h-[clamp(28px,2.2vw,36px)] w-auto shrink-0 object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]" />
                </div>

                {/* Battery Section */}
                <div className="relative z-10 flex flex-col gap-1.5 pt-0.5 text-left min-[1680px]:gap-2 min-[1920px]:gap-2.5 min-[1920px]:pt-1">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FF383C] to-transparent" />
                    <h3 className="text-[#000000] text-xs font-medium tracking-wide">{t('dashboard.battery')}</h3>
                    <div className="relative flex min-h-[64px] items-center justify-between px-[clamp(9px,0.85vw,14px)] py-[clamp(8px,0.7vw,10px)] min-[1680px]:py-[11px] min-[1920px]:py-[12px]">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 select-none"
                            dangerouslySetInnerHTML={{ __html: batteryBorderMarkup }}
                        />
                        <div className="relative z-10 flex items-center gap-3">
                            <HorizontalBatteryIcon
                                percent={battery}
                                fillColor={batteryStatus.barColor}
                                shellColor={batteryStatus.shellColor}
                                isCharging={isBatteryCharging}
                            />
                            <span className="font-inter text-[clamp(12px,1vw,14px)] font-bold tracking-wider text-[#000000]">{batteryStatus.text}</span>
                        </div>
                        <div className="relative z-10 flex flex-col items-end">
                            <span className={`text-[clamp(10px,0.8vw,11px)] font-bold tracking-wide ${batteryStatus.color}`}>
                                {battery !== null ? (battery >= 60 ? t('dashboard.good') : battery >= 30 ? t('dashboard.moderate') : t('dashboard.low')) : '--'}
                            </span>
                            <span className={`text-[clamp(8px,0.62vw,9px)] font-medium tracking-wide ${batteryStatus.color}`}>
                                {voltage !== null ? `${voltage.toFixed(1)}V` : batteryStatus.label}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Weather Section */}
                <div className="relative z-10 flex min-h-0 flex-col gap-1.5 overflow-hidden text-left min-[1680px]:gap-2 min-[1920px]:gap-2.5">
                    <h3 className="text-[#2A2A2A] text-xs font-medium tracking-wide">{t('common.weather')}</h3>
                    <div className="flex min-h-0 flex-1 flex-col gap-[clamp(6px,0.65vw,10px)] rounded-[24px] border border-[#A8A8A8] bg-[rgba(197,197,197,0.5)] p-[clamp(8px,0.8vw,12px)] min-[1680px]:gap-[11px] min-[1680px]:p-[13px] min-[1920px]:gap-[12px] min-[1920px]:p-[14px]">
                        <div className="flex justify-between items-start gap-[clamp(6px,0.7vw,10px)]">
                            <div className="flex min-w-0 items-center gap-[clamp(6px,0.7vw,10px)]">
                                <img
                                    src={currentWeatherPresentation.icon}
                                    alt={currentWeatherLabel}
                                    className="h-[clamp(30px,2.3vw,42px)] w-[clamp(30px,2.3vw,42px)] shrink-0 object-contain"
                                />
                                <span className="font-inter text-[clamp(18px,1.5vw,22px)] font-medium tracking-wider text-[#1F1F1F]">
                                    {isWeatherLoading ? '--' : formatTemperature(currentWeather.temperature_2m)}
                                </span>
                            </div>
                            <div className="flex min-w-0 flex-col items-end">
                                <span className="truncate text-[#1F1F1F] text-[clamp(11px,0.95vw,13px)] font-medium tracking-wide leading-tight">
                                    {isWeatherLoading ? t('common.loading') : weatherError ? t('missions.weatherError') : currentWeatherLabel}
                                </span>
                                <span className="font-inter mt-[2px] text-[clamp(8px,0.7vw,10px)] tracking-wide text-[#555555]">
                                    {formatHour(currentWeather.time)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-[clamp(5px,0.55vw,7px)]">
                            <WeatherBadge label={t('dashboard.gust')} value={isWeatherLoading ? '--' : formatWind(currentWeather.wind_gusts_10m)} />
                            <WeatherBadge label={t('dashboard.wind')} value={isWeatherLoading ? '--' : formatWind(currentWeather.wind_speed_10m)} />
                            <WeatherBadge label={t('dashboard.humid')} value={isWeatherLoading ? '--' : formatHumidity(currentWeather.relative_humidity_2m)} />
                            <WeatherBadge label={t('dashboard.visibility')} value={isWeatherLoading ? '--' : formatVisibility(currentWeather.visibility)} />
                        </div>

                        <div className="flex flex-1 items-center justify-center pt-0.5">
                            <span className={`text-[10px] font-medium tracking-wide ${weatherError ? 'text-red-500' : 'text-[#1ab394]'}`}>
                                {weatherError || (isWeatherLoading ? t('dashboard.loadingWeather') : t('dashboard.liveDroneWeather'))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Telemetry Stats Section */}
            <div className="flex flex-col gap-2 flex-1 text-left" style={{ display: 'none' }}>
                <h3 className="text-[#2A2A2A] text-xs font-semibold tracking-wide">{t('dashboard.telemetry')}</h3>
                <div className="flex flex-1 flex-col justify-between border border-[#FF383C] bg-transparent p-4">

                    {/* Flight Info Grid */}
                    <div className="flex flex-col text-[10px] text-gray-400">
                        <div className="flex justify-between px-1">
                            <div className="flex w-1/2 justify-between pr-4">
                                <span>{t('dashboard.altitude')}</span>
                                <span className="text-gray-200 font-mono">{altitude !== null ? `${Number(altitude).toFixed(1)} m` : '-- m'}</span>
                            </div>
                            <div className="flex w-1/2 justify-between pl-4">
                                <span>{t('dashboard.speed')}</span>
                                <span className="text-gray-200 font-mono">{speed !== null ? `${Number(speed).toFixed(1)} m/s` : '-- m/s'}</span>
                            </div>
                        </div>
                        <div className="h-[1px] w-full bg-[#2a3240] my-1.5 opacity-60"></div>
                        <div className="flex justify-between px-1">
                            <div className="flex w-1/2 justify-between pr-4">
                                <span>{t('dashboard.heading')}</span>
                                <span className="text-gray-200 font-mono">{heading !== null ? `${Number(heading).toFixed(0)}°` : '--°'}</span>
                            </div>
                            <div className="flex w-1/2 justify-between pl-4">
                                <span>{t('dashboard.climb')}</span>
                                <span className="text-gray-200 font-mono">{climbRate !== null ? `${Number(climbRate).toFixed(1)} m/s` : '-- m/s'}</span>
                            </div>
                        </div>
                        <div className="h-[1px] w-full bg-[#2a3240] my-1.5 opacity-60"></div>
                        <div className="flex justify-between px-1">
                            <div className="flex w-1/2 justify-between pr-4">
                                <span>Sat</span>
                                <span className="text-gray-200 font-mono">{satellites !== null ? `${satellites} (${fixLabel || '?'})` : '--'}</span>
                            </div>
                            <div className="flex w-1/2 justify-between pl-4">
                                <span>RSSI</span>
                                <span className="text-gray-200 font-mono">{rssi !== null ? rssi : '--'}</span>
                            </div>
                        </div>
                        <div className="h-[1px] w-full bg-[#2a3240] my-1.5 opacity-60"></div>
                        <div className="flex justify-between px-1">
                            <div className="flex w-1/2 justify-between pr-4">
                                <span>Lat</span>
                                <span className="text-gray-200 font-mono">{latitude !== null ? Number(latitude).toFixed(6) : '--'}</span>
                            </div>
                            <div className="flex w-1/2 justify-between pl-4">
                                <span>Lng</span>
                                <span className="text-gray-200 font-mono">{longitude !== null ? Number(longitude).toFixed(6) : '--'}</span>
                            </div>
                        </div>
                        <div className="h-[1px] w-full bg-[#2a3240] my-1.5 opacity-60"></div>
                    </div>

                    {/* Flight Mode Footer */}
                    <div className="flex justify-between items-center mt-2 px-1">
                        <span className={`text-[10px] font-medium tracking-wide ${isRealtimeOnline ? 'text-[#1ab394]' : 'text-gray-600'}`}>
                            {flightMode
                                ? `${flightMode}${isArmed ? ` • ${t('dashboard.armed')}` : ` • ${t('dashboard.disarmed')}`}`
                                : (isRealtimeOnline ? `${t('dashboard.awaitingData')}...` : t('dashboard.disconnected'))}
                        </span>
                        {landedState && (
                            <span className="text-[9px] font-mono text-gray-500">{landedState}</span>
                        )}
                    </div>

                </div>
            </div>

        </div>
    );
}
