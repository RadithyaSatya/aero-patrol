import React, { useEffect } from 'react';

const modalStroke = '#FF383C';
const actionStroke = '#ED0000';
const modalBackground = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const cancelBackground = '#571414';
const saveBackground = 'linear-gradient(135deg, #242424 0%, #343434 100%)';
const dividerGradient = 'linear-gradient(90deg, rgba(253,87,87,0.05) 0%, rgba(253,87,87,0.5) 50%, rgba(253,87,87,0.05) 100%)';

function InputLabel({ children, required = false }) {
    return (
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-[#000000]">
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
                className="h-[44px] w-full border bg-[#D2D2D2] px-4 py-2 text-[13px] text-[#000000] outline-none transition-colors placeholder:text-[#565656] focus:border-[#929292]"
                style={{ borderColor: '#929292', ...inputStyle }}
            />
        </div>
    );
}

function SelectInput({
    label,
    name,
    value,
    onChange,
    options,
    required = false,
}) {
    return (
        <div>
            <InputLabel required={required}>{label}</InputLabel>
            <div className="relative">
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="h-[44px] w-full appearance-none border bg-[#D2D2D2] px-4 py-2 pr-10 text-[13px] text-[#000000] outline-none transition-colors focus:border-[#929292]"
                    style={{ borderColor: '#929292' }}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value} className="bg-[#D2D2D2] text-[#000000]">
                            {option.label}
                        </option>
                    ))}
                </select>
                <svg
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#565656]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </div>
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
                style={{ borderColor: modalStroke, background: modalBackground }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />

                <div className="custom-scrollbar overflow-y-auto px-6 py-6 sm:px-7 sm:py-7">
                    <div className="mb-6">
                        <h2 className="text-[22px] font-medium uppercase tracking-[0.18em] text-[#000000]">Create User</h2>
                    </div>

                    {errorMsg ? (
                        <div
                            className="mb-5 border px-4 py-3 text-[12px] text-[#B42323]"
                            style={{ borderColor: '#7F3434', backgroundColor: '#EBDDDD' }}
                        >
                            {errorMsg}
                        </div>
                    ) : null}

                    <form onSubmit={onSubmit} className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
                            <TextInput
                                label="Username"
                                name="username"
                                value={formData.username}
                                onChange={onChange}
                                placeholder="user1"
                                required
                            />
                            <SelectInput
                                label="Role"
                                name="role"
                                value={formData.role}
                                onChange={onChange}
                                options={[
                                    { value: 'user', label: 'User' },
                                    { value: 'admin', label: 'Admin' },
                                    { value: 'viewer', label: 'Viewer' },
                                ]}
                                required
                            />
                        </div>

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
                                className="h-[46px] min-w-[140px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[#FFFFFF] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                style={{ borderColor: actionStroke, backgroundColor: cancelBackground }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-[46px] min-w-[160px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[#FFFFFF] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
