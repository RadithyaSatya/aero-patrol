import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import appLogo from '../../assets/images/icon_app_white.svg';
import droneMenuIcon from '../../assets/images/icon_drone_menu.svg';
import homeMenuIcon from '../../assets/images/icon_home_menu.svg';
import historyMenuIcon from '../../assets/images/icon_history_menu.svg';
import livestreamMenuIcon from '../../assets/images/icon_livestream_menu.svg';
import settingMenuIcon from '../../assets/images/icon_setting_menu.svg';
import notificationIcon from '../../assets/images/icon_notification.svg';
import dangerIcon from '../../assets/images/icon_danger.svg';
import { useI18n } from '../i18n/I18nProvider';
import { authService, clearAuthStorage, SSO_LOGOUT_REDIRECT_URL } from '../../services/api';

const HEADER_HEIGHT = 64;
const SIDEBAR_COLLAPSED_WIDTH = 92;
const SIDEBAR_EXPANDED_WIDTH = 216;
const NOTIFICATION_TYPES = {
    reminder: 'mission_reminder',
    terminal: 'mission_terminal',
};

const formatBadgeCount = (count) => {
    const normalized = Number(count);

    if (!Number.isFinite(normalized) || normalized <= 0) {
        return null;
    }

    return normalized > 99 ? '99+' : String(normalized);
};

const UserIcon = ({ color = '#111111' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 10C14.2091 10 16 8.20914 16 6C16 3.79086 14.2091 2 12 2C9.79086 2 8 3.79086 8 6C8 8.20914 9.79086 10 12 10Z" fill={color} />
        <path d="M20 17.5C20 19.985 20 22 12 22C4 22 4 19.985 4 17.5C4 15.015 7.582 13 12 13C16.418 13 20 15.015 20 17.5Z" fill={color} />
    </svg>
);

const SidebarToggleIcon = ({ isCollapsed }) => (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
            d={isCollapsed ? 'M6 3L11 8L6 13' : 'M10 3L5 8L10 13'}
            stroke="#C20000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const MENU_ITEMS = [
    { key: 'dashboard', labelKey: 'common.dashboard', fallbackLabel: 'Dashboard', to: '/dashboard', icon: homeMenuIcon },
    { key: 'missions', labelKey: 'missions.aespr', fallbackLabel: 'AESPR', to: '/missions', icon: droneMenuIcon },
    { key: 'history', labelKey: 'common.history', fallbackLabel: 'History', to: '/history', icon: historyMenuIcon },
    { key: 'live-video', labelKey: 'common.liveVideo', fallbackLabel: 'Live Video', to: '/live-video', icon: livestreamMenuIcon },
    { key: 'settings', labelKey: 'common.settings', fallbackLabel: 'Settings', to: '/settings', icon: settingMenuIcon },
];

const ACTIVE_ICON_FILTER = 'brightness(0) saturate(100%) invert(15%) sepia(97%) saturate(7428%) hue-rotate(0deg) brightness(82%) contrast(119%)';

const MenuIcon = ({ icon, isActive }) => (
    <img
        src={icon}
        alt=""
        aria-hidden="true"
        className="h-[17px] w-[17px] shrink-0 object-contain"
        style={isActive ? { filter: ACTIVE_ICON_FILTER } : undefined}
    />
);

const matchesRoute = (pathname, path) => {
    if (path === '/settings') {
        return pathname === '/settings' || pathname === '/user-management';
    }

    return pathname === path || pathname.startsWith(`${path}/`);
};

const formatNotificationDate = (value, locale, options) => {
    const parsed = Date.parse(value || '');
    if (!Number.isFinite(parsed)) {
        return '--';
    }

    return new Intl.DateTimeFormat(locale, options).format(new Date(parsed));
};

const formatRelativeTime = (diffMinutes, language, { future = false } = {}) => {
    const absoluteMinutes = Math.abs(diffMinutes);

    if (absoluteMinutes < 60) {
        const value = Math.max(1, absoluteMinutes);
        if (future) {
            return language === 'id' ? `${value} menit lagi` : `in ${value} min`;
        }

        return language === 'id' ? `${value} menit lalu` : `${value} min ago`;
    }

    if (absoluteMinutes < 1440) {
        const value = Math.floor(absoluteMinutes / 60);
        if (future) {
            return language === 'id' ? `${value} jam lagi` : `in ${value} hr`;
        }

        return language === 'id' ? `${value} jam lalu` : `${value} hr ago`;
    }

    const value = Math.floor(absoluteMinutes / 1440);
    if (future) {
        return language === 'id' ? `${value} hari lagi` : `in ${value} day${value === 1 ? '' : 's'}`;
    }

    return language === 'id' ? `${value} hari lalu` : `${value} day${value === 1 ? '' : 's'} ago`;
};

const getRelativeMinutesLabel = (notification, language) => {
    const rawMinutes = Number(notification?.payload?.minutes);

    if (Number.isFinite(rawMinutes) && rawMinutes > 0) {
        return formatRelativeTime(rawMinutes, language, { future: true });
    }

    const runAtTimestamp = Date.parse(notification?.payload?.run_at || '');
    if (!Number.isFinite(runAtTimestamp)) {
        return '';
    }

    const diffMinutes = Math.round((runAtTimestamp - Date.now()) / 60000);

    if (diffMinutes > 0) {
        return formatRelativeTime(diffMinutes, language, { future: true });
    }

    if (diffMinutes === 0) {
        return language === 'id' ? 'mulai sekarang' : 'starting now';
    }

    return formatRelativeTime(diffMinutes, language);
};

const getRelativeCreatedLabel = (value, language) => {
    const timestamp = Date.parse(value || '');

    if (!Number.isFinite(timestamp)) {
        return '--';
    }

    const diffMs = Date.now() - timestamp;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes <= 0) {
        return 'now';
    }

    return formatRelativeTime(diffMinutes, language);
};

