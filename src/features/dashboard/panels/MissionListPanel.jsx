import React, { useEffect, useMemo, useRef, useState } from 'react';
import { missionService } from '../../../services/api';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const PAGE_LIMIT = 20;
const MISSION_PANEL_BACKGROUND = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const MISSION_PANEL_BORDER = 'linear-gradient(0deg, #ED0000 0%, #FB5555 22%, rgba(251, 85, 85, 0.38) 38%, rgba(251, 85, 85, 0.12) 47%, rgba(251, 85, 85, 0) 56%)';
const MISSION_TABLE_HEADER_FILL = 'linear-gradient(137.97deg, rgba(254, 5, 0, 0.6) -3.94%, rgba(186, 4, 4, 0.6) 48.88%, rgba(254, 5, 0, 0.6) 101.7%)';
const MISSION_TABLE_LAYOUT = 'grid grid-cols-[1fr_1.7fr_1fr_1.4fr]';
const COUNTDOWN_THRESHOLD_MS = 60 * 1000;
const TERMINAL_COUNTDOWN_STATUSES = new Set(['completed', 'failed', 'aborted', 'skipped']);
const TAKEOFF_STARTED_STATUSES = new Set(['in progress', 'takeoff', 'landed', 'dockconfirmed']);
const BLINKING_LABEL_CLASS = 'animate-[missionStatusBlink_1s_ease-in-out_infinite]';
const StatBox = ({ count, label }) => (
    <div className="font-inter relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[12px] border border-[#D4D4D4] bg-transparent">
        <span className="text-[28px] font-medium leading-none tracking-wider text-[#1F1F1F]">{count}</span>
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

const getScheduleInfo = (mission, t) => {
    const scheduleType = mission?.schedule_type || '';
    const formattedSchedule = formatRunAt(mission?.run_at, mission?.schedule_timezone);

    return {
        typeLabel: scheduleType === 'one_time'
            ? t('missions.oneTime')
            : t('missions.recurring'),
        timeLabel: formattedSchedule.time,
    };
};

const getMissionStatusLabel = (status, t) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();

    if (normalizedStatus === 'waiting') return t('missions.waiting');
    if (normalizedStatus === 'completed') return t('missions.completed');
    if (normalizedStatus === 'in progress') return t('missions.inProgress');

    return status || '-';
};

const getRunAtTime = (runAt) => {
    const timestamp = new Date(runAt || 0).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
};

const getMissionRunKey = (mission) => `${mission.mission_id}-${mission.run_at}`;

const isCountdownEligibleStatus = (status) => !TERMINAL_COUNTDOWN_STATUSES.has(String(status || '').trim().toLowerCase());
const hasMissionTakenOff = (status) => TAKEOFF_STARTED_STATUSES.has(String(status || '').trim().toLowerCase());

const getNearestUpcomingMissionKey = (missions = [], currentTimeMs = Date.now()) => {
    const eligibleMissions = missions
        .filter((mission) => isCountdownEligibleStatus(mission?.status))
        .map((mission) => ({
            key: getMissionRunKey(mission),
            runAtTime: getRunAtTime(mission?.run_at),
            hasTakenOff: hasMissionTakenOff(mission?.status),
        }))
        .filter((mission) => mission.runAtTime != null);

    const activeDueMission = eligibleMissions
        .filter((mission) => !mission.hasTakenOff && mission.runAtTime <= currentTimeMs)
        .sort((left, right) => right.runAtTime - left.runAtTime)[0];

    if (activeDueMission) {
        return activeDueMission.key;
    }

    const nearestMission = eligibleMissions
        .filter((mission) => mission.runAtTime > currentTimeMs)
        .sort((left, right) => left.runAtTime - right.runAtTime)[0];

    return nearestMission?.key || null;
};

