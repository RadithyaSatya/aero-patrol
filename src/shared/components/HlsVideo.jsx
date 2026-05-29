import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

function isHlsUrl(url) {
    return /\.m3u8($|\?)/i.test(url);
}

export default function HlsVideo({
    src,
    className = '',
    autoPlay = true,
    muted = true,
    playsInline = true,
    controls = false,
}) {
    const videoRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) {
            return undefined;
        }

        let hls;
        const nativeHlsSupported = video.canPlayType('application/vnd.apple.mpegurl');
        const shouldUseHlsJs = isHlsUrl(src) && !nativeHlsSupported && Hls.isSupported();

        if (shouldUseHlsJs) {
            hls = new Hls({
                lowLatencyMode: true,
                liveSyncDurationCount: 2,
                maxLiveSyncPlaybackRate: 1.2,
                backBufferLength: 10,
            });
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {});
            });
        } else {
            video.src = src;
            video.load();
            video.play().catch(() => {});
        }

        return () => {
            if (hls) {
                hls.destroy();
            } else {
                video.pause();
                video.removeAttribute('src');
                video.load();
            }
        };
    }, [src]);

    return (
        <video
            ref={videoRef}
            autoPlay={autoPlay}
            muted={muted}
            playsInline={playsInline}
            controls={controls}
            className={className}
        />
    );
}
