import legacyGeofenceData from '../../services/geofence.json';

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
const requestedGeofenceFile = String(import.meta.env.VITE_GEOFENCE_FILE || 'geofence.json').trim();

const availableGeofenceEntries = [
    {
        fileName: 'geofence.json',
        sourcePath: '../../services/geofence.json',
        data: legacyGeofenceData,
    },
    ...Object.entries(geofenceModules).map(([sourcePath, module]) => ({
        fileName: sourcePath.split('/').pop(),
        sourcePath,
        data: module?.default ?? module,
    })),
];

const matchedGeofenceEntry = availableGeofenceEntries.find((entry) => entry.fileName === requestedGeofenceFile);
const fallbackGeofenceEntry = availableGeofenceEntries[0] || {
    fileName: 'geofence.json',
    sourcePath: '../../services/geofence.json',
    data: { type: 'FeatureCollection', features: [] },
};

const activeGeofenceEntry = matchedGeofenceEntry || fallbackGeofenceEntry;

export const AVAILABLE_GEOFENCE_FILES = availableGeofenceEntries.map((entry) => entry.fileName);
export const ACTIVE_GEOFENCE_FILE = activeGeofenceEntry.fileName;
export const ACTIVE_GEOFENCE_DATA = activeGeofenceEntry.data;