const formatCountdown = (remainingMs) => {
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
        return '00:00';
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const sortMissionRunsByLatestSchedule = (items = []) => [...items].sort((left, right) => {
    const leftTime = getRunAtTime(left?.run_at);
    const rightTime = getRunAtTime(right?.run_at);

    if (leftTime == null && rightTime == null) {
        return 0;
    }

    if (leftTime == null) {
        return 1;
    }

    if (rightTime == null) {
        return -1;
    }

    return rightTime - leftTime;
});

function MissionListPanel({ uavId, refreshKey = 0 }) {
    const { t } = useI18n();
    const [missions, setMissions] = useState([]);
    const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
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
        const intervalId = window.setInterval(() => {
            setCurrentTimeMs(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

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

                setMissions(sortMissionRunsByLatestSchedule(Array.isArray(data?.items) ? data.items : []));
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

            setMissions((currentItems) => sortMissionRunsByLatestSchedule([
                ...currentItems,
                ...(Array.isArray(data?.items) ? data.items : []),
            ]));
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

    const nearestMissionKey = useMemo(
        () => getNearestUpcomingMissionKey(missions, currentTimeMs),
        [missions, currentTimeMs]
    );

    return (
        <div
            className="font-inter relative h-full w-full overflow-hidden rounded-[30px] p-px select-none"
            style={{ backgroundImage: MISSION_PANEL_BORDER }}
        >
            <div
                className="flex h-full w-full gap-4 overflow-hidden rounded-[29px] p-4"
                style={{ background: MISSION_PANEL_BACKGROUND }}
            >
                <div className="flex h-full w-[164px] flex-col gap-3">
                    <div className="min-h-0 flex-1">
                        <StatBox count={stats.total} label={t('missions.todayMission')} />
                    </div>
                    <div className="min-h-0 flex-1">
                        <StatBox count={stats.waiting} label={t('missions.waiting')} />
                    </div>
                    <div className="min-h-0 flex-1">
                        <StatBox count={stats.completed} label={t('missions.completed')} />
                    </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <div
                        ref={containerRef}
                        onScroll={handleScroll}
                        className="custom-scrollbar flex-1 overflow-y-auto"
                    >
                        {isInitialLoading ? (
                            <div className="px-1 py-2 text-xs text-gray-400">{t('missions.loadingTodayMissions')}</div>
                        ) : errorMsg && missions.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center px-1 py-2 text-center text-xs text-red-400">
                                <span>{t('missions.errorLoadingTodayMission')}</span>
                                <span className="mt-1 opacity-80">{errorMsg}</span>
                            </div>
                        ) : (
                            <div>
                                <div
                                    className={`${MISSION_TABLE_LAYOUT} border-x border-t border-[#7A0A0C] px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-[#FFFFFF]`}
                                    style={{ background: MISSION_TABLE_HEADER_FILL }}
                                >
                                    <div className="font-medium">{t('common.date')}</div>
                                    <div className="font-medium">{t('common.mission')}</div>
                                    <div className="font-medium">{t('common.status')}</div>
                                    <div className="font-medium">{t('missions.schedule')}</div>
                                </div>

                                <div className="border-x border-[#7A0A0C]">
                                    {missions.length === 0 ? (
                                        <div className="border-b border-[#7A0A0C] px-2 py-3 text-center text-xs italic text-gray-400">
                                            {t('missions.noMissionToday')}
                                        </div>
                                    ) : (
                                        <div>
                                            {missions.map((mission, index) => {
                                                const active = mission.status === 'In Progress';
                                                const formattedSchedule = formatRunAt(mission.run_at, mission.schedule_timezone);
                                                const scheduleInfo = getScheduleInfo(mission, t);
                                                const missionKey = getMissionRunKey(mission);
                                                const runAtTime = getRunAtTime(mission.run_at);
                                                const remainingMs = runAtTime != null ? runAtTime - currentTimeMs : null;
                                                const showCountdown = (
                                                    nearestMissionKey === missionKey
                                                    && remainingMs != null
                                                    && remainingMs > 0
                                                    && remainingMs <= COUNTDOWN_THRESHOLD_MS
                                                );
                                                const showWaitingDrone = (
                                                    nearestMissionKey === missionKey
                                                    && remainingMs != null
                                                    && remainingMs <= 0
                                                    && !hasMissionTakenOff(mission.status)
                                                    && isCountdownEligibleStatus(mission.status)
                                                );

                                                return (
                                                    <div
                                                        key={missionKey}
                                                        className={`${MISSION_TABLE_LAYOUT} items-center px-1 py-2.5 text-xs ${
                                                            index === 0 ? '' : 'border-t border-[#7A0A0C]'
                                                        } ${
                                                            index === missions.length - 1 ? 'border-b border-[#7A0A0C]' : ''
                                                        }`}
                                                    >
                                                        <div className="flex flex-col leading-[1.15]">
                                                            <span className="text-[13px] text-[#1F1F1F]">
                                                                {formattedSchedule.date}
                                                            </span>
                                                            <span className="mt-0.5 text-[11px] text-[#5F5F5F]">
                                                                {formattedSchedule.time}
                                                            </span>
                                                        </div>
                                                        <div className={`mr-2 truncate text-[13px] ${active ? 'w-max border-b border-[#7A0A0C] text-[#1F1F1F]' : 'text-[#2A2A2A]'}`}>
                                                            {mission.mission_name}
                                                        </div>
                                                        <div className={`text-[13px] ${active ? 'text-[#1F1F1F]' : 'text-[#2A2A2A]'}`}>
                                                            {getMissionStatusLabel(mission.status, t)}
                                                        </div>
                                                        <div className="flex flex-col leading-[1.15]">
                                                            <span className="text-[13px] text-[#2A2A2A]">
                                                                {scheduleInfo.typeLabel}
                                                            </span>
                                                            <span className={`mt-0.5 min-h-[14px] text-[11px] ${
                                                                showCountdown
                                                                    ? `font-medium text-[#B42323] ${BLINKING_LABEL_CLASS}`
                                                                    : showWaitingDrone
                                                                    ? `font-medium text-[#D97706] ${BLINKING_LABEL_CLASS}`
                                                                    : 'text-[#5F5F5F]'
                                                            }`}>
                                                                {showCountdown
                                                                    ? `${formatCountdown(remainingMs)} ${t('missions.countdownLabel')}`
                                                                    : showWaitingDrone
                                                                    ? t('missions.waitingDrone')
                                                                    : scheduleInfo.timeLabel}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {isLoadingMore ? (
                                    <div className="px-2 py-3 text-center text-xs text-gray-400">
                                        {t('missions.loadingMoreMissions')}
                                    </div>
                                ) : null}

                                {!pagination.hasNext && missions.length > 0 ? (
                                    <div>
                                        <div className={`${MISSION_TABLE_LAYOUT} px-2 py-3 text-[11px] text-gray-500`}>
                                            <div className="col-span-4 text-center">{t('missions.endOfTodayMissions')}</div>
                                        </div>
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
            <style>
                {`
                    @keyframes missionStatusBlink {
                        0%, 100% {
                            opacity: 1;
                        }
                        50% {
                            opacity: 0.3;
                        }
                    }
                `}
            </style>
        </div>
    );
}

export default React.memo(MissionListPanel);
