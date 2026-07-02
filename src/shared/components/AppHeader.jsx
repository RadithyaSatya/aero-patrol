import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import appLogo from '../../assets/images/icon_app_white.svg';
import droneMenuIcon from '../../assets/images/icon_drone_menu.svg';
import homeMenuIcon from '../../assets/images/icon_home_menu.svg';
import livestreamMenuIcon from '../../assets/images/icon_livestream_menu.svg';
import settingMenuIcon from '../../assets/images/icon_setting_menu.svg';
import notificationIcon from '../../assets/images/icon_notification.svg';
import dangerIcon from '../../assets/images/icon_danger.svg';
import satelliteIcon from '../../assets/images/icon_satellite.svg';
import { useI18n } from '../i18n/I18nProvider';

const HEADER_HEIGHT = 84;
const SIDEBAR_COLLAPSED_WIDTH = 92;
const SIDEBAR_EXPANDED_WIDTH = 236;

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

const HeaderBatteryIcon = ({ percent = null }) => {
    const hasValue = Number.isFinite(Number(percent));
    const normalizedPercent = hasValue ? Math.max(0, Math.min(100, Number(percent))) : 0;
    const fillHeight = Math.max(0, Math.round((normalizedPercent / 100) * 24));

    return (
        <div className="relative h-[44px] w-[24px] shrink-0">
            <div className="absolute left-1/2 top-0 h-[5px] w-[9px] -translate-x-1/2 rounded-t-[3px] bg-[#D6DEEB]" />
            <div className="absolute inset-x-0 bottom-0 top-[4px] rounded-[7px] bg-[#D6DEEB]" />
            <div className="absolute inset-x-[3px] bottom-[5px] top-[9px] rounded-[4px] bg-white" />
            <div
                className={`absolute inset-x-[7px] bottom-[9px] rounded-[2px] transition-all duration-500 ${
                    hasValue ? 'bg-[#8294B3]' : 'bg-[#D6DEEB]'
                }`}
                style={{ height: `${Math.min(24, Math.max(hasValue ? 4 : 10, fillHeight))}px` }}
            />
        </div>
    );
};

const RcBarsIcon = ({ level = 0 }) => {
    const activeColor = '#8294B3';
    const inactiveColor = '#D6DEEB';
    const bars = [1, 2, 3, 4];

    return (
        <div className="flex h-[18px] items-end gap-[2px]">
            {bars.map((bar) => (
                <div
                    key={bar}
                    className="w-[4px] rounded-t-[2px]"
                    style={{
                        height: `${bar * 4 + 2}px`,
                        backgroundColor: bar <= level ? activeColor : inactiveColor,
                    }}
                />
            ))}
        </div>
    );
};

const MENU_ITEMS = [
    { key: 'dashboard', labelKey: 'common.dashboard', fallbackLabel: 'Dashboard', to: '/dashboard', icon: homeMenuIcon },
    { key: 'missions', labelKey: 'missions.aespr', fallbackLabel: 'AESPR', to: '/missions', icon: droneMenuIcon },
    { key: 'history', labelKey: 'common.history', fallbackLabel: 'History', to: '/history', icon: livestreamMenuIcon },
    { key: 'settings', labelKey: 'common.settings', fallbackLabel: 'Settings', to: '/settings', icon: settingMenuIcon },
];

const ACTIVE_ICON_FILTER = 'brightness(0) saturate(100%) invert(15%) sepia(97%) saturate(7428%) hue-rotate(0deg) brightness(82%) contrast(119%)';

const MenuIcon = ({ icon, isActive }) => (
    <img
        src={icon}
        alt=""
        aria-hidden="true"
        className="h-[22px] w-[22px] shrink-0 object-contain"
        style={isActive ? { filter: ACTIVE_ICON_FILTER } : undefined}
    />
);

const matchesRoute = (pathname, path) => {
    if (path === '/settings') {
        return pathname === '/settings' || pathname === '/user-management';
    }

    return pathname === path || pathname.startsWith(`${path}/`);
};

const formatTelemetryLabel = (value = '') => value
    .split('_')
    .filter(Boolean)
    .map((part) => part.toUpperCase())
    .join(' ');

