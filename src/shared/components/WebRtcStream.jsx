import React, { useEffect, useRef, useState } from 'react';
import disconnectIcon from '../../assets/images/icon_disconnect.svg';
import {
    STREAM_AUTH_PASS,
    STREAM_AUTH_TOKEN,
    STREAM_AUTH_USER,
} from '../config/streamConfig';

const STREAM_PROBE_TIMEOUT_MS = 4000;
const STREAM_CONNECT_TIMEOUT_MS = 8000;
const RECONNECT_BASE_DELAY_MS = 3000;
const RECONNECT_MAX_DELAY_MS = 15000;
const SESSION_RELEASE_DELAY_MS = 800;
const readerScriptPromises = new Map();
const streamSessions = new Map();

function buildStreamUrl(src, params = {}) {
    const url = new URL(src);

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
    });

    return url.toString();
}

function buildWhepUrl(src, params = {}) {
    const url = new URL(src);

    if (!url.pathname.endsWith('/whep')) {
        url.pathname = `${url.pathname.replace(/\/+$/, '')}/whep`;
    }

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
    });

    return url.toString();
}

function buildReaderScriptUrl(src) {
    const url = new URL(src);

    if (url.pathname.endsWith('/whep')) {
        url.pathname = `${url.pathname.replace(/\/whep$/, '')}/reader.js`;
        return url.toString();
    }

    url.pathname = `${url.pathname.replace(/\/+$/, '')}/reader.js`;
    return url.toString();
}

async function probeStreamAvailability(src) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
        controller.abort();
    }, STREAM_PROBE_TIMEOUT_MS);

    try {
        await fetch(src, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal,
        });

        return {
            available: true,
            message: '',
        };
    } catch (error) {
        if (error?.name === 'AbortError') {
            return {
                available: false,
                message: 'Stream not responding',
            };
        }

        return {
            available: false,
            message: 'Stream not available',
        };
    } finally {
        window.clearTimeout(timeoutId);
    }
}

