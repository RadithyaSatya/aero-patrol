import React, { useEffect, useRef, useState } from 'react';
import disconnectIcon from '../../assets/images/icon_disconnect.svg';

const STREAM_PROBE_TIMEOUT_MS = 4000;
const readerScriptPromises = new Map();

function buildStreamUrl(src, params = {}) {
    const url = new URL(src);

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
    });

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
    const scriptUrl = buildStreamUrl(new URL('./reader.js', src).toString());

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

export default function WebRtcStream({
    src,
    className = '',
    title = 'Live stream',
    autoPlay = true,
    muted = true,
    playsInline = true,
    controls = false,
    unavailableMessage = 'Stream not available',
    fallbackClassName = '',
    fallbackStyle = undefined,
    fallbackTextClassName = 'text-[#E5E5E5]',
    onStatusChange,
}) {
    const [status, setStatus] = useState(src ? 'checking' : 'empty');
    const [errorMessage, setErrorMessage] = useState('');
    const videoRef = useRef(null);

    useEffect(() => {
        let isCancelled = false;

        if (!src) {
            setStatus('empty');
            setErrorMessage('Stream not configured');
            return () => {
                isCancelled = true;
            };
        }

        setStatus('checking');
        setErrorMessage('');

        const checkStream = async () => {
            const result = await probeStreamAvailability(src);

            if (isCancelled) {
                return;
            }

            if (result.available) {
                setStatus('ready');
                setErrorMessage('');
            } else {
                setStatus('unavailable');
                setErrorMessage(result.message || unavailableMessage);
            }
        };

        checkStream();

        return () => {
            isCancelled = true;
        };
    }, [src, unavailableMessage]);

    useEffect(() => {
        onStatusChange?.(status);
    }, [onStatusChange, status]);

    useEffect(() => {
        let isCancelled = false;
        let readerInstance = null;

        if (!src || status !== 'ready' || !videoRef.current) {
            return () => {
                isCancelled = true;
            };
        }

        const video = videoRef.current;
        video.controls = controls;
        video.muted = muted;
        video.autoplay = autoPlay;
        video.playsInline = playsInline;

        const connectStream = async () => {
            try {
                const MediaMTXWebRTCReader = await loadReaderScript(src);

                if (isCancelled || !MediaMTXWebRTCReader) {
                    return;
                }

                readerInstance = new MediaMTXWebRTCReader({
                    url: buildStreamUrl(new URL('whep', src).toString(), {
                        autoplay: autoPlay,
                        muted,
                        playsinline: playsInline,
                        controls,
                    }),
                    onError: (message) => {
                        if (isCancelled) {
                            return;
                        }

                        setStatus('unavailable');
                        setErrorMessage(message || unavailableMessage);
                    },
                    onTrack: (event) => {
                        if (isCancelled) {
                            return;
                        }

                        setErrorMessage('');
                        video.srcObject = event.streams[0];
                    },
                });
            } catch (error) {
                if (isCancelled) {
                    return;
                }

                setStatus('unavailable');
                setErrorMessage(error.message || unavailableMessage);
            }
        };

        connectStream();

        return () => {
            isCancelled = true;

            if (readerInstance) {
                readerInstance.close();
            }

            if (video.srcObject) {
                video.srcObject = null;
            }
        };
    }, [src, status, autoPlay, muted, playsInline, controls, unavailableMessage]);

    return (
        <div className={`relative ${className}`}>
            {status === 'ready' ? (
                <video
                    ref={videoRef}
                    title={title}
                    className="h-full w-full object-cover"
                    muted={muted}
                    autoPlay={autoPlay}
                    playsInline={playsInline}
                    controls={controls}
                />
            ) : (
                <div
                    className={`flex h-full w-full items-center justify-center px-6 text-center ${fallbackClassName || 'bg-[#474747]'}`}
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
                            {status === 'checking' ? 'Checking stream...' : errorMessage || unavailableMessage}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
