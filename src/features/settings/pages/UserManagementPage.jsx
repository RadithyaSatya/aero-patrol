import React, { useCallback, useEffect, useState } from 'react';
import { userService } from '../../../services/api';
import filterHistoryIcon from '../../../assets/images/icon_filter_history.svg';
import CreateUserModal from '../components/CreateUserModal';

const panelStroke = '#FC4747';
const tableStroke = '#5E0A0A';
const overlayDividerStroke = 'linear-gradient(90deg, rgba(252,71,71,0.12) 0%, #FC4747 50%, rgba(252,71,71,0.12) 100%)';
const initialCreateUserForm = {
    email: '',
    username: '',
    dob: '',
    phone: '',
    pilot_cert: '',
    password: '',
};

const DeleteIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[#FC4747] transition-colors hover:text-[#ff7a7a]"
    >
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
);

const ViewIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-300 transition-colors hover:text-white"
    >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const PanelShell = ({ children, className = '' }) => (
    <div
        className={`font-tomorrow relative min-h-0 overflow-hidden border bg-[#222222] p-4 shadow-lg select-none ${className}`}
        style={{ borderColor: panelStroke }}
    >
        <div
            className="pointer-events-none absolute left-0 top-0 h-px w-full"
            style={{ backgroundImage: overlayDividerStroke }}
        />
        <div
            className="pointer-events-none absolute bottom-0 left-0 h-px w-full"
            style={{ backgroundImage: overlayDividerStroke }}
        />
        {children}
    </div>
);

