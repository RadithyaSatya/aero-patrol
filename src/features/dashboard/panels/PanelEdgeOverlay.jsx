import React from 'react';

function LineGradient({ id, stops, x1, y1, x2, y2 }) {
    return (
        <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
            {stops.map((stop) => (
                <stop key={`${id}-${stop.offset}`} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity ?? 1} />
            ))}
        </linearGradient>
    );
}

export function TopBottomFadeOverlay({
    startColor,
    midColor,
    inset = 16,
    holdUntil = '55%',
    fadeEnd = '100%',
    strokeWidth = 1,
}) {
    const topId = React.useId();
    const bottomId = React.useId();

    return (
        <svg className="pointer-events-none absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <LineGradient
                    id={topId}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                    stops={[
                        { offset: '0%', color: startColor },
                        { offset: holdUntil, color: startColor },
                        { offset: fadeEnd, color: midColor, opacity: 0 },
                    ]}
                />
                <LineGradient
                    id={bottomId}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                    stops={[
                        { offset: '0%', color: startColor },
                        { offset: holdUntil, color: startColor },
                        { offset: fadeEnd, color: midColor, opacity: 0 },
                    ]}
                />
            </defs>
            <line x1={inset} y1={strokeWidth / 2} x2={100 - inset} y2={strokeWidth / 2} stroke={`url(#${topId})`} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
            <line x1={inset} y1={100 - (strokeWidth / 2)} x2={100 - inset} y2={100 - (strokeWidth / 2)} stroke={`url(#${bottomId})`} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

export function BottomSidesOverlay({
    sideStartColor,
    sideMidColor,
    bottomColor,
    inset = 16,
}) {
    const leftId = React.useId();
    const rightId = React.useId();

    return (
        <svg className="pointer-events-none absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <LineGradient
                    id={leftId}
                    x1="0%"
                    y1="100%"
                    x2="0%"
                    y2="0%"
                    stops={[
                        { offset: '0%', color: sideStartColor },
                        { offset: '72%', color: sideMidColor, opacity: 0.45 },
                        { offset: '100%', color: sideMidColor, opacity: 0 },
                    ]}
                />
                <LineGradient
                    id={rightId}
                    x1="0%"
                    y1="100%"
                    x2="0%"
                    y2="0%"
                    stops={[
                        { offset: '0%', color: sideStartColor },
                        { offset: '72%', color: sideMidColor, opacity: 0.45 },
                        { offset: '100%', color: sideMidColor, opacity: 0 },
                    ]}
                />
            </defs>
            <line x1="0.5" y1={inset} x2="0.5" y2={100 - inset} stroke={`url(#${leftId})`} vectorEffect="non-scaling-stroke" />
            <line x1="99.5" y1={inset} x2="99.5" y2={100 - inset} stroke={`url(#${rightId})`} vectorEffect="non-scaling-stroke" />
            <line x1={inset} y1="99.5" x2={100 - inset} y2="99.5" stroke={bottomColor} vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

export function LeftSolidTopFadeOverlay({
    color,
    strokeWidth = 1,
}) {
    return (
        <svg className="pointer-events-none absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line
                x1="0"
                y1="0"
                x2="0"
                y2="100"
                stroke={color}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

export function BottomSolidUpFadeOverlay({
    color,
    strokeWidth = 1,
}) {
    return (
        <svg className="pointer-events-none absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line
                x1="0"
                y1="100"
                x2="100"
                y2="100"
                stroke={color}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}
