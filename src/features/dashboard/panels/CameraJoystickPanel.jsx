import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authService, WS_BASE_URL } from '../../../services/api';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;
const SEND_INTERVAL_MS = 100;
const MAX_PITCH_DEG = 90;
const MAX_YAW_DEG = 180;
const PITCH_SPEED_DPS = 38;
const YAW_SPEED_DPS = 65;
const JOYSTICK_PANEL_BACKGROUND = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const JOYSTICK_PANEL_BORDER = 'linear-gradient(0deg, #ED0000 0%, #FB5555 51.28%, rgba(251, 85, 85, 0) 100%)';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function ArrowIcon({ direction, active = false }) {
    const rotationByDirection = {
        up: '180deg',
        right: '-90deg',
        down: '0deg',
        left: '90deg',
    };

    return (
        <span
            aria-hidden="true"
            className="flex h-4.5 w-4.5 items-center justify-center"
            style={{ transform: `rotate(${rotationByDirection[direction]})` }}
        >
            <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
                <polyline
                    points="5 8 12 16 19 8"
                    stroke={active ? '#5C5C5C' : '#7B7B7B'}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );
}

function ZoomButton({ children, label, active = false, disabled = false, onClick }) {
    return (
        <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={`relative flex h-full w-[clamp(60px,22%,82px)] flex-1 items-center justify-center overflow-hidden text-[clamp(22px,2vw,30px)] font-medium text-black transition-all ${
                disabled
                    ? 'cursor-not-allowed opacity-60'
                    : active
                        ? 'brightness-90'
                        : 'brightness-100 hover:brightness-95'
            }`}
            style={{
                background: 'linear-gradient(to bottom, #C4C4C4 0%, #989898 100%)',
            }}
        >
            <span className="relative z-10 leading-none">{children}</span>
        </button>
    );
}

function DirectionButton({ direction, active = false, iconClassName = '', style, onPressStart, onPressEnd, disabled = false }) {
    return (
        <button
            type="button"
            aria-label={`Move gimbal ${direction}`}
            disabled={disabled}
            onPointerDown={() => onPressStart(direction)}
            onPointerUp={onPressEnd}
            onPointerLeave={onPressEnd}
            onPointerCancel={onPressEnd}
            className={`absolute inset-0 transition-all ${
                disabled
                    ? 'cursor-not-allowed bg-transparent opacity-55'
                    : active
                        ? 'bg-[#d4d4d4] opacity-80'
                        : 'bg-transparent hover:bg-white/10'
            }`}
            style={{ ...style, zIndex: 1 }}
        >
            <span className={`absolute ${iconClassName}`}>
                <ArrowIcon direction={direction} active={active} />
            </span>
        </button>
    );
}

