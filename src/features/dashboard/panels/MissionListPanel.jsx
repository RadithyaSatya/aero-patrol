import React, { useEffect, useMemo, useRef, useState } from 'react';
import { missionService } from '../../../services/api';

const PAGE_LIMIT = 20;
const PANEL_STROKE_RED = '#FF383C';

const StatBox = ({ count, label }) => (
    <div className="font-tomorrow relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[rgba(197,197,197,0.5)]">
        <div className="pointer-events-none absolute bottom-0 left-0 h-[52%] w-px bg-gradient-to-t from-[#FF383C] via-[#FF383C]/45 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[52%] w-px bg-gradient-to-t from-[#FF383C] via-[#FF383C]/45 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[#FF383C]" />
        <span className="text-[28px] font-bold leading-none tracking-wider text-[#1F1F1F]">{count}</span>
        <span className="mt-1 text-[14px] text-[#3A3A3A]">{label}</span>
    </div>
);

const formatRunAt = (runAt, timeZone) => {
    if (!runAt) return { date: '-', time: '-' };

    const parsedDate = new Date(runAt);
    if (Number.isNaN(parsedDate.getTime())) {
        return { date: runAt, time: '-' };
    }

    return {
        date: new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: timeZone || undefined,
        }).format(parsedDate),
        time: new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timeZone || undefined,
        }).format(parsedDate),
    };
};

const toTitleCase = (value = '') => value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getScheduleInfo = (mission) => {
    const scheduleType = mission?.schedule_type || '';
    const formattedSchedule = formatRunAt(mission?.run_at, mission?.schedule_timezone);

    return {
        typeLabel: scheduleType === 'one_time'
            ? 'One Time'
            : `Recurring - ${toTitleCase(scheduleType)}`,
        timeLabel: formattedSchedule.time,
    };
};

