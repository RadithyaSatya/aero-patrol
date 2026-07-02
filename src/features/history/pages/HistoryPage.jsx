import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { historyService } from '../../../services/api';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const PAGE_LIMIT = 20;
const panelStroke = '#FFB3B3';
const panelBackground = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const tableHeaderBackground = 'linear-gradient(180deg, #F56C6C 0%, #E76060 100%)';
const HISTORY_DETAIL_STORAGE_KEY = 'historyDetail:selectedItem';

const formatDateTime = (value, locale = 'en-GB') => {
    if (!value) return '-';

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return value;

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(parsedDate);
};

const formatScheduleCell = (value, locale = 'en-GB') => {
    if (!value) return '-';

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return value;

    const date = new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsedDate);
    const time = new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(parsedDate);

    return { date, time };
};

const formatDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return '-';

    const startMs = new Date(startedAt).getTime();
    const endMs = new Date(completedAt).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return '-';

    const totalSeconds = Math.floor((endMs - startMs) / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
};

const getHistoryDuration = (historyItem) => formatDuration(historyItem?.started_at, historyItem?.completed_at);

const getMissionName = (historyItem, translate) => (
    historyItem?.mission_name
    || historyItem?.mission_snapshot?.mission_name
    || translate('historyPage.missionFallback', 'Mission {id}', { id: historyItem?.mission_id ?? '-' })
);

const getHistoryScheduleValue = (historyItem) => (
    historyItem?.mission_snapshot?.schedule
    || historyItem?.started_at
    || historyItem?.created_at
    || ''
);

const getHistoryReason = (historyItem) => (
    historyItem?.failure_reason
    || historyItem?.skip_reason
    || historyItem?.reason
    || '-'
);

const buildPaginationItems = (currentPage, totalPages) => {
    if (totalPages <= 1) return [1];
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

    if (currentPage <= 3) return [1, 2, 3, 'ellipsis', totalPages];
    if (currentPage >= totalPages - 2) return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];

    return [1, 'ellipsis', currentPage, currentPage + 1, totalPages];
};

const HistoryTableState = ({ children, tone = 'default' }) => {
    if (tone === 'error') {
        return (
            <div className="flex h-full flex-col items-center justify-center px-3 py-6 text-center text-sm text-[#B42323]">
                <div className="max-w-[420px] leading-6">{children}</div>
            </div>
        );
    }

    return (
        <div className="flex h-full items-center justify-center px-3 py-6 text-center text-sm text-[#5F5F5F]">
            {children}
        </div>
    );
};

const SummaryCard = ({ value, label }) => (
    <div className="flex h-[96px] min-w-[142px] flex-col items-center justify-center rounded-[16px] border border-[#D2D2D2] bg-[rgba(255,255,255,0.36)] px-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
        <div className="text-[26px] font-normal leading-none text-[#101010]">{value}</div>
        <div className="mt-3 text-center text-[13px] font-medium text-[#3F3F3F]">{label}</div>
    </div>
);

