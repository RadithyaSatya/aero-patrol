const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://api-xflight.kumalabs.tech';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://api-xflight.kumalabs.tech';
export const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'https://sso.connectmesh.io';
export const SSO_LOGOUT_REDIRECT_URL = import.meta.env.VITE_SSO_LOGOUT_REDIRECT_URL || PORTAL_URL;
const SSO_LOGOUT_URL = import.meta.env.VITE_SSO_LOGOUT_URL || 'https://sso-oauth.connectmesh.io/v1/auth/logout';
const SSO_LOGOUT_ALL = import.meta.env.VITE_SSO_LOGOUT_ALL === 'true';
const FRIENDLY_NETWORK_ERROR_MESSAGE = 'Unable to connect. Try again.';
const FRIENDLY_TIMEOUT_ERROR_MESSAGE = 'Request timed out. Try again.';

export const clearAuthStorage = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUsername');
    localStorage.removeItem('authUserId');
    localStorage.removeItem('authRole');
    localStorage.removeItem('authMethod');
    localStorage.removeItem('authSsoUserId');
    localStorage.removeItem('deviceToken');
};

export const persistAuthSession = (session = {}) => {
    const authMethod = session.auth_method === 'sso' ? 'sso' : 'local';
    localStorage.setItem('authMethod', authMethod);

    if (session.sso_user_id) {
        localStorage.setItem('authSsoUserId', String(session.sso_user_id));
    } else {
        localStorage.removeItem('authSsoUserId');
    }
};

export const persistAuthProfile = (profile = {}) => {
    if (profile.username) {
        localStorage.setItem('authUsername', profile.username);
    } else {
        localStorage.removeItem('authUsername');
    }

    if (profile.id != null) {
        localStorage.setItem('authUserId', String(profile.id));
    } else if (profile.user_id != null) {
        localStorage.setItem('authUserId', String(profile.user_id));
    } else {
        localStorage.removeItem('authUserId');
    }

    if (profile.role) {
        localStorage.setItem('authRole', profile.role);
    } else {
        localStorage.removeItem('authRole');
    }
};

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

const normalizeRequestErrorMessage = (message, fallbackMessage = 'Something went wrong.') => {
    const normalizedMessage = String(message || '').trim();

    if (!normalizedMessage) {
        return fallbackMessage;
    }

    if (/failed to fetch|networkerror|load failed|network request failed/i.test(normalizedMessage)) {
        return FRIENDLY_NETWORK_ERROR_MESSAGE;
    }

    if (/timeout|timed out|aborterror/i.test(normalizedMessage)) {
        return FRIENDLY_TIMEOUT_ERROR_MESSAGE;
    }

    return normalizedMessage;
};

const createRequestError = (message, fallbackMessage, extras = {}) => {
    const error = new Error(normalizeRequestErrorMessage(message, fallbackMessage));

    Object.entries(extras).forEach(([key, value]) => {
        if (value !== undefined) {
            error[key] = value;
        }
    });

    return error;
};

const rethrowFriendlyError = (error, fallbackMessage) => {
    if (error instanceof Error) {
        throw createRequestError(error.message, fallbackMessage, {
            status: error.status,
            code: error.code,
            details: error.details,
        });
    }

    throw createRequestError('', fallbackMessage);
};

const fetchBlobResponse = async (url, fallbackName) => {
    try {
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw createRequestError(errorData.error || errorData.message, 'Unable to download the file right now.', {
                status: response.status,
            });
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
    } catch (error) {
        rethrowFriendlyError(error, 'Unable to download the file right now.');
    }
};

