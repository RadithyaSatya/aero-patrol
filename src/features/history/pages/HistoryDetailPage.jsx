import React, { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import disconnectIcon from '../../../assets/images/icon_disconnect.svg';
import droneIconImage from '../../../assets/images/icon_drone.svg';
import cameraPanelBorderSvg from '../../../assets/images/image_border_previewpanel_detail.svg?raw';
import { historyService, telemetryService, uavService } from '../../../services/api';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const HISTORY_DETAIL_STORAGE_KEY = 'historyDetail:selectedItem';
const panelStroke = '#FFB3B3';
const panelBackground = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const mapStroke = '#BCBCBC';
const HISTORY_TRAJECTORY_ZOOM = 18;
const cameraPanelBorderMarkup = cameraPanelBorderSvg.replace(
    '<svg ',
    '<svg preserveAspectRatio="none" class="h-full w-full" '
);
const streamPanelFill = 'linear-gradient(180deg, #F5F5F5 0%, #EDEDED 100%)';
const streamPanelBorder = 'linear-gradient(135deg, #FB5555 0%, #ED0000 18%, rgba(251, 85, 85, 0.42) 40%, rgba(251, 85, 85, 0.12) 56%, rgba(251, 85, 85, 0) 66%)';
const geofencePathOptions = {
    color: '#E1BA95',
    fillColor: '#9616161A',
    fillOpacity: 1,
    weight: 0.3,
};
const trajectoryPathOptions = {
    color: mapStroke,
    weight: 2,
    dashArray: '4, 6',
    opacity: 1,
};

const dockIcon = new L.DivIcon({
    className: 'custom-dock-icon',
    html: '<div class="w-6 h-6 rounded-full bg-[#d4af37] text-black text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-[#d4af37]/50">H</div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const DRONE_ICON_WIDTH = 48;
const DRONE_ICON_HEIGHT = 68;
const DRONE_ICON_CENTER_X = 24;
const DRONE_ICON_CENTER_Y = 52;

const droneIcon = new L.DivIcon({
    className: 'custom-drone-icon',
    html: `
        <div style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:flex; align-items:center; justify-content:center; transform-origin:${DRONE_ICON_CENTER_X}px ${DRONE_ICON_CENTER_Y}px;">
            <img src="${droneIconImage}" alt="Drone" style="width:${DRONE_ICON_WIDTH}px; height:${DRONE_ICON_HEIGHT}px; display:block;" />
        </div>
    `,
    iconSize: [DRONE_ICON_WIDTH, DRONE_ICON_HEIGHT],
    iconAnchor: [DRONE_ICON_CENTER_X, DRONE_ICON_CENTER_Y],
});

const createWaypointIcon = (number) => new L.DivIcon({
    className: 'custom-waypoint-icon',
    html: `<div class="w-5 h-5 rounded-full bg-[#FD5050] border border-[#FD5050] text-white text-[10px] font-bold flex items-center justify-center shadow-lg">${number}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

const toLatLng = (latitude, longitude) => {
    if (latitude == null || longitude == null) return null;

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return [lat, lng];
};

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

const getHistoryReason = (historyItem) => (
    historyItem?.failure_reason
    || historyItem?.skip_reason
    || historyItem?.reason
    || '-'
);

const getHistoryScheduleValue = (historyItem) => (
    historyItem?.mission_snapshot?.schedule
    || historyItem?.started_at
    || historyItem?.created_at
    || ''
);

const getMissionName = (historyItem, translate) => (
    historyItem?.mission_name
    || historyItem?.mission_snapshot?.mission_name
    || translate('historyPage.missionFallback', 'Mission {id}', { id: historyItem?.mission_id ?? '-' })
);

const HistoryTrajectoryMap = ({ historyItem, homePosition, maxRange, trackPoints }) => {
    const snapshot = historyItem?.mission_snapshot || {};
    const frozenHomePosition = toLatLng(historyItem?.uav_home_latitude, historyItem?.uav_home_longitude);
    const effectiveHomePosition = frozenHomePosition || homePosition;
    const waypointPositions = (snapshot.waypoints || [])
        .map((waypoint) => toLatLng(waypoint.latitude, waypoint.longitude))
        .filter(Boolean);
    const recordedTrackPositions = (trackPoints || [])
        .map((point) => toLatLng(point.latitude, point.longitude))
        .filter(Boolean);
    const displayedPath = recordedTrackPositions.length > 1 ? recordedTrackPositions : waypointPositions;
    const dronePosition = recordedTrackPositions[recordedTrackPositions.length - 1]
        || waypointPositions[waypointPositions.length - 1]
        || effectiveHomePosition;
    const center = dronePosition || effectiveHomePosition || [-6.2, 106.816666];

    return (
        <MapContainer
            key={`${historyItem?.id || 'empty'}-${center[0]}-${center[1]}`}
            center={center}
            zoom={HISTORY_TRAJECTORY_ZOOM}
            attributionControl={false}
            zoomControl={false}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri"
            />

            {effectiveHomePosition ? <Circle center={effectiveHomePosition} radius={maxRange} pathOptions={geofencePathOptions} /> : null}
            {effectiveHomePosition ? <Marker position={effectiveHomePosition} icon={dockIcon} /> : null}
            {displayedPath.length > 1 ? <Polyline positions={displayedPath} pathOptions={trajectoryPathOptions} /> : null}
            {waypointPositions.map((position, index) => (
                <Marker key={`waypoint-${index}`} position={position} icon={createWaypointIcon(index + 1)} />
            ))}
            {dronePosition ? <Marker position={dronePosition} icon={droneIcon} /> : null}
        </MapContainer>
    );
};

const DetailRow = ({ label, value, children }) => (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 text-[14px] text-[#1F1F1F]">
        <div className="font-medium">{label}</div>
        <div className="text-right">{children ?? value}</div>
    </div>
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

export default function HistoryDetailPage() {
    const { t, language } = useI18n();
    const navigate = useNavigate();
    const location = useLocation();
    const { historyId } = useParams();
    const locale = language === 'id' ? 'id-ID' : 'en-GB';
    const [historyItem, setHistoryItem] = useState(() => {
        if (location.state?.historyItem) {
            return location.state.historyItem;
        }

        const storedValue = window.sessionStorage.getItem(HISTORY_DETAIL_STORAGE_KEY);
        if (!storedValue) {
            return null;
        }

        try {
            const parsedValue = JSON.parse(storedValue);
            return String(parsedValue?.id) === String(historyId) ? parsedValue : null;
        } catch {
            return null;
        }
    });
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [trackPoints, setTrackPoints] = useState([]);
    const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');
    const [mediaPreviewName, setMediaPreviewName] = useState('');
    const [isMediaPreviewLoading, setIsMediaPreviewLoading] = useState(false);
    const [mediaPreviewError, setMediaPreviewError] = useState('');
    const [activeDownloadKey, setActiveDownloadKey] = useState('');

    useEffect(() => {
        let isCancelled = false;

        const fetchDrone = async () => {
            try {
                const data = await uavService.getUav();
                if (!isCancelled) {
                    setSelectedDrone(data);
                }
            } catch (error) {
                console.error('Error fetching drone info for history detail page:', error);
            }
        };

        fetchDrone();
        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const fetchTrack = async () => {
            if (!historyItem?.id) {
                setTrackPoints([]);
                return;
            }

            try {
                const data = await telemetryService.getTrack();
                if (isCancelled) {
                    return;
                }

                if (String(data?.history_id) === String(historyItem.id)) {
                    setTrackPoints(Array.isArray(data?.points) ? data.points : []);
                } else {
                    setTrackPoints([]);
                }
            } catch (error) {
                if (!isCancelled) {
                    console.error('Error fetching history trajectory:', error);
                    setTrackPoints([]);
                }
            }
        };

        fetchTrack();
        return () => {
            isCancelled = true;
        };
    }, [historyItem?.id]);

    useEffect(() => {
        let isCancelled = false;

        setMediaPreviewError('');
        setMediaPreviewName('');
        setMediaPreviewUrl((current) => {
            if (current) {
                window.URL.revokeObjectURL(current);
            }
            return '';
        });

        if (!historyItem?.id || !historyItem?.has_full_video) {
            setIsMediaPreviewLoading(false);
            return () => {
                isCancelled = true;
            };
        }

        setIsMediaPreviewLoading(true);

        const loadPreview = async () => {
            try {
                const file = await historyService.getMissionHistoryFullVideoFile(historyItem.id);
                if (isCancelled) {
                    return;
                }

                setMediaPreviewUrl(window.URL.createObjectURL(file.blob));
                setMediaPreviewName(file.filename);
            } catch (error) {
                if (!isCancelled) {
                    setMediaPreviewError(error.message || t('historyPage.failedLoadFullVideoPreview'));
                }
            } finally {
                if (!isCancelled) {
                    setIsMediaPreviewLoading(false);
                }
            }
        };

        loadPreview();

        return () => {
            isCancelled = true;
        };
    }, [historyItem?.has_full_video, historyItem?.id, t]);

    useEffect(() => () => {
        if (mediaPreviewUrl) {
            window.URL.revokeObjectURL(mediaPreviewUrl);
        }
    }, [mediaPreviewUrl]);

    const handleDownloadFullVideo = async () => {
        if (!historyItem?.id || !historyItem?.has_full_video) {
            return;
        }

        setActiveDownloadKey('full-video');
        try {
            const file = await historyService.getMissionHistoryFullVideoFile(historyItem.id);
            downloadBlob(file.blob, file.filename);
        } catch (error) {
            window.alert(error.message || t('historyPage.failedDownloadFullVideo'));
        } finally {
            setActiveDownloadKey('');
        }
    };

    const handleDownloadMediaArchive = async () => {
        if (!historyItem?.id || (historyItem.media_count ?? 0) <= 0) {
            return;
        }

        setActiveDownloadKey('media-archive');
        try {
            const file = await historyService.getMissionHistoryMediaArchiveFile(historyItem.id);
            downloadBlob(file.blob, file.filename);
        } catch (error) {
            window.alert(error.message || t('historyPage.failedDownloadMediaArchive'));
        } finally {
            setActiveDownloadKey('');
        }
    };

    const homePosition = toLatLng(selectedDrone?.home_latitude, selectedDrone?.home_longitude);
    const maxRange = selectedDrone?.max_range_meter || 1800;
    const missionName = getMissionName(historyItem, (key, fallback, replacements) => Object.entries(replacements || {}).reduce(
        (message, [replacementKey, replacementValue]) => message.replace(`{${replacementKey}}`, replacementValue),
        t(key, fallback)
    ));
    const scheduleLabel = formatDateTime(getHistoryScheduleValue(historyItem), locale);
    const reasonLabel = getHistoryReason(historyItem);
    const waypointCount = historyItem?.waypoint_count ?? historyItem?.mission_snapshot?.waypoints?.length ?? 0;

    if (!historyItem) {
        return (
            <div className="app-page flex items-center justify-center">
                <div className="rounded-[24px] border border-[#FFB3B3] bg-white px-8 py-6 text-center text-[#5F5F5F] shadow-lg">
                    <div className="text-[18px] font-medium text-[#1F1F1F]">{t('historyPage.noHistorySelected')}</div>
                    <button
                        type="button"
                        onClick={() => navigate('/history')}
                        className="mt-4 rounded-[10px] bg-[#E76060] px-4 py-2 text-sm font-medium text-white"
                    >
                        {t('historyPage.back')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-page overflow-y-auto">
            <div className="app-page__inner flex min-h-full min-w-0 gap-[clamp(18px,2vw,24px)]">
                <div className="min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={() => navigate('/history')}
                        className="mb-4 inline-flex items-center gap-2 text-[18px] font-medium text-[#1F1F1F]"
                    >
                        <span aria-hidden="true">‹</span>
                        <span>{t('historyPage.back')}</span>
                    </button>

                    <div className="relative h-[calc(100%-52px)] overflow-hidden rounded-[30px]">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 z-[450] select-none"
                            dangerouslySetInnerHTML={{ __html: cameraPanelBorderMarkup }}
                        />
                        <div className="h-full overflow-hidden rounded-[30px] p-[5px]">
                            <div className="relative h-full w-full overflow-hidden rounded-[29px] bg-black">
                                {mediaPreviewUrl ? (
                                    <video
                                        src={mediaPreviewUrl}
                                        controls
                                        autoPlay={false}
                                        preload="metadata"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-[#D0D0D0] px-6 text-center">
                                        <div className="flex max-w-[260px] flex-col items-center">
                                            <img
                                                src={disconnectIcon}
                                                alt=""
                                                aria-hidden="true"
                                                className="mb-4 h-10 w-10 object-contain"
                                            />
                                            <div className="text-[12px] text-[#5F5F5F]">
                                                {isMediaPreviewLoading
                                                    ? t('historyPage.loadingFullVideoPreview')
                                                    : mediaPreviewError || t('historyPage.fullVideoPreviewUnavailable')}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex min-h-0 w-[clamp(380px,34vw,560px)] min-w-[380px] flex-col gap-5">
                    <div
                        className="font-inter flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border p-6 shadow-lg"
                        style={{ borderColor: panelStroke, background: panelBackground }}
                    >
                        <div className="flex items-start gap-3">
                            <span className="h-[38px] w-[6px] shrink-0 bg-[#FC4747]" />
                            <div>
                                <h2 className="text-[18px] font-medium text-[#151515]">{t('historyPage.trajectory')}</h2>
                                <p className="text-[14px] text-[#777777]">{t('historyPage.trajectorySubtitle')}</p>
                            </div>
                        </div>
                        <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[14px] border border-[#D0D0D0] bg-[#ECECEC]">
                            <HistoryTrajectoryMap historyItem={historyItem} homePosition={homePosition} maxRange={maxRange} trackPoints={trackPoints} />
                        </div>
                    </div>

                    <div
                        className="font-inter flex flex-1 flex-col overflow-hidden rounded-[30px] border p-6 shadow-lg"
                        style={{ borderColor: panelStroke, background: panelBackground }}
                    >
                        <div className="flex shrink-0 items-start gap-3">
                            <span className="h-[38px] w-[6px] shrink-0 bg-[#FC4747]" />
                            <div>
                                <h2 className="text-[18px] font-medium text-[#151515]">{t('historyPage.detailMission')}</h2>
                                <p className="text-[14px] text-[#777777]">{t('historyPage.recordedFootageSubtitle')}</p>
                            </div>
                        </div>

                        <div
                            className="mt-3 min-h-0 flex-1 rounded-[22px] p-px"
                            style={{ backgroundImage: streamPanelBorder }}
                        >
                            <div
                                className="flex h-full min-h-0 flex-col rounded-[21px] px-5 py-4"
                                style={{ background: streamPanelFill }}
                            >
                                <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
                                    <DetailRow label={t('historyPage.mission')} value={missionName} />
                                    <DetailRow label={t('historyPage.schedule')} value={scheduleLabel} />
                                    <DetailRow label={t('historyPage.pinPoint')} value={t('historyPage.pinPointCount').replace('{count}', waypointCount)} />
                                    <DetailRow label={t('historyPage.task')} value={historyItem?.task_summary || '-'} />
                                    <DetailRow
                                        label={t('historyPage.fullRecord')}
                                        value=""
                                    >
                                        <button
                                            type="button"
                                            onClick={handleDownloadFullVideo}
                                            disabled={!historyItem?.has_full_video || activeDownloadKey === 'media-archive'}
                                            className="text-right text-[#2563EB] underline underline-offset-2 disabled:cursor-not-allowed disabled:text-[#8C8C8C] disabled:no-underline"
                                        >
                                            {activeDownloadKey === 'full-video'
                                                ? t('historyPage.downloading')
                                                : (mediaPreviewName || `${missionName}.mp4`)}
                                        </button>
                                    </DetailRow>
                                    <DetailRow
                                        label={t('historyPage.media')}
                                        value=""
                                    >
                                        <button
                                            type="button"
                                            onClick={handleDownloadMediaArchive}
                                            disabled={(historyItem?.media_count ?? 0) <= 0 || activeDownloadKey === 'full-video'}
                                            className="text-right text-[#2563EB] underline underline-offset-2 disabled:cursor-not-allowed disabled:text-[#8C8C8C] disabled:no-underline"
                                        >
                                            {activeDownloadKey === 'media-archive'
                                                ? t('historyPage.downloading')
                                                : `${t('historyPage.download')} (${historyItem?.media_count ?? 0})`}
                                        </button>
                                    </DetailRow>
                                    <DetailRow label={t('historyPage.duration')} value={formatDuration(historyItem?.started_at, historyItem?.completed_at)} />
                                    <DetailRow label={t('historyPage.status')} value={historyItem?.status || '-'} />
                                    <DetailRow label={t('historyPage.reason')} value={reasonLabel} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