const PaginationBox = ({ active = false, disabled = false, children, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex h-9 min-w-9 items-center justify-center rounded-[8px] border px-3 text-[12px] font-medium transition-colors ${
            active ? 'text-[#FFFFFF]' : 'text-[#1F1F1F]'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#E8E8E8]'}`}
        style={{
            backgroundColor: active ? '#E76060' : '#F3F3F3',
            borderColor: active ? '#E76060' : '#D2D2D2',
        }}
    >
        {children}
    </button>
);

export default function HistoryPage() {
    const { t, language } = useI18n();
    const navigate = useNavigate();
    const translate = (key, fallback, replacements = {}) => Object.entries(replacements).reduce(
        (message, [replacementKey, replacementValue]) => message.replace(`{${replacementKey}}`, replacementValue),
        t(key, fallback)
    );
    const locale = language === 'id' ? 'id-ID' : 'en-GB';
    const [missionNameInput, setMissionNameInput] = useState('');
    const [appliedMissionName, setAppliedMissionName] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: PAGE_LIMIT,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
    });
    const [historyItems, setHistoryItems] = useState([]);
    const [historySummary, setHistorySummary] = useState({
        total: 0,
        statuses: {},
    });
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const requestVersionRef = useRef(0);

    useEffect(() => {
        let isCancelled = false;
        const requestVersion = requestVersionRef.current + 1;
        requestVersionRef.current = requestVersion;

        const fetchHistory = async () => {
            setIsLoading(true);
            setErrorMsg('');

            try {
                const data = await historyService.getMissionHistory({
                    page: pagination.page,
                    limit: pagination.limit,
                    missionName: appliedMissionName,
                });

                if (isCancelled || requestVersionRef.current !== requestVersion) {
                    return;
                }

                setHistoryItems(Array.isArray(data?.items) ? data.items : []);
                setHistorySummary({
                    total: Number(data?.total ?? 0),
                    statuses: data?.statuses && typeof data.statuses === 'object' ? data.statuses : {},
                });
                setPagination((current) => ({
                    ...current,
                    total: data?.total ?? 0,
                    totalPages: data?.total_pages ?? 1,
                    hasNext: Boolean(data?.has_next),
                    hasPrev: Boolean(data?.has_prev),
                }));
            } catch (error) {
                if (isCancelled || requestVersionRef.current !== requestVersion) {
                    return;
                }

                console.error('Error fetching mission history:', error);
                setHistoryItems([]);
                setHistorySummary({
                    total: 0,
                    statuses: {},
                });
                setErrorMsg(error.message);
            } finally {
                if (!isCancelled && requestVersionRef.current === requestVersion) {
                    setIsLoading(false);
                }
            }
        };

        fetchHistory();

        return () => {
            isCancelled = true;
        };
    }, [appliedMissionName, pagination.page, pagination.limit]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            const normalizedQuery = missionNameInput.trim();

            setAppliedMissionName((current) => {
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
    }, [missionNameInput]);

    const filteredHistoryItems = useMemo(() => {
        if (!scheduleDate) {
            return historyItems;
        }

        return historyItems.filter((item) => {
            const rawValue = getHistoryScheduleValue(item);
            if (!rawValue) {
                return false;
            }

            const parsedDate = new Date(rawValue);
            if (Number.isNaN(parsedDate.getTime())) {
                return false;
            }

            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}` === scheduleDate;
        });
    }, [historyItems, scheduleDate]);

    const summary = useMemo(() => ({
        failed: Number(historySummary.statuses?.Failed ?? 0),
        completed: Number(historySummary.statuses?.Completed ?? 0),
        aborted: Number(historySummary.statuses?.Aborted ?? 0),
        total: Number(historySummary.total ?? 0),
    }), [historySummary]);
    const paginationItems = buildPaginationItems(pagination.page, pagination.totalPages);

    const handleOpenHistoryDetail = (historyItem) => {
        if (!historyItem?.id) {
            return;
        }

        window.sessionStorage.setItem(HISTORY_DETAIL_STORAGE_KEY, JSON.stringify(historyItem));
        navigate(`/history/${historyItem.id}`, {
            state: {
                historyItem,
            },
        });
    };

    return (
        <div className="h-[calc(100vh-84px)] w-full overflow-hidden p-[28px]">
            <div
                className="font-inter relative flex h-full w-full flex-col overflow-hidden rounded-[34px] border px-8 py-8 shadow-lg"
                style={{ borderColor: panelStroke, background: panelBackground }}
            >
                <div className="flex items-start justify-between gap-8">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-4">
                            <span className="mt-1 h-[48px] w-[6px] shrink-0 bg-[#FC4747]" />
                            <div className="min-w-0">
                                <h1 className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-[#151515]">
                                    {t('historyPage.recordedFootage')}
                                </h1>
                                <p className="mt-2 text-[15px] text-[#777777]">
                                    {t('historyPage.recordedFootageSubtitle')}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <div className="relative">
                                <svg
                                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]"
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
                                    value={missionNameInput}
                                    onChange={(event) => setMissionNameInput(event.target.value)}
                                    placeholder={t('historyPage.searchMissionName')}
                                    className="h-[48px] w-[332px] rounded-[8px] border border-[#E2E2E2] bg-[#FFFFFF] pl-12 pr-4 text-[14px] text-[#000000] outline-none transition-colors placeholder:text-[#A0A7B4] focus:border-[#D6D6D6]"
                                />
                            </div>

                            <div className="relative">
                                <svg
                                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B0B0B0]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(event) => setScheduleDate(event.target.value)}
                                    className="h-[48px] w-[184px] rounded-[8px] border border-[#E2E2E2] bg-[#FFFFFF] pl-12 pr-4 text-[14px] text-[#000000] outline-none transition-colors focus:border-[#D6D6D6]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap justify-end gap-4">
                        <SummaryCard value={summary.failed} label={t('historyPage.failed')} />
                        <SummaryCard value={summary.completed} label={t('historyPage.completed')} />
                        <SummaryCard value={summary.aborted} label={t('historyPage.aborted')} />
                        <SummaryCard value={summary.total} label={t('historyPage.totalMission')} />
                    </div>
                </div>

                <div className="mt-7 min-h-0 flex flex-1 flex-col overflow-hidden rounded-[12px]">
                    <div
                        className="grid grid-cols-[1.3fr_0.95fr_1fr_0.7fr_0.85fr_0.7fr] items-center rounded-t-[10px] pl-4 pr-6 py-3 text-[16px] font-medium text-white"
                        style={{ background: tableHeaderBackground }}
                    >
                        <div>{t('historyPage.mission')}</div>
                        <div>{t('historyPage.schedule')}</div>
                        <div>{t('historyPage.task')}</div>
                        <div>{t('historyPage.status')}</div>
                        <div>{t('historyPage.reason')}</div>
                        <div className="pr-6 text-right">{t('historyPage.duration')}</div>
                    </div>

                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-transparent">
                        {isLoading ? (
                            <HistoryTableState>{t('historyPage.loadingMissionHistory')}</HistoryTableState>
                        ) : errorMsg ? (
                            <HistoryTableState tone="error">
                                <>
                                    <span>{t('historyPage.errorLoadingMissionHistory')}</span>
                                    <span className="mt-1 block opacity-80">{errorMsg}</span>
                                </>
                            </HistoryTableState>
                        ) : filteredHistoryItems.length === 0 ? (
                            <HistoryTableState>{t('historyPage.noMissionHistoryForFilter')}</HistoryTableState>
                        ) : (
                            filteredHistoryItems.map((row) => {
                                const schedule = formatScheduleCell(getHistoryScheduleValue(row), locale);

                                return (
                                    <button
                                        key={row.id}
                                        type="button"
                                        onClick={() => handleOpenHistoryDetail(row)}
                                        className="grid w-full grid-cols-[1.3fr_0.95fr_1fr_0.7fr_0.85fr_0.7fr] items-center border-b border-[#D38787] px-4 py-3 text-left text-[14px] text-[#3A3A3A] transition-colors hover:bg-[rgba(255,255,255,0.34)]"
                                    >
                                        <div className="pr-4 text-[15px] font-medium text-[#3A3A3A]">
                                            {getMissionName(row, translate)}
                                        </div>
                                        <div className="pr-4 leading-tight text-[#4B4B4B]">
                                            {typeof schedule === 'string' ? (
                                                schedule
                                            ) : (
                                                <>
                                                    <div>{schedule.date}</div>
                                                    <div>{schedule.time}</div>
                                                </>
                                            )}
                                        </div>
                                        <div
                                            className="truncate pr-4 text-[15px] text-[#3A3A3A]"
                                            title={row.task_summary || '-'}
                                        >
                                            {row.task_summary || '-'}
                                        </div>
                                        <div className="pr-4 text-[15px] text-[#3A3A3A]">
                                            {row.status || '-'}
                                        </div>
                                        <div
                                            className="truncate pr-4 text-[15px] text-[#4B4B4B]"
                                            title={getHistoryReason(row)}
                                        >
                                            {getHistoryReason(row)}
                                        </div>
                                        <div className="pr-4 text-right text-[15px] text-[#3A3A3A]">
                                            {getHistoryDuration(row)}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-[#E4C7C7] px-2 pt-4">
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
                </div>
            </div>
        </div>
    );
}