export default function AppHeader({
    isSidebarCollapsed = false,
    onToggleSidebar,
    telemetry = null,
    telemetryStatus = null,
}) {
    const { t, language } = useI18n();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const location = useLocation();
    const navigate = useNavigate();
    const authUsername = localStorage.getItem('authUsername') || 'Aero Patrol';
    const batteryTelemetry = telemetry?.battery || null;
    const vehicleStateTelemetry = telemetry?.vehicle_state || null;
    const dockingStatusTelemetry = telemetry?.docking_status || null;
    const uavStatusTelemetry = telemetry?.uav_status || null;
    const gpsTelemetry = telemetry?.gps || null;
    const gps2Telemetry = telemetry?.gps2 || null;
    const linkTelemetry = telemetry?.link || null;
    const isBatteryFresh = Boolean(telemetryStatus?.metrics?.battery?.isFresh);
    const isVehicleStateFresh = Boolean(telemetryStatus?.metrics?.vehicle_state?.isFresh);
    const isDockingStatusFresh = Boolean(telemetryStatus?.metrics?.docking_status?.isFresh);
    const isUavStatusFresh = Boolean(telemetryStatus?.metrics?.uav_status?.isFresh);
    const isGpsFresh = Boolean(telemetryStatus?.metrics?.gps?.isFresh);
    const isGps2Fresh = Boolean(telemetryStatus?.metrics?.gps2?.isFresh);
    const isLinkFresh = Boolean(telemetryStatus?.metrics?.link?.isFresh);
    const isDroneActive = Boolean(
        (isVehicleStateFresh && vehicleStateTelemetry?.connected) || isBatteryFresh
    );
    const hasDockingBatterySnapshot = Boolean(
        isUavStatusFresh && (
            uavStatusTelemetry?.battery_percent != null ||
            uavStatusTelemetry?.battery_voltage != null
        )
    );
    const shouldUseDockingBatteryFallback = !isDroneActive && hasDockingBatterySnapshot;
    const batteryPercent = shouldUseDockingBatteryFallback
        ? (isUavStatusFresh ? uavStatusTelemetry?.battery_percent ?? null : null)
        : (isBatteryFresh ? batteryTelemetry?.percent ?? null : null);
    const batteryVoltage = shouldUseDockingBatteryFallback
        ? (isUavStatusFresh ? uavStatusTelemetry?.battery_voltage ?? null : null)
        : (isBatteryFresh ? batteryTelemetry?.voltage ?? null : null);
    const batteryTemperature = shouldUseDockingBatteryFallback
        ? (isDockingStatusFresh ? dockingStatusTelemetry?.temperature ?? null : null)
        : (
            isDockingStatusFresh
                ? dockingStatusTelemetry?.temperature ?? null
                : (
                    isBatteryFresh
                        ? (batteryTelemetry?.temperature ?? batteryTelemetry?.temp ?? batteryTelemetry?.battery_temperature ?? null)
                        : null
                )
        );
    const gpsSatellites = isGpsFresh ? Number(gpsTelemetry?.satellites) : null;
    const gps2Satellites = isGps2Fresh ? Number(gps2Telemetry?.satellites) : null;
    const hasDualGps = Number.isFinite(gpsSatellites) && Number.isFinite(gps2Satellites);
    const gpsFixLabel = isGpsFresh
        ? formatTelemetryLabel(String(gpsTelemetry?.fix_type_label || '').trim())
        : '';
    const gps2FixLabel = isGps2Fresh
        ? formatTelemetryLabel(String(gps2Telemetry?.fix_type_label || '').trim())
        : '';
    const fixLabels = [gpsFixLabel, gps2FixLabel].filter(Boolean);
    const rtkStatusLabel = (() => {
        if (fixLabels.length === 0) {
            return 'RTK';
        }

        const preferredRtkLabel = fixLabels.find((label) => /rtk/i.test(label));
        if (preferredRtkLabel) {
            return preferredRtkLabel;
        }

        return fixLabels[0];
    })();
    const satelliteCountValue = hasDualGps
        ? gpsSatellites + gps2Satellites
        : (Number.isFinite(gpsSatellites) ? gpsSatellites : Number.isFinite(gps2Satellites) ? gps2Satellites : null);
    const rssiValue = isLinkFresh ? Number(linkTelemetry?.rssi) : null;
    const rcLevel = Number.isFinite(rssiValue)
        ? rssiValue >= 75 ? 4 : rssiValue >= 50 ? 3 : rssiValue >= 25 ? 2 : rssiValue >= 1 ? 1 : 0
        : 0;

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
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const locale = language === 'id' ? 'id-ID' : 'en-GB';
    const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(currentTime);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUsername');
        localStorage.removeItem('authUserId');
        localStorage.removeItem('authRole');
        localStorage.removeItem('deviceToken');
        setIsSettingsOpen(false);
        navigate('/login');
    };

    const handleNavigateTo = (path) => {
        setIsSettingsOpen(false);
        navigate(path);
    };

    return (
        <>
            <header
                className="relative z-[1000] flex w-full shrink-0 items-center justify-between border-b border-[#E3E3E3] bg-white px-4 md:px-5 xl:px-8"
                style={{ height: HEADER_HEIGHT }}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <img src={appLogo} alt="Aero Patrol" className="h-[38px] w-auto shrink-0 object-contain md:h-[44px]" />
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
                    <div className="hidden items-center gap-1 md:flex">
                        <div className="flex flex-col items-start gap-[4px] text-[#8294B3]">
                            <span className="max-w-[88px] truncate text-[11px] font-normal leading-none xl:max-w-[110px] xl:text-[11px]">
                                {rtkStatusLabel}
                            </span>
                            <div className="flex items-center gap-2">
                                <img src={satelliteIcon} alt="" aria-hidden="true" className="h-[18px] w-[18px] object-contain" />
                                <span className="text-[14px] font-normal leading-none xl:text-[14px]">
                                    {satelliteCountValue != null ? satelliteCountValue : '--'}
                                </span>
                            </div>
                        </div>
                        <div className="ml-2 flex items-center gap-1.5 pt-[10px] text-[#8294B3]">
                            <span className="text-[11px] font-normal leading-none xl:text-[11px]">RC</span>
                            <RcBarsIcon level={rcLevel} />
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className="min-w-[36px] text-right text-[14px] font-normal leading-none text-[#8294B3] xl:min-w-[40px] xl:text-[14px]">
                                {batteryPercent != null ? `${Math.round(Number(batteryPercent))}%` : '--'}
                            </span>
                            <HeaderBatteryIcon percent={batteryPercent} />
                            <div className="flex flex-col items-start leading-none text-[#8294B3]">
                                <span className="text-[14px] font-normal xl:text-[14px]">
                                    {batteryTemperature != null ? `${Number(batteryTemperature).toFixed(0)}°C` : '--°C'}
                                </span>
                                <span className="mt-[4px] text-[14px] font-normal xl:text-[14px]">
                                    {batteryVoltage != null ? `${Number(batteryVoltage).toFixed(1)}V` : '--.-V'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden h-8 w-px bg-[#E2E7F1] md:block" />

                    <div className="hidden flex-col items-end md:flex">
                        <span className="font-inter text-[11px] font-medium tracking-[0.04em] text-[#8294B3]">
                            UTC+7 • {dateStr}
                        </span>
                        <span className="mt-1 font-inter text-[16px] font-bold leading-none text-[#C20000] md:text-[18px] xl:text-[20px]">
                            {timeStr}
                        </span>
                    </div>

                    <div className="hidden h-8 w-px bg-[#E2E7F1] md:block" />

                    <div className="flex items-center gap-3">
                        <img
                            src={dangerIcon}
                            alt={t('header.dangerAlerts')}
                            className="h-8 w-8 shrink-0 object-contain"
                        />

                        <div className="hidden h-8 w-px bg-[#E2E7F1] md:block" />

                        <img
                            src={notificationIcon}
                            alt={t('header.notifications')}
                            className="h-8 w-8 shrink-0 object-contain"
                        />

                        <div className="hidden h-8 w-px bg-[#E2E7F1] md:block" />

                        <span className="font-inter text-[14px] font-normal text-[#000000]">
                            {authUsername}
                        </span>

                        <div className="relative" ref={settingsRef}>
                            <button
                                type="button"
                                onClick={() => setIsSettingsOpen((prev) => !prev)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F2F2] text-[#111111] transition-colors hover:bg-[#F1E7E7]"
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
                className={`fixed left-0 z-[950] flex flex-col items-center bg-[#C20000] py-6 transition-[width,padding,border-radius] duration-300 ease-in-out ${isSidebarCollapsed ? 'px-3 rounded-tr-none' : 'px-4 rounded-tr-[28px]'}`}
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
                                className={`flex h-[64px] w-full items-center rounded-[18px] transition-[background-color,box-shadow,padding] duration-300 ease-in-out ${
                                    isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-5'
                                } ${
                                    isActive ? 'bg-white shadow-[0_10px_24px_rgba(0,0,0,0.12)]' : 'bg-transparent hover:bg-[#D51A1A]'
                                }`}
                            >
                                <div className={`flex min-w-0 items-center ${isSidebarCollapsed ? 'justify-center gap-0' : 'gap-4'}`}>
                                    <MenuIcon icon={item.icon} isActive={isActive} />
                                    <span
                                        className={`${isActive ? 'text-[#C20000]' : 'text-white'} overflow-hidden whitespace-nowrap font-inter text-[16px] font-semibold transition-[max-width,opacity,margin] duration-300 ease-in-out`}
                                        style={{
                                            maxWidth: isSidebarCollapsed ? '0px' : '140px',
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
                    className="absolute top-1/2 right-0 flex h-[32px] w-[26px] -translate-y-1/2 items-center justify-start rounded-l-full bg-white pl-[3px]"
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