export default function MissionListPanel({ uavId, refreshKey = 0 }) {
    const [missions, setMissions] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        total: 0,
        hasNext: false,
    });
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const containerRef = useRef(null);
    const isMountedRef = useRef(true);
    const isLoadingMoreRef = useRef(false);
    const paginationRef = useRef({
        page: 1,
        total: 0,
        hasNext: false,
    });
    const requestVersionRef = useRef(0);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        isLoadingMoreRef.current = isLoadingMore;
    }, [isLoadingMore]);

    useEffect(() => {
        paginationRef.current = pagination;
    }, [pagination]);

    useEffect(() => {
        let isCancelled = false;
        const requestVersion = requestVersionRef.current + 1;
        requestVersionRef.current = requestVersion;

        const fetchInitialMissionRuns = async () => {
            setMissions([]);
            setPagination({
                page: 1,
                total: 0,
                hasNext: false,
            });
            setIsInitialLoading(true);
            setIsLoadingMore(false);
            setErrorMsg('');

            try {
                const data = await missionService.getMissionRuns({
                    page: 1,
                    limit: PAGE_LIMIT,
                    uavId,
                    upcoming: 'today',
                });

                if (isCancelled || !isMountedRef.current || requestVersionRef.current !== requestVersion) {
                    return;
                }

                setMissions(Array.isArray(data?.items) ? data.items : []);
                setPagination({
                    page: data?.page ?? 1,
                    total: data?.total ?? 0,
                    hasNext: Boolean(data?.has_next),
                });
            } catch (error) {
                if (isCancelled || !isMountedRef.current || requestVersionRef.current !== requestVersion) {
                    return;
                }

                console.error('Error fetching mission runs:', error);
                setMissions([]);
                setPagination({
                    page: 1,
                    total: 0,
                    hasNext: false,
                });
                setErrorMsg(error.message);
            } finally {
                if (!isCancelled && isMountedRef.current && requestVersionRef.current === requestVersion) {
                    setIsInitialLoading(false);
                }
            }
        };

        fetchInitialMissionRuns();

        return () => {
            isCancelled = true;
        };
    }, [uavId, refreshKey]);

    const loadMoreMissionRuns = async () => {
        if (isInitialLoading || isLoadingMoreRef.current || !paginationRef.current.hasNext) {
            return;
        }

        const requestVersion = requestVersionRef.current;
        setErrorMsg('');
        setIsLoadingMore(true);

        try {
            const nextPage = paginationRef.current.page + 1;
            const data = await missionService.getMissionRuns({
                page: nextPage,
                limit: PAGE_LIMIT,
                uavId,
                upcoming: 'today',
            });

            if (!isMountedRef.current || requestVersionRef.current !== requestVersion) {
                return;
            }

            setMissions((currentItems) => [
                ...currentItems,
                ...(Array.isArray(data?.items) ? data.items : []),
            ]);
            setPagination({
                page: data?.page ?? nextPage,
                total: data?.total ?? paginationRef.current.total,
                hasNext: Boolean(data?.has_next),
            });
        } catch (error) {
            if (!isMountedRef.current || requestVersionRef.current !== requestVersion) {
                return;
            }

            console.error('Error loading more mission runs:', error);
            setErrorMsg(error.message);
        } finally {
            if (isMountedRef.current) {
                setIsLoadingMore(false);
            }
        }
    };

    const handleScroll = (event) => {
        const element = event.currentTarget;
        const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

        if (distanceToBottom <= 120) {
            loadMoreMissionRuns();
        }
    };

    useEffect(() => {
        const element = containerRef.current;
        if (!element || isInitialLoading || isLoadingMore || !pagination.hasNext) {
            return;
        }

        if (element.scrollHeight <= element.clientHeight + 16) {
            loadMoreMissionRuns();
        }
    }, [isInitialLoading, isLoadingMore, pagination.hasNext, pagination.page]);

    const stats = useMemo(() => {
        const waitingCount = missions.filter((mission) => mission.status === 'Waiting').length;
        const completedCount = missions.filter((mission) => mission.status === 'Completed').length;

        return {
            total: pagination.total,
            waiting: waitingCount,
            completed: completedCount,
        };
    }, [missions, pagination.total]);

    return (
        <div
            className="font-tomorrow flex h-full w-full gap-4 select-none border border-[#FF383C] p-4 shadow-lg"
            style={{ background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }}
        >
            <div className="flex h-full w-[200px] flex-col gap-3">
                <div className="min-h-0 flex-1">
                    <StatBox count={stats.total} label="Today Mission" />
                </div>
                <div className="min-h-0 flex-1">
                    <StatBox count={stats.waiting} label="Waiting" />
                </div>
                <div className="min-h-0 flex-1">
                    <StatBox count={stats.completed} label="Completed" />
                </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="grid grid-cols-[1fr_1.7fr_1fr_1.4fr] border-t-[0.5px] border-b border-[#7A0A0C] bg-[#5E0A0A] px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-white">
                    <div className="font-medium">Date</div>
                    <div className="font-medium">Mission</div>
                    <div className="font-medium">Status</div>
                    <div className="font-medium">Schedule</div>
                </div>

                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="custom-scrollbar flex-1 overflow-y-auto"
                >
                    {isInitialLoading ? (
                        <div className="px-1 py-2 text-xs text-gray-400">Loading today missions...</div>
                    ) : errorMsg && missions.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center px-1 py-2 text-center text-xs text-red-400">
                            <span>Oops, error loading mission today:</span>
                            <span className="mt-1 opacity-80">{errorMsg}</span>
                        </div>
                    ) : missions.length === 0 ? (
                        <div className="flex h-full items-center justify-center px-1 py-2 text-xs italic text-gray-400">
                            No mission scheduled for today.
                        </div>
                    ) : (
                        <div>
                            {missions.map((mission) => {
                                const active = mission.status === 'In Progress';
                                const formattedSchedule = formatRunAt(mission.run_at, mission.schedule_timezone);
                                const scheduleInfo = getScheduleInfo(mission);

                                return (
                                    <div
                                        key={`${mission.mission_id}-${mission.run_at}`}
                                        className="grid grid-cols-[1fr_1.7fr_1fr_1.4fr] items-center border-t-[0.5px] border-b border-[#7A0A0C] px-1 py-2.5 text-xs"
                                    >
                                        <div className="flex flex-col leading-[1.1]">
                                            <span className="text-[14px] text-[#1F1F1F]">
                                                {formattedSchedule.date}
                                            </span>
                                            <span className="mt-0.5 text-[11px] text-[#5F5F5F]">
                                                {formattedSchedule.time}
                                            </span>
                                        </div>
                                        <div className={`mr-2 truncate text-[14px] ${active ? 'w-max border-b border-[#7A0A0C] text-[#1F1F1F]' : 'text-[#2A2A2A]'}`}>
                                            {mission.mission_name}
                                        </div>
                                        <div className={`text-[14px] ${active ? 'text-[#1F1F1F]' : 'text-[#2A2A2A]'}`}>
                                            {mission.status}
                                        </div>
                                        <div className="flex flex-col leading-[1.1]">
                                            <span className="text-[11px] text-[#2A2A2A]">
                                                {scheduleInfo.typeLabel}
                                            </span>
                                            <span className="mt-0.5 text-[11px] text-[#5F5F5F]">
                                                {scheduleInfo.timeLabel}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            {isLoadingMore ? (
                                <div className="px-2 py-3 text-center text-xs text-gray-400">
                                    Loading more missions...
                                </div>
                            ) : null}

                            {!pagination.hasNext ? (
                                <div className="px-2 py-3 text-center text-[11px] text-gray-500">
                                    End of today missions
                                </div>
                            ) : null}

                            {errorMsg && missions.length > 0 ? (
                                <div className="px-2 py-3 text-center text-xs text-red-400">
                                    {errorMsg}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
