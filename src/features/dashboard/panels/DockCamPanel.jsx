import React from 'react';
import { DOCK_CCTV_STREAM_URL } from '../../../shared/config/streamConfig';
import WebRtcStream from '../../../shared/components/WebRtcStream';
import { TopBottomFadeOverlay } from './PanelEdgeOverlay';

const STREAM_PANEL_FILL = 'linear-gradient(180deg, #F5F5F5 0%, #EDEDED 100%)';
const STREAM_PANEL_BORDER = 'linear-gradient(135deg, #FB5555 0%, #ED0000 18%, rgba(251, 85, 85, 0.42) 40%, rgba(251, 85, 85, 0.12) 56%, rgba(251, 85, 85, 0) 66%)';

export default function DockCamPanel() {
    const [streamStatus, setStreamStatus] = React.useState(DOCK_CCTV_STREAM_URL ? 'checking' : 'empty');
    const showStreamOverlay = streamStatus === 'ready';

    return (
        <div
            className="font-inter relative h-full w-full overflow-hidden rounded-[30px] p-px select-none"
            style={{ backgroundImage: STREAM_PANEL_BORDER }}
        >
            <div
                className="relative flex h-full w-full flex-col overflow-hidden rounded-[29px] px-5 py-4"
                style={{ background: STREAM_PANEL_FILL }}
            >
                <div className="flex shrink-0 items-center gap-3 pb-3">
                    <span className="h-[20px] w-[5px] bg-[#FF383C]" />
                    <p className="text-left text-[18px] font-medium tracking-wide text-[#1F1F1F]">Dock Cam</p>
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-[22px] bg-black">
                    <div className="relative h-full w-full overflow-hidden rounded-[22px]">
                        <TopBottomFadeOverlay startColor="#ED0000" midColor="#5E0A0A" />
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
            </div>
        </div>
    );
}