function NotificationItem({
    notification,
    type,
    isActive,
    isFirst,
    isLast,
    preserveUnreadAppearance = false,
    locale,
    language,
    rootRef,
    onVisible,
    t,
}) {
    const itemRef = useRef(null);

    useEffect(() => {
        const target = itemRef.current;
        const root = rootRef.current;

        if (!isActive || !target || !root) {
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        onVisible(notification);
                    }
                });
            },
            {
                root,
                threshold: 0.65,
            }
        );

        observer.observe(target);

        return () => observer.disconnect();
    }, [isActive, notification, onVisible, rootRef]);

    const relativeCreatedLabel = getRelativeCreatedLabel(notification?.created_at, language);
    const createdAtLabel = formatNotificationDate(notification?.created_at, locale, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
    const takeoffAtLabel = formatNotificationDate(notification?.payload?.run_at, locale, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
    const isVisuallyRead = notification?.is_read && !preserveUnreadAppearance;

    return (
        <article
            ref={itemRef}
            className={`px-2 py-3 ${isVisuallyRead ? 'bg-[#F1F4F9]' : 'bg-white'} ${
                isFirst ? 'rounded-t-[20px]' : ''
            } ${
                isLast ? 'rounded-b-[20px]' : ''
            }`}
        >
            <div className="min-w-0 px-3">
                {type === NOTIFICATION_TYPES.reminder ? (
                    <>
                        <div className="flex items-start justify-between gap-3">
                            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#151515]">
                                {t('header.missionAlert')}
                            </span>
                            <span className="shrink-0 text-[11px] text-[#8A94A6]">
                                {createdAtLabel}
                            </span>
                        </div>
                        <div className="mt-2 min-w-0 truncate text-[13px] font-medium text-[#1B1E28]">
                            {`${notification?.mission_name || t('header.untitledMission')} - ${takeoffAtLabel}`}
                        </div>
                        <div className="mt-1 text-[12px] font-medium text-[#C20000]">
                            {language === 'id'
                                ? `Drone takeoff ${getRelativeMinutesLabel(notification, language)}`
                                : `Drone takeoff ${getRelativeMinutesLabel(notification, language)}`}
                        </div>
                    </>
                ) : (
                    <>
                            <div className="flex items-start justify-between gap-3">
                                <div className="truncate text-[13px] font-medium text-[#1B1E28]">
                                    {notification?.mission_name || t('header.untitledMission')}
                                </div>
                                <span className="shrink-0 text-[11px] text-[#8A94A6]">
                                    {relativeCreatedLabel}
                                </span>
                            </div>
                        <div className="mt-1 overflow-hidden text-[12px] font-medium text-[#C20000] text-ellipsis whitespace-nowrap">
                            {notification?.title || t('header.noTitle')}
                        </div>
                        <div
                            className="mt-1 overflow-hidden text-[12px] font-medium leading-5 text-[#596273]"
                            style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                            }}
                        >
                            {notification?.body || t('header.noDescription')}
                        </div>
                    </>
                )}
            </div>
        </article>
    );
}

