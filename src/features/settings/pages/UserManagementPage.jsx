import React, { useState, useEffect } from 'react';
import { userService } from '../../../services/api'; const DeleteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 hover:text-red-400 cursor-pointer transition-colors">
        <path d="M3 6h18"></path>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
    </svg>
);

const ViewIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 hover:text-white cursor-pointer transition-colors">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await userService.getUsers(1, 50); // Fetch first 50 users
                if (data && data.items) {
                    setUsers(data.items);
                }
            } catch (error) {
                console.error("Error fetching users:", error);
                setErrorMsg(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // Helper to format date "2026-03-12T13:10:26.748452+07:00" to "12/03/2026 13:10:26"
    const formatDateTime = (isoString) => {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).replace(',', '');
    };

    return (
        <div className="p-[28px] w-full h-[calc(100vh-104px)] overflow-hidden flex justify-center">
            {/* Main Panel */}
            <div className="w-full flex flex-col gap-5 rounded-[24px] border border-[#2a3240] shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-[#151a25]/95 backdrop-blur p-6 h-full">

                {/* Header/Controls Area */}
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-[45%] text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                placeholder="Search"
                                className="bg-[#1e2532] text-sm text-gray-200 placeholder-gray-500 rounded-[8px] pl-10 pr-4 py-2.5 w-[300px] border border-[#2a3240] focus:outline-none focus:border-orange-500/50 transition-colors"
                            />
                        </div>
                        <button className="h-[42px] px-3.5 bg-[#1e2532] hover:bg-[#252b36] border border-[#2a3240] rounded-[8px] flex items-center justify-center text-gray-300 transition-colors shadow-sm">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                        </button>
                    </div>

                    <button className="h-[42px] px-5 bg-[#1e2532] hover:bg-[#252b36] border border-[#2a3240] rounded-[8px] flex items-center gap-2 text-[13px] font-semibold text-white transition-colors shadow-sm tracking-wide">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                        Export as CSV
                    </button>
                </div>

                {/* Table Container */}
                <div className="flex-1 bg-[#1e2532] rounded-[12px] border border-[#2a3240] overflow-hidden flex flex-col shadow-inner">
                    {/* Table Header */}
                    <div className="grid grid-cols-[2fr_2fr_2fr_2fr_1fr] gap-4 px-6 py-4 bg-[#232b38] border-b border-[#2a3240] text-[14px] font-bold text-gray-100 tracking-wide sticky top-0 z-10">
                        <div>Username</div>
                        <div>Email</div>
                        <div>Pilot Certificate</div>
                        <div>Created at</div>
                        <div className="text-center">Action</div>
                    </div>

                    {/* Table Body (Scrollable) */}
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-2 pt-2">
                        {isLoading ? (
                            <div className="text-gray-400 text-sm px-6 py-4">Loading users...</div>
                        ) : errorMsg ? (
                            <div className="text-red-400 text-sm px-6 py-4 flex flex-col">
                                <span>Oops, error loading users:</span>
                                <span className="opacity-80 mt-1">{errorMsg}</span>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-gray-400 text-sm px-6 py-4 italic">No users found.</div>
                        ) : (
                            users.map((user) => (
                                <div key={user.id} className="grid grid-cols-[2fr_2fr_2fr_2fr_1fr] gap-4 px-6 py-4 border-b border-[#2a3240]/50 hover:bg-[#252b36] transition-colors items-center text-[13px] group">
                                    <div className="text-gray-300 font-medium">{user.username}</div>
                                    <div className="text-gray-200">{user.email || '-'}</div>
                                    <div className="text-gray-400">{user.pilot_cert || '-'}</div>
                                    <div className="text-gray-400">{formatDateTime(user.created_at)}</div>

                                    {/* Action Column */}
                                    <div className="flex items-center justify-center gap-4">
                                        <DeleteIcon />
                                        <ViewIcon />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
