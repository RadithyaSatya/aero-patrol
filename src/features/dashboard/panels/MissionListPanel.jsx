import React, { useState, useEffect } from 'react';
import { missionService } from '../../../services/api';

const StatBox = ({ count, label }) => (
    <div className="font-tomorrow relative flex h-[72px] w-full flex-col items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#ED0000]/35 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-[#ED0000] via-[#ED0000]/35 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[#ED0000]" />
        <div className="pointer-events-none absolute inset-x-3 bottom-0 h-6 bg-gradient-to-t from-[#ED0000]/12 to-transparent" />
        <span className="text-white text-[28px] font-bold tracking-wider leading-none">{count}</span>
        <span className="text-white text-[14px] mt-1">{label}</span>
    </div>
);

export default function MissionListPanel() {
    const [missions, setMissions] = useState([]);
    const [stats, setStats] = useState({ total: 0, waiting: 0, completed: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchMissions = async () => {
            try {
                const data = await missionService.getMissions(1, 50);
                if (data && data.items) {
                    setMissions(data.items);

                    const waiting = data.items.filter(m => m.status === 'Waiting').length;
                    const completed = data.items.filter(m => m.status === 'Completed').length;

                    setStats({
                        total: data.total || data.items.length,
                        waiting: waiting,
                        completed: completed
                    });
                }
            } catch (error) {
                console.error("Error fetching missions:", error);
                setErrorMsg(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMissions();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return { date: '', time: '' };

        const normalized = dateString.trim().replace('T', ' ');
        const [datePart, rawTimePart = ''] = normalized.split(' ');
        if (!datePart) return { date: dateString, time: '' };

        const [year, month, day] = datePart.split('-');
        const time = rawTimePart.replace('Z', '').slice(0, 5);

        if (!year || !month || !day) {
            return { date: dateString, time: '' };
        }

        return {
            date: `${day}/${month}/${year}`,
            time
        };
    };

    return (
        <div className="font-tomorrow flex h-full w-full gap-4 border border-[#D53535] bg-[#222222] p-4 shadow-lg select-none">
            <div className="mt-4 flex  w-[200px] flex-col flex-col justify-start gap-3">
                <StatBox count={stats.total} label="Total Mission" />
                <StatBox count={stats.waiting} label="Waiting" />
                <StatBox count={stats.completed} label="Completed" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden border border-[#5E0A0A]">
                <div className="grid grid-cols-[1fr_2fr_2fr] border-b border-[#5E0A0A] bg-[#5E0A0A] px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-white">
                    <div className="font-medium">Date</div>
                    <div className="font-medium">Mission</div>
                    <div className="font-medium">Status</div>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="px-1 py-2 text-xs text-gray-400">Loading missions...</div>
                    ) : errorMsg ? (
                        <div className="flex h-full flex-col items-center justify-center px-1 py-2 text-center text-xs text-red-400">
                            <span>Oops, error loading missions:</span>
                            <span className="mt-1 opacity-80">{errorMsg}</span>
                        </div>
                    ) : missions.length === 0 ? (
                        <div className="flex h-full items-center justify-center px-1 py-2 text-xs italic text-gray-400">No missions found.</div>
                    ) : (
                        missions.map((mission) => {
                            const active = mission.status === 'In Progress';
                            const formattedSchedule = formatDate(mission.schedule);
                            return (
                                <div
                                    key={mission.id}
                                    className="grid grid-cols-[1fr_2fr_2fr] items-center border-b border-[#5E0A0A] px-1 py-3 text-xs last:border-b-0"
                                >
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[14px] text-white">
                                            {formattedSchedule.date}
                                        </span>
                                        <span className="mt-1 text-[12px] text-gray-400">
                                            {formattedSchedule.time}:00
                                        </span>
                                    </div>
                                    <div className={`mr-2 truncate text-[14px] ${active ? 'w-max border-b border-[#5E0A0A] text-white' : 'text-gray-200'}`}>
                                        {mission.mission_name}
                                    </div>
                                    <div className={`text-[14px] ${active ? 'text-white' : 'text-gray-300'}`}>
                                        {mission.status}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