function NotificationPanel({
    panelType,
    notifications,
    hasNext,
    isReady,
    isInitialLoading,
    isLoadingMore,
    error,
    onLoadMore,
    onMarkVisibleRead,
    language,
    t,
}) {
    const locale = language === 'id' ? 'id-ID' : 'en-GB';
    const scrollRef = useRef(null);
    const sentinelRef = useRef(null);
    const readBufferRef = useRef(new Set());
    const flushTimeoutRef = useRef(null);
    const filteredNotifications = notifications.filter((item) => item?.type === panelType);

    useEffect(() => {
        const root = scrollRef.current;
        const sentinel = sentinelRef.current;

        if (!root || !sentinel || !hasNext) {
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isLoadingMore) {
                        onLoadMore();
                    }
                });
            },
            {
                root,
                threshold: 0.2,
            }
        );

        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [hasNext, isLoadingMore, onLoadMore]);

    useEffect(() => () => {
        if (flushTimeoutRef.current) {
            clearTimeout(flushTimeoutRef.current);
        }
    }, []);

    const enqueueVisibleNotification = (notification) => {
        if (notification?.is_read !== false) {
            return;
        }

        readBufferRef.current.add(Number(notification.id));

        if (flushTimeoutRef.current) {
            clearTimeout(flushTimeoutRef.current);
        }

        flushTimeoutRef.current = setTimeout(() => {
            const ids = [...readBufferRef.current].filter((id) => Number.isFinite(id));
            readBufferRef.current.clear();

            if (ids.length > 0) {
                void onMarkVisibleRead(ids);
            }
        }, 180);
    };

    const emptyLabel = panelType === NOTIFICATION_TYPES.terminal
        ? t('header.noWarnings')
        : t('header.noReminders');

    return (
        <div className="absolute right-0 top-[calc(100%+12px)] z-[1200] w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[24px] border border-[#D5D5D5] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
            <div ref={scrollRef} className="max-h-[480px] overflow-y-auto">
                {isInitialLoading && !isReady ? (
                    <div className="px-5 py-10 text-center text-[13px] text-[#8A94A6]">
                        {t('header.loadingNotifications')}
                    </div>
                ) : null}

                {!isInitialLoading && filteredNotifications.length === 0 ? (
                    <div className="px-5 py-10 text-center text-[13px] text-[#8A94A6]">
                        {emptyLabel}
                    </div>
                ) : null}

                <div className="divide-y divide-[#ECEFF5]">
                    {filteredNotifications.map((notification, index) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            type={panelType}
                            isActive
                            isFirst={index === 0}
                            isLast={index === filteredNotifications.length - 1}
                            preserveUnreadAppearance={notification?.preserveUnreadAppearance}
                            locale={locale}
                            language={language}
                            rootRef={scrollRef}
                            onVisible={enqueueVisibleNotification}
                            t={t}
                        />
                    ))}
                </div>

                {error ? (
                    <div className="px-5 py-4 text-[12px] text-[#C20000]">
                        {error}
                    </div>
                ) : null}

                <div ref={sentinelRef} className="h-0" />

                {isLoadingMore ? (
                    <div className="px-5 py-1 text-center text-[12px] text-[#8A94A6]">
                        {t('header.loadingMoreNotifications')}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default function AppHeader({
    isSidebarCollapsed = false,
    onToggleSidebar,
    notificationCenter = null,
}) {
    const { t, language } = useI18n();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeNotificationPanel, setActiveNotificationPanel] = useState(null);
    const [stickyUnreadIds, setStickyUnreadIds] = useState([]);
    const settingsRef = useRef(null);
    const notificationRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const location = useLocation();
    const navigate = useNavigate();
    const authUsername = localStorage.getItem('authUsername') || 'Aero Patrol';
    const locale = language === 'id' ? 'id-ID' : 'en-GB';
    const notificationItems = (notificationCenter?.notifications || []).map((item) => ({
        ...item,
        preserveUnreadAppearance: stickyUnreadIds.includes(Number(item?.id)),
    }));
    const unreadCountByType = notificationCenter?.unreadCountByType || {};
    const terminalUnreadCount = Number.isFinite(Number(unreadCountByType[NOTIFICATION_TYPES.terminal]))
        ? Math.max(0, Number(unreadCountByType[NOTIFICATION_TYPES.terminal]))
        : 0;
    const reminderUnreadCount = Number.isFinite(Number(unreadCountByType[NOTIFICATION_TYPES.reminder]))
        ? Math.max(0, Number(unreadCountByType[NOTIFICATION_TYPES.reminder]))
        : 0;
    const terminalBadgeLabel = formatBadgeCount(terminalUnreadCount);
    const reminderBadgeLabel = formatBadgeCount(reminderUnreadCount);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }

            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setActiveNotificationPanel(null);
                setStickyUnreadIds([]);
            }
        }

        function handleEscape(event) {
            if (event.key === 'Escape') {
                setIsSettingsOpen(false);
                setActiveNotificationPanel(null);
                setStickyUnreadIds([]);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(currentTime);

    const handleLogout = async () => {
        const authMethod = localStorage.getItem('authMethod') || 'local';

        try {
            await authService.logout();
        } catch (error) {
            console.error('Backend logout failed:', error);
        }

        if (authMethod === 'sso') {
            try {
                await authService.logoutSso();
            } catch (error) {
                console.error('SSO logout failed:', error);
            }
        }

        clearAuthStorage();
        setIsSettingsOpen(false);

        if (authMethod !== 'sso') {
            navigate('/login');
            return;
        }

        if (/^https?:\/\//i.test(SSO_LOGOUT_REDIRECT_URL)) {
            window.location.assign(SSO_LOGOUT_REDIRECT_URL);
            return;
        }

        navigate(SSO_LOGOUT_REDIRECT_URL);
    };

    const handleNavigateTo = (path) => {
        setIsSettingsOpen(false);
        navigate(path);
    };

    const toggleNotificationPanel = (panelName) => {
        setActiveNotificationPanel((previous) => {
            const nextValue = previous === panelName ? null : panelName;

            if (nextValue == null) {
                setStickyUnreadIds([]);
            }

            return nextValue;
        });
        setIsSettingsOpen(false);
    };

    useEffect(() => {
        if (!activeNotificationPanel) {
            return;
        }

        const activeType = activeNotificationPanel === 'terminal'
            ? NOTIFICATION_TYPES.terminal
            : NOTIFICATION_TYPES.reminder;
        const unreadIdsInOpenPanel = notificationItems
            .filter((item) => item?.type === activeType && item?.is_read === false)
            .map((item) => Number(item?.id))
            .filter((id) => Number.isFinite(id));

        if (unreadIdsInOpenPanel.length === 0) {
            return;
        }

        setStickyUnreadIds((previous) => {
            const next = new Set(previous);
            unreadIdsInOpenPanel.forEach((id) => next.add(id));
            return [...next];
        });
    }, [activeNotificationPanel, notificationItems]);

    return (
        <>
            <header
                className="relative z-[1000] flex w-full shrink-0 items-center justify-between border-b border-[#E3E3E3] bg-white px-4 md:px-5 xl:px-8"
                style={{ height: HEADER_HEIGHT }}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <img src={appLogo} alt="Aero Patrol" className="h-[30px] w-auto shrink-0 object-contain md:h-[34px]" />
                    <div className="flex min-w-0 items-center gap-2 md:gap-3">
                        <div className="truncate font-inter text-[16px] font-bold leading-none text-[#151515] md:text-[19px] xl:text-[21px]">
                            {t('app.fullTitle')}
                        </div>
                        <span className="hidden text-[20px] leading-none text-[#9B9B9B] md:inline">-</span>
                        <div className="hidden truncate font-inter text-[13px] text-[#5D5D5D] md:block xl:text-[15px]">
                            {t('app.fullDescription')}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 font-inter md:gap-4 xl:gap-5">
                    <div className="hidden flex-col items-end md:flex">
                        <span className="font-inter text-[11px] font-medium tracking-[0.04em] text-[#8294B3]">
                            UTC+7 • {dateStr}
                        </span>
                        <span className="mt-1 font-inter text-[16px] font-bold leading-none text-[#C20000] md:text-[18px] xl:text-[20px]">
                            {timeStr}
                        </span>
                    </div>

                    <div className="hidden h-7 w-px bg-[#E2E7F1] md:block" />

                    <div className="flex items-center gap-3">
                        <div className="relative" ref={notificationRef}>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => toggleNotificationPanel('terminal')}
                                    className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                                        activeNotificationPanel === 'terminal' ? 'bg-[#FFF0F0]' : 'bg-transparent hover:bg-[#F7F2F2]'
                                    }`}
                                    aria-label={t('header.warningNotifications')}
                                >
                                    <img
                                        src={dangerIcon}
                                        alt=""
                                        aria-hidden="true"
                                        className="h-7 w-7 shrink-0 object-contain"
                                    />
                                    {terminalBadgeLabel ? (
                                        <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#C20000] px-1 text-[9px] font-semibold leading-none text-white">
                                            {terminalBadgeLabel}
                                        </span>
                                    ) : null}
                                </button>

                                <div className="hidden h-7 w-px bg-[#E2E7F1] md:block" />

                                <button
                                    type="button"
                                    onClick={() => toggleNotificationPanel('reminder')}
                                    className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                                        activeNotificationPanel === 'reminder' ? 'bg-[#FFF0F0]' : 'bg-transparent hover:bg-[#F7F2F2]'
                                    }`}
                                    aria-label={t('header.reminderNotifications')}
                                >
                                    <img
                                        src={notificationIcon}
                                        alt=""
                                        aria-hidden="true"
                                        className="h-7 w-7 shrink-0 object-contain"
                                    />
                                    {reminderBadgeLabel ? (
                                        <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#C20000] px-1 text-[9px] font-semibold leading-none text-white">
                                            {reminderBadgeLabel}
                                        </span>
                                    ) : null}
                                </button>
                            </div>

                            {activeNotificationPanel ? (
                                <NotificationPanel
                                    panelType={activeNotificationPanel === 'terminal' ? NOTIFICATION_TYPES.terminal : NOTIFICATION_TYPES.reminder}
                                    notifications={notificationItems}
                                    hasNext={Boolean(notificationCenter?.hasNext)}
                                    isReady={Boolean(notificationCenter?.isReady)}
                                    isInitialLoading={Boolean(notificationCenter?.isInitialLoading)}
                                    isLoadingMore={Boolean(notificationCenter?.isLoadingMore)}
                                    error={notificationCenter?.error || null}
                                    onLoadMore={() => void notificationCenter?.loadMore?.()}
                                    onMarkVisibleRead={(ids) => notificationCenter?.markAsRead?.(ids)}
                                    language={language}
                                    t={t}
                                />
                            ) : null}
                        </div>

                        <div className="hidden h-7 w-px bg-[#E2E7F1] md:block" />

                        <span className="font-inter text-[14px] font-normal text-[#000000]">
                            {authUsername}
                        </span>

                        <div className="relative" ref={settingsRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSettingsOpen((prev) => !prev);
                                    setActiveNotificationPanel(null);
                                    setStickyUnreadIds([]);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F2F2] text-[#111111] transition-colors hover:bg-[#F1E7E7]"
                                aria-label={t('header.openProfileMenu')}
                            >
                                <UserIcon color="#111111" />
                            </button>

                            {isSettingsOpen ? (
                                <div className="absolute right-0 top-[calc(100%+10px)] z-[1100] flex w-[180px] flex-col rounded-[20px] border border-[#F0D4D4] bg-white py-2 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
                                    <button
                                        type="button"
                                        onClick={() => handleNavigateTo('/about')}
                                        className="mx-2 rounded-[12px] px-4 py-3 text-left font-inter text-[14px] text-[#303030] transition-colors hover:bg-[#FAF4F4] focus:outline-none focus-visible:bg-[#FAF4F4]"
                                    >
                                        {t('common.about')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="mx-2 rounded-[12px] px-4 py-3 text-left font-inter text-[14px] text-[#303030] transition-colors hover:bg-[#FAF4F4] focus:outline-none focus-visible:bg-[#FAF4F4]"
                                    >
                                        {t('common.logout')}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </header>

            <aside
                className={`fixed left-0 z-[950] flex flex-col items-center bg-[#C20000] py-5 transition-[width,padding,border-radius] duration-300 ease-in-out ${isSidebarCollapsed ? 'rounded-tr-none px-3' : 'rounded-tr-[24px] px-3'}`}
                style={{
                    top: HEADER_HEIGHT,
                    height: `calc(100vh - ${HEADER_HEIGHT}px)`,
                    width: isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
                }}
            >
                <nav className="flex w-full flex-col gap-3">
                    {MENU_ITEMS.map((item) => {
                        const isActive = matchesRoute(location.pathname, item.to);

                        return (
                            <NavLink
                                key={item.key}
                                to={item.to}
                                className={`flex items-center rounded-[16px] transition-[background-color,box-shadow,padding,width,height] duration-300 ease-in-out ${
                                    isSidebarCollapsed ? 'mx-auto h-[56px] w-[56px] justify-center px-0' : 'h-[58px] w-full justify-start px-3.5'
                                } ${
                                    isActive ? 'bg-white shadow-[0_10px_24px_rgba(0,0,0,0.12)]' : 'bg-transparent hover:bg-[#D51A1A]'
                                }`}
                            >
                                <div className={`flex min-w-0 items-center ${isSidebarCollapsed ? 'justify-center gap-0' : 'gap-2.5'}`}>
                                    <MenuIcon icon={item.icon} isActive={isActive} />
                                    <span
                                        className={`${isActive ? 'text-[#C20000]' : 'text-white'} overflow-hidden whitespace-nowrap font-inter text-[15px] font-semibold transition-[max-width,opacity,margin] duration-300 ease-in-out`}
                                        style={{
                                            maxWidth: isSidebarCollapsed ? '0px' : '126px',
                                            opacity: isSidebarCollapsed ? 0 : 1,
                                            marginLeft: isSidebarCollapsed ? '0px' : '0px',
                                        }}
                                    >
                                        {t(item.labelKey, item.fallbackLabel)}
                                    </span>
                                </div>
                            </NavLink>
                        );
                    })}
                </nav>

                <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="absolute right-0 top-1/2 flex h-[32px] w-[26px] -translate-y-1/2 items-center justify-start rounded-l-full bg-white pl-[3px]"
                    aria-label={isSidebarCollapsed ? t('header.expandSidebar') : t('header.collapseSidebar')}
                >
                    <SidebarToggleIcon isCollapsed={isSidebarCollapsed} />
                </button>

                <div className="mt-auto flex w-full justify-center">
                    {isSidebarCollapsed ? (
                        <div className="font-inter text-[22px] font-semibold leading-none tracking-[0.01em] text-[#FF6B6B] transition-all duration-300 ease-in-out">
                            AP
                        </div>
                    ) : (
                        <div className="font-inter text-[22px] font-semibold leading-none tracking-[0.01em] text-[#FF6B6B] transition-all duration-300 ease-in-out">
                            Aero Patrol
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
