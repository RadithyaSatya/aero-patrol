import React, { useEffect } from 'react';

const modalStroke = '#FD575780';
const actionStroke = '#FB55557A';
const modalBackground = '#222222';
const cancelBackground = '#571414';
const saveBackground = 'linear-gradient(135deg, #242424 0%, #343434 100%)';
const dividerGradient = 'linear-gradient(90deg, rgba(253,87,87,0.05) 0%, rgba(253,87,87,0.5) 50%, rgba(253,87,87,0.05) 100%)';

function InputLabel({ children, required = false }) {
    return (
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[#F2D6D6]">
            {children}
            {required ? <span className="ml-1 text-[#FD5757]">*</span> : null}
        </label>
    );
}

function TextInput({
    label,
    name,
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    inputStyle,
}) {
    return (
        <div>
            <InputLabel required={required}>{label}</InputLabel>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="h-[44px] w-full border bg-[#1B1B1B] px-4 py-2 text-[13px] text-white outline-none transition-colors placeholder:text-[#7F7F7F] focus:border-[#FD5757]"
                style={{ borderColor: modalStroke, ...inputStyle }}
            />
        </div>
    );
}

export default function CreateUserModal({
    isOpen,
    formData,
    errorMsg,
    isSubmitting,
    onChange,
    onClose,
    onSubmit
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
                className="relative flex max-h-[calc(100vh-48px)] w-full max-w-[860px] flex-col overflow-hidden border shadow-[0_28px_70px_rgba(0,0,0,0.58)]"
                style={{ borderColor: modalStroke, backgroundColor: modalBackground }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />

                <div className="custom-scrollbar overflow-y-auto px-6 py-6 sm:px-7 sm:py-7">
                    <div className="mb-6">
                        <h2 className="text-[22px] font-medium uppercase tracking-[0.18em] text-white">Create User</h2>
                    </div>

                    {errorMsg ? (
                        <div
                            className="mb-5 border px-4 py-3 text-[12px] text-[#FFD0D0]"
                            style={{ borderColor: actionStroke, backgroundColor: 'rgba(87, 20, 20, 0.28)' }}
                        >
                            {errorMsg}
                        </div>
                    ) : null}

                    <form onSubmit={onSubmit} className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
                            <TextInput
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={onChange}
                                placeholder="user@example.com"
                                required
                            />
                            <TextInput
                                label="Username"
                                name="username"
                                value={formData.username}
                                onChange={onChange}
                                placeholder="user1"
                                required
                            />
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <TextInput
                                label="Date of Birth"
                                name="dob"
                                type="date"
                                value={formData.dob}
                                onChange={onChange}
                                placeholder="1990-01-01"
                                inputStyle={{ colorScheme: 'dark' }}
                            />
                            <TextInput
                                label="Phone"
                                name="phone"
                                value={formData.phone}
                                onChange={onChange}
                                placeholder="+628123456789"
                            />
                        </div>

                        <TextInput
                            label="Pilot Certificate"
                            name="pilot_cert"
                            value={formData.pilot_cert}
                            onChange={onChange}
                            placeholder="CERT-001"
                        />

                        <TextInput
                            label="Password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={onChange}
                            placeholder="secret123"
                            required
                        />
                        
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="h-[46px] min-w-[140px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                style={{ borderColor: actionStroke, backgroundColor: cancelBackground }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-[46px] min-w-[160px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                style={{ borderColor: actionStroke, background: saveBackground }}
                            >
                                {isSubmitting ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
