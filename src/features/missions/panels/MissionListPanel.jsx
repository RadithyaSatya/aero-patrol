import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const missions = [
    { id: 1, date: '12/12/2025\n16:34:00', name: 'Patrol on 3 Site', action: 'Video Record', status: 'Waiting', schedule: 'today' },
    { id: 2, date: '12/12/2025\n16:34:00', name: 'Inspection on 5 Site', action: 'Audio Record', status: 'Completed', schedule: 'today' },
    { id: 3, date: '12/12/2025\n16:34:00', name: 'Follow-up on 2 Site', action: 'Video Record', status: 'In Progress', active: true, schedule: 'today' },
    { id: 4, date: '12/12/2025\n16:34:00', name: 'Maintenance on 1 Site', action: 'No Record', status: 'Scheduled', schedule: 'later' },
    { id: 5, date: '12/12/2025\n16:34:00', name: 'Emergency Response', action: 'Video Record', status: 'Resolved', schedule: 'later' },
    { id: 6, date: '12/12/2025\n16:34:00', name: 'Debriefing on 6 Site', action: 'Audio Record', status: 'Pending', schedule: 'later' }
];

const overlayDividerStroke = 'linear-gradient(90deg, rgba(213,53,53,0.18) 0%, #D53535 50%, rgba(213,53,53,0.18) 100%)';

export default function MissionListPanel({ onAddMission }) {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState('today');

    const filteredMissions = useMemo(
        () => missions.filter((mission) => mission.schedule === activeFilter),
        [activeFilter]
    );

    const handleRowClick = (mission) => {
        if (mission.status === 'In Progress') {
            navigate('/missions/active');
        }
    };

    return (
        <div className="font-tomorrow relative flex h-full w-full flex-col overflow-hidden border-[0.5px] border-[#FC4747] bg-[#222222] p-4 shadow-lg select-none">

            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-3">
                    <h2 className="text-white text-[18px] tracking-wide">Mission List</h2>
                    <span className="text-gray-400 text-[11px] font-medium mt-1">34 Mission</span>
                </div>
                <button
                    onClick={onAddMission}
                    className="transition hover:brightness-110"
                >
                    <img src="/src/assets/images/btn_add_mission.png" alt="Add Mission" className="h-auto w-[132px] object-contain" />
                </button>
            </div>

            <div
                className="h-px w-full"
                style={{ backgroundImage: overlayDividerStroke }}
            />

            <div className="mb-1 mt-6 flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => setActiveFilter('today')}
                    className={`min-w-[74px] border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                        activeFilter === 'today'
                            ? 'border-[#951616] bg-[#951616] text-white'
                            : 'border-[#3B3B3B] bg-[#222222] text-gray-300 hover:bg-[#272727]'
                    }`}
                >
                    Today
                </button>
                <button
                    type="button"
                    onClick={() => setActiveFilter('later')}
                    className={`min-w-[74px] border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                        activeFilter === 'later'
                            ? 'border-[#951616] bg-[#951616] text-white'
                            : 'border-[#3B3B3B] bg-[#222222] text-gray-300 hover:bg-[#272727]'
                    }`}
                >
                    Later
                </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1fr_2fr_1.5fr_1fr] bg-[#5E0A0A] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#D6D6D6]">
                <div>Date</div>
                <div>Mission</div>
                <div>Action</div>
                <div>Status</div>
            </div>

            {/* Table Body */}
            <div className="mt-[2px] flex-1 overflow-y-auto pr-1 space-y-[2px] custom-scrollbar">
                {filteredMissions.map((mission) => (
                    <div
                        key={mission.id}
                        className={`grid grid-cols-[1fr_2fr_1.5fr_1fr] items-center bg-[#282828] px-3 py-[7px] text-xs transition-colors ${
                            mission.active ? 'border border-[#393F44]' : 'hover:bg-[#303030]'
                        } ${mission.status === 'In Progress' ? 'cursor-pointer' : ''}`}
                        onClick={() => handleRowClick(mission)}
                    >
                        <div className="text-gray-300 leading-tight whitespace-pre-line text-[10px]">
                            {mission.date}
                        </div>
                        <div className={`text-[11px] font-medium ${mission.active ? 'text-white' : 'text-gray-200'}`}>
                            {mission.name}
                        </div>
                        <div className="text-gray-300 text-[11px]">
                            {mission.action}
                        </div>
                        <div className="text-gray-300 text-[11px]">
                            {mission.status}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