function loadReaderScript(src) {
    const scriptUrl = buildReaderScriptUrl(src);

    if (!readerScriptPromises.has(scriptUrl)) {
        const promise = new Promise((resolve, reject) => {
            if (window.MediaMTXWebRTCReader) {
                resolve(window.MediaMTXWebRTCReader);
                return;
            }

            const existingScript = document.querySelector(`script[data-webrtc-reader="${scriptUrl}"]`);

            if (existingScript) {
                existingScript.addEventListener('load', () => resolve(window.MediaMTXWebRTCReader), { once: true });
                existingScript.addEventListener('error', () => reject(new Error('Failed to load WebRTC reader')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = scriptUrl;
            script.async = true;
            script.dataset.webrtcReader = scriptUrl;
            script.onload = () => resolve(window.MediaMTXWebRTCReader);
            script.onerror = () => reject(new Error('Failed to load WebRTC reader'));
            document.head.appendChild(script);
        });

        readerScriptPromises.set(scriptUrl, promise);
    }

    return readerScriptPromises.get(scriptUrl);
}

function createStreamSession(src) {
    return {
        src,
        status: 'checking',
        errorMessage: '',
        stream: null,
        listeners: new Set(),
        readerInstance: null,
        connectTimeoutId: null,
        reconnectTimeoutId: null,
        releaseTimeoutId: null,
        reconnectAttempts: 0,
        lifecycleId: 0,
        isStarted: false,
        connectionOptions: null,
    };
}

function getStreamSession(src) {
    if (!streamSessions.has(src)) {
        streamSessions.set(src, createStreamSession(src));
    }

    return streamSessions.get(src);
}

function emitSession(session) {
    const snapshot = {
        status: session.status,
        errorMessage: session.errorMessage,
        stream: session.stream,
    };

    session.listeners.forEach((listener) => {
        listener(snapshot);
    });
}

function clearSessionReconnect(session) {
    if (session.reconnectTimeoutId) {
        window.clearTimeout(session.reconnectTimeoutId);
        session.reconnectTimeoutId = null;
    }
}

function clearSessionConnectTimeout(session) {
    if (session.connectTimeoutId) {
        window.clearTimeout(session.connectTimeoutId);
        session.connectTimeoutId = null;
    }
}

function setSessionState(session, status, errorMessage = '') {
    session.status = status;
    session.errorMessage = errorMessage;
    emitSession(session);
}

function closeSessionReader(session) {
    clearSessionConnectTimeout(session);

    if (session.readerInstance) {
        session.readerInstance.close();
        session.readerInstance = null;
    }
}

function stopSession(session) {
    session.isStarted = false;
    session.lifecycleId += 1;
    clearSessionReconnect(session);
    closeSessionReader(session);
    session.reconnectAttempts = 0;
    session.stream = null;
    session.connectionOptions = null;
    setSessionState(session, session.src ? 'checking' : 'empty', session.src ? '' : 'Stream not configured');
}

function scheduleSessionReconnect(session, message = 'Stream not available') {
    if (!session.isStarted) {
        return;
    }

    closeSessionReader(session);
    session.stream = null;
    session.reconnectAttempts += 1;
    setSessionState(session, 'reconnecting', message);

    const lifecycleId = session.lifecycleId;
    const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * Math.min(session.reconnectAttempts, 5),
        RECONNECT_MAX_DELAY_MS,
    );

    clearSessionReconnect(session);
    session.reconnectTimeoutId = window.setTimeout(() => {
        session.reconnectTimeoutId = null;

        if (!session.isStarted || lifecycleId !== session.lifecycleId) {
            return;
        }

        startSession(session);
    }, delay);
}

async function connectSessionReader(session, lifecycleId) {
    const { src, connectionOptions } = session;

    try {
        const MediaMTXWebRTCReader = await loadReaderScript(src);

        if (!session.isStarted || lifecycleId !== session.lifecycleId || !MediaMTXWebRTCReader) {
            return;
        }

        clearSessionConnectTimeout(session);
        session.connectTimeoutId = window.setTimeout(() => {
            if (!session.isStarted || lifecycleId !== session.lifecycleId) {
                return;
            }

            scheduleSessionReconnect(session, 'Stream connection timed out. Reconnecting...');
        }, STREAM_CONNECT_TIMEOUT_MS);

        session.readerInstance = new MediaMTXWebRTCReader({
            url: buildWhepUrl(src, {
                autoplay: connectionOptions.autoPlay,
                muted: connectionOptions.muted,
                playsinline: connectionOptions.playsInline,
                controls: connectionOptions.controls,
            }),
            user: connectionOptions.user,
            pass: connectionOptions.pass,
            token: connectionOptions.token,
            onError: (message) => {
                if (!session.isStarted || lifecycleId !== session.lifecycleId) {
                    return;
                }

                scheduleSessionReconnect(session, message || 'Stream interrupted. Reconnecting...');
            },
            onTrack: (event) => {
                if (!session.isStarted || lifecycleId !== session.lifecycleId) {
                    return;
                }

                clearSessionConnectTimeout(session);
                session.reconnectAttempts = 0;
                session.stream = event.streams[0] || null;
                setSessionState(session, 'ready');

                const [videoTrack] = typeof session.stream?.getVideoTracks === 'function'
                    ? session.stream.getVideoTracks()
                    : [];

                if (videoTrack) {
                    videoTrack.addEventListener('ended', () => {
                        if (!session.isStarted || lifecycleId !== session.lifecycleId) {
                            return;
                        }

                        scheduleSessionReconnect(session, 'Stream ended. Reconnecting...');
                    }, { once: true });
                }
            },
        });
    } catch (error) {
        if (!session.isStarted || lifecycleId !== session.lifecycleId) {
            return;
        }

        scheduleSessionReconnect(session, error.message || 'Stream not available');
    }
}

async function startSession(session) {
    if (!session.isStarted || !session.src) {
        return;
    }

    session.lifecycleId += 1;
    const lifecycleId = session.lifecycleId;
    closeSessionReader(session);
    clearSessionReconnect(session);
    session.stream = null;
    setSessionState(session, session.reconnectAttempts > 0 ? 'reconnecting' : 'checking');

    const probeResult = await probeStreamAvailability(session.src);

    if (!session.isStarted || lifecycleId !== session.lifecycleId) {
        return;
    }

    if (!probeResult.available) {
        scheduleSessionReconnect(session, probeResult.message || 'Stream not available');
        return;
    }

    setSessionState(session, 'connecting');
    connectSessionReader(session, lifecycleId);
}

function ensureSessionRunning(session, connectionOptions) {
    session.connectionOptions = connectionOptions;

    if (session.releaseTimeoutId) {
        window.clearTimeout(session.releaseTimeoutId);
        session.releaseTimeoutId = null;
    }

    if (session.isStarted) {
        return;
    }

    session.isStarted = true;
    session.reconnectAttempts = 0;
    startSession(session);
}

function releaseSession(session) {
    if (session.listeners.size > 0 || session.releaseTimeoutId) {
        return;
    }

    session.releaseTimeoutId = window.setTimeout(() => {
        session.releaseTimeoutId = null;

        if (session.listeners.size > 0) {
            return;
        }

        stopSession(session);
        streamSessions.delete(session.src);
    }, SESSION_RELEASE_DELAY_MS);
}

export default function WebRtcStream({
    src,
    className = '',
    title = 'Live stream',
    autoPlay = true,
    muted = true,
    playsInline = true,
    controls = false,
    user = STREAM_AUTH_USER,
    pass = STREAM_AUTH_PASS,
    token = STREAM_AUTH_TOKEN,
    unavailableMessage = 'Stream not available',
    fallbackClassName = '',
    fallbackStyle = undefined,
    fallbackTextClassName = 'text-[#E5E5E5]',
    onStatusChange,
}) {
    const videoRef = useRef(null);
    const [snapshot, setSnapshot] = useState(() => ({
        status: src ? 'checking' : 'empty',
        errorMessage: src ? '' : 'Stream not configured',
        stream: null,
    }));

    useEffect(() => {
        if (!src) {
            setSnapshot({
                status: 'empty',
                errorMessage: 'Stream not configured',
                stream: null,
            });
            return undefined;
        }

        const session = getStreamSession(src);
        const handleSessionUpdate = (nextSnapshot) => {
            setSnapshot(nextSnapshot);
        };

        session.listeners.add(handleSessionUpdate);
        handleSessionUpdate({
            status: session.status,
            errorMessage: session.errorMessage,
            stream: session.stream,
        });

        ensureSessionRunning(session, {
            autoPlay,
            muted,
            playsInline,
            controls,
            user,
            pass,
            token,
        });

        return () => {
            session.listeners.delete(handleSessionUpdate);
            releaseSession(session);
        };
    }, [autoPlay, controls, muted, pass, playsInline, src, token, user]);

    useEffect(() => {
        onStatusChange?.(snapshot.status);
    }, [onStatusChange, snapshot.status]);

    useEffect(() => {
        const video = videoRef.current;

        if (!video) {
            return undefined;
        }

        video.controls = controls;
        video.muted = muted;
        video.autoplay = autoPlay;
        video.playsInline = playsInline;

        if (snapshot.stream && video.srcObject !== snapshot.stream) {
            video.srcObject = snapshot.stream;
        }

        if (!snapshot.stream && video.srcObject) {
            video.srcObject = null;
        }

        return () => {
            if (video.srcObject && video.srcObject !== snapshot.stream) {
                video.srcObject = null;
            }
        };
    }, [autoPlay, controls, muted, playsInline, snapshot.stream]);

    const { status, errorMessage } = snapshot;

    return (
        <div className={`relative ${className}`}>
            <video
                ref={videoRef}
                title={title}
                className={`h-full w-full object-cover ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
                muted={muted}
                autoPlay={autoPlay}
                playsInline={playsInline}
                controls={controls}
            />
            {status !== 'ready' ? (
                <div
                    className={`absolute inset-0 flex h-full w-full items-center justify-center px-6 text-center ${fallbackClassName || 'bg-[#474747]'}`}
                    style={fallbackStyle}
                >
                    <div className="flex max-w-[260px] flex-col items-center">
                        <img
                            src={disconnectIcon}
                            alt=""
                            aria-hidden="true"
                            className="mb-4 h-10 w-10 object-contain"
                        />
                        <div className={`text-[12px] ${fallbackTextClassName}`}>
                            {status === 'checking'
                                ? 'Checking stream...'
                                : status === 'connecting'
                                    ? 'Connecting stream...'
                                    : status === 'reconnecting'
                                        ? errorMessage || 'Reconnecting stream...'
                                        : errorMessage || unavailableMessage}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
