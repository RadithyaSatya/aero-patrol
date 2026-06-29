import React from 'react';
import storageIcon from '../../../assets/images/icon_storage.svg';
import recordIcon from '../../../assets/images/icon_record.svg';
import captureIcon from '../../../assets/images/icon_capture.svg';
import abortMissionButton from '../../../assets/images/btn_abort_mission_dashboard_white.png';

const SOLID_STROKE_RED = '#FF383C';
const PANEL_BACKGROUND = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const INNER_CARD_BACKGROUND = 'rgba(197, 197, 197, 0.5)';
const INNER_CARD_STROKE = '#7A0A0C';

const TAPERED_STROKE_STYLE = {
    backgroundImage: `linear-gradient(to top, ${SOLID_STROKE_RED} 0%, rgba(252,71,71,0.28) 72%, rgba(252,71,71,0.08) 100%)`
};

const EdgeFadePanel = ({
    children,
    className = '',
    withTopStroke = false,
    solidStroke = false,
    taperedStroke = false,
    backgroundClassName = ''
}) => (
    <div className={`relative min-h-0 overflow-hidden ${backgroundClassName} ${className}`} style={{ backgroundColor: INNER_CARD_BACKGROUND }}>
        {withTopStroke && (
            <div
                className="pointer-events-none absolute left-0 right-0 top-0 h-px"
                style={{ backgroundColor: solidStroke ? 'rgba(252,71,71,0.18)' : 'rgba(237,0,0,0.35)' }}
            />
        )}
        <div
            className={`pointer-events-none absolute bottom-0 left-0 h-full w-px ${solidStroke || taperedStroke ? '' : 'bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent'}`}
            style={solidStroke ? { backgroundColor: SOLID_STROKE_RED } : taperedStroke ? TAPERED_STROKE_STYLE : undefined}
        />
        <div
            className={`pointer-events-none absolute bottom-0 right-0 h-full w-px ${solidStroke || taperedStroke ? '' : 'bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent'}`}
            style={solidStroke ? { backgroundColor: SOLID_STROKE_RED } : taperedStroke ? TAPERED_STROKE_STYLE : undefined}
        />
        <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
            style={{ backgroundColor: solidStroke ? SOLID_STROKE_RED : '#ED0000' }}
        />
        {children}
    </div>
);

const StorageCard = ({ value }) => (
    <EdgeFadePanel
        withTopStroke
        taperedStroke
        className="flex h-full items-center justify-between px-2.5 py-1.5"
    >
        <div className="flex min-w-0 items-center gap-2">
            <img
                src={storageIcon}
                alt=""
                aria-hidden="true"
                className="h-6 w-6 shrink-0 object-contain"
            />
            <span className="truncate text-[16px] font-medium tracking-wide text-[#1F1F1F]">Storage Capacity</span>
        </div>
        <span className="ml-3 shrink-0 text-[16px] font-medium tracking-wide text-[#1F1F1F]">{value}</span>
    </EdgeFadePanel>
);

const TelemetryStat = ({ label, value }) => (
    <div className="border px-2.5 py-1.5" style={{ borderColor: '#9F9F9F', backgroundColor: '#D2D2D2' }}>
        <p className="text-[8px] uppercase tracking-[0.16em] text-[#5F5F5F]">{label}</p>
        <p className="mt-0.5 text-[12px] font-medium tracking-wide text-[#1F1F1F]">{value}</p>
    </div>
);

