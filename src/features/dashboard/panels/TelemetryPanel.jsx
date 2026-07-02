import React from 'react';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const STREAM_PANEL_FILL = 'linear-gradient(180deg, #F5F5F5 0%, #EDEDED 100%)';
const STREAM_PANEL_BORDER = 'linear-gradient(135deg, #FB5555 0%, #ED0000 18%, rgba(251, 85, 85, 0.42) 40%, rgba(251, 85, 85, 0.12) 56%, rgba(251, 85, 85, 0) 66%)';

const TelemetryRow = ({ label, value }) => (
    <div className="flex items-center justify-between gap-3 border-b border-[#C7C7C7] py-2 last:border-b-0">
        <span className="text-[12px] font-medium tracking-[0.04em] text-[#2C2C2C]">{label}</span>
        <span className="text-right text-[12px] font-semibold tracking-[0.04em] text-[#1F1F1F]">{value}</span>
    </div>
);

export default function TelemetryPanel({
    headerAction = null,
    telemetry = null,
    telemetryStatus = null,
}) {
    const { t } = useI18n();
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
    const telemetryRows = [
        {
            label: t('dashboard.flightMode'),
            value: isVehicleStateFresh ? (vehicleState.mode || t('dashboard.awaitingData')) : t('dashboard.disconnected'),
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
            value: isBatteryFresh && battery.percent != null ? `${battery.percent}%` : '--',
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
                className="relative flex h-full w-full flex-col overflow-hidden rounded-[29px] px-5 py-4"
                style={{ background: STREAM_PANEL_FILL }}
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D7D7D7] pb-3">
                    <div className="flex items-center gap-3">
                        <span className="h-[20px] w-[5px] bg-[#FF383C]" />
                        <p className="text-left text-[16px] font-medium tracking-wide text-[#1F1F1F]">{t('dashboard.telemetry')}</p>
                    </div>
                    {headerAction}
                </div>

                <div className="mt-3 flex shrink-0 items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#5F5F5F]">{t('dashboard.quickOverview')}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#5F5F5F]">{t('dashboard.live')}</p>
                </div>

                <div className="mt-1 min-h-0 flex-1 overflow-auto pr-1">
                    {telemetryRows.map((item) => (
                        <TelemetryRow key={item.label} label={item.label} value={item.value} />
                    ))}
                </div>
            </div>
        </div>
    );
}
