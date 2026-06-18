import { useState, useEffect, useRef, useCallback } from 'react';
import { authService, WS_BASE_URL } from '../../services/api';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;
export const TELEMETRY_STALE_MS = 10000;

/**
 * Custom hook to manage a telemetry WebSocket connection.
 *
 * Message format from server:
 * {
 *   "type": "publish",
 *   "uav_id": 2,
 *   "kind": "telemetry",
 *   "metric": "location" | "battery" | "vehicle_state" | "gps" | "gps2" | "attitude" | "link" | "mission_progress" | "mission_event" | "mission_status",
 *   "payload": { ... }
 * }
 *
 * Telemetry state shape per UAV:
 * {
 *   [uav_id]: {
 *     vehicle_state: { armed, mode, landed_state },
 *     location: { latitude, longitude, altitude, ground_speed, heading, climb_rate },
 *     gps: { fix_type, fix_type_label, satellites, hdop, eph },
 *     gps2: { fix_type, fix_type_label, satellites, hdop, eph },
 *     attitude: { roll_deg, pitch_deg, yaw_deg, ... },
 *     battery: { percent, voltage, current, power },
 *     mission_progress: { current_waypoint },
 *     link: { rssi, source },
 *     mission_event: { history_id, event, message },
 *     mission_status: { history_id, mission_id, runtime_status, mission_ready, schedule_time, updated_at }
 *   }
 * }
 *
 * @param {number[]} uavIds - Array of UAV IDs to subscribe to.
 * @returns {{ telemetry: object, isConnected: boolean, error: string|null }}
 */
export default function useTelemetry(uavIds = []) {
    const [telemetry, setTelemetry] = useState({});
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [metricUpdatedAtByUav, setMetricUpdatedAtByUav] = useState({});
    const [clock, setClock] = useState(Date.now());

    const wsRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimeout = useRef(null);
    const uavIdsRef = useRef(uavIds);
    const isMounted = useRef(true);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setClock(Date.now());
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    // Keep uavIdsRef in sync
    useEffect(() => {
        uavIdsRef.current = uavIds;

        // If already connected, re-subscribe with new IDs
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && uavIds.length > 0) {
            const subscribeMsg = JSON.stringify({
                type: 'subscribe',
                uav_ids: uavIds
            });
            wsRef.current.send(subscribeMsg);
        }
    }, [JSON.stringify(uavIds)]);

    const connect = useCallback(async () => {
        // Don't connect if no UAV IDs
        if (!uavIdsRef.current || uavIdsRef.current.length === 0) {
            return;
        }

        // Close existing connection
        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }

        try {
            setError(null);

            // 1. Get WebSocket token via POST
            const tokenData = await authService.getWsToken();
            const wsToken = tokenData.token || tokenData.ws_token;

            if (!wsToken) {
                throw new Error('Invalid WebSocket token received');
            }

            // 2. Connect to WebSocket
            const wsUrl = `${WS_BASE_URL}/ws/telemetry?token=${wsToken}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMounted.current) return;
                setIsConnected(true);
                setError(null);
                reconnectAttempts.current = 0;

                // 3. Subscribe to UAV IDs
                const subscribeMsg = JSON.stringify({
                    type: 'subscribe',
                    uav_ids: uavIdsRef.current
                });
                ws.send(subscribeMsg);
            };

            ws.onmessage = (event) => {
                if (!isMounted.current) return;
                try {
                    const msg = JSON.parse(event.data);

                    // Handle messages with uav_id + metric (kind: telemetry)
                    if (!msg.uav_id || !msg.metric) {
                        return;
                    }

                    const { uav_id, metric, payload } = msg;

                    setTelemetry(prev => ({
                        ...prev,
                        [uav_id]: {
                            ...(prev[uav_id] || {}),
                            [metric]: payload
                        }
                    }));
                    setMetricUpdatedAtByUav((prev) => ({
                        ...prev,
                        [uav_id]: {
                            ...(prev[uav_id] || {}),
                            [metric]: Date.now(),
                        },
                    }));
                } catch (parseErr) {
                    void parseErr;
                }
            };

            ws.onerror = () => {
                if (!isMounted.current) return;
                setError('WebSocket connection error');
            };

            ws.onclose = (event) => {
                if (!isMounted.current) return;
                setIsConnected(false);
                wsRef.current = null;

                // Auto-reconnect
                if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts.current += 1;
                    const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttempts.current, 5);
                    reconnectTimeout.current = setTimeout(connect, delay);
                } else {
                    setError('Max reconnection attempts reached');
                }
            };

        } catch (err) {
            if (!isMounted.current) return;
            setError(err.message);
            setIsConnected(false);

            if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts.current += 1;
                const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttempts.current, 5);
                reconnectTimeout.current = setTimeout(connect, delay);
            }
        }
    }, []);

    // Connect/disconnect lifecycle
    useEffect(() => {
        isMounted.current = true;

        if (uavIds && uavIds.length > 0) {
            connect();
        }

        return () => {
            isMounted.current = false;
            clearTimeout(reconnectTimeout.current);
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect, JSON.stringify(uavIds)]);

    const telemetryStatus = Object.entries(metricUpdatedAtByUav).reduce((accumulator, [uavId, metrics]) => {
        const metricStatus = Object.entries(metrics || {}).reduce((metricAccumulator, [metric, updatedAt]) => {
            const isFresh = isConnected && (clock - updatedAt) < TELEMETRY_STALE_MS;

            metricAccumulator[metric] = {
                updatedAt,
                isFresh,
                isStale: !isFresh,
            };

            return metricAccumulator;
        }, {});

        const updatedTimestamps = Object.values(metrics || {}).filter((value) => Number.isFinite(value));
        const lastUpdatedAt = updatedTimestamps.length > 0 ? Math.max(...updatedTimestamps) : null;
        const isFresh = isConnected && lastUpdatedAt != null && (clock - lastUpdatedAt) < TELEMETRY_STALE_MS;

        accumulator[uavId] = {
            updatedAt: lastUpdatedAt,
            isFresh,
            isStale: !isFresh,
            metrics: metricStatus,
        };

        return accumulator;
    }, {});

    return { telemetry, telemetryStatus, isConnected, error };
}
