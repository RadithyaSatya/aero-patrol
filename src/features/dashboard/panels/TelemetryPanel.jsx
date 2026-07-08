import React from 'react';
import { useI18n } from '../../../shared/i18n/I18nProvider';
import { resolveTelemetryBattery } from '../../../shared/utils/telemetryBattery';

const STREAM_PANEL_FILL = 'linear-gradient(180deg, #F5F5F5 0%, #EDEDED 100%)';
const STREAM_PANEL_BORDER = 'linear-gradient(135deg, #FB5555 0%, #ED0000 18%, rgba(251, 85, 85, 0.42) 40%, rgba(251, 85, 85, 0.12) 56%, rgba(251, 85, 85, 0) 66%)';

const TelemetryRow = ({ label, value }) => (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 py-1.5">
        <span className="font-inter text-[15px] font-medium tracking-[0.01em] text-[#111111]">{label}</span>
        <span className="font-inter text-right text-[15px] font-medium tracking-[0.01em] text-[#111111]">{value}</span>
    </div>
);

export default function TelemetryPanel({
    headerAction = null,
    telemetry = null,
    telemetryStatus = null,
}) {
    const { t } = useI18n();
    const location = telemetry?.location || {};
    const gps = telemetry?.gps || {};
    const gps2 = telemetry?.gps2 || {};
    const vehicleState = telemetry?.vehicle_state || {};
    const link = telemetry?.link || {};
    const isLocationFresh = Boolean(telemetryStatus?.metrics?.location?.isFresh);
    const batteryState = resolveTelemetryBattery(telemetry, telemetryStatus);
    const isGpsFresh = Boolean(telemetryStatus?.metrics?.gps?.isFresh);
    const isGps2Fresh = Boolean(telemetryStatus?.metrics?.gps2?.isFresh);
    const isVehicleStateFresh = Boolean(telemetryStatus?.metrics?.vehicle_state?.isFresh);
    const isLinkFresh = Boolean(telemetryStatus?.metrics?.link?.isFresh);
    const gps1On = isGpsFresh && ((Number(gps.fix_type) > 0) || Number(gps.satellites) > 0);
    const gps2On = isGps2Fresh && ((Number(gps2.fix_type) > 0) || Number(gps2.satellites) > 0);
    const telemetryRows = [
        {
            label: t('dashboard.flightMode'),
            value: isVehicleStateFresh ? (vehicleState.mode || t('dashboard.awaitingData')) : t('dashboard.disconnected'),
        },
        {
            label: t('dashboard.gps1'),
            value: isGpsFresh ? (gps1On ? t('dashboard.online') : 'Off') : '--',
        },
        {
            label: t('dashboard.gps2'),
            value: isGps2Fresh ? (gps2On ? t('dashboard.online') : 'Off') : '--',
        },
        {
            label: t('dashboard.satellite1'),
            value: isGpsFresh && gps.satellites != null ? `${gps.satellites}` : '--',
        },
        {
            label: t('dashboard.satellite2'),
            value: isGps2Fresh && gps2.satellites != null ? `${gps2.satellites}` : '--',
        },
        {
            label: t('dashboard.hdop1'),
            value: isGpsFresh && gps.hdop != null ? `${Number(gps.hdop).toFixed(2)}` : '--',
        },
        {
            label: t('dashboard.hdop2'),
            value: isGps2Fresh && gps2.hdop != null ? `${Number(gps2.hdop).toFixed(2)}` : '--',
        },
        {
            label: t('dashboard.altitude'),
            value: isLocationFresh && location.altitude != null ? `${Number(location.altitude).toFixed(1)} m` : '-- m',
        },
        {
            label: t('dashboard.speed'),
            value: isLocationFresh && location.ground_speed != null ? `${Number(location.ground_speed).toFixed(1)} m/s` : '-- m/s',
        },
        {
            label: t('dashboard.heading'),
            value: isLocationFresh && location.heading != null ? `${Number(location.heading).toFixed(0)}°` : '--°',
        },
        {
            label: 'SAT',
            value: isGpsFresh && gps.satellites != null ? `${gps.satellites}` : '--',
        },
        {
            label: 'RSSI',
            value: isLinkFresh && link.rssi != null ? `${link.rssi}` : '--',
        },
        {
            label: 'BAT',
            value: batteryState.percent != null ? `${batteryState.percent}%` : '--',
        },
        {
            label: t('dashboard.live'),
            value: isVehicleStateFresh && typeof vehicleState.connected === 'boolean'
                ? (vehicleState.connected ? t('dashboard.online') : t('dashboard.disconnected'))
                : t('dashboard.awaitingData'),
        },
    ];

    return (
        <div
            className="font-inter relative h-full w-full overflow-hidden rounded-[30px] p-px select-none"
            style={{ backgroundImage: STREAM_PANEL_BORDER }}
        >
            <div
                className="relative flex h-full w-full flex-col overflow-hidden rounded-[29px] px-6 py-6"
                style={{ background: STREAM_PANEL_FILL }}
            >
                <div className="flex shrink-0 items-center justify-between gap-3 pb-5">
                    <div className="flex items-center gap-3">
                        <span className="h-[34px] w-[6px] bg-[#FF4A4A]" />
                        <p className="font-inter text-left text-[22px] font-bold tracking-[-0.01em] text-[#111111]">{t('dashboard.droneStatus')}</p>
                    </div>
                    {headerAction}
                </div>

                <div className="min-h-0 flex-1 overflow-auto pr-1">
                    {telemetryRows.map((item) => (
                        <TelemetryRow key={item.label} label={item.label} value={item.value} />
                    ))}
                </div>
            </div>
        </div>
    );
}
