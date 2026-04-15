import React from 'react';

const WeatherBadge = ({ label, value }) => (
    <div className="flex items-center justify-between rounded-[12px] border border-[#393F44] bg-[#222425] px-2 py-1 text-[11px]">
        <span className="text-gray-400">{label}</span>
        <span className="font-tomorrow text-gray-100">{value}</span>
    </div>
);

const HOURLY_FORECAST = [
    { time: '12:00', icon: '☁', temp: '30°' },
    { time: '14:00', icon: '☀', temp: '32°' },
    { time: '16:00', icon: '☁', temp: '31°' },
    { time: '18:00', icon: '☾', temp: '28°' },
    { time: '20:00', icon: '☾', temp: '27°' }
];

export default function WeatherPanel({ className = '', variant = 'default' }) {
    const isStream = variant === 'stream';

    return (
        <div className={`font-tomorrow relative flex h-full w-full flex-col overflow-hidden bg-[#222222] shadow-lg select-none ${isStream ? 'border border-[#D53535]' : 'border-l border-[#5E0A0A]'} ${isStream ? '' : 'gap-2 p-5'} ${className}`}>
            {!isStream && <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />}
            {!isStream && <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />}

            <div className={`flex flex-1 flex-col border border-[#393F44] bg-[rgba(50,50,50,0.5)] ${isStream ? 'h-full p-4' : 'p-4'}`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative mt-1">
                            <div className="absolute -left-1 -top-1 h-6 w-6 rounded-full bg-[#fcd34d]" />
                            <div className="relative z-10 h-4 w-8 rounded-full bg-white shadow-sm before:absolute before:-top-2 before:left-1 before:h-3.5 before:w-3.5 before:rounded-full before:bg-white after:absolute after:-top-2.5 after:right-0.5 after:h-4.5 after:w-4.5 after:rounded-full after:bg-white" />
                        </div>
                        <span className="font-tomorrow text-2xl font-bold tracking-wider text-white">Cloudly</span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="font-tomorrow text-2xl uppercase tracking-wider text-white">31°C</span>
                    </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1">
                    <WeatherBadge label="Gust" value="6 m/s" />
                    <WeatherBadge label="Wind" value="4 m/s" />
                    <WeatherBadge label="Humid" value="72%" />
                    <WeatherBadge label="Visibility" value="10 km" />
                </div>

                <div className="mt-2">
                    <div className="grid grid-cols-5 gap-2">
                        {HOURLY_FORECAST.map((hour) => (
                            <div
                                key={hour.time}
                                className="flex flex-col items-center justify-center px-1 py-1"
                            >
                                <span className="text-[10px] tracking-wide text-gray-400">{hour.time}</span>
                                <span className="mt-1 text-[16px] text-white">{hour.icon}</span>
                                <span className="mt-1 text-[11px] font-medium tracking-wide text-white">{hour.temp}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
