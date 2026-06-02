import React, { useEffect, useMemo, useState } from 'react';

const STREAM_PROBE_TIMEOUT_MS = 4000;

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

export default function WebRtcStream({
    src,
    className = '',
    title = 'Live stream',
    autoPlay = true,
    muted = true,
    playsInline = true,
    controls = false,
    unavailableMessage = 'Stream not available',
}) {
    const [status, setStatus] = useState(src ? 'checking' : 'empty');
    const [errorMessage, setErrorMessage] = useState('');

    const streamUrl = useMemo(() => {
        if (!src) {
            return '';
        }

        return buildStreamUrl(src, {
            autoplay: autoPlay,
            muted,
            playsInline,
            controls,
        });
    }, [src, autoPlay, muted, playsInline, controls]);

    useEffect(() => {
        let isCancelled = false;

        if (!src) {
            setStatus('empty');
            setErrorMessage('');
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

    if (!src) {
        return null;
    }

    return (
        <div className={`relative ${className}`}>
            {status === 'ready' ? (
                <iframe
                    src={streamUrl}
                    title={title}
                    className="h-full w-full border-0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    scrolling="no"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-black/70 px-6 text-center">
                    <div className="max-w-[260px] rounded border border-[#5E0A0A] bg-[#140b0b]/85 px-4 py-3 text-[12px] text-gray-300 backdrop-blur-sm">
                        {status === 'checking' ? 'Checking stream...' : errorMessage || unavailableMessage}
                    </div>
                </div>
            )}
        </div>
    );
}
