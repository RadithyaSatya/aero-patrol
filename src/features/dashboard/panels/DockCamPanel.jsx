import React from 'react';

export default function DockCamPanel({ variant = 'default' }) {
    const isStream = variant === 'stream';

    if (isStream) {
        return (
            <div className="font-tomorrow relative flex h-full w-full flex-col overflow-hidden border border-[#D53535] bg-[#222222] p-3 shadow-lg select-none">
                <div className="shrink-0 pb-3">
                    <div className="flex items-center gap-3">
                        <span className="h-[20px] w-[5px] bg-[#FC4747]" />
                        <p className="text-left text-[16px] font-medium tracking-wide text-white">Dock Cam</p>
                    </div>
                </div>

                <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
                    <div className="pointer-events-none absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
                    <div className="pointer-events-none absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[#ED0000]" />

                    <div
                        className="absolute inset-x-0 bottom-0 top-[1px] bg-cover bg-center opacity-80"
                        style={{ backgroundImage: "url('/src/assets/dock_cam_placeholder.png')" }}
                    />
                    <div className="absolute inset-x-0 bottom-0 top-[1px] bg-gradient-to-t from-black/70 via-black/20 to-black/45" />

                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Dock Status</p>
                            <p className="mt-1 text-sm font-semibold tracking-wide text-white">Standby • Gate Secured</p>
                        </div>

                        <div className="bg-black/55 px-3 py-1.5 text-right">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400">Link</p>
                            <p className="mt-1 text-xs font-medium tracking-wide text-[#1ab394]">Stable uplink</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="font-tomorrow relative h-full w-full overflow-hidden border-l border-[#5E0A0A] bg-black shadow-lg select-none">
            <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />

            <div
                className="absolute inset-0 bg-cover bg-center opacity-80"
                style={{ backgroundImage: "url('/src/assets/dock_cam_placeholder.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/45" />

            <div className="absolute left-4 top-4 flex items-center gap-2 bg-black/55 px-3 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1ab394]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#FD5757]">Dock Cam</span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Dock Status</p>
                    <p className="mt-1 text-sm font-semibold tracking-wide text-white">Standby • Gate Secured</p>
                </div>

                <div className="bg-black/55 px-3 py-1.5 text-right">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400">Link</p>
                    <p className="mt-1 text-xs font-medium tracking-wide text-[#1ab394]">Stable uplink</p>
                </div>
            </div>
        </div>
    );
}
