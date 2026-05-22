import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import headerBackground from '../../assets/images/image_background_navbar.png';
import headerLogo from '../../assets/images/icon_app.svg';
import { dockingService, uavService } from '../../services/api';
import useTelemetry from '../hooks/useTelemetry';

const SatelliteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
        <path d="M13 7 9 3 5 7l4 4" /><path d="m17 11 4 4-4 4-4-4" /><path d="m8 12 4 4 6-6-4-4Z" /><path d="m16 8 3-3" /><path d="M9 21a6 6 0 0 0-6-6" />
    </svg>
);

const SignalRender = ({ level, label }) => {
    const heights = ['h-1/4', 'h-2/4', 'h-3/4', 'h-full'];
    return (
        <div className="flex items-center justify-end space-x-2 min-w-[3rem] text-white">
            <span className="text-[11px] font-bold text-gray-100">{label}</span>
            <div className="flex items-end space-x-[2px] h-[14px]">
                {[1, 2, 3, 4].map((bar, idx) => (
                    <div
                        key={bar}
                        className={`w-[3px] rounded-[0.5px] ${heights[idx]} ${bar <= level ? 'bg-white' : 'bg-[#566070]'}`}
                    />
                ))}
            </div>
        </div>
    );
};

const scaleRssiToSignalLevel = (rssi) => {
    const value = Number(rssi);

    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }

    return Math.max(1, Math.min(4, Math.ceil((Math.min(value, 255) / 255) * 4)));
};

const BATTERY_TELEMETRY_STALE_MS = 10000;

const BatteryVertical = ({ level = 80, isStale = false }) => (
    <div className="relative flex h-7 w-4 flex-col items-center justify-end">
        <div className={`h-[2px] w-[6px] rounded-t-[1px] ${isStale ? 'bg-[#7c8796]' : 'bg-gray-300'}`} />
        <div className={`flex h-[22px] w-[16px] flex-col justify-end rounded-[2px] border-[1.5px] p-[1.5px] ${isStale ? 'border-[#7c8796]' : 'border-gray-300'}`}>
            {!isStale ? (
                <div
                    className="w-full rounded-[1px] bg-white"
                    style={{ height: `${level}%` }}
                />
            ) : null}
        </div>
        {isStale ? (
            <svg
                viewBox="0 0 16 22"
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 h-[22px] w-[16px]"
            >
                <line x1="2" y1="20" x2="14" y2="2" stroke="#ff5b5b" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
        ) : null}
    </div>
);

const UserIcon = ({ color }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 10C14.2091 10 16 8.20914 16 6C16 3.79086 14.2091 2 12 2C9.79086 2 8 3.79086 8 6C8 8.20914 9.79086 10 12 10Z" fill={color} />
        <path d="M20 17.5C20 19.985 20 22 12 22C4 22 4 19.985 4 17.5C4 15.015 7.582 13 12 13C16.418 13 20 15.015 20 17.5Z" fill={color} />
    </svg>
);

const navLinkStyles = ({ isActive }) =>
    isActive
        ? "px-1 py-1 text-[12px] md:text-[13px] xl:text-[14px] font-semibold uppercase tracking-[0.12em] md:tracking-[0.16em] xl:tracking-[0.18em] text-[#FD5757] transition-colors"
        : "px-1 py-1 text-[12px] md:text-[13px] xl:text-[14px] font-semibold uppercase tracking-[0.12em] md:tracking-[0.16em] xl:tracking-[0.18em] text-[#BFBFBF] hover:text-white transition-colors";

