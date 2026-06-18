import React from 'react';
import { DOCK_CCTV_STREAM_URL } from '../../../shared/config/streamConfig';
import WebRtcStream from '../../../shared/components/WebRtcStream';

export default function DockCamPanel({ variant = 'default', streamBorderClassName = 'border', headerAction = null }) {
    const isStream = variant === 'stream';
    const [streamStatus, setStreamStatus] = React.useState(DOCK_CCTV_STREAM_URL ? 'checking' : 'empty');
    const showStreamOverlay = streamStatus === 'ready';

    if (isStream) {
        return (
            <div
                className={`font-tomorrow relative flex h-full w-full flex-col overflow-hidden ${streamBorderClassName} border-[#FF383C] p-3 shadow-lg select-none`}
                style={{ background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }}
            >
                <div className="shrink-0 pb-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="h-[20px] w-[5px] bg-[#FF383C]" />
                            <p className="text-left text-[16px] font-medium tracking-wide text-[#1F1F1F]">Dock Cam</p>
                        </div>
                        {headerAction}
                    </div>
                </div>

                <div className="relative min-h-0 flex-1 overflow-hidden">
                    <div className="pointer-events-none absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
                    <div className="pointer-events-none absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[#ED0000]" />

                    <WebRtcStream
                        src={DOCK_CCTV_STREAM_URL}
                        title="Dock Cam Stream"
                        autoPlay
                        muted
                        playsInline
                        controls={false}
                        className="absolute inset-0 h-full w-full object-cover"
                        fallbackClassName="bg-[#D0D0D0]"
                        fallbackTextClassName="text-[#5F5F5F]"
                        onStatusChange={setStreamStatus}
                    />
                    {showStreamOverlay ? <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/45" /> : null}

                </div>
            </div>
        );
    }

    return (
        <div className="font-tomorrow relative h-full w-full overflow-hidden border-l border-[#5E0A0A] bg-black shadow-lg select-none">
            <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#ED0000] via-[#5E0A0A]/45 to-transparent" />

            <WebRtcStream
                src={DOCK_CCTV_STREAM_URL}
                title="Dock Cam Stream"
                autoPlay
                muted
                playsInline
                controls={false}
                className="absolute inset-0 h-full w-full object-cover"
                fallbackClassName="bg-[#D0D0D0]"
                fallbackTextClassName="text-[#5F5F5F]"
                onStatusChange={setStreamStatus}
            />
            {showStreamOverlay ? <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/45" /> : null}

            <div className="absolute left-4 top-4 flex items-center gap-2 bg-black/55 px-3 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1ab394]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#FD5757]">Dock Cam</span>
            </div>

        </div>
    );
}
