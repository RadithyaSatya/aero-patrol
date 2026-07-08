const parseEnvBoolean = (value, defaultValue = true) => {
    if (value == null || value === '') {
        return defaultValue;
    }

    const normalizedValue = String(value).trim().toLowerCase();

    if (['true', '1', 'yes', 'on'].includes(normalizedValue)) {
        return true;
    }

    if (['false', '0', 'no', 'off'].includes(normalizedValue)) {
        return false;
    }

    return defaultValue;
};

export const IS_GEOFENCE_JSON_ENABLED = parseEnvBoolean(import.meta.env.VITE_GEOFENCE_JSON_ENABLED, true);