export default function AppHeader() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [selectedDocking, setSelectedDocking] = useState(null);
    const [lastBatteryTelemetryAt, setLastBatteryTelemetryAt] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

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
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [settingsRef]);

    useEffect(() => {
        let isCancelled = false;

        const fetchDrone = async () => {
            try {
                const [uavData, dockingData] = await Promise.all([
                    uavService.getUav(),
                    dockingService.getDocking(),
                ]);

                if (!isCancelled && uavData?.id) {
                    setSelectedDrone(uavData);
                }

                if (!isCancelled && dockingData?.id) {
                    setSelectedDocking(dockingData);
                }
            } catch (error) {
                console.error('Error fetching header status info:', error);
            }
        };

        fetchDrone();

        return () => {
            isCancelled = true;
        };
    }, []);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const dayStr = days[currentTime.getDay()];
    const dateStr = `${currentTime.getDate()} ${months[currentTime.getMonth()]}`;
    const authRole = (localStorage.getItem('authRole') || '').toLowerCase();
    const isAdmin = authRole === 'admin';
    const isSettingsRoute = location.pathname === '/about' || (isAdmin && location.pathname === '/user-management');
    const isSettingsActive = isSettingsOpen || isSettingsRoute;
    const settingsIconColor = isSettingsActive ? '#FD0202' : '#BFBFBF';
    const uavIds = selectedDrone?.id ? [selectedDrone.id] : [];
    const { telemetry, telemetryStatus } = useTelemetry(uavIds);
    const selectedTelemetry = selectedDrone ? telemetry[selectedDrone.id] : null;
    const selectedTelemetryStatus = selectedDrone ? telemetryStatus[selectedDrone.id] : null;
    const gps = selectedTelemetry?.gps || null;
    const link = selectedTelemetry?.link || null;
    const battery = selectedTelemetry?.battery || null;
    const isGpsFresh = Boolean(selectedTelemetryStatus?.metrics?.gps?.isFresh);
    const isLinkFresh = Boolean(selectedTelemetryStatus?.metrics?.link?.isFresh);
    const isBatteryFresh = Boolean(selectedTelemetryStatus?.metrics?.battery?.isFresh);
    const shouldShowGnss = Boolean(isGpsFresh && gps?.satellites != null);
    const rcSignalLevel = isLinkFresh ? scaleRssiToSignalLevel(link?.rssi) : 0;
    const batteryPercent = battery?.percent ?? null;
    const batteryVoltage = battery?.voltage ?? null;
    const batteryLevel = batteryPercent != null ? Math.max(0, Math.min(100, batteryPercent)) : 0;
    const hasBatteryTelemetry = batteryPercent != null || batteryVoltage != null;
    const isBatteryTelemetryStale = !isBatteryFresh || (
        lastBatteryTelemetryAt != null
        && (currentTime.getTime() - lastBatteryTelemetryAt) >= BATTERY_TELEMETRY_STALE_MS
    );
    const dockingTemperature = selectedDocking?.status?.temperature ?? null;

    useEffect(() => {
        if (battery?.percent != null || battery?.voltage != null) {
            setLastBatteryTelemetryAt(Date.now());
        }
    }, [battery]);

    useEffect(() => {
        setLastBatteryTelemetryAt(null);
    }, [selectedDrone?.id]);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUsername');
        localStorage.removeItem('authUserId');
        localStorage.removeItem('authRole');
        localStorage.removeItem('deviceToken');
        setIsSettingsOpen(false);
        navigate('/login');
    };

    return (
        <header
            className="relative z-[1000] grid h-[104px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center overflow-visible px-3 py-2 shadow-sm select-none md:px-4 xl:px-6"
        >
            <img
                src={headerBackground}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
            />

            {/* Left Section - Branding */}
            <div className="relative z-10 mb-2 flex min-w-0 items-center justify-start md:mx-10 xl:mx-12">
                <div className="flex min-w-0 items-center gap-2 md:gap-3 xl:gap-4">
                    <img src={headerLogo} alt="Logo" className="h-[42px] w-auto shrink-0 object-contain md:h-[48px] xl:h-[56px]" />
                    <div className="flex items-center">
                        <span className="font-orbitron whitespace-nowrap text-[20px] md:text-[26px] xl:text-[34px] font-black leading-none tracking-[0.05em] md:tracking-[0.06em] xl:tracking-[0.08em] text-[#FD5757]">
                            Aero Patrol
                        </span>
                    </div>
                </div>
            </div>

            {/* Center Section - Navigation */}
            <div className="relative z-10 mt-4 flex h-full items-center justify-center gap-4 px-3 md:gap-6 xl:gap-12">
                <NavLink to="/dashboard" className={navLinkStyles}>
                    DASHBOARD
                </NavLink>
                <NavLink to="/missions" className={navLinkStyles}>
                    MISSIONS
                </NavLink>
                <NavLink to="/history" className={navLinkStyles}>
                    HISTORY
                </NavLink>
                <div className="relative" ref={settingsRef}>
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className="ml-1 flex items-center justify-center rounded-sm p-[6px] md:p-[7px]"
                    >
                        <UserIcon color={settingsIconColor} />
                    </button>

                    {isSettingsOpen && (
                        <div className="absolute right-0 top-[calc(100%+8px)] z-[1100] flex w-[200px] flex-col border border-[#A30000] bg-[#220202]/96 py-2 shadow-[0_0_22px_rgba(163,0,0,0.32)] backdrop-blur-md">
                            <NavLink
                                to="/about"
                                onClick={() => setIsSettingsOpen(false)}
                                className={({ isActive }) => `
                                    px-4 py-3 text-[13px] font-semibold tracking-wide transition-colors border-l-2
                                    ${isActive ? 'text-[#FD5757] bg-[#3a0909]/60 border-[#FD5757]' : 'text-[#FFFFFF] hover:bg-[#3a0909]/55 border-transparent hover:text-white'}
                                `}
                            >
                                About
                            </NavLink>
                            {isAdmin ? (
                                <>
                                    <div className="mx-4 my-1 h-[1px] bg-[#A30000]/45"></div>
                                    <NavLink
                                        to="/user-management"
                                        onClick={() => setIsSettingsOpen(false)}
                                        className={({ isActive }) => `
                                            px-4 py-3 text-[13px] font-semibold tracking-wide transition-colors text-left border-l-2
                                            ${isActive ? 'text-[#FD5757] bg-[#3a0909]/60 border-[#FD5757]' : 'text-[#FFFFFF] hover:bg-[#3a0909]/55 border-transparent hover:text-white'}
                                        `}
                                    >
                                        User Management
                                    </NavLink>
                                </>
                            ) : null}
                            <div className="mx-4 my-1 h-[1px] bg-[#A30000]/45"></div>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full border-l-2 border-transparent px-4 py-3 text-left text-[13px] font-semibold tracking-wide text-[#FFFFFF] transition-colors hover:border-[#FD5757] hover:bg-[#3a0909]/55 hover:text-white"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Section - Status, Telemetry and Clock */}
            <div className="relative z-10 mr-10 mt-4 flex h-full items-center justify-end justify-self-end font-tomorrow">
                <div className="flex h-full items-center gap-4 md:gap-6 xl:gap-8">

                    {/* GNSS */}
                    {shouldShowGnss ? (
                        <div className="flex flex-col items-center justify-center">
                            <span className="hidden md:block text-[10px] font-semibold text-gray-100 tracking-wider font-sans">
                                {gps.fix_type_label || 'GNSS'}
                            </span>
                            <div className="flex items-center space-x-1 mt-[1px]">
                                <SatelliteIcon />
                                <span className="text-[13px] font-bold text-white tracking-widest">{gps.satellites}</span>
                            </div>
                        </div>
                    ) : null}

                    {/* Signal */}
                    <div className="flex items-center justify-center">
                        <SignalRender level={rcSignalLevel} label="RC" />
                    </div>

                    {/* Battery */}
                    {hasBatteryTelemetry ? (
                        <div className="flex items-center space-x-2">
                            {!isBatteryTelemetryStale && batteryPercent != null ? (
                                <span className="text-[18px] md:text-[20px] xl:text-[22px] font-semibold tracking-tighter text-white">
                                    {`${batteryPercent}%`}
                                </span>
                            ) : null}
                            <BatteryVertical level={batteryLevel} isStale={isBatteryTelemetryStale} />
                            <div className="ml-1 hidden flex-col space-y-[1px] text-[10px] font-semibold leading-[1.15] text-gray-100 xl:flex">
                                <span>{dockingTemperature != null ? `${Number(dockingTemperature).toFixed(1)}°C` : '--°C'}</span>
                                {!isBatteryTelemetryStale && batteryVoltage != null ? (
                                    <span>{`${batteryVoltage.toFixed(1)}V`}</span>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    {/* Clock */}
                    <div className="ml-1 md:ml-2 flex min-w-[96px] md:min-w-[118px] xl:min-w-[130px] flex-row items-center rounded bg-[#000000] px-2 md:px-3 py-[6px]">
                        <span className="text-[20px] md:text-[23px] xl:text-[26px] font-light text-white tracking-wider leading-none mt-1">
                            {timeStr}
                        </span>
                        <div className="hidden lg:flex flex-col text-[9px] uppercase tracking-wider text-gray-300 leading-[1.2] ml-3 mt-1">
                            <span>{dayStr}</span>
                            <span>{dateStr}</span>
                        </div>
                    </div>
                </div>
            </div>

        </header>
    );
}
