import React, { useEffect, useMemo, useRef, useState } from 'react';
import { missionService } from '../../../services/api';
import DeleteMissionModal from '../components/DeleteMissionModal';
import addMissionButton from '../../../assets/images/btn_add_mission_white.svg';
import deleteMissionIcon from '../../../assets/images/icon_trash_mission.svg';

const PAGE_LIMIT = 20;
const DEFAULT_LATER_DAYS = 21;
const overlayDividerStroke = 'linear-gradient(90deg, rgba(213,53,53,0.18) 0%, #D53535 50%, rgba(213,53,53,0.18) 100%)';
const tableLayoutClass = 'grid min-w-[640px] grid-cols-[120px_minmax(220px,1fr)_120px_160px_64px]';

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

const getScheduleLabel = (scheduleType) => (
    !scheduleType
        ? '-'
        : scheduleType === 'one_time'
        ? 'One Time'
        : `Recurring - ${toTitleCase(scheduleType)}`
);

const getMissionRunKey = (missionRun) => `${missionRun.mission_id}-${missionRun.run_at}`;

export default function MissionListPanel({
    onAddMission,
    uavId,
    selectedMissionKey,
    onSelectMission,
    onMissionDeleted,
}) {
    const [activeFilter, setActiveFilter] = useState('today');
    const [missionRuns, setMissionRuns] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        total: 0,
        hasNext: false,
    });
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [reloadToken, setReloadToken] = useState(0);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteErrorMsg, setDeleteErrorMsg] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const containerRef = useRef(null);
    const isMountedRef = useRef(true);
    const isLoadingMoreRef = useRef(false);
    const paginationRef = useRef({ page: 1, total: 0, hasNext: false });
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

        const fetchMissionRuns = async () => {
            setMissionRuns([]);
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
                    upcoming: activeFilter,
                    days: activeFilter === 'later' ? DEFAULT_LATER_DAYS : undefined,
                });

                if (isCancelled || !isMountedRef.current || requestVersionRef.current !== requestVersion) {
                    return;
                }

                const items = Array.isArray(data?.items) ? data.items : [];
                setMissionRuns(items);
                setPagination({
                    page: data?.page ?? 1,
                    total: data?.total ?? 0,
                    hasNext: Boolean(data?.has_next),
                });

                if (items.length === 0) {
                    onSelectMission?.(null);
                    return;
                }

                const hasSelectedItem = selectedMissionKey
                    ? items.some((item) => getMissionRunKey(item) === selectedMissionKey)
                    : false;

                if (!hasSelectedItem) {
                    onSelectMission?.(items[0]);
                }
            } catch (error) {
                if (isCancelled || !isMountedRef.current || requestVersionRef.current !== requestVersion) {
                    return;
                }

                console.error('Error fetching mission runs:', error);
                setMissionRuns([]);
                setPagination({
                    page: 1,
                    total: 0,
                    hasNext: false,
                });
                setErrorMsg(error.message);
                onSelectMission?.(null);
            } finally {
                if (!isCancelled && isMountedRef.current && requestVersionRef.current === requestVersion) {
                    setIsInitialLoading(false);
                }
            }
        };

        fetchMissionRuns();

        return () => {
            isCancelled = true;
        };
    }, [activeFilter, reloadToken, onSelectMission, uavId]);

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
                upcoming: activeFilter,
                days: activeFilter === 'later' ? DEFAULT_LATER_DAYS : undefined,
            });

            if (!isMountedRef.current || requestVersionRef.current !== requestVersion) {
                return;
            }

            setMissionRuns((currentItems) => [
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

    const handleDeleteMission = async () => {
        if (!deleteTarget) return;

        setDeleteErrorMsg('');
        setIsDeleting(true);

        try {
            await missionService.deleteMission(deleteTarget.mission_id);
            onMissionDeleted?.(deleteTarget.mission_id);
            setDeleteTarget(null);
            setReloadToken((current) => current + 1);
        } catch (error) {
            console.error('Error deleting mission:', error);
            setDeleteErrorMsg(error.message);
        } finally {
            if (isMountedRef.current) {
                setIsDeleting(false);
            }
        }
    };

    const listSubtitle = useMemo(() => {
        if (isInitialLoading) return 'Loading...';
        return `${pagination.total} Mission`;
    }, [isInitialLoading, pagination.total]);

    return (
        <>
            <div
                className="font-tomorrow relative flex h-full w-full flex-col overflow-hidden border border-[#FF383C] p-4 shadow-lg select-none"
                style={{ background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }}
            >
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <h2 className="text-[18px] tracking-wide text-[#1F1F1F]">Mission List</h2>
                        <span className="mt-1 text-[11px] font-medium text-[#5F5F5F]">{listSubtitle}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onAddMission}
                        className="transition hover:brightness-110"
                    >
                        <img src={addMissionButton} alt="Add Mission" className="h-auto w-[132px] object-contain" />
                    </button>
                </div>

                <div className="h-px w-full" style={{ backgroundImage: overlayDividerStroke }} />

                <div className="mt-6 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveFilter('today')}
                        className={`min-w-[74px] border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                            activeFilter === 'today'
                                ? 'border-[#951616] bg-[#951616] text-[#FFFFFF]'
                                : 'border-[#3B3B3B] bg-[#E3E3E3] text-[#000000] hover:bg-[#D9D9D9]'
                        }`}
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveFilter('later')}
                        className={`min-w-[74px] border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                            activeFilter === 'later'
                                ? 'border-[#951616] bg-[#951616] text-[#FFFFFF]'
                                : 'border-[#3B3B3B] bg-[#E3E3E3] text-[#000000] hover:bg-[#D9D9D9]'
                        }`}
                    >
                        Later
                    </button>
                </div>

                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="custom-scrollbar mt-2 flex-1 min-h-0 overflow-auto"
                >
                    <div className="inline-block min-w-full align-top">
                        <div className={`${tableLayoutClass} w-full items-center border-t-[0.5px] border-b border-x border-[#7A0A0C] bg-[#5E0A0A] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFFFFF]`}>
                            <div className="whitespace-nowrap">Date</div>
                            <div className="min-w-0">Mission Name</div>
                            <div className="whitespace-nowrap">Status</div>
                            <div className="whitespace-nowrap">Schedule</div>
                            <div className="whitespace-nowrap text-center">Act</div>
                        </div>

                        {isInitialLoading ? (
                            <div className="px-2 py-3 text-xs text-[#5F5F5F]">Loading missions...</div>
                        ) : errorMsg && missionRuns.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center px-3 py-4 text-center text-xs text-[#B42323]">
                                <span>Oops, error loading missions:</span>
                                <span className="mt-1 opacity-80">{errorMsg}</span>
                            </div>
                        ) : missionRuns.length === 0 ? (
                            <div className="flex h-full items-center justify-center px-3 py-4 text-xs italic text-[#5F5F5F]">
                                No missions found for this filter.
                            </div>
                        ) : (
                            <>
                                {missionRuns.map((missionRun) => {
                                    const formattedRunAt = formatRunAt(missionRun.run_at, missionRun.schedule_timezone);
                                    const missionKey = getMissionRunKey(missionRun);
                                    const isSelected = selectedMissionKey === missionKey;

                                    return (
                                        <div
                                            key={missionKey}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => onSelectMission?.(missionRun)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    onSelectMission?.(missionRun);
                                                }
                                            }}
                                            className={`${tableLayoutClass} w-full items-center border-t-[0.5px] border-b border-x border-[#7A0A0C] px-3 py-[10px] text-xs transition-colors ${
                                                isSelected
                                                    ? 'bg-[#F3D9D9] shadow-[inset_0_0_0_1px_rgba(149,22,22,0.35)]'
                                                    : 'bg-[#F8F8F8] hover:bg-[#EFEFEF]'
                                            }`}
                                        >
                                            <div className="min-w-0 whitespace-nowrap leading-tight text-[10px] text-[#454545]">
                                                <div>{formattedRunAt.date}</div>
                                                <div className="mt-1">{formattedRunAt.time}</div>
                                            </div>
                                            <div className={`min-w-0 pr-3 text-[11px] font-medium ${isSelected ? 'text-[#951616]' : 'text-[#1F1F1F]'}`}>
                                                <div className="truncate">{missionRun.mission_name}</div>
                                                {/* <div className="mt-1 truncate text-[10px] text-[#5F5F5F]">Mission ID {missionRun.mission_id}</div> */}
                                            </div>
                                            <div className="min-w-0 pr-2 text-[11px] text-[#454545]">
                                                <div className="truncate">{missionRun.status}</div>
                                            </div>
                                            <div className="min-w-0 pr-2 text-[10px] text-[#454545]">
                                                <div className="truncate">{getScheduleLabel(missionRun.schedule_type)}</div>
                                                <div className="mt-1 whitespace-nowrap text-[#5F5F5F]">{formattedRunAt.time}</div>
                                            </div>
                                            <div className="flex w-full justify-center">
                                                <button
                                                    type="button"
                                                    aria-label={`Delete mission ${missionRun.mission_name}`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setDeleteErrorMsg('');
                                                        setDeleteTarget(missionRun);
                                                    }}
                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-transparent transition hover:border-[#7A0A0C] hover:bg-[#F1DCDC]"
                                                >
                                                    <img src={deleteMissionIcon} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {isLoadingMore ? (
                                    <div className="px-2 py-3 text-center text-xs text-[#5F5F5F]">Loading more missions...</div>
                                ) : null}

                                {!pagination.hasNext ? (
                                    <div className="px-2 py-3 text-center text-[11px] text-[#5F5F5F]">End of missions</div>
                                ) : null}

                                {errorMsg && missionRuns.length > 0 ? (
                                    <div className="px-2 py-3 text-center text-xs text-[#B42323]">{errorMsg}</div>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <DeleteMissionModal
                isOpen={Boolean(deleteTarget)}
                missionName={deleteTarget?.mission_name}
                errorMsg={deleteErrorMsg}
                isSubmitting={isDeleting}
                onClose={() => {
                    if (isDeleting) return;
                    setDeleteTarget(null);
                    setDeleteErrorMsg('');
                }}
                onConfirm={handleDeleteMission}
            />
        </>
    );
}
