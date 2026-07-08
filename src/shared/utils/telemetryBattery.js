const toFiniteNumberOrNull = (value) => {
    if (value == null || value === '') {
        return null;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
};

export function resolveTelemetryBattery(telemetry = null, telemetryStatus = null) {
    const batteryTelemetry = telemetry?.battery || null;
    const vehicleStateTelemetry = telemetry?.vehicle_state || null;
    const dockingStatusTelemetry = telemetry?.docking_status || null;
    const uavStatusTelemetry = telemetry?.uav_status || null;

    const isBatteryFresh = Boolean(telemetryStatus?.metrics?.battery?.isFresh);
    const isVehicleStateFresh = Boolean(telemetryStatus?.metrics?.vehicle_state?.isFresh);
    const isDockingStatusFresh = Boolean(telemetryStatus?.metrics?.docking_status?.isFresh);
    const isUavStatusFresh = Boolean(telemetryStatus?.metrics?.uav_status?.isFresh);

    const isDroneOnline = Boolean(
        isVehicleStateFresh && vehicleStateTelemetry?.connected === true
    );
    const hasDockingBatterySnapshot = Boolean(
        isUavStatusFresh && (
            uavStatusTelemetry?.battery_percent != null ||
            uavStatusTelemetry?.battery_voltage != null
        )
    );
    const shouldUseDockingBatteryFallback = !isDroneOnline && hasDockingBatterySnapshot;

    const percent = shouldUseDockingBatteryFallback
        ? toFiniteNumberOrNull(uavStatusTelemetry?.battery_percent)
        : (isBatteryFresh ? toFiniteNumberOrNull(batteryTelemetry?.percent) : null);
    const voltage = shouldUseDockingBatteryFallback
        ? toFiniteNumberOrNull(uavStatusTelemetry?.battery_voltage)
        : (isBatteryFresh ? toFiniteNumberOrNull(batteryTelemetry?.voltage) : null);
    const temperature = shouldUseDockingBatteryFallback
        ? (isDockingStatusFresh ? toFiniteNumberOrNull(dockingStatusTelemetry?.temperature) : null)
        : (
            isDockingStatusFresh
                ? toFiniteNumberOrNull(dockingStatusTelemetry?.temperature)
                : (
                    isBatteryFresh
                        ? toFiniteNumberOrNull(
                            batteryTelemetry?.temperature
                            ?? batteryTelemetry?.temp
                            ?? batteryTelemetry?.battery_temperature
                        )
                        : null
                )
        );

    return {
        percent,
        voltage,
        temperature,
        source: shouldUseDockingBatteryFallback ? 'uav_status' : 'battery',
        isBatteryFresh,
        isVehicleStateFresh,
        isDockingStatusFresh,
        isUavStatusFresh,
        isDroneOnline,
        shouldUseDockingBatteryFallback,
    };
}
