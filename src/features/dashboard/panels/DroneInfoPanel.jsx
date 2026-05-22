import React from 'react';
import batteryBorderImage from '../../../assets/images/image_border_battery_dashboard.png';
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

const WeatherBadge = ({ label, value }) => (
    <div className="flex items-center justify-between border border-[#393F44] rounded-[12px] bg-[#222425] px-3 py-2 text-[10px]">
        <span className="text-gray-400">{label}</span>
        <span className="font-tomorrow text-gray-100">{value}</span>
    </div>
);

export default function DroneInfoPanel({
    selectedDrone = null,
    isLoading = true,
    errorMsg = '',
    telemetry = null,
    telemetryStatus = null,
    isTelemetryConnected = false
}) {
    // Extract telemetry from metric-keyed structure
    const location = telemetry?.location || {};
    const batteryData = telemetry?.battery || {};
    const gps = telemetry?.gps || {};
    const vehicleState = telemetry?.vehicle_state || {};
    const attitude = telemetry?.attitude || {};
    const link = telemetry?.link || {};
    const missionProgress = telemetry?.mission_progress || {};
    const isLocationFresh = Boolean(telemetryStatus?.metrics?.location?.isFresh);
    const isBatteryFresh = Boolean(telemetryStatus?.metrics?.battery?.isFresh);
    const isGpsFresh = Boolean(telemetryStatus?.metrics?.gps?.isFresh);
    const isVehicleStateFresh = Boolean(telemetryStatus?.metrics?.vehicle_state?.isFresh);
    const isLinkFresh = Boolean(telemetryStatus?.metrics?.link?.isFresh);
    const hasVehicleConnectedState = typeof vehicleState.connected === 'boolean';

    const battery = isBatteryFresh ? (batteryData.percent ?? null) : null;
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
    const voltage = isBatteryFresh ? (batteryData.voltage ?? null) : null;
    const { weatherData, weatherError, isLoading: isWeatherLoading } = useWeatherForecast({
        selectedDrone,
        telemetry,
        forecastHours: 8,
    });
    const currentWeather = weatherData?.current || {};
    const currentWeatherPresentation = getWeatherPresentation(currentWeather.weather_code, currentWeather.is_day);

    // Determine battery status
    const getBatteryStatus = (level) => {
        if (level === null || level === undefined) return { text: '--', color: 'text-gray-500', label: 'No Data', width: '0%', barColor: '#4b5563' };
        if (level >= 60) return { text: `${level}%`, color: 'text-[#1ab394]', label: 'Safe to Fly', width: `${level}%`, barColor: '#1ab394' };
        if (level >= 30) return { text: `${level}%`, color: 'text-[#f0ad4e]', label: 'Moderate', width: `${level}%`, barColor: '#f0ad4e' };
        return { text: `${level}%`, color: 'text-[#ea580c]', label: 'Low Battery', width: `${level}%`, barColor: '#ea580c' };
    };

    const batteryStatus = getBatteryStatus(battery);
    const droneLabel = 'Drone SLR';
    const hasFreshTelemetry = Boolean(
        isLocationFresh || isBatteryFresh || isGpsFresh || isVehicleStateFresh || isLinkFresh
    );
    const isRealtimeOnline = hasVehicleConnectedState
        ? (isVehicleStateFresh && vehicleState.connected)
        : hasFreshTelemetry;
    const connectionLabel = isRealtimeOnline ? 'Online' : 'Disconnected';
    const connectionColorClass = isRealtimeOnline ? 'text-[#32BA87]' : 'text-red-500';
    return (
        <div className="font-tomorrow relative flex h-full w-full flex-col gap-4 overflow-hidden border-l border-[#5E0A0A] bg-[#222222] p-5 shadow-lg select-none">
            <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />


            {/* Header Section */}
            <div className="flex justify-between items-start">
                <div className="flex min-w-0 flex-col text-left">
                    {isLoading ? (
                        <h2 className="text-white text-[18px] font-bold tracking-wide">Loading...</h2>
                    ) : errorMsg ? (
                        <h2 className="text-red-400 text-[18px] font-bold tracking-wide text-sm">{errorMsg}</h2>
                    ) : (
                        <>
                            <h2 className="truncate text-white text-[18px] font-bold tracking-wide">
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
            <div className="flex flex-col gap-2 pt-3 text-left">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-[#ED0000] to-transparent" />
                <h3 className="text-gray-200 text-xs font-semibold tracking-wide">Battery</h3>
                <div className="relative flex min-h-[74px] items-center justify-between px-4 py-3">
                    <img
                        src={batteryBorderImage}
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
                    />
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="w-9 h-4 border-[1.5px] border-gray-400 rounded-[2px] p-[1.5px] relative">
                            <div
                                className="h-full rounded-[1px] transition-all duration-500"
                                style={{ width: batteryStatus.width, backgroundColor: batteryStatus.barColor }}
                            ></div>
                            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-[2px] h-2 bg-gray-400 rounded-r-[1px]"></div>
                        </div>
                        <span className="text-white text-sm font-bold tracking-wider font-mono">{batteryStatus.text}</span>
                    </div>
                    <div className="relative z-10 flex flex-col items-end">
                        <span className={`text-[11px] font-bold tracking-wide ${batteryStatus.color}`}>
                            {battery !== null ? (battery >= 60 ? 'Good' : battery >= 30 ? 'Moderate' : 'Low') : '--'}
                        </span>
                        <span className={`text-[9px] font-medium tracking-wide ${batteryStatus.color}`}>
                            {voltage !== null ? `${voltage.toFixed(1)}V` : batteryStatus.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Weather Section */}
            <div className="flex flex-col gap-2 text-left">
                <h3 className="text-gray-200 text-xs font-semibold tracking-wide">Weather</h3>
                <div className="flex flex-col border border-[#393F44] bg-[rgba(50,50,50,0.5)] p-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <span className="text-[28px] leading-none text-white">{currentWeatherPresentation.icon}</span>
                            <span className="text-white text-2xl font-bold tracking-wider font-sans">
                                {isWeatherLoading ? '--' : formatTemperature(currentWeather.temperature_2m)}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-white text-[13px] font-bold tracking-wide leading-tight">
                                {isWeatherLoading ? 'Loading...' : weatherError ? 'Weather Error' : currentWeatherPresentation.label}
                            </span>
                            <span className="text-gray-300 text-[10px] font-mono tracking-wide mt-[2px]">
                                {formatHour(currentWeather.time)}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <WeatherBadge label="Gust" value={isWeatherLoading ? '--' : formatWind(currentWeather.wind_gusts_10m)} />
                        <WeatherBadge label="Wind" value={isWeatherLoading ? '--' : formatWind(currentWeather.wind_speed_10m)} />
                        <WeatherBadge label="Humid" value={isWeatherLoading ? '--' : formatHumidity(currentWeather.relative_humidity_2m)} />
                        <WeatherBadge label="Visibility" value={isWeatherLoading ? '--' : formatVisibility(currentWeather.visibility)} />
                    </div>

                    <div className="flex justify-center mt-2">
                        <span className={`text-[10px] font-medium tracking-wide ${weatherError ? 'text-red-300' : 'text-[#1ab394]'}`}>
                            {weatherError || (isWeatherLoading ? 'Loading weather...' : 'Live drone weather')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Telemetry Stats Section */}
            <div className="flex flex-col gap-2 flex-1 text-left" style={{ display: 'none' }}>
                <h3 className="text-gray-200 text-xs font-semibold tracking-wide">Telemetry</h3>
                <div className="flex flex-1 flex-col justify-between border border-[#5E0A0A] bg-transparent p-4">

                    {/* Flight Info Grid */}
                    <div className="flex flex-col text-[10px] text-gray-400">
                        <div className="flex justify-between px-1">
                            <div className="flex w-1/2 justify-between pr-4">
                                <span>Altitude</span>
                                <span className="text-gray-200 font-mono">{altitude !== null ? `${Number(altitude).toFixed(1)} m` : '-- m'}</span>
                            </div>
                            <div className="flex w-1/2 justify-between pl-4">
                                <span>Speed</span>
                                <span className="text-gray-200 font-mono">{speed !== null ? `${Number(speed).toFixed(1)} m/s` : '-- m/s'}</span>
                            </div>
                        </div>
                        <div className="h-[1px] w-full bg-[#2a3240] my-1.5 opacity-60"></div>
                        <div className="flex justify-between px-1">
                            <div className="flex w-1/2 justify-between pr-4">
                                <span>Heading</span>
                                <span className="text-gray-200 font-mono">{heading !== null ? `${Number(heading).toFixed(0)}°` : '--°'}</span>
                            </div>
                            <div className="flex w-1/2 justify-between pl-4">
                                <span>Climb</span>
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
                                ? `${flightMode}${isArmed ? ' • Armed' : ' • Disarmed'}`
                                : (isRealtimeOnline ? 'Awaiting data...' : 'Disconnected')}
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