export const authService = {
    login: async (username, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw createRequestError(data.error, 'Unable to sign in right now.', {
                    status: response.status,
                });
            }
            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to sign in right now.');
        }
    },

    ssoLogin: async (code) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/sso-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw createRequestError(data.error || data.message, 'Unable to sign in with SSO right now.', {
                    status: response.status,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to sign in with SSO right now.');
        }
    },

    logout: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw createRequestError(data.error || data.message, 'Unable to sign out right now.', {
                    status: response.status,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to sign out right now.');
        }
    },

    logoutSso: async () => {
        try {
            const query = SSO_LOGOUT_ALL ? '?all=true' : '';
            const response = await fetch(`${SSO_LOGOUT_URL}${query}`, {
                method: 'POST',
                credentials: 'include',
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw createRequestError(data.error || data.message, 'Unable to sign out from SSO right now.', {
                    status: response.status,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to sign out from SSO right now.');
        }
    },

    getMe: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                headers: getAuthHeaders(),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw createRequestError(data.error || data.message, 'Unable to load your profile right now.', {
                    status: response.status,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load your profile right now.');
        }
    },

    getWsToken: async () => {
        try {
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
                throw createRequestError(errorData.error, 'Unable to prepare the live connection right now.', {
                    status: response.status,
                });
            }

            return response.json();
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to prepare the live connection right now.');
        }
    }
};

export const uavService = {
    getUav: async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error('No authentication token found');

            const response = await fetch(`${API_BASE_URL}/uav`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw createRequestError(errorData.error, 'Unable to load drone data right now.', {
                    status: response.status,
                });
            }

            return response.json();
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load drone data right now.');
        }
    }
};

export const dockingService = {
    getDocking: async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error('No authentication token found');

            const response = await fetch(`${API_BASE_URL}/docking`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw createRequestError(errorData.error, 'Unable to load dock data right now.', {
                    status: response.status,
                });
            }

            return response.json();
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load dock data right now.');
        }
    }
};

