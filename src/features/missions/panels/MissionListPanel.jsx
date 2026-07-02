import React, { useEffect, useMemo, useRef, useState } from 'react';
import { missionService } from '../../../services/api';
import DeleteMissionModal from '../components/DeleteMissionModal';
import addMissionButton from '../../../assets/images/btn_add_mission.svg';
import addMissionButtonId from '../../../assets/images/btn_add_mission_id.svg';
import deleteMissionIcon from '../../../assets/images/icon_trash_mission.svg';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const PAGE_LIMIT = 20;
const DEFAULT_LATER_DAYS = 21;
const overlayDividerStroke = 'linear-gradient(90deg, rgba(213,53,53,0.18) 0%, #D53535 50%, rgba(213,53,53,0.18) 100%)';
const tableLayoutClass = 'grid min-w-[640px] grid-cols-[1fr_1.7fr_1fr_1.4fr_64px]';
const missionHeaderFill = 'linear-gradient(137.97deg, rgba(254, 5, 0, 0.6) -3.94%, rgba(186, 4, 4, 0.6) 48.88%, rgba(254, 5, 0, 0.6) 101.7%)';

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

const getScheduleLabel = (scheduleType, t) => (
    !scheduleType
        ? '-'
        : scheduleType === 'one_time'
        ? t('missions.oneTime')
        : `${t('missions.recurring')} - ${toTitleCase(scheduleType)}`
);

const getMissionStatusLabel = (status, t) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();

    if (normalizedStatus === 'waiting') return t('missions.waiting');
    if (normalizedStatus === 'completed') return t('missions.completed');
    if (normalizedStatus === 'in progress') return t('missions.inProgress');

    return status || '-';
};

const getMissionRunKey = (missionRun) => `${missionRun.mission_id}-${missionRun.run_at}`;

