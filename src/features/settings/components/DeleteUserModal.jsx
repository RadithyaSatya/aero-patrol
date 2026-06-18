import React, { useEffect } from 'react';

const modalStroke = '#FF383C';
const actionStroke = '#ED0000';
const modalBackground = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const cancelBackground = '#571414';
const confirmBackground = 'linear-gradient(135deg, #242424 0%, #343434 100%)';
const dividerGradient = 'linear-gradient(90deg, rgba(253,87,87,0.05) 0%, rgba(253,87,87,0.5) 50%, rgba(253,87,87,0.05) 100%)';

export default function DeleteUserModal({
    isOpen,
    username,
    errorMsg,
    isSubmitting,
    onClose,
    onConfirm,
}) {
    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="font-tomorrow fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[2px]"
            onClick={() => {
                if (!isSubmitting) onClose();
            }}
        >
            <div
                className="relative flex w-full max-w-[560px] flex-col overflow-hidden border shadow-[0_28px_70px_rgba(0,0,0,0.58)]"
                style={{ borderColor: modalStroke, background: modalBackground }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />

                <div className="px-6 py-6 sm:px-7 sm:py-7">
                    <div className="mb-5">
                        <h2 className="text-[20px] font-medium uppercase tracking-[0.18em] text-[#000000]">Delete User</h2>
                    </div>

                    <p className="text-[13px] leading-6 text-[#454545]">
                        Delete user
                        <span className="mx-1 text-[#000000]">{username || 'this user'}</span>
                        permanently from the list? This action cannot be undone.
                    </p>

                    {errorMsg ? (
                        <div
                            className="mt-5 border px-4 py-3 text-[12px] text-[#B42323]"
                            style={{ borderColor: '#7F3434', backgroundColor: '#EBDDDD' }}
                        >
                            {errorMsg}
                        </div>
                    ) : null}

                    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="h-[46px] min-w-[140px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[#FFFFFF] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ borderColor: actionStroke, backgroundColor: cancelBackground }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className="h-[46px] min-w-[160px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[#FFFFFF] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ borderColor: actionStroke, background: confirmBackground }}
                        >
                            {isSubmitting ? 'Deleting...' : 'Delete User'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
