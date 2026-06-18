import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import filterHistoryIcon from '../../../assets/images/icon_filter_history_white.svg';
import downloadHistoryIcon from '../../../assets/images/icon_white_download_history_white.svg';
import droneIconImage from '../../../assets/images/icon_drone.svg';
import mediaPreviewImage from '../../../assets/img_dummy_active.png';
import { historyService, uavService } from '../../../services/api';

const PAGE_LIMIT = 20;
const panelStroke = '#FF383C';
const panelBackground = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const overlayDividerStroke = 'linear-gradient(90deg, rgba(252,71,71,0.12) 0%, #FC4747 50%, rgba(252,71,71,0.12) 100%)';
const geofencePathOptions = {
    color: '#E1BA95',
    fillColor: '#9616161A',
    fillOpacity: 1,
    weight: 0.3
};
const trajectoryPathOptions = {
    color: '#682F2F',
    weight: 2,
    dashArray: '4, 6',
    opacity: 1
};

const dockIcon = new L.DivIcon({
    className: 'custom-dock-icon',
    html: '<div class="h-6 w-6 rounded-full border-2 border-[#d4af37]/50 bg-[#d4af37] text-[10px] font-bold text-black flex items-center justify-center shadow-lg">H</div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const DRONE_ICON_WIDTH = 68;
const DRONE_ICON_HEIGHT = 96;
const DRONE_ICON_CENTER_X = 34;
const DRONE_ICON_CENTER_Y = 74;

const droneIcon = new L.DivIcon({
    className: 'custom-drone-icon',
    html: `
        <div style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:flex; align-items:center; justify-content:center; transform-origin:${DRONE_ICON_CENTER_X}px ${DRONE_ICON_CENTER_Y}px;">
            <img src="${droneIconImage}" alt="Drone" style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:block;" />
        </div>
    `,
    iconSize: [DRONE_ICON_WIDTH, DRONE_ICON_HEIGHT],
    iconAnchor: [DRONE_ICON_CENTER_X, DRONE_ICON_CENTER_Y]
});

const createWaypointIcon = (number) => new L.DivIcon({
    className: 'custom-waypoint-icon',
    html: `<div class="h-5 w-5 rounded-full border border-[#682F2F] bg-[#682F2F] text-[10px] font-bold text-white flex items-center justify-center shadow-lg">${number}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const PanelShell = ({ children, className = '' }) => (
    <div
        className={`font-tomorrow relative min-h-0 overflow-hidden border p-4 shadow-lg select-none ${className}`}
        style={{ borderColor: panelStroke, background: panelBackground }}
    >
        <div className="pointer-events-none absolute left-0 top-0 h-px w-full" style={{ backgroundImage: overlayDividerStroke }} />
        <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full" style={{ backgroundImage: overlayDividerStroke }} />
        {children}
    </div>
);

const PanelTitleBlock = ({ title, subtitle }) => (
    <div className="flex items-start gap-3">
        <span className="w-[5px] shrink-0 self-stretch bg-[#FC4747]" />
        <div className="min-w-0">
            <p className="text-left text-[16px] font-medium tracking-wide text-[#1F1F1F]">{title}</p>
            {subtitle ? <p className="mt-1 text-[11px] tracking-[0.08em] text-[#5F5F5F]">{subtitle}</p> : null}
        </div>
    </div>
);

function HistoryTableState({ children, tone = 'default' }) {
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

const DownloadCell = ({ title, subtitle, onClick, disabled = false }) => (
    <button
        type="button"
        onClick={(event) => {
            event.stopPropagation();
            onClick?.(event);
        }}
        disabled={disabled}
        className={`flex items-center gap-2 text-left transition-opacity ${
            disabled ? 'cursor-not-allowed text-[#8C8C8C] opacity-60' : 'text-[#3B82F6] hover:opacity-80'
        }`}
    >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4 shrink-0">
            <path
                d="M8 12L3 7L4.4 5.55L7 8.15V0H9V8.15L11.6 5.55L13 7L8 12ZM2 16C1.45 16 0.979333 15.8043 0.588 15.413C0.196666 15.0217 0.000666667 14.5507 0 14V11H2V14H14V11H16V14C16 14.55 15.8043 15.021 15.413 15.413C15.0217 15.805 14.5507 16.0007 14 16H2Z"
                fill="currentColor"
            />
        </svg>
        <div className="flex flex-col leading-tight">
            <span className={`text-[11px] font-medium ${disabled ? 'text-[#8C8C8C]' : 'text-[#3B82F6]'}`}>{title}</span>
            <span className="mt-1 text-[10px] text-[#5F5F5F]">{subtitle}</span>
        </div>
    </button>
);

const downloadBlob = (blob, filename) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(objectUrl);
};

const toLatLng = (latitude, longitude) => {
    if (latitude == null || longitude == null) return null;

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return [lat, lng];
};

const formatDateTime = (value) => {
    if (!value) return '-';

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return value;

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(parsedDate);
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

const shouldHideDuration = (status) => String(status || '').toLowerCase() === 'failed';

const getHistoryDuration = (historyItem) => {
    if (!historyItem || shouldHideDuration(historyItem.status)) {
        return '-';
    }

    return formatDuration(historyItem.started_at, historyItem.completed_at);
};

const formatScheduleCell = (value) => {
    if (!value) return '-';

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return value;

    const date = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsedDate);
    const time = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(parsedDate);

    return `${date}\n${time}`;
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

const PAGE_LIMIT_OPTIONS = [10, 20, 50, 100];

const HistoryTrajectoryMap = ({ historyItem, homePosition, maxRange }) => {
    const snapshot = historyItem?.mission_snapshot || {};
    const frozenHomePosition = toLatLng(historyItem?.uav_home_latitude, historyItem?.uav_home_longitude);
    const effectiveHomePosition = frozenHomePosition || homePosition;
    const waypointPositions = (snapshot.waypoints || [])
        .map((waypoint) => toLatLng(waypoint.latitude, waypoint.longitude))
        .filter(Boolean);
    const dronePosition = waypointPositions[waypointPositions.length - 1] || effectiveHomePosition;
    const rtlAnchorPosition = effectiveHomePosition || dronePosition;
    const pathPositions = rtlAnchorPosition && waypointPositions.length > 0
        ? [rtlAnchorPosition, ...waypointPositions, rtlAnchorPosition]
        : waypointPositions;
    const center = dronePosition || effectiveHomePosition || [-6.200000, 106.816666];

    return (
        <MapContainer
            key={`${historyItem?.id || 'empty'}-${center[0]}-${center[1]}`}
            center={center}
            zoom={15}
            attributionControl={false}
            zoomControl={false}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri'
            />

            {effectiveHomePosition ? (
                <Circle center={effectiveHomePosition} radius={maxRange} pathOptions={geofencePathOptions} />
            ) : null}

            {effectiveHomePosition ? <Marker position={effectiveHomePosition} icon={dockIcon} /> : null}
            {pathPositions.length > 1 ? <Polyline positions={pathPositions} pathOptions={trajectoryPathOptions} /> : null}

            {waypointPositions.map((position, index) => (
                <Marker key={`${historyItem?.id || 'history'}-${index}`} position={position} icon={createWaypointIcon(index + 1)} />
            ))}
        </MapContainer>
    );
};

export default function HistoryPage() {
    const [missionNameInput, setMissionNameInput] = useState('');
    const [appliedMissionName, setAppliedMissionName] = useState('');
    const [isLimitMenuOpen, setIsLimitMenuOpen] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: PAGE_LIMIT,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
    });
    const [historyItems, setHistoryItems] = useState([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState(null);
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');
    const [mediaPreviewName, setMediaPreviewName] = useState('');
    const [mediaPreviewError, setMediaPreviewError] = useState('');
    const [isMediaPreviewLoading, setIsMediaPreviewLoading] = useState(false);
    const [hasMediaPreviewPlaybackError, setHasMediaPreviewPlaybackError] = useState(false);
    const [activeDownloadKey, setActiveDownloadKey] = useState('');
    const requestVersionRef = useRef(0);
    const previewRequestVersionRef = useRef(0);

    useEffect(() => {
        let isCancelled = false;

        const fetchDrone = async () => {
            try {
                const data = await uavService.getUav();
                if (!isCancelled) {
                    setSelectedDrone(data);
                }
            } catch (error) {
                console.error('Error fetching drone info for history page:', error);
            }
        };

        fetchDrone();

        return () => {
            isCancelled = true;
        };
    }, []);

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

                const items = Array.isArray(data?.items) ? data.items : [];
                setHistoryItems(items);
                setPagination((current) => ({
                    ...current,
                    total: data?.total ?? 0,
                    totalPages: data?.total_pages ?? 1,
                    hasNext: Boolean(data?.has_next),
                    hasPrev: Boolean(data?.has_prev),
                }));

                setSelectedHistoryId((currentSelectedId) => {
                    if (items.length === 0) return null;
                    if (currentSelectedId && items.some((item) => item.id === currentSelectedId)) {
                        return currentSelectedId;
                    }
                    return items[0].id;
                });
            } catch (error) {
                if (isCancelled || requestVersionRef.current !== requestVersion) {
                    return;
                }

                console.error('Error fetching mission history:', error);
                setHistoryItems([]);
                setSelectedHistoryId(null);
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

    const highlightedHistory = useMemo(
        () => historyItems.find((item) => item.id === selectedHistoryId) ?? historyItems[0] ?? null,
        [historyItems, selectedHistoryId]
    );

    const highlightedMissionName = highlightedHistory?.mission_name || highlightedHistory?.mission_snapshot?.mission_name || 'No History Selected';
    const highlightedScheduleLabel = highlightedHistory
        ? formatDateTime(highlightedHistory.mission_snapshot?.schedule || highlightedHistory.started_at || highlightedHistory.created_at)
        : 'Waiting for history data';
    const homePosition = toLatLng(selectedDrone?.home_latitude, selectedDrone?.home_longitude);
    const maxRange = selectedDrone?.max_range_meter || 1800;
    const paginationItems = buildPaginationItems(pagination.page, pagination.totalPages);

    const handleSelectPageLimit = (nextLimit) => {
        setPagination((current) => ({
            ...current,
            page: 1,
            limit: nextLimit,
        }));
        setIsLimitMenuOpen(false);
    };

    useEffect(() => {
        let isCancelled = false;
        const previewRequestVersion = previewRequestVersionRef.current + 1;
        previewRequestVersionRef.current = previewRequestVersion;

        setMediaPreviewError('');
        setMediaPreviewName('');
        setHasMediaPreviewPlaybackError(false);
        setMediaPreviewUrl((current) => {
            if (current) {
                window.URL.revokeObjectURL(current);
            }
            return '';
        });

        if (!highlightedHistory?.id || !highlightedHistory?.has_full_video) {
            setIsMediaPreviewLoading(false);
            return () => {
                isCancelled = true;
            };
        }

        setIsMediaPreviewLoading(true);

        const loadPreview = async () => {
            try {
                const file = await historyService.getMissionHistoryFullVideoFile(highlightedHistory.id);

                if (isCancelled || previewRequestVersionRef.current !== previewRequestVersion) {
                    return;
                }

                const objectUrl = window.URL.createObjectURL(file.blob);
                setMediaPreviewUrl(objectUrl);
                setMediaPreviewName(file.filename);
                setHasMediaPreviewPlaybackError(false);
            } catch (error) {
                if (isCancelled || previewRequestVersionRef.current !== previewRequestVersion) {
                    return;
                }

                setMediaPreviewError(error.message || 'Failed to load full video preview');
            } finally {
                if (!isCancelled && previewRequestVersionRef.current === previewRequestVersion) {
                    setIsMediaPreviewLoading(false);
                }
            }
        };

        loadPreview();

        return () => {
            isCancelled = true;
        };
    }, [highlightedHistory?.has_full_video, highlightedHistory?.id]);

    useEffect(() => () => {
        if (mediaPreviewUrl) {
            window.URL.revokeObjectURL(mediaPreviewUrl);
        }
    }, [mediaPreviewUrl]);

    const handleDownloadFullVideo = async (historyItem) => {
        if (!historyItem?.id || !historyItem?.has_full_video) {
            return;
        }

        const downloadKey = `full-video-${historyItem.id}`;
        setActiveDownloadKey(downloadKey);

        try {
            const file = await historyService.getMissionHistoryFullVideoFile(historyItem.id);
            downloadBlob(file.blob, file.filename);
        } catch (error) {
            window.alert(error.message || 'Failed to download full video');
        } finally {
            setActiveDownloadKey((current) => (current === downloadKey ? '' : current));
        }
    };

    const handleDownloadMediaArchive = async (historyItem) => {
        if (!historyItem?.id || (historyItem.media_count ?? 0) <= 0) {
            return;
        }

        const downloadKey = `media-archive-${historyItem.id}`;
        setActiveDownloadKey(downloadKey);

        try {
            const file = await historyService.getMissionHistoryMediaArchiveFile(historyItem.id);
            downloadBlob(file.blob, file.filename);
        } catch (error) {
            window.alert(error.message || 'Failed to download media archive');
        } finally {
            setActiveDownloadKey((current) => (current === downloadKey ? '' : current));
        }
    };

    return (
        <div className="grid h-[calc(100vh-104px)] w-full grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)] gap-[28px] p-[28px]">
            <PanelShell className="flex flex-col gap-4">
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
                                value={missionNameInput}
                                onChange={(event) => setMissionNameInput(event.target.value)}
                                placeholder="Search mission name"
                                className="h-[42px] w-[300px] border border-[#FD5757] bg-[#EDEDED] pl-10 pr-4 text-[12px] text-[#000000] outline-none transition-colors placeholder:text-[#565656] focus:border-[#FD5757]"
                            />
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsLimitMenuOpen((current) => !current)}
                                className="flex h-[42px] w-[42px] items-center justify-center border border-[#FD5757] bg-[#EDEDED] transition-colors hover:bg-[#E3E3E3]"
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

                    <button
                        type="button"
                        className="flex h-[42px] items-center gap-2 border border-[#FD5757] bg-[#EDEDED] px-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[#000000] transition-colors hover:bg-[#E3E3E3]"
                    >
                        <img src={downloadHistoryIcon} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                        Export as CSV
                    </button>
                </div>

                <div className="h-px w-full" style={{ backgroundImage: overlayDividerStroke }} />

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="grid grid-cols-[1.2fr_1fr_0.8fr_1.2fr_0.9fr_1.1fr_1.1fr] border-t-[0.5px] border-b border-[#7A0A0C] bg-[#5E0A0A] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#ffffff]">
                        <div>Mission</div>
                        <div>Schedule</div>
                        <div>Pin Point</div>
                        <div>Action</div>
                        <div>Duration</div>
                        <div>Video</div>
                        <div>Media</div>
                    </div>

                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                        {isLoading ? (
                            <HistoryTableState>Loading mission history...</HistoryTableState>
                        ) : errorMsg ? (
                            <HistoryTableState tone="error">
                                <>
                                    <span>Oops, error loading mission history:</span>
                                    <span className="mt-1 opacity-80">{errorMsg}</span>
                                </>
                            </HistoryTableState>
                        ) : historyItems.length === 0 ? (
                            <HistoryTableState tone="empty">
                                No mission history found for this filter.
                            </HistoryTableState>
                        ) : (
                            historyItems.map((row) => (
                                <div
                                    key={row.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={row.id === selectedHistoryId}
                                    onClick={() => setSelectedHistoryId(row.id)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            setSelectedHistoryId(row.id);
                                        }
                                    }}
                                    className={`relative grid grid-cols-[1.2fr_1fr_0.8fr_1.2fr_0.9fr_1.1fr_1.1fr] items-center gap-4 border-t-[0.5px] border-b border-[#7A0A0C] px-4 py-3 text-[11px] transition-colors ${
                                        row.id === selectedHistoryId ? 'bg-[#F3D9D9]' : 'bg-[#F8F8F8] hover:bg-[#EFEFEF]'
                                    } cursor-pointer focus:outline-none focus-visible:bg-[#F3D9D9]`}
                                >
                                    {row.id === selectedHistoryId ? <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-[3px] bg-[#FC4747]" /> : null}
                                    <div className={`font-medium ${row.id === selectedHistoryId ? 'text-[#951616]' : 'text-[#1F1F1F]'}`}>{row.mission_name || row.mission_snapshot?.mission_name || `Mission ${row.mission_id}`}</div>
                                    <div className="whitespace-pre-line leading-tight text-[#454545]">
                                        {formatScheduleCell(row.mission_snapshot?.schedule || row.started_at || row.created_at)}
                                    </div>
                                    <div className="text-[#454545]">{row.waypoint_count} Pin point</div>
                                    <div className="text-[#454545]">{row.task_summary || '-'}</div>
                                    <div className="text-[#454545]">{getHistoryDuration(row)}</div>
                                    <DownloadCell
                                        title={activeDownloadKey === `full-video-${row.id}` ? 'Downloading...' : `${row.mission_name || row.mission_snapshot?.mission_name || `Mission ${row.mission_id}`}.mp4`}
                                        subtitle={row.has_full_video ? 'Full Video' : 'Full video unavailable'}
                                        disabled={!row.has_full_video || activeDownloadKey === `media-archive-${row.id}`}
                                        onClick={() => handleDownloadFullVideo(row)}
                                    />
                                    <DownloadCell
                                        title={activeDownloadKey === `media-archive-${row.id}` ? 'Downloading...' : 'Download'}
                                        subtitle={`${row.media_count ?? 0} Media ZIP`}
                                        disabled={(row.media_count ?? 0) <= 0 || activeDownloadKey === `full-video-${row.id}`}
                                        onClick={() => handleDownloadMediaArchive(row)}
                                    />
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

            <div className="flex min-h-0 flex-col gap-[20px]">
                <PanelShell className="flex flex-1 flex-col gap-4">
                    <PanelTitleBlock title="Trajectory" subtitle="Drone trajectory in one event" />

                    <div className="relative min-h-0 flex-1 overflow-hidden border border-[#7A0A0C] bg-[#DADADA]">
                        {highlightedHistory ? (
                            <HistoryTrajectoryMap
                                historyItem={highlightedHistory}
                                homePosition={homePosition}
                                maxRange={maxRange}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-[12px] text-[#5F5F5F]">
                                No trajectory selected
                            </div>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 top-0 z-[350] h-16 bg-gradient-to-b from-black/55 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[350] h-24 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {highlightedHistory ? (
                            <div className="absolute bottom-4 left-4 right-4 z-[400] border border-[#7A0A0C] bg-[rgba(245,245,245,0.92)] px-4 py-3 backdrop-blur-sm">
                                <div className="text-[14px] font-medium text-[#1F1F1F]">{highlightedMissionName}</div>
                                <div className="mt-1 text-[11px] text-[#5F5F5F]">
                                    Schedule {formatDateTime(highlightedHistory.mission_snapshot?.schedule || highlightedHistory.started_at || highlightedHistory.created_at)}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </PanelShell>

                <PanelShell className="flex flex-1 flex-col gap-4">
                    <PanelTitleBlock title="Media" subtitle={highlightedScheduleLabel} />

                    <div className="h-px w-full" style={{ backgroundImage: overlayDividerStroke }} />

                    <div className="relative min-h-0 flex-1 overflow-hidden border border-[#7A0A0C] bg-[#DADADA]">
                        {mediaPreviewUrl && !hasMediaPreviewPlaybackError ? (
                            <video
                                src={mediaPreviewUrl}
                                controls
                                preload="metadata"
                                className="h-full w-full object-cover"
                                onError={() => {
                                    setHasMediaPreviewPlaybackError(true);
                                    setMediaPreviewError('Full video preview could not be played');
                                }}
                            />
                        ) : (
                            <img
                                src={mediaPreviewImage}
                                alt="History media preview"
                                className="h-full w-full object-cover opacity-75"
                            />
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                        {!mediaPreviewUrl || hasMediaPreviewPlaybackError ? (
                            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                                <div className="max-w-[280px] rounded border border-[#7A0A0C] bg-[rgba(245,245,245,0.92)] px-5 py-4 text-[12px] text-[#454545] backdrop-blur-sm">
                                    {isMediaPreviewLoading
                                        ? 'Loading full video preview...'
                                        : mediaPreviewError
                                            ? mediaPreviewError
                                            : highlightedHistory?.has_full_video
                                                ? 'Full video preview is not available yet.'
                                                : 'No full video is available for this mission history.'}
                                </div>
                            </div>
                        ) : null}

                        <div className="pointer-events-none absolute bottom-5 left-5 right-5">
                            <div className="mb-2 flex items-center justify-between text-[11px] text-[#1F1F1F]">
                                <span>{mediaPreviewName || `${highlightedMissionName}.mp4`}</span>
                                <span>{getHistoryDuration(highlightedHistory)}</span>
                            </div>
                            {!mediaPreviewUrl || hasMediaPreviewPlaybackError ? (
                                <div className="h-[3px] bg-white/20">
                                    <div className={`h-full bg-[#FC4747] ${isMediaPreviewLoading ? 'w-[46%]' : 'w-0'}`} />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </PanelShell>
            </div>
        </div>
    );
}
