const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://api-xflight.kumalabs.tech';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://api-xflight.kumalabs.tech';

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
    getMyUavsDropdown: async () => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/uavs/me/dropdown`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch UAVs');
        }

        return response.json();
    },

    getUavById: async (uavId) => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/uavs/${uavId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch UAV detail');
        }

        return response.json();
    }
};

export const userService = {
    getUsers: async (page = 1, limit = 50) => {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/users?page=${page}&limit=${limit}`, {
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

        const response = await fetch(`${API_BASE_URL}/register-user`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create user');
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
    }
};
