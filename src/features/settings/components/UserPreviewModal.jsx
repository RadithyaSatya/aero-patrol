import React, { useEffect } from 'react';

const modalStroke = '#FF383C';
const modalBackground = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const dividerGradient = 'linear-gradient(90deg, rgba(253,87,87,0.05) 0%, rgba(253,87,87,0.5) 50%, rgba(253,87,87,0.05) 100%)';
const cardStroke = '#7A0A0C';
const actionStroke = '#ED0000';
const closeBackground = '#571414';

const formatDateTime = (isoString) => {
    if (!isoString) return '-';

    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(date).replace(',', '');
};

function InfoCard({ label, value }) {
    return (
        <div className="border bg-[#D2D2D2] px-4 py-4" style={{ borderColor: '#929292' }}>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#5F5F5F]">{label}</div>
            <div className="mt-2 text-[14px] text-[#1F1F1F]">{value}</div>
        </div>
    );
}

export default function UserPreviewModal({
    isOpen,
    user,
    onClose,
}) {
    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !user) return null;

    return (
        <div
            className="font-tomorrow fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="relative flex max-h-[calc(100vh-48px)] w-full max-w-[720px] flex-col overflow-hidden border shadow-[0_28px_70px_rgba(0,0,0,0.58)]"
                style={{ borderColor: modalStroke, background: modalBackground }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />

                <div className="custom-scrollbar overflow-y-auto px-6 py-6 sm:px-7 sm:py-7">
                    <div className="mb-6 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-[22px] font-medium uppercase tracking-[0.18em] text-[#000000]">User Preview</h2>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 min-w-10 items-center justify-center border text-white transition-opacity hover:opacity-90"
                            style={{ borderColor: actionStroke, backgroundColor: closeBackground }}
                            aria-label="Close preview"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" x2="6" y1="6" y2="18" />
                                <line x1="6" x2="18" y1="6" y2="18" />
                            </svg>
                        </button>
                    </div>

                    <div className="border bg-[rgba(197,197,197,0.5)] px-4 py-4" style={{ borderColor: cardStroke }}>
                        <div className="text-[22px] font-medium text-[#1F1F1F]">{user.username || '-'}</div>
                        <div className="mt-2 inline-flex items-center border border-[#929292] bg-[#D2D2D2] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#000000]">
                            {user.role || 'user'}
                        </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-1">
                        <InfoCard label="Created At" value={formatDateTime(user.created_at)} />
                    </div>
                </div>
            </div>
        </div>
    );
}
