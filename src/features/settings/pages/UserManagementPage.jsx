import React, { useCallback, useEffect, useRef, useState } from 'react';
import { userService } from '../../../services/api';
import filterHistoryIcon from '../../../assets/images/icon_filter_history.svg';
import CreateUserModal from '../components/CreateUserModal';
import DeleteUserModal from '../components/DeleteUserModal';
import UserPreviewModal from '../components/UserPreviewModal';

const PAGE_LIMIT = 20;
const PAGE_LIMIT_OPTIONS = [10, 20, 50, 100];
const panelStroke = '#FF383C';
const panelBackground = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const overlayDividerStroke = 'linear-gradient(90deg, rgba(252,71,71,0.12) 0%, #FC4747 50%, rgba(252,71,71,0.12) 100%)';
const initialCreateUserForm = {
    username: '',
    password: '',
    role: 'user',
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
        className="text-[#565656] transition-colors hover:text-[#000000]"
    >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const PanelShell = ({ children, className = '', showBottomDivider = true }) => (
    <div
        className={`font-tomorrow relative min-h-0 overflow-hidden border p-4 shadow-lg select-none ${className}`}
        style={{ borderColor: panelStroke, background: panelBackground }}
    >
        <div className="pointer-events-none absolute left-0 top-0 h-px w-full" style={{ backgroundImage: overlayDividerStroke }} />
        {showBottomDivider ? <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full" style={{ backgroundImage: overlayDividerStroke }} /> : null}
        {children}
    </div>
);

function UserTableState({ children, tone = 'default' }) {
    if (tone === 'error') {
        return (
            <div className="flex h-full flex-col items-center justify-center px-3 py-4 text-center text-xs text-[#B42323]">
                <div className="max-w-[340px] leading-6">{children}</div>
            </div>
        );
    }

    if (tone === 'empty') {
        return (
            <div className="flex h-full items-center justify-center px-3 py-4 text-xs italic text-[#5F5F5F]">
                {children}
            </div>
        );
    }

    return (
        <div className="flex h-full items-center justify-center px-3 py-4 text-center text-xs text-[#5F5F5F]">
            {children}
        </div>
    );
}

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

const buildPaginationItems = (currentPage, totalPages) => {
    if (totalPages <= 1) return [1];
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

    if (currentPage <= 3) return [1, 2, 3, 'ellipsis', totalPages];
    if (currentPage >= totalPages - 2) return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];

    return [1, 'ellipsis', currentPage, currentPage + 1, totalPages];
};

const PaginationBox = ({ active = false, disabled = false, children, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex h-9 min-w-9 items-center justify-center border px-3 text-[12px] font-medium transition-colors ${
            active ? 'text-[#FFFFFF]' : 'text-[#1F1F1F]'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#DCDCDC]'}`}
        style={{
            backgroundColor: active ? '#951616' : '#E3E3E3',
            borderColor: active ? '#951616' : '#3B3B3B',
        }}
    >
        {children}
    </button>
);

export default function UserManagementPage() {
    const [usernameInput, setUsernameInput] = useState('');
    const [appliedUsername, setAppliedUsername] = useState('');
    const [isLimitMenuOpen, setIsLimitMenuOpen] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: PAGE_LIMIT,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
    });
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [createUserForm, setCreateUserForm] = useState(initialCreateUserForm);
    const [createUserErrorMsg, setCreateUserErrorMsg] = useState('');
    const [deleteUserErrorMsg, setDeleteUserErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [userRoleOverrides, setUserRoleOverrides] = useState({});
    const requestVersionRef = useRef(0);

    const fetchUsers = useCallback(async () => {
        const requestVersion = requestVersionRef.current + 1;
        requestVersionRef.current = requestVersion;
        setIsLoading(true);
        setErrorMsg('');

        try {
            const data = await userService.getUsers({
                page: pagination.page,
                limit: pagination.limit,
                username: appliedUsername,
            });

            if (requestVersionRef.current !== requestVersion) {
                return;
            }

            const nextUsers = Array.isArray(data?.items) ? data.items : [];
            setUsers(nextUsers);
            setPagination((current) => ({
                ...current,
                total: data?.total ?? 0,
                totalPages: data?.total_pages ?? 1,
                hasNext: Boolean(data?.has_next),
                hasPrev: Boolean(data?.has_prev),
            }));
            setSelectedUserId((currentSelectedId) => {
                if (nextUsers.length === 0) return null;
                if (currentSelectedId && nextUsers.some((user) => user.id === currentSelectedId)) {
                    return currentSelectedId;
                }
                return nextUsers[0].id;
            });
        } catch (error) {
            if (requestVersionRef.current !== requestVersion) {
                return;
            }

            console.error('Error fetching users:', error);
            setUsers([]);
            setSelectedUserId(null);
            setErrorMsg(error.message);
        } finally {
            if (requestVersionRef.current === requestVersion) {
                setIsLoading(false);
            }
        }
    }, [appliedUsername, pagination.page, pagination.limit]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            const normalizedQuery = usernameInput.trim();

            setAppliedUsername((current) => {
                if (current === normalizedQuery) {
                    return current;
                }

                return normalizedQuery;
            });

            setPagination((current) => (
                current.page === 1
                    ? current
                    : { ...current, page: 1 }
            ));
        }, 300);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [usernameInput]);

    const resolveUserRole = (user) => {
        if (user?.role) return user.role;
        return userRoleOverrides[`id:${user.id}`] || userRoleOverrides[`username:${user.username}`] || 'user';
    };

    const paginationItems = buildPaginationItems(pagination.page, pagination.totalPages);

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
        setSuccessMsg('');

        const payload = {
            username: createUserForm.username.trim(),
            password: createUserForm.password,
            role: createUserForm.role,
        };

        if (!payload.username) {
            setCreateUserErrorMsg('Username wajib diisi.');
            return;
        }

        if (!payload.password) {
            setCreateUserErrorMsg('Password wajib diisi.');
            return;
        }

        setIsCreatingUser(true);

        try {
            const response = await userService.createUser(payload);
            setUserRoleOverrides((currentOverrides) => ({
                ...currentOverrides,
                [`username:${payload.username}`]: payload.role,
                ...(response?.id ? { [`id:${response.id}`]: payload.role } : {}),
            }));
            setSuccessMsg(response?.message || 'User created successfully');
            setIsCreateModalOpen(false);
            resetCreateUserState();
            await fetchUsers();
        } catch (error) {
            setCreateUserErrorMsg(error.message);
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleSelectPageLimit = (nextLimit) => {
        setPagination((current) => ({
            ...current,
            page: 1,
            limit: nextLimit,
        }));
        setIsLimitMenuOpen(false);
    };

    const highlightedUser = users.find((user) => user.id === selectedUserId) ?? null;

    const handleOpenPreviewModal = (user) => {
        setSelectedUserId(user.id);
        setIsPreviewModalOpen(true);
    };

    const handleOpenDeleteModal = (user) => {
        setSelectedUserId(user.id);
        setDeleteUserErrorMsg('');
        setSuccessMsg('');
        setDeleteTarget(user);
    };

    const handleCloseDeleteModal = () => {
        if (isDeletingUser) return;

        setDeleteTarget(null);
        setDeleteUserErrorMsg('');
    };

    const handleDeleteUser = async () => {
        if (!deleteTarget?.id) return;

        setDeleteUserErrorMsg('');
        setSuccessMsg('');
        setIsDeletingUser(true);

        try {
            const response = await userService.deleteUser(deleteTarget.id);
            const deletedUserId = deleteTarget.id;
            const deletedUsername = deleteTarget.username;

            setSuccessMsg(response?.message || 'User deleted successfully');
            setDeleteTarget(null);
            setIsPreviewModalOpen((current) => (selectedUserId === deletedUserId ? false : current));
            setUserRoleOverrides((currentOverrides) => {
                const nextOverrides = { ...currentOverrides };
                delete nextOverrides[`id:${deletedUserId}`];
                delete nextOverrides[`username:${deletedUsername}`];
                return nextOverrides;
            });

            if (users.length === 1 && pagination.page > 1) {
                setPagination((current) => ({ ...current, page: current.page - 1 }));
            } else {
                await fetchUsers();
            }
        } catch (error) {
            setDeleteUserErrorMsg(error.message);
        } finally {
            setIsDeletingUser(false);
        }
    };

    return (
        <div className="h-[calc(100vh-104px)] w-full p-[28px]">
            <PanelShell className="flex h-full flex-col gap-4" showBottomDivider={false}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <svg
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#565656]"
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
                                value={usernameInput}
                                onChange={(event) => setUsernameInput(event.target.value)}
                                placeholder="Search username"
                                className="h-[42px] w-[300px] border border-[#929292] bg-[#D2D2D2] pl-10 pr-4 text-[12px] text-[#000000] outline-none transition-colors placeholder:text-[#565656] focus:border-[#929292]"
                            />
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsLimitMenuOpen((current) => !current)}
                                className="flex h-[42px] w-[42px] items-center justify-center border border-[#929292] bg-[#D2D2D2] transition-colors hover:bg-[#C7C7C7]"
                                aria-label="Open page limit filter"
                                aria-expanded={isLimitMenuOpen}
                            >
                                <img src={filterHistoryIcon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
                            </button>

                            {isLimitMenuOpen ? (
                                <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[180px] overflow-hidden border border-[#FF383C] bg-[#F5F5F5] shadow-lg">
                                    <div className="border-b border-[#7A0A0C] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#5F5F5F]">
                                        Limit per page
                                    </div>
                                    {PAGE_LIMIT_OPTIONS.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => handleSelectPageLimit(option)}
                                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12px] transition-colors ${
                                                pagination.limit === option ? 'bg-[#F3D9D9] text-[#951616]' : 'text-[#1F1F1F] hover:bg-[#E9E9E9]'
                                            }`}
                                        >
                                            <span>{option} items</span>
                                            {pagination.limit === option ? <span className="text-[#FC4747]">●</span> : null}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleOpenCreateModal}
                            className="flex h-[42px] items-center gap-2 border border-[#929292] bg-[#D2D2D2] px-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[#000000] transition-colors hover:bg-[#C7C7C7]"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" x2="12" y1="5" y2="19" />
                                <line x1="5" x2="19" y1="12" y2="12" />
                            </svg>
                            Add User
                        </button>
                    </div>
                </div>

                {successMsg ? (
                    <div className="border border-[#7F3434] bg-[#EBDDDD] px-4 py-3 text-[12px] text-[#951616]">
                        {successMsg}
                    </div>
                ) : null}

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="relative grid grid-cols-[1.5fr_1fr_1.3fr_0.8fr] border-t-[0.5px] border-b border-[#7A0A0C] bg-[#5E0A0A] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white">
                        <div>Username</div>
                        <div>Role</div>
                        <div>Created At</div>
                        <div className="text-center">Action</div>
                    </div>

                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                        {isLoading ? (
                            <UserTableState>Loading users...</UserTableState>
                        ) : errorMsg ? (
                            <UserTableState tone="error">
                                <>
                                    <span>Oops, error loading users:</span>
                                    <span className="mt-1 opacity-80">{errorMsg}</span>
                                </>
                            </UserTableState>
                        ) : users.length === 0 ? (
                            <UserTableState tone="empty">
                                No users found for this filter.
                            </UserTableState>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={user.id === selectedUserId}
                                    onClick={() => setSelectedUserId(user.id)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            setSelectedUserId(user.id);
                                        }
                                    }}
                                    className={`relative grid cursor-pointer grid-cols-[1.5fr_1fr_1.3fr_0.8fr] items-center gap-4 border-t-[0.5px] border-b border-[#7A0A0C] px-4 py-3 text-[11px] transition-colors ${
                                        user.id === selectedUserId ? 'bg-[#F3D9D9]' : 'bg-[#F8F8F8] hover:bg-[#EFEFEF]'
                                    } focus:outline-none focus-visible:bg-[#F3D9D9]`}
                                >
                                    {user.id === selectedUserId ? <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-[3px] bg-[#FC4747]" /> : null}

                                    <div className={`truncate font-medium ${user.id === selectedUserId ? 'text-[#951616]' : 'text-[#1F1F1F]'}`}>{user.username || '-'}</div>
                                    <div className="truncate text-[#454545]">{resolveUserRole(user)}</div>
                                    <div className="text-[#454545]">{formatDateTime(user.created_at)}</div>
                                    <div className="flex items-center justify-center gap-4">
                                        <button
                                            type="button"
                                            aria-label={`Delete ${user.username || 'user'}`}
                                            className="cursor-pointer"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleOpenDeleteModal(user);
                                            }}
                                        >
                                            <DeleteIcon />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`View ${user.username || 'user'}`}
                                            className="cursor-pointer"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleOpenPreviewModal(user);
                                            }}
                                        >
                                            <ViewIcon />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                    <PaginationBox
                        disabled={pagination.page <= 1}
                        onClick={() => {
                            if (pagination.page > 1) {
                                setPagination((current) => ({ ...current, page: current.page - 1 }));
                            }
                        }}
                    >
                        {'<'}
                    </PaginationBox>

                    {paginationItems.map((item, index) => (
                        item === 'ellipsis' ? (
                            <PaginationBox key={`ellipsis-${index}`} disabled>...</PaginationBox>
                        ) : (
                            <PaginationBox
                                key={item}
                                active={pagination.page === item}
                                onClick={() => setPagination((current) => ({ ...current, page: item }))}
                            >
                                {item}
                            </PaginationBox>
                        )
                    ))}

                    <PaginationBox
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => {
                            if (pagination.page < pagination.totalPages) {
                                setPagination((current) => ({ ...current, page: current.page + 1 }));
                            }
                        }}
                    >
                        {'>'}
                    </PaginationBox>
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

            <DeleteUserModal
                isOpen={Boolean(deleteTarget)}
                username={deleteTarget?.username}
                errorMsg={deleteUserErrorMsg}
                isSubmitting={isDeletingUser}
                onClose={handleCloseDeleteModal}
                onConfirm={handleDeleteUser}
            />

            <UserPreviewModal
                isOpen={isPreviewModalOpen}
                user={highlightedUser ? { ...highlightedUser, role: resolveUserRole(highlightedUser) } : null}
                onClose={() => setIsPreviewModalOpen(false)}
            />
        </div>
    );
}
