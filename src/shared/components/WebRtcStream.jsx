import React from 'react';

function buildStreamUrl(src, params = {}) {
    const url = new URL(src);

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
    });

    return url.toString();
}

export default function WebRtcStream({
    src,
    className = '',
    title = 'Live stream',
    autoPlay = true,
    muted = true,
    playsInline = true,
    controls = false,
}) {
    if (!src) {
        return null;
    }

    const streamUrl = buildStreamUrl(src, {
        autoplay: autoPlay,
        muted,
        playsInline,
        controls,
    });

    return (
        <iframe
            src={streamUrl}
            title={title}
            className={className}
            allow="autoplay; fullscreen; picture-in-picture"
            scrolling="no"
        />
    );
}
