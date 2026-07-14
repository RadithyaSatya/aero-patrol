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

const geofenceModules = import.meta.glob('../../services/geofences/*.json', { eager: true });
const requestedGeofenceFile = String(import.meta.env.VITE_GEOFENCE_FILE || '').trim();

const availableGeofenceEntries = Object.entries(geofenceModules).map(([sourcePath, module]) => ({
    fileName: sourcePath.split('/').pop(),
    sourcePath,
    data: module?.default ?? module,
}));

const matchedGeofenceEntry = availableGeofenceEntries.find((entry) => entry.fileName === requestedGeofenceFile);
const emptyGeofenceData = { type: 'FeatureCollection', features: [] };

if (requestedGeofenceFile && !matchedGeofenceEntry) {
    console.warn(
        `[geofence] VITE_GEOFENCE_FILE="${requestedGeofenceFile}" not found. Available files: ${availableGeofenceEntries.map((entry) => entry.fileName).join(', ')}`
    );
}

export const AVAILABLE_GEOFENCE_FILES = availableGeofenceEntries.map((entry) => entry.fileName);
export const ACTIVE_GEOFENCE_FILE = requestedGeofenceFile;
export const ACTIVE_GEOFENCE_DATA = matchedGeofenceEntry?.data ?? emptyGeofenceData;