function UserTableState({ children, tone = 'default' }) {
    const toneClassName = tone === 'error' ? 'text-[#FC4747]' : 'text-gray-400';

    return <div className={`px-4 py-4 text-[11px] ${toneClassName}`}>{children}</div>;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createUserForm, setCreateUserForm] = useState(initialCreateUserForm);
    const [createUserErrorMsg, setCreateUserErrorMsg] = useState('');
    const [createUserSuccessMsg, setCreateUserSuccessMsg] = useState('');
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setErrorMsg('');

        try {
            const data = await userService.getUsers(1, 50);
            if (data?.items) {
                setUsers(data.items);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setErrorMsg(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const formatDateTime = (isoString) => {
        if (!isoString) return '-';

        const date = new Date(isoString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(',', '');
    };

    const resetCreateUserState = () => {
        setCreateUserForm(initialCreateUserForm);
        setCreateUserErrorMsg('');
    };

    const handleOpenCreateModal = () => {
        resetCreateUserState();
        setIsCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        if (isCreatingUser) return;

        setIsCreateModalOpen(false);
        setCreateUserErrorMsg('');
    };

    const handleCreateUserFieldChange = (event) => {
        const { name, value } = event.target;
        setCreateUserForm((currentForm) => ({
            ...currentForm,
            [name]: value,
        }));
    };

    const handleCreateUser = async (event) => {
        event.preventDefault();
        setCreateUserErrorMsg('');
        setCreateUserSuccessMsg('');

        const payload = {
            email: createUserForm.email.trim(),
            username: createUserForm.username.trim(),
            dob: createUserForm.dob.trim(),
            phone: createUserForm.phone.trim(),
            pilot_cert: createUserForm.pilot_cert.trim(),
            password: createUserForm.password,
        };

        if (!payload.email || !payload.username) {
            setCreateUserErrorMsg('Email dan username wajib diisi.');
            return;
        }

        if (!payload.password) {
            setCreateUserErrorMsg('Password wajib diisi.');
            return;
        }

        if (payload.dob && !/^\d{4}-\d{2}-\d{2}$/.test(payload.dob)) {
            setCreateUserErrorMsg('Date of birth harus berformat YYYY-MM-DD.');
            return;
        }

        const requestBody = Object.fromEntries(
            Object.entries(payload).filter(([, value]) => value !== '')
        );

        setIsCreatingUser(true);

        try {
            const response = await userService.createUser(requestBody);
            setCreateUserSuccessMsg(response?.message || 'User created successfully');
            setIsCreateModalOpen(false);
            resetCreateUserState();
            await fetchUsers();
        } catch (error) {
            setCreateUserErrorMsg(error.message);
        } finally {
            setIsCreatingUser(false);
        }
    };

    return (
        <div className="h-[calc(100vh-104px)] w-full p-[28px]">
            <PanelShell className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <svg
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search"
                                className="h-[42px] w-[300px] border border-[#FC4747] bg-[#1C1C1C] pl-10 pr-4 text-[12px] text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#FC4747]"
                            />
                        </div>

                        <button
                            type="button"
                            className="flex h-[42px] w-[42px] items-center justify-center border border-[#FC4747] bg-[#1C1C1C] transition-colors hover:border-[#FC4747] hover:bg-[#262626]"
                            aria-label="Filter users"
                        >
                            <img src={filterHistoryIcon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleOpenCreateModal}
                            className="flex h-[42px] items-center gap-2 border border-[#FC4747] bg-[#222222] px-4 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#2B2B2B]"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" x2="12" y1="5" y2="19" />
                                <line x1="5" x2="19" y1="12" y2="12" />
                            </svg>
                            Add User
                        </button>

                        <button
                            type="button"
                            className="flex h-[42px] items-center gap-2 border border-[#FC4747] bg-[#222222] px-4 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#2B2B2B]"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" x2="12" y1="15" y2="3" />
                            </svg>
                            Export as CSV
                        </button>
                    </div>
                </div>

                <div className="h-px w-full" style={{ backgroundImage: overlayDividerStroke }} />

                {createUserSuccessMsg ? (
                    <div className="border border-[#2F6F4F] bg-[#11251B] px-4 py-3 text-[12px] text-[#C8F7DA]">
                        {createUserSuccessMsg}
                    </div>
                ) : null}

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[#5E0A0A]">
                    <div className="relative grid grid-cols-[1.2fr_1.8fr_1.3fr_1.3fr_0.8fr] bg-[#5E0A0A] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white">
                        <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-px" style={{ backgroundColor: tableStroke }} />
                        <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-px" style={{ backgroundColor: tableStroke }} />
                        <div>Username</div>
                        <div>Email</div>
                        <div>Pilot Certificate</div>
                        <div>Created At</div>
                        <div className="text-center">Action</div>
                    </div>

                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                        {isLoading ? (
                            <UserTableState>Loading users...</UserTableState>
                        ) : errorMsg ? (
                            <UserTableState tone="error">
                                Oops, error loading users: {errorMsg}
                            </UserTableState>
                        ) : users.length === 0 ? (
                            <UserTableState>No users found.</UserTableState>
                        ) : (
                            users.map((user, index) => (
                                <div
                                    key={user.id}
                                    className="relative grid grid-cols-[1.2fr_1.8fr_1.3fr_1.3fr_0.8fr] items-center gap-4 px-4 py-3 text-[11px] transition-colors hover:bg-[#292929]"
                                >
                                    {index === 0 && (
                                        <div
                                            className="pointer-events-none absolute left-0 right-0 top-0 h-px"
                                            style={{ backgroundColor: tableStroke }}
                                        />
                                    )}
                                    <div
                                        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
                                        style={{ backgroundColor: tableStroke }}
                                    />
                                    <div
                                        className="pointer-events-none absolute bottom-0 left-0 top-0 w-px"
                                        style={{ backgroundColor: tableStroke }}
                                    />
                                    <div
                                        className="pointer-events-none absolute bottom-0 right-0 top-0 w-px"
                                        style={{ backgroundColor: tableStroke }}
                                    />

                                    <div className="truncate font-medium text-white">{user.username || '-'}</div>
                                    <div className="truncate text-gray-300">{user.email || '-'}</div>
                                    <div className="truncate text-gray-300">{user.pilot_cert || '-'}</div>
                                    <div className="text-gray-300">{formatDateTime(user.created_at)}</div>
                                    <div className="flex items-center justify-center gap-4">
                                        <button type="button" aria-label={`Delete ${user.username || 'user'}`} className="cursor-pointer">
                                            <DeleteIcon />
                                        </button>
                                        <button type="button" aria-label={`View ${user.username || 'user'}`} className="cursor-pointer">
                                            <ViewIcon />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </PanelShell>

            <CreateUserModal
                isOpen={isCreateModalOpen}
                formData={createUserForm}
                errorMsg={createUserErrorMsg}
                isSubmitting={isCreatingUser}
                onChange={handleCreateUserFieldChange}
                onClose={handleCloseCreateModal}
                onSubmit={handleCreateUser}
            />
        </div>
    );
}
