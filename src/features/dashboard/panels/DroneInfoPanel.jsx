import React from 'react';
import batteryBorderSvg from '../../../assets/images/image_border_battery_dashboard.svg?raw';
import droneImage from '../../../assets/images/image_drone.png';
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

const batteryBorderMarkup = batteryBorderSvg.replace(
    '<svg ',
    '<svg preserveAspectRatio="none" class="h-full w-full" '
);

const STREAM_PANEL_FILL = 'linear-gradient(180deg, #F5F5F5 0%, #EDEDED 100%)';
const STREAM_PANEL_BORDER = 'linear-gradient(135deg, #FB5555 0%, #ED0000 18%, rgba(251, 85, 85, 0.42) 40%, rgba(251, 85, 85, 0.12) 56%, rgba(251, 85, 85, 0) 66%)';

const WeatherBadge = ({ label, value }) => (
    <div className="flex items-center justify-between rounded-[12px] border border-[#A8A8A8] bg-[#EBEBEB] px-3 py-2 text-[10px]">
        <span className="text-[#555555]">{label}</span>
        <span className="font-inter text-[#1F1F1F]">{value}</span>
    </div>
);

const HorizontalBatteryIcon = ({ percent = null, fillColor = '#8294B3', shellColor = '#D6DEEB' }) => {
    const hasValue = Number.isFinite(Number(percent));
    const normalizedPercent = hasValue ? Math.max(0, Math.min(100, Number(percent))) : 0;
    const fillWidth = Math.max(0, Math.round((normalizedPercent / 100) * 26));

    return (
        <div className="relative h-[22px] w-[44px] shrink-0">
            <div className="absolute right-0 top-1/2 h-[8px] w-[4px] -translate-y-1/2 rounded-r-[2px]" style={{ backgroundColor: shellColor }} />
            <div className="absolute inset-y-0 left-0 right-[3px] rounded-[7px]" style={{ backgroundColor: shellColor }} />
            <div className="absolute inset-y-[3px] left-[3px] right-[7px] rounded-[4px] bg-white" />
            <div
                className="absolute inset-y-[6px] left-[6px] rounded-[2px] transition-all duration-500"
                style={{
                    width: `${Math.min(26, Math.max(hasValue ? 4 : 10, fillWidth))}px`,
                    backgroundColor: hasValue ? fillColor : '#D6DEEB',
                }}
            />
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
    const batteryData = telemetry?.battery || {};
    const dockingStatus = telemetry?.docking_status || {};
    const uavStatus = telemetry?.uav_status || {};
    const gps = telemetry?.gps || {};
    const vehicleState = telemetry?.vehicle_state || {};
    const attitude = telemetry?.attitude || {};
    const link = telemetry?.link || {};
    const missionProgress = telemetry?.mission_progress || {};
    const isLocationFresh = Boolean(telemetryStatus?.metrics?.location?.isFresh);
    const isBatteryFresh = Boolean(telemetryStatus?.metrics?.battery?.isFresh);
    const isDockingStatusFresh = Boolean(telemetryStatus?.metrics?.docking_status?.isFresh);
    const isUavStatusFresh = Boolean(telemetryStatus?.metrics?.uav_status?.isFresh);
    const isGpsFresh = Boolean(telemetryStatus?.metrics?.gps?.isFresh);
    const isVehicleStateFresh = Boolean(telemetryStatus?.metrics?.vehicle_state?.isFresh);
    const isLinkFresh = Boolean(telemetryStatus?.metrics?.link?.isFresh);
    const hasVehicleConnectedState = typeof vehicleState.connected === 'boolean';
    const isDroneActive = Boolean(
        (isVehicleStateFresh && vehicleState.connected) || isBatteryFresh
    );
    const hasDockingBatterySnapshot = Boolean(
        isUavStatusFresh && (
            uavStatus?.battery_percent != null ||
            uavStatus?.battery_voltage != null
        )
    );
    const shouldUseDockingBatteryFallback = !isDroneActive && hasDockingBatterySnapshot;

    const battery = shouldUseDockingBatteryFallback
        ? (isUavStatusFresh ? (uavStatus.battery_percent ?? null) : null)
        : (isBatteryFresh ? (batteryData.percent ?? null) : null);
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
    const voltage = shouldUseDockingBatteryFallback
        ? (isUavStatusFresh ? (uavStatus.battery_voltage ?? null) : null)
        : (isBatteryFresh ? (batteryData.voltage ?? null) : null);
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
        if (level >= 60) return { text: `${level}%`, color: 'text-[#4E9B86]', label: t('dashboard.safeToFly'), width: `${level}%`, barColor: '#4E9B86', shellColor: '#4E9B86' };
        if (level >= 30) return { text: `${level}%`, color: 'text-[#f0ad4e]', label: t('dashboard.moderate'), width: `${level}%`, barColor: '#f0ad4e', shellColor: '#f0ad4e' };
        return { text: `${level}%`, color: 'text-[#FE8645]', label: t('missions.low'), width: `${level}%`, barColor: '#FE8645', shellColor: '#FE8645' };
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
                className="grid h-full w-full grid-rows-[auto_auto_1fr] gap-4 overflow-hidden rounded-[29px] px-5 py-5"
                style={{ background: STREAM_PANEL_FILL }}
            >
                {/* Header Section */}
                <div className="relative z-10 flex items-start justify-between">
                    <div className="flex min-w-0 flex-col text-left">
                        {isLoading ? (
                            <h2 className="text-[#1F1F1F] text-[18px] font-bold tracking-wide">{t('common.loading')}</h2>
                        ) : errorMsg ? (
                            <h2 className="text-red-400 text-[18px] font-bold tracking-wide text-sm">{errorMsg}</h2>
                        ) : (
                            <>
                                <h2 className="truncate text-[#1F1F1F] text-[18px] font-bold tracking-wide">
                                    {droneLabel}
                                </h2>
                                <span className={`mt-[2px] text-[10px] tracking-wider ${connectionColorClass}`}>
                                    {connectionLabel}
                                </span>
                            </>
                        )}
                    </div>
                    <img src={droneImage} alt="Drone" className="h-10 w-auto shrink-0 object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]" />
                </div>

                {/* Battery Section */}
                <div className="relative z-10 flex flex-col gap-2 pt-1 text-left">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FF383C] to-transparent" />
                    <h3 className="text-[#000000] text-xs font-semibold tracking-wide">{t('dashboard.battery')}</h3>
                    <div className="relative flex min-h-[72px] items-center justify-between px-4 py-3">
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
                            />
                            <span className="font-inter text-sm font-bold tracking-wider text-[#000000]">{batteryStatus.text}</span>
                        </div>
                        <div className="relative z-10 flex flex-col items-end">
                            <span className={`text-[11px] font-bold tracking-wide ${batteryStatus.color}`}>
                                {battery !== null ? (battery >= 60 ? t('dashboard.good') : battery >= 30 ? t('dashboard.moderate') : t('dashboard.low')) : '--'}
                            </span>
                            <span className={`text-[9px] font-medium tracking-wide ${batteryStatus.color}`}>
                                {voltage !== null ? `${voltage.toFixed(1)}V` : batteryStatus.label}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Weather Section */}
                <div className="relative z-10 flex min-h-0 flex-col gap-2 text-left">
                    <h3 className="text-[#2A2A2A] text-xs font-semibold tracking-wide">{t('common.weather')}</h3>
                    <div className="flex min-h-0 flex-1 flex-col justify-between rounded-[30px] border border-[#A8A8A8] bg-[rgba(197,197,197,0.5)] p-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <img
                                    src={currentWeatherPresentation.icon}
                                    alt={currentWeatherLabel}
                                    className="h-[52px] w-[52px] shrink-0 object-contain"
                                />
                                <span className="font-inter text-2xl font-bold tracking-wider text-[#1F1F1F]">
                                    {isWeatherLoading ? '--' : formatTemperature(currentWeather.temperature_2m)}
                                </span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[#1F1F1F] text-[13px] font-bold tracking-wide leading-tight">
                                    {isWeatherLoading ? t('common.loading') : weatherError ? t('missions.weatherError') : currentWeatherLabel}
                                </span>
                                <span className="font-inter mt-[2px] text-[10px] tracking-wide text-[#555555]">
                                    {formatHour(currentWeather.time)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <WeatherBadge label={t('dashboard.gust')} value={isWeatherLoading ? '--' : formatWind(currentWeather.wind_gusts_10m)} />
                            <WeatherBadge label={t('dashboard.wind')} value={isWeatherLoading ? '--' : formatWind(currentWeather.wind_speed_10m)} />
                            <WeatherBadge label={t('dashboard.humid')} value={isWeatherLoading ? '--' : formatHumidity(currentWeather.relative_humidity_2m)} />
                            <WeatherBadge label={t('dashboard.visibility')} value={isWeatherLoading ? '--' : formatVisibility(currentWeather.visibility)} />
                        </div>

                        <div className="mt-2 flex justify-center">
                            <span className={`text-[10px] font-medium tracking-wide ${weatherError ? 'text-red-300' : 'text-[#1ab394]'}`}>
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