export default function MissionListPanel({
    onAddMission,
    uavId,
    selectedMissionKey,
    onSelectMission,
    onMissionDeleted,
}) {
    const { t, language } = useI18n();
    const addMissionButtonAsset = language === 'id' ? addMissionButtonId : addMissionButton;
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
        if (isInitialLoading) return t('common.loading');
        return t('missions.missionCount').replace('{count}', pagination.total);
    }, [isInitialLoading, pagination.total, t]);

    return (
        <>
            <div
                className="font-inter relative flex h-full w-full flex-col overflow-hidden rounded-[30px] border border-[#FF383C] p-4 shadow-lg select-none"
                style={{ background: 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)' }}
            >
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <h2 className="text-[18px] tracking-wide font-medium text-[#1F1F1F]">{t('missions.missionList')}</h2>
                        <span className="mt-1 text-[11px] font-medium text-[#5F5F5F]">{listSubtitle}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onAddMission}
                        className="transition hover:brightness-110"
                    >
                        <img src={addMissionButtonAsset} alt={t('missions.missionList')} className="h-auto w-[132px] object-contain" />
                    </button>
                </div>

                <div className="h-px w-full" style={{ backgroundImage: overlayDividerStroke }} />

                <div className="mt-6 inline-flex items-end">
                    <button
                        type="button"
                        onClick={() => setActiveFilter('today')}
                        className={`min-w-[92px] border border-b-0 px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors rounded-tl-[18px] ${
                            activeFilter === 'today'
                                ? 'border-[#951616] bg-[#951616] text-[#FFFFFF]'
                                : 'border-[#000000] bg-[#E3E3E3] text-[#000000] hover:bg-[#D9D9D9]'
                        }`}
                    >
                        {t('common.today')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveFilter('later')}
                        className={`-ml-px min-w-[92px] border border-b-0 px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors rounded-tr-[18px] ${
                            activeFilter === 'later'
                                ? 'border-[#951616] bg-[#951616] text-[#FFFFFF]'
                                : 'border-[#000000] bg-[#E3E3E3] text-[#000000] hover:bg-[#D9D9D9]'
                        }`}
                    >
                        {t('common.later')}
                    </button>
                </div>

                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="custom-scrollbar flex-1 min-h-0 overflow-auto"
                >
                    <div className="inline-block min-w-full align-top">
                        <div className="overflow-hidden rounded-tr-[18px] rounded-br-[18px] rounded-bl-[18px] border border-[#7A0A0C]">
                            <div
                                className={`${tableLayoutClass} w-full items-center border-b border-[#7A0A0C] px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-[#FFFFFF]`}
                                style={{ background: missionHeaderFill }}
                            >
                                <div className="font-medium whitespace-nowrap">{t('common.date')}</div>
                                <div className="font-medium min-w-0">{t('common.mission')}</div>
                                <div className="font-medium whitespace-nowrap">{t('common.status')}</div>
                                <div className="font-medium whitespace-nowrap">{t('missions.schedule')}</div>
                                <div className="whitespace-nowrap text-center">{t('missions.act')}</div>
                            </div>

                            {isInitialLoading ? (
                                <div className="px-2 py-3 text-xs text-[#5F5F5F]">{t('missions.loadingMissions')}</div>
                            ) : errorMsg && missionRuns.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center px-3 py-4 text-center text-xs text-[#B42323]">
                                    <span>{t('missions.errorLoadingMissions')}</span>
                                    <span className="mt-1 opacity-80">{errorMsg}</span>
                                </div>
                            ) : missionRuns.length === 0 ? (
                                <div className="flex h-full items-center justify-center px-3 py-4 text-xs italic text-[#5F5F5F]">
                                    {t('missions.noMissionsForFilter')}
                                </div>
                            ) : (
                                <div>
                                    {missionRuns.map((missionRun) => {
                                        const formattedRunAt = formatRunAt(missionRun.run_at, missionRun.schedule_timezone);
                                        const missionKey = getMissionRunKey(missionRun);
                                        const isSelected = selectedMissionKey === missionKey;
                                        const isActive = missionRun.status === 'In Progress';

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
                                                className={`${tableLayoutClass} w-full items-center px-1 py-2.5 text-xs transition-colors ${
                                                    missionRuns[0] === missionRun ? '' : 'border-t border-[#7A0A0C]'
                                                } ${
                                                    missionRuns[missionRuns.length - 1] === missionRun ? '' : ''
                                                } ${
                                                    isSelected
                                                        ? 'bg-[#F3D9D9] shadow-[inset_0_0_0_1px_rgba(122,10,12,0.28)]'
                                                        : 'bg-transparent hover:bg-[#F2E5E5]'
                                                }`}
                                            >
                                                <div className="flex min-w-0 flex-col whitespace-nowrap leading-[1.15]">
                                                    <span className="text-[13px] text-[#1F1F1F]">
                                                        {formattedRunAt.date}
                                                    </span>
                                                    <span className="mt-0.5 text-[11px] text-[#5F5F5F]">
                                                        {formattedRunAt.time}
                                                    </span>
                                                </div>
                                                <div className={`min-w-0 pr-3 text-[13px] ${
                                                    isActive
                                                        ? 'text-[#1F1F1F]'
                                                        : 'text-[#2A2A2A]'
                                                }`}>
                                                    <div className={`truncate ${isActive && !isSelected ? 'inline-block border-b border-[#7A0A0C]' : ''}`}>
                                                        {missionRun.mission_name}
                                                    </div>
                                                </div>
                                                <div className={`min-w-0 pr-2 text-[13px] ${
                                                    isActive
                                                        ? 'text-[#1F1F1F]'
                                                        : 'text-[#2A2A2A]'
                                                }`}>
                                                    <div className="truncate">{getMissionStatusLabel(missionRun.status, t)}</div>
                                                </div>
                                                <div className="flex min-w-0 flex-col pr-2 leading-[1.15]">
                                                    <span className="truncate text-[13px] text-[#2A2A2A]">
                                                        {getScheduleLabel(missionRun.schedule_type, t)}
                                                    </span>
                                                    <span className="mt-0.5 whitespace-nowrap text-[11px] text-[#5F5F5F]">
                                                        {formattedRunAt.time}
                                                    </span>
                                                </div>
                                                <div className="flex w-full justify-center">
                                                    <button
                                                        type="button"
                                                        aria-label={t('missions.deleteMissionAria').replace('{name}', missionRun.mission_name)}
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
                                </div>
                            )}
                        </div>
                    </div>

                    {isLoadingMore ? (
                        <div className="px-2 py-3 text-center text-xs text-[#5F5F5F]">{t('missions.loadingMoreMissions')}</div>
                    ) : null}

                    {!pagination.hasNext && missionRuns.length > 0 ? (
                        <div className="px-2 py-3 text-center text-[11px] text-[#5F5F5F]">{t('missions.endOfMissions')}</div>
                    ) : null}

                    {errorMsg && missionRuns.length > 0 ? (
                        <div className="px-2 py-3 text-center text-xs text-[#B42323]">{errorMsg}</div>
                    ) : null}
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