export const userService = {
    getUsers: async ({ page = 1, limit = 50, username = '' } = {}) => {
        try {
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
                throw createRequestError(errorData.error, 'Unable to load users right now.', {
                    status: response.status,
                });
            }

            return response.json();
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load users right now.');
        }
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

        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw createRequestError(data.error, 'Unable to create the user right now.', {
                    status: response.status,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to create the user right now.');
        }
    },

    deleteUser: async (userId) => {
        try {
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
                throw createRequestError(data.error, 'Unable to delete the user right now.', {
                    status: response.status,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to delete the user right now.');
        }
    }
};

export const missionService = {
    getMissions: async (page = 1, limit = 50, uavId = '') => {
        try {
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
                throw createRequestError(errorData.error, 'Unable to load missions right now.', {
                    status: response.status,
                });
            }

            return response.json();
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load missions right now.');
        }
    },

    getMissionRuns: async ({
        page = 1,
        limit = 20,
        uavId = '',
        upcoming = 'today',
        days,
        sortBy,
        sortOrder,
    } = {}) => {
        try {
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

            if (sortBy) {
                params.set('sort_by', String(sortBy));
            }

            if (sortOrder) {
                params.set('sort_order', String(sortOrder));
            }

            const response = await fetch(`${API_BASE_URL}/mission-runs?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw createRequestError(errorData.error, 'Unable to load mission schedules right now.', {
                    status: response.status,
                });
            }

            return response.json();
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load mission schedules right now.');
        }
    },

    getMissionById: async (missionId) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error('No authentication token found');

            const response = await fetch(`${API_BASE_URL}/missions/${missionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw createRequestError(errorData.error || errorData.message, 'Unable to load mission details right now.', {
                    status: response.status,
                });
            }

            return response.json();
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load mission details right now.');
        }
    },

    createMission: async (payload) => {
        try {
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
                throw createRequestError(data.error || data.message, 'Unable to create the mission right now.', {
                    status: response.status,
                    code: data.code,
                    details: data,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to create the mission right now.');
        }
    },

    previewMissionConflicts: async (payload) => {
        try {
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
                throw createRequestError(data.error || data.message, 'Unable to preview mission conflicts right now.', {
                    status: response.status,
                    code: data.code,
                    details: data,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to preview mission conflicts right now.');
        }
    },

    deleteMission: async (missionId) => {
        try {
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
                throw createRequestError(data.error || data.message, 'Unable to delete the mission right now.', {
                    status: response.status,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to delete the mission right now.');
        }
    }
};

export const notificationService = {
    getNotifications: async ({ page = 1, limit = 20, uavId } = {}) => {
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
            });

            if (uavId != null && uavId !== '') {
                params.set('uav_id', String(uavId));
            }

            const response = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
                headers: getAuthHeaders(),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw createRequestError(data.error || data.message, 'Unable to load notifications right now.', {
                    status: response.status,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load notifications right now.');
        }
    },

    getUnreadCount: async ({ uavId, type } = {}) => {
        try {
            const params = new URLSearchParams();

            if (uavId != null && uavId !== '') {
                params.set('uav_id', String(uavId));
            }

            if (type) {
                params.set('type', String(type));
            }

            const query = params.toString();
            const response = await fetch(`${API_BASE_URL}/notifications/unread-count${query ? `?${query}` : ''}`, {
                headers: getAuthHeaders(),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw createRequestError(data.error || data.message, 'Unable to load notification badge right now.', {
                    status: response.status,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load notification badge right now.');
        }
    },

    markAsRead: async (ids = []) => {
        try {
            const normalizedIds = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];

            if (normalizedIds.length === 0) {
                return { updated_count: 0 };
            }

            const response = await fetch(`${API_BASE_URL}/notifications/read`, {
                method: 'PATCH',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: normalizedIds }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw createRequestError(data.error || data.message, 'Unable to update notification status right now.', {
                    status: response.status,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to update notification status right now.');
        }
    },

    deleteNotification: async (notificationId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw createRequestError(data.error || data.message, 'Unable to delete the notification right now.', {
                    status: response.status,
                });
            }

            return data;
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to delete the notification right now.');
        }
    },
};

export const historyService = {
    getMissionHistory: async ({ page = 1, limit = 20, missionId = '', missionName = '' } = {}) => {
        try {
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
                throw createRequestError(errorData.error || errorData.message, 'Unable to load mission history right now.', {
                    status: response.status,
                });
            }

            return response.json();
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load mission history right now.');
        }
    },

    getMissionHistoryMedia: async (historyId, { eventId = '', includeFullVideo = false } = {}) => {
        const params = new URLSearchParams();

        if (eventId) {
            params.set('event_id', String(eventId));
        }

        if (includeFullVideo) {
            params.set('include_full_video', 'true');
        }

        try {
            const query = params.toString();
            const response = await fetch(`${API_BASE_URL}/mission-history/${historyId}/media${query ? `?${query}` : ''}`, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw createRequestError(errorData.error || errorData.message, 'Unable to load mission media right now.', {
                    status: response.status,
                });
            }

            return response.json();
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load mission media right now.');
        }
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
        try {
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
                throw createRequestError(errorData.error || errorData.message, 'Unable to load live telemetry right now.', {
                    status: response.status,
                });
            }

            return response.json();
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load live telemetry right now.');
        }
    },

    publishMetric: async ({ uavId, metric, payload, kind = 'telemetry', timeoutMs = 5000 }) => {
        try {
            if (!uavId) {
                throw new Error('UAV ID is required');
            }

            if (!metric) {
                throw new Error('Metric is required');
            }

            const tokenData = await authService.getWsToken();
            const wsToken = tokenData?.token || tokenData?.ws_token;

            if (!wsToken) {
                throw new Error('Invalid WebSocket token received');
            }

            await new Promise((resolve, reject) => {
                const ws = new WebSocket(`${WS_BASE_URL}/ws/telemetry?token=${wsToken}`);
                const timeoutId = setTimeout(() => {
                    ws.close();
                    reject(new Error('Timed out while publishing realtime event'));
                }, timeoutMs);

                const cleanup = () => {
                    clearTimeout(timeoutId);
                    ws.onopen = null;
                    ws.onerror = null;
                    ws.onclose = null;
                };

                ws.onopen = () => {
                    try {
                        ws.send(JSON.stringify({
                            type: 'publish',
                            uav_id: uavId,
                            kind,
                            metric,
                            payload,
                        }));
                        cleanup();
                        ws.close();
                        resolve();
                    } catch (error) {
                        cleanup();
                        ws.close();
                        reject(error);
                    }
                };

                ws.onerror = () => {
                    cleanup();
                    ws.close();
                    reject(new Error('Failed to publish realtime event'));
                };

                ws.onclose = () => {
                    cleanup();
                };
            });
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to send the command right now.');
        }
    },
};

export const weatherService = {
    getForecast: async ({ latitude, longitude, forecastHours = 6 } = {}) => {
        try {
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
                throw createRequestError(errorData.reason || errorData.error, 'Unable to load weather data right now.', {
                    status: response.status,
                });
            }

            return response.json();
        } catch (error) {
            rethrowFriendlyError(error, 'Unable to load weather data right now.');
        }
    }
};