export default function FlightStreamControlPanel({
    secondaryPanel,
    onSwitchPanel,
    switchButtonImage,
    telemetry = null,
    telemetryStatus = null,
    isTelemetryConnected = false,
    onAbortMission = null,
    isAbortDisabled = false,
    isAbortingMission = false,
    abortMissionError = '',
    onTakePicture = null,
    onStartRecording = null,
    isCaptureDisabled = false,
    isRecordDisabled = false,
    cameraCommandError = '',
}) {
    const location = telemetry?.location || {};
    const battery = telemetry?.battery || {};
    const gps = telemetry?.gps || {};
    const vehicleState = telemetry?.vehicle_state || {};
    const link = telemetry?.link || {};
    const isLocationFresh = Boolean(telemetryStatus?.metrics?.location?.isFresh);
    const isBatteryFresh = Boolean(telemetryStatus?.metrics?.battery?.isFresh);
    const isGpsFresh = Boolean(telemetryStatus?.metrics?.gps?.isFresh);
    const isVehicleStateFresh = Boolean(telemetryStatus?.metrics?.vehicle_state?.isFresh);
    const isLinkFresh = Boolean(telemetryStatus?.metrics?.link?.isFresh);
    const hasVehicleConnectedState = typeof vehicleState.connected === 'boolean';
    const hasFreshTelemetry = Boolean(
        isLocationFresh || isBatteryFresh || isGpsFresh || isVehicleStateFresh || isLinkFresh
    );
    const isRealtimeOnline = hasVehicleConnectedState
        ? (isVehicleStateFresh && vehicleState.connected)
        : hasFreshTelemetry;

    const telemetryStats = [
        { label: 'ALT', value: isLocationFresh && location.altitude != null ? `${Number(location.altitude).toFixed(1)} m` : '-- m' },
        { label: 'SPD', value: isLocationFresh && location.ground_speed != null ? `${Number(location.ground_speed).toFixed(1)} m/s` : '-- m/s' },
        { label: 'BAT', value: isBatteryFresh && battery.percent != null ? `${battery.percent}%` : '--' },
        { label: 'SAT', value: isGpsFresh && gps.satellites != null ? `${gps.satellites}` : '--' }
    ];

    return (
        <div className="font-tomorrow h-full w-full overflow-hidden border border-[#FF383C] p-3 shadow-lg select-none" style={{ background: PANEL_BACKGROUND }}>
            <div className="grid h-full grid-cols-[460px_minmax(0,1fr)] gap-5">
                <div className="flex min-w-0 flex-col gap-2">
                    <EdgeFadePanel className="flex-1 p-1">
                        <div className="h-full w-full overflow-hidden border-b border-[#FF383C]">
                            {secondaryPanel}
                        </div>

                        <button
                            type="button"
                            onClick={onSwitchPanel}
                            aria-label="Switch map and camera panels"
                            className="absolute bottom-3 left-3 z-[550] h-[40px] w-[40px] transition-transform hover:scale-105"
                        >
                            <img
                                src={switchButtonImage}
                                alt=""
                                aria-hidden="true"
                                className="h-full w-full object-contain"
                            />
                        </button>
                    </EdgeFadePanel>
                </div>

                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] gap-5">
                    <div className="flex min-w-0 flex-col gap-3">
                        <EdgeFadePanel
                            withTopStroke
                            taperedStroke
                            className="flex-1 p-1"
                        >
                            <div className="grid h-full grid-cols-2 gap-1">
                                <button
                                    type="button"
                                    onClick={onStartRecording}
                                    disabled={isRecordDisabled}
                                    className={`flex h-full w-full items-center justify-center gap-3 border border-[#FC4747] bg-[#EBEBEB] transition-colors ${
                                        isRecordDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-[#E1E1E1]'
                                    }`}
                                >
                                    <img
                                        src={recordIcon}
                                        alt="Record"
                                        className="h-7 w-7 object-contain"
                                    />
                                    <span className="text-[16px] font-medium tracking-[0.16em] text-[#000000]">Record</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={onTakePicture}
                                    disabled={isCaptureDisabled}
                                    className={`flex h-full w-full items-center justify-center gap-3 border border-[#FC4747] bg-[#EBEBEB] transition-colors ${
                                        isCaptureDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-[#E1E1E1]'
                                    }`}
                                >
                                    <img
                                        src={captureIcon}
                                        alt="Capture"
                                        className="h-8 w-8 object-contain"
                                    />
                                    <span className="text-[16px] font-medium tracking-[0.16em] text-[#000000]">Capture</span>
                                </button>
                            </div>
                        </EdgeFadePanel>

                        <div className="min-h-0 flex-1">
                            <StorageCard value="140/100GB" />
                        </div>

                        <button
                            type="button"
                            onClick={onAbortMission}
                            disabled={isAbortDisabled || isAbortingMission}
                            className={`flex min-h-0 flex-1 w-full items-center justify-center px-0 py-0 transition-transform ${
                                isAbortDisabled || isAbortingMission
                                    ? 'cursor-not-allowed opacity-60'
                                    : 'hover:scale-[1.01] active:scale-[0.99]'
                            }`}
                        >
                            <img
                                src={abortMissionButton}
                                alt={isAbortingMission ? 'Aborting Mission' : 'Abort Mission'}
                                className="h-full w-full object-contain"
                            />
                        </button>
                        {abortMissionError ? (
                            <p className="text-[11px] tracking-wide text-[#7A0A0C]">{abortMissionError}</p>
                        ) : null}
                        {cameraCommandError ? (
                            <p className="text-[11px] tracking-wide text-[#7A0A0C]">{cameraCommandError}</p>
                        ) : null}
                    </div>

                    <div className="flex min-w-0 flex-col border px-2.5 py-2.5" style={{ borderColor: '#FF383C', backgroundColor: INNER_CARD_BACKGROUND }}>
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-[14px] font-medium tracking-wide text-[#1F1F1F]">Telemetry</p>
                                <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-[#5F5F5F]">Quick overview</p>
                            </div>
                            <div className={`text-[9px] font-medium uppercase tracking-[0.16em] ${isRealtimeOnline ? 'text-[#1ab394]' : 'text-[#5F5F5F]'}`}>
                                {isRealtimeOnline ? 'Live' : 'Disconnected'}
                            </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                            {telemetryStats.map((stat) => (
                                <TelemetryStat key={stat.label} label={stat.label} value={stat.value} />
                            ))}
                        </div>

                        <div className="mt-2 border px-2.5 py-2" style={{ borderColor: '#9F9F9F', backgroundColor: '#D2D2D2' }}>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[8px] uppercase tracking-[0.16em] text-[#5F5F5F]">Flight Mode</p>
                                <p className="text-[8px] uppercase tracking-[0.16em] text-[#5F5F5F]">
                                    HDG {isLocationFresh && location.heading != null ? `${Number(location.heading).toFixed(0)}°` : '--°'}
                                </p>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <p className="text-[12px] font-medium tracking-wide text-[#1F1F1F]">
                                    {isVehicleStateFresh ? (vehicleState.mode || 'Awaiting data') : 'Disconnected'}
                                </p>
                                <p className={`text-[9px] uppercase tracking-[0.16em] ${isVehicleStateFresh && vehicleState.armed ? 'text-[#1ab394]' : 'text-[#5F5F5F]'}`}>
                                    {isVehicleStateFresh ? (vehicleState.armed ? 'Armed' : 'Standby') : '--'}
                                </p>
                            </div>
                            <div className="mt-1 text-[9px] text-[#5F5F5F]">
                                RSSI {isLinkFresh && link.rssi != null ? link.rssi : '--'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
