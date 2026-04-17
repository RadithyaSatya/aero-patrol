import React from 'react';

const SOLID_STROKE_RED = '#FC4747';

const TAPERED_STROKE_STYLE = {
    backgroundImage: `linear-gradient(to top, ${SOLID_STROKE_RED} 0%, rgba(252,71,71,0.28) 72%, rgba(252,71,71,0.08) 100%)`
};

const EdgeFadePanel = ({
    children,
    className = '',
    withTopStroke = false,
    solidStroke = false,
    taperedStroke = false,
    backgroundClassName = 'bg-[#222222]'
}) => (
    <div className={`relative min-h-0 overflow-hidden ${backgroundClassName} ${className}`}>
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
        backgroundClassName="bg-[#222222]"
        className="flex h-full items-center justify-between px-2.5 py-1.5"
    >
        <div className="flex min-w-0 items-center gap-2">
            <img
                src="/src/assets/images/icon_storage.svg"
                alt=""
                aria-hidden="true"
                className="h-6 w-6 shrink-0 object-contain"
            />
            <span className="truncate text-[16px] font-medium tracking-wide text-white">Storage Capacity</span>
        </div>
        <span className="ml-3 shrink-0 text-[16px] font-semibold tracking-wide text-white">{value}</span>
    </EdgeFadePanel>
);

const TelemetryStat = ({ label, value }) => (
    <div className="border border-[#393F44] bg-[#1A1A1A] px-2.5 py-1.5">
        <p className="text-[8px] uppercase tracking-[0.16em] text-gray-500">{label}</p>
        <p className="mt-0.5 text-[12px] font-medium tracking-wide text-white">{value}</p>
    </div>
);

export default function FlightStreamControlPanel({
    secondaryPanel,
    onSwitchPanel,
    switchButtonImage,
    telemetry = null,
    isTelemetryConnected = false
}) {
    const location = telemetry?.location || {};
    const battery = telemetry?.battery || {};
    const gps = telemetry?.gps || {};
    const vehicleState = telemetry?.vehicle_state || {};
    const link = telemetry?.link || {};

    const telemetryStats = [
        { label: 'ALT', value: location.altitude != null ? `${Number(location.altitude).toFixed(1)} m` : '-- m' },
        { label: 'SPD', value: location.ground_speed != null ? `${Number(location.ground_speed).toFixed(1)} m/s` : '-- m/s' },
        { label: 'BAT', value: battery.percent != null ? `${battery.percent}%` : '--' },
        { label: 'SAT', value: gps.satellites != null ? `${gps.satellites}` : '--' }
    ];

    return (
        <div className="font-tomorrow h-full w-full overflow-hidden border border-[#D53535] bg-[#222222] p-3 shadow-lg select-none">
            <div className="grid h-full grid-cols-[460px_minmax(0,1fr)] gap-5">
                <div className="flex min-w-0 flex-col gap-2">
                    <EdgeFadePanel className="flex-1 p-1">
                        <div className="h-full w-full overflow-hidden border-b border-[#5E0A0A]">
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
                            backgroundClassName="bg-[#222222]"
                            className="flex-1 p-1"
                        >
                            <div className="grid h-full grid-cols-2 gap-1">
                                <button
                                    type="button"
                                    className="relative h-full transition-colors hover:bg-[#1B2331]/50"
                                >
                                    <div className="absolute inset-[4px] flex items-center justify-center">
                                        <img
                                            src="/src/assets/images/btn_record_dashboard.png"
                                            alt="Record"
                                            className="w-full h-auto object-contain"
                                        />
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    className="relative h-full transition-colors hover:bg-[#1B2331]/50"
                                >
                                    <div className="absolute inset-[4px] flex items-center justify-center">
                                        <img
                                            src="/src/assets/images/btn_capture_dashboard.png"
                                            alt="Capture"
                                            className="w-full h-auto object-contain"
                                        />
                                    </div>
                                </button>
                            </div>
                        </EdgeFadePanel>

                        <div className="min-h-0 flex-1">
                            <StorageCard value="140/100GB" />
                        </div>

                        <button
                            type="button"
                            className="flex min-h-0 flex-1 w-full items-center justify-center px-0 py-0 transition-transform hover:scale-[1.01] active:scale-[0.99]"
                        >
                            <img
                                src="/src/assets/images/btn_abort_mission_dashboard.png"
                                alt="Abort Mission"
                                className="h-full w-full object-contain"
                            />
                        </button>
                    </div>

                    <div className="flex min-w-0 flex-col border border-[#D53535] bg-[#222222] px-2.5 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-[14px] font-medium tracking-wide text-white">Telemetry</p>
                                <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-gray-500">Quick overview</p>
                            </div>
                            <div className={`text-[9px] font-medium uppercase tracking-[0.16em] ${isTelemetryConnected ? 'text-[#1ab394]' : 'text-gray-500'}`}>
                                {isTelemetryConnected ? 'Live' : 'Offline'}
                            </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                            {telemetryStats.map((stat) => (
                                <TelemetryStat key={stat.label} label={stat.label} value={stat.value} />
                            ))}
                        </div>

                        <div className="mt-2 border border-[#393F44] bg-[#1A1A1A] px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[8px] uppercase tracking-[0.16em] text-gray-500">Flight Mode</p>
                                <p className="text-[8px] uppercase tracking-[0.16em] text-gray-500">
                                    HDG {location.heading != null ? `${Number(location.heading).toFixed(0)}°` : '--°'}
                                </p>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <p className="text-[12px] font-medium tracking-wide text-white">
                                    {vehicleState.mode || (isTelemetryConnected ? 'Awaiting data' : 'Disconnected')}
                                </p>
                                <p className={`text-[9px] uppercase tracking-[0.16em] ${vehicleState.armed ? 'text-[#1ab394]' : 'text-gray-500'}`}>
                                    {vehicleState.armed ? 'Armed' : 'Standby'}
                                </p>
                            </div>
                            <div className="mt-1 text-[9px] text-gray-400">
                                RSSI {link.rssi != null ? link.rssi : '--'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