export default function CameraJoystickPanel({
    uavId = null,
    onZoomIn = null,
    onZoomOut = null,
    isZoomInDisabled = false,
    isZoomOutDisabled = false,
}) {
    const [activeDirection, setActiveDirection] = useState(null);
    const [activeZoom, setActiveZoom] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [targetInitialized, setTargetInitialized] = useState(false);
    const [connectionError, setConnectionError] = useState('');

    const wsRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef(null);
    const sendIntervalRef = useRef(null);
    const isMountedRef = useRef(false);
    const activeDirectionRef = useRef(null);
    const targetPitchRef = useRef(0);
    const targetYawRef = useRef(0);
    const targetInitializedRef = useRef(false);
    const userHasTakenControlRef = useRef(false);
    const lastTickAtRef = useRef(0);
    const currentUavIdRef = useRef(uavId);

    const knobOffset = useMemo(() => {
        const offsetByDirection = {
            up: 'translate(-50%, calc(-50% - 11px))',
            down: 'translate(-50%, calc(-50% + 11px))',
            left: 'translate(calc(-50% - 11px), -50%)',
            right: 'translate(calc(-50% + 11px), -50%)',
        };

        return offsetByDirection[activeDirection] || 'translate(-50%, -50%)';
    }, [activeDirection]);

    const publishGimbalCommand = useCallback((pitchDeg, yawDeg) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !currentUavIdRef.current) {
            return;
        }

        ws.send(JSON.stringify({
            type: 'publish',
            uav_id: currentUavIdRef.current,
            kind: 'telemetry',
            metric: 'gimbal_command',
            payload: {
                command: 'set_pitch_yaw',
                pitch_deg: Number(pitchDeg.toFixed(1)),
                yaw_deg: Number(yawDeg.toFixed(1)),
                mode: 'follow',
                gimbal_device_id: 0,
            },
        }));
    }, []);

    const stopDirectionalControl = useCallback(() => {
        activeDirectionRef.current = null;
        setActiveDirection(null);

        if (sendIntervalRef.current) {
            clearInterval(sendIntervalRef.current);
            sendIntervalRef.current = null;
        }
    }, []);

    const tickDirectionalControl = useCallback(() => {
        const direction = activeDirectionRef.current;
        if (!direction) {
            return;
        }

        if (!targetInitializedRef.current) {
            return;
        }

        const now = performance.now();
        const previousTickAt = lastTickAtRef.current || now;
        const dt = Math.max((now - previousTickAt) / 1000, SEND_INTERVAL_MS / 1000);
        lastTickAtRef.current = now;

        let normalizedX = 0;
        let normalizedY = 0;

        if (direction === 'left') {
            normalizedX = -1;
        } else if (direction === 'right') {
            normalizedX = 1;
        } else if (direction === 'up') {
            normalizedY = -1;
        } else if (direction === 'down') {
            normalizedY = 1;
        }

        const nextYaw = clamp(
            targetYawRef.current + (normalizedX * YAW_SPEED_DPS * dt),
            -MAX_YAW_DEG,
            MAX_YAW_DEG,
        );
        const nextPitch = clamp(
            targetPitchRef.current + ((-normalizedY) * PITCH_SPEED_DPS * dt),
            -MAX_PITCH_DEG,
            MAX_PITCH_DEG,
        );

        targetYawRef.current = nextYaw;
        targetPitchRef.current = nextPitch;
        publishGimbalCommand(nextPitch, nextYaw);
    }, [publishGimbalCommand]);

    const startDirectionalControl = useCallback((direction) => {
        if (!currentUavIdRef.current) {
            return;
        }

        if (!targetInitializedRef.current) {
            return;
        }

        userHasTakenControlRef.current = true;

        activeDirectionRef.current = direction;
        setActiveDirection(direction);
        lastTickAtRef.current = performance.now();

        if (sendIntervalRef.current) {
            clearInterval(sendIntervalRef.current);
        }

        tickDirectionalControl();
        sendIntervalRef.current = setInterval(tickDirectionalControl, SEND_INTERVAL_MS);
    }, [tickDirectionalControl]);

    const connect = useCallback(async () => {
        if (!currentUavIdRef.current) {
            return;
        }

        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }

        try {
            setConnectionError('');
            const tokenData = await authService.getWsToken();
            const wsToken = tokenData?.token || tokenData?.ws_token;

            if (!wsToken) {
                throw new Error('Invalid WebSocket token received');
            }

            const ws = new WebSocket(`${WS_BASE_URL}/ws/telemetry?token=${wsToken}`);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMountedRef.current) {
                    return;
                }

                setIsConnected(true);
                setConnectionError('');
                reconnectAttemptsRef.current = 0;

                ws.send(JSON.stringify({
                    type: 'subscribe',
                    uav_ids: [currentUavIdRef.current],
                    metrics: ['gimbal_state'],
                }));
            };

            ws.onmessage = (event) => {
                if (!isMountedRef.current) {
                    return;
                }

                try {
                    const message = JSON.parse(event.data);
                    if (
                        message?.uav_id !== currentUavIdRef.current
                        || message?.metric !== 'gimbal_state'
                        || message?.kind !== 'telemetry'
                    ) {
                        return;
                    }

                    const payload = message.payload || {};
                    const nextPitch = Number(payload.pitch_deg);
                    const nextYaw = Number(payload.yaw_deg);
                    const hasAngles = Number.isFinite(nextPitch) && Number.isFinite(nextYaw);

                    if (payload.connected === true && hasAngles) {
                        if (!userHasTakenControlRef.current || !activeDirectionRef.current) {
                            targetPitchRef.current = nextPitch;
                            targetYawRef.current = nextYaw;
                            targetInitializedRef.current = true;
                            setTargetInitialized(true);
                        }
                    }
                } catch (error) {
                    void error;
                }
            };

            ws.onerror = () => {
                if (!isMountedRef.current) {
                    return;
                }

                setConnectionError('Gimbal WebSocket connection error');
            };

            ws.onclose = () => {
                if (!isMountedRef.current) {
                    return;
                }

                stopDirectionalControl();
                setIsConnected(false);
                wsRef.current = null;

                if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                    setConnectionError('Gimbal WebSocket disconnected');
                    return;
                }

                reconnectAttemptsRef.current += 1;
                reconnectTimeoutRef.current = setTimeout(
                    connect,
                    RECONNECT_DELAY_MS * Math.min(reconnectAttemptsRef.current, 5),
                );
            };
        } catch (error) {
            if (!isMountedRef.current) {
                return;
            }

            setIsConnected(false);
            setConnectionError(error.message || 'Failed to connect gimbal control');
            stopDirectionalControl();

            if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                return;
            }

            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(
                connect,
                RECONNECT_DELAY_MS * Math.min(reconnectAttemptsRef.current, 5),
            );
        }
    }, [stopDirectionalControl]);

    useEffect(() => {
        currentUavIdRef.current = uavId;
    }, [uavId]);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        stopDirectionalControl();
        clearTimeout(reconnectTimeoutRef.current);

        setIsConnected(false);
        setTargetInitialized(false);
        setConnectionError('');

        targetPitchRef.current = 0;
        targetYawRef.current = 0;
        targetInitializedRef.current = false;
        userHasTakenControlRef.current = false;
        reconnectAttemptsRef.current = 0;

        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }

        if (!uavId) {
            return undefined;
        }

        connect();

        return () => {
            stopDirectionalControl();
            clearTimeout(reconnectTimeoutRef.current);

            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect, stopDirectionalControl, uavId]);

    const isDirectionControlDisabled = !uavId || !isConnected || !targetInitialized;

    return (
        <div
            className="font-inter relative h-full w-full overflow-hidden rounded-[30px] p-px select-none"
            style={{ backgroundImage: JOYSTICK_PANEL_BORDER }}
        >
            <div
                className="flex h-full w-full items-center justify-evenly gap-[clamp(22px,2.8vw,36px)] overflow-hidden rounded-[29px] p-[clamp(8px,1vw,12px)]"
                style={{ background: JOYSTICK_PANEL_BACKGROUND }}
            >
                <div className="flex flex-col items-center gap-[clamp(8px,1vw,12px)]">
                    <div className="flex h-[clamp(120px,13vw,160px)] flex-col gap-[clamp(8px,1vw,12px)]">
                        <ZoomButton
                            label="Zoom in"
                            active={activeZoom === 'in'}
                            disabled={isZoomInDisabled}
                            onClick={() => {
                                setActiveZoom('in');
                                onZoomIn?.();
                                setTimeout(() => {
                                    setActiveZoom((current) => (current === 'in' ? null : current));
                                }, 150);
                            }}
                        >
                            +
                        </ZoomButton>
                        <ZoomButton
                            label="Zoom out"
                            active={activeZoom === 'out'}
                            disabled={isZoomOutDisabled}
                            onClick={() => {
                                setActiveZoom('out');
                                onZoomOut?.();
                                setTimeout(() => {
                                    setActiveZoom((current) => (current === 'out' ? null : current));
                                }, 150);
                            }}
                        >
                            −
                        </ZoomButton>
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="relative flex h-[clamp(120px,13vw,160px)] w-[clamp(120px,13vw,160px)] items-center justify-center overflow-hidden rounded-full bg-[#DDDDDD]">
                        <DirectionButton
                            direction="up"
                            active={activeDirection === 'up'}
                            disabled={isDirectionControlDisabled}
                            iconClassName="left-1/2 top-[clamp(11px,1.1vw,16px)] -translate-x-1/2"
                            style={{ clipPath: 'polygon(50% 50%, 0% 0%, 100% 0%)' }}
                            onPressStart={startDirectionalControl}
                            onPressEnd={stopDirectionalControl}
                        />
                        <DirectionButton
                            direction="down"
                            active={activeDirection === 'down'}
                            disabled={isDirectionControlDisabled}
                            iconClassName="bottom-[clamp(11px,1.1vw,16px)] left-1/2 -translate-x-1/2"
                            style={{ clipPath: 'polygon(50% 50%, 0% 100%, 100% 100%)' }}
                            onPressStart={startDirectionalControl}
                            onPressEnd={stopDirectionalControl}
                        />
                        <DirectionButton
                            direction="left"
                            active={activeDirection === 'left'}
                            disabled={isDirectionControlDisabled}
                            iconClassName="left-[clamp(11px,1.1vw,16px)] top-1/2 -translate-y-1/2"
                            style={{ clipPath: 'polygon(50% 50%, 0% 0%, 0% 100%)' }}
                            onPressStart={startDirectionalControl}
                            onPressEnd={stopDirectionalControl}
                        />
                        <DirectionButton
                            direction="right"
                            active={activeDirection === 'right'}
                            disabled={isDirectionControlDisabled}
                            iconClassName="right-[clamp(11px,1.1vw,16px)] top-1/2 -translate-y-1/2"
                            style={{ clipPath: 'polygon(50% 50%, 100% 0%, 100% 100%)' }}
                            onPressStart={startDirectionalControl}
                            onPressEnd={stopDirectionalControl}
                        />
                        <div
                            className={`pointer-events-none absolute left-1/2 top-1/2 z-10 h-[clamp(48px,5vw,64px)] w-[clamp(48px,5vw,64px)] rounded-full border shadow-[0_8px_16px_rgba(0,0,0,0.24)] transition-transform duration-150 ${activeDirection ? 'brightness-90' : 'brightness-100'}`}
                            style={{
                                transform: knobOffset,
                                borderColor: '#AAAAAA',
                                background: 'linear-gradient(to bottom, #C4C4C4 0%, #989898 100%)',
                            }}
                            aria-hidden="true"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
