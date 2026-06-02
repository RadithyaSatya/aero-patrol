const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://api-xflight.kumalabs.tech';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://api-xflight.kumalabs.tech';

const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');

    return {
        'Authorization': `Bearer ${token}`,
    };
};

const parseFilenameFromDisposition = (contentDisposition, fallbackName) => {
    if (!contentDisposition) {
        return fallbackName;
    }

    const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
        return decodeURIComponent(utfMatch[1]);
    }

    const asciiMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    if (asciiMatch?.[1]) {
        return asciiMatch[1];
    }

    return fallbackName;
};

const fetchBlobResponse = async (url, fallbackName) => {
    const response = await fetch(url, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to fetch file');
    }

    const blob = await response.blob();
    const filename = parseFilenameFromDisposition(
        response.headers.get('Content-Disposition'),
        fallbackName
    );

    return {
        blob,
        filename,
        contentType: response.headers.get('Content-Type') || blob.type || '',
    };
};

export const authService = {
    login: async (username, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        return data;
    },

    getWsToken: async () => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/auth/ws-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to get WebSocket token');
        }

        return response.json();
    }
};

export const uavService = {
    getUav: async () => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/uav`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch UAV');
        }

        return response.json();
    }
};

export const dockingService = {
    getDocking: async () => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/docking`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch docking');
        }

        return response.json();
    }
};

export const userService = {
    getUsers: async ({ page = 1, limit = 50, username = '' } = {}) => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
        });

        if (username) {
            params.set('username', username);
        }

        const response = await fetch(`${API_BASE_URL}/users?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch users');
        }

        return response.json();
    },

    createUser: async (payload) => {
        const token = localStorage.getItem('authToken');
        const deviceToken = localStorage.getItem('deviceToken');

        if (!token && !deviceToken) {
            throw new Error('No authentication token found');
        }

        const headers = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        } else {
            headers['X-Device-Token'] = deviceToken;
        }

        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create user');
        }

        return data;
    },

    deleteUser: async (userId) => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data.error || 'Failed to delete user');
            error.status = response.status;
            throw error;
        }

        return data;
    }
};

export const missionService = {
    getMissions: async (page = 1, limit = 50, uavId = '') => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const uavParam = uavId ? `&uav_id=${uavId}` : '';
        const response = await fetch(`${API_BASE_URL}/missions/me?page=${page}&limit=${limit}${uavParam}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch missions');
        }

        return response.json();
    },

    getMissionRuns: async ({ page = 1, limit = 20, uavId = '', upcoming = 'today', days } = {}) => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
            upcoming,
        });

        if (uavId) {
            params.set('uav_id', String(uavId));
        }

        if (upcoming === 'later' && Number.isInteger(days) && days > 0) {
            params.set('days', String(days));
        }

        const response = await fetch(`${API_BASE_URL}/mission-runs?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch mission runs');
        }

        return response.json();
    },

    getMissionById: async (missionId) => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/missions/${missionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || 'Failed to fetch mission detail');
        }

        return response.json();
    },

    createMission: async (payload) => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/missions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data.error || data.message || 'Failed to create mission');
            error.code = data.code;
            error.details = data;
            throw error;
        }

        return data;
    },

    previewMissionConflicts: async (payload) => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/mission-conflicts/preview`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data.error || data.message || 'Failed to preview mission conflicts');
            error.code = data.code;
            error.details = data;
            throw error;
        }

        return data;
    },

    deleteMission: async (missionId) => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/missions/${missionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to delete mission');
        }

        return data;
    }
};

export const historyService = {
    getMissionHistory: async ({ page = 1, limit = 20, missionId = '', missionName = '' } = {}) => {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
        });

        if (missionId) {
            params.set('mission_id', String(missionId));
        }

        if (missionName) {
            params.set('mission_name', missionName);
        }

        const response = await fetch(`${API_BASE_URL}/mission-history?${params.toString()}`, {
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || 'Failed to fetch mission history');
        }

        return response.json();
    },

    getMissionHistoryMedia: async (historyId, { eventId = '', includeFullVideo = false } = {}) => {
        const params = new URLSearchParams();

        if (eventId) {
            params.set('event_id', String(eventId));
        }

        if (includeFullVideo) {
            params.set('include_full_video', 'true');
        }

        const query = params.toString();
        const response = await fetch(`${API_BASE_URL}/mission-history/${historyId}/media${query ? `?${query}` : ''}`, {
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || 'Failed to fetch mission media');
        }

        return response.json();
    },

    getMissionHistoryFullVideoFile: async (historyId) => (
        fetchBlobResponse(
            `${API_BASE_URL}/mission-history/${historyId}/full-video`,
            `mission-history-${historyId}-full-video.mp4`
        )
    ),

    getMissionHistoryMediaArchiveFile: async (historyId) => (
        fetchBlobResponse(
            `${API_BASE_URL}/mission-history/${historyId}/media/archive`,
            `mission-history-${historyId}-media.zip`
        )
    ),
};

export const telemetryService = {
    getTrack: async () => {
        const token = localStorage.getItem('authToken');
        const deviceToken = localStorage.getItem('deviceToken');

        if (!token && !deviceToken) {
            throw new Error('No authentication token found');
        }

        const headers = {};

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        } else {
            headers['X-Device-Token'] = deviceToken;
        }

        const response = await fetch(`${API_BASE_URL}/telemetry/track`, {
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || 'Failed to fetch telemetry track');
        }

        return response.json();
    }
};

export const weatherService = {
    getForecast: async ({ latitude, longitude, forecastHours = 6 } = {}) => {
        const normalizedLatitude = Number(latitude);
        const normalizedLongitude = Number(longitude);

        if (!Number.isFinite(normalizedLatitude) || !Number.isFinite(normalizedLongitude)) {
            throw new Error('Invalid coordinates for weather forecast');
        }

        const params = new URLSearchParams({
            latitude: String(normalizedLatitude),
            longitude: String(normalizedLongitude),
            current: [
                'temperature_2m',
                'relative_humidity_2m',
                'weather_code',
                'wind_speed_10m',
                'wind_gusts_10m',
                'visibility',
                'is_day',
            ].join(','),
            hourly: [
                'temperature_2m',
                'weather_code',
                'is_day',
            ].join(','),
            forecast_hours: String(forecastHours),
            timezone: 'auto',
            wind_speed_unit: 'ms',
        });

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.reason || errorData.error || 'Failed to fetch weather forecast');
        }

        return response.json();
    }
};
