import React, { useState } from 'react';

const panelStroke = '#D53535';
const dividerStroke = 'linear-gradient(90deg, rgba(163,88,88,0.12) 0%, #A35858 50%, rgba(163,88,88,0.12) 100%)';
const fieldBorder = '#333333';
const fieldBg = '#1C1C1C';
const inputShellClass = 'border px-4 flex items-center transition-colors focus-within:border-[#7F3434]';
const inputShellTallClass = `${inputShellClass} h-[40px]`;
const inputShellClassSmall = `${inputShellClass} h-[38px] px-3`;

// Icons
const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);

const ChevronDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
);

export default function MissionDetailPanel({ waypointsCount = 0, onClearWaypoints }) {
    const [timeMode, setTimeMode] = useState('Recurrent'); // default to Recurrent for testing
    const [recurrentType, setRecurrentType] = useState('Monthly'); // 'Monthly', 'Weekly', 'Daily'
    const [selectedMonths, setSelectedMonths] = useState([0, 1, 2]); // default Jan, Feb, Mar
    const [selectedWeeks, setSelectedWeeks] = useState([]);
    const [selectedDays, setSelectedDays] = useState([]);
    const [isIntervalEnabled, setIsIntervalEnabled] = useState(true);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const toggleSelection = (setter, itemIndex) => {
        setter(prev => prev.includes(itemIndex) ? prev.filter(i => i !== itemIndex) : [...prev, itemIndex]);
    };

    return (
        <div className="font-tomorrow relative flex h-full w-full flex-col overflow-hidden border bg-[#222222] p-5 shadow-lg select-none" style={{ borderColor: panelStroke }}>
            {/* Header */}
            <div className="mb-4 flex shrink-0 items-start justify-between">
                <div>
                    <h2 className="text-white text-[24px] font-medium tracking-wide">Create Mission</h2>
                    <p className="text-gray-400 text-[13px] mt-[2px]">{waypointsCount} Pinpoint - 150 meter</p>
                </div>
                <button
                    onClick={onClearWaypoints}
                    className="border bg-[#7F3434] hover:bg-[#914040] transition-colors px-[18px] py-[10px] text-white text-[13px] font-bold flex items-center shadow-md active:scale-[0.98]"
                    style={{ borderColor: panelStroke }}
                >
                    <CloseIcon />
                    Clear Mission
                </button>
            </div>

            <div className="mb-6 h-px w-full shrink-0 bg-no-repeat" style={{ background: dividerStroke }} />

            {/* Form Fields */}
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-5 no-scrollbar">

                {/* Mission Name */}
                <div className="flex flex-col">
                    <label className="text-gray-400 text-[11px] mb-2 pl-1 shadow-black drop-shadow-sm font-medium">Mission Name</label>
                    <div className={inputShellTallClass} style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}>
                        <input
                            type="text"
                            className="bg-transparent text-gray-100 text-[13px] outline-none w-full"
                            defaultValue="Mission1"
                        />
                    </div>
                </div>

                {/* Time Mode */}
                <div className="flex flex-col">
                    <label className="text-gray-400 text-[11px] mb-2 pl-1 shadow-black drop-shadow-sm font-medium">Time Mode</label>
                    <div className={`${inputShellTallClass} relative`} style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}>
                        <select
                            value={timeMode}
                            onChange={(e) => setTimeMode(e.target.value)}
                            className="bg-transparent text-gray-100 text-[13px] outline-none w-full appearance-none cursor-pointer"
                        >
                            <option value="Now" className="bg-[#1C1C1C]">Now</option>
                            <option value="Later" className="bg-[#1C1C1C]">Later</option>
                            <option value="Recurrent" className="bg-[#1C1C1C]">Recurrent</option>
                        </select>
                        <div className="pointer-events-none absolute right-4 text-gray-400">
                            <ChevronDownIcon />
                        </div>
                    </div>
                </div>

                {timeMode === 'Now' && (
                    <div className="flex items-center mt-2 group cursor-pointer w-fit pl-1">
                        <div className="w-4 h-4 border border-gray-400 group-hover:border-gray-300 mr-2 flex items-center justify-center transition-colors">
                        </div>
                        <span className="text-gray-300 text-[13px] font-medium group-hover:text-white transition-colors">Interval</span>
                    </div>
                )}

                {/* Later Mode Fields */}
                {timeMode === 'Later' && (
                    <>
                        <div className="grid grid-cols-2 gap-8">
                            {/* Date Field Container */}
                            <div className="flex flex-col relative w-full">
                                <label className="text-gray-400 text-[11px] mb-2 pl-1 shadow-black drop-shadow-sm font-medium">Date</label>
                                <div className={`${inputShellClassSmall} w-full`} style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}>
                                    <input
                                        type="date"
                                        className="bg-transparent text-gray-100 text-[12px] outline-none w-full"
                                        style={{ colorScheme: 'dark' }} // Attempt to theme native picker icon
                                    />
                                </div>
                            </div>

                            {/* Start Time Field Container */}
                            <div className="flex flex-col relative w-full">
                                <label className="text-gray-400 text-[11px] mb-2 pl-1 shadow-black drop-shadow-sm font-medium">Start Time</label>
                                <div className={`${inputShellClassSmall} w-full`} style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}>
                                    <input
                                        type="time"
                                        className="bg-transparent text-gray-100 text-[12px] outline-none w-full"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Recurrent Mode Fields */}
                {timeMode === 'Recurrent' && (
                    <div className="bg-[#222222] flex flex-col gap-4 w-full">
                        {/* Type Row */}
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-[11px] pl-1 font-medium">Type</span>
                            <div className="h-[28px] border flex items-center px-3 relative w-[100px] cursor-pointer transition-colors hover:border-[#7F3434]" style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}>
                                <select
                                    value={recurrentType}
                                    onChange={(e) => setRecurrentType(e.target.value)}
                                    className="bg-transparent text-gray-400 text-[11px] outline-none w-full appearance-none cursor-pointer"
                                >
                                    <option value="Monthly" className="bg-[#1C1C1C]">Monthly</option>
                                    <option value="Weekly" className="bg-[#1C1C1C]">Weekly</option>
                                    <option value="Daily" className="bg-[#1C1C1C]">Daily</option>
                                </select>
                                <div className="pointer-events-none absolute right-2 text-gray-400">
                                    <ChevronDownIcon />
                                </div>
                            </div>
                        </div>

                        {/* Selection Grid */}
                        {recurrentType === 'Monthly' && (
                            <div className="grid grid-cols-12 overflow-hidden border" style={{ borderColor: fieldBorder }}>
                                {months.map((month, idx) => (
                                    <button
                                        key={month}
                                        onClick={() => toggleSelection(setSelectedMonths, idx)}
                                        className={`py-[6px] text-[9.5px] font-bold tracking-wide transition-colors ${selectedMonths.includes(idx)
                                            ? 'bg-[#7F3434] text-white'
                                            : 'bg-[#1C1C1C] text-gray-400 hover:bg-[#2b2b2b] hover:text-gray-200'
                                            } ${idx !== 11 ? 'border-r border-[#333333]' : ''}`}
                                    >
                                        {month}
                                    </button>
                                ))}
                            </div>
                        )}
                        {recurrentType === 'Weekly' && (
                            <div className="grid grid-cols-5 overflow-hidden border" style={{ borderColor: fieldBorder }}>
                                {weeks.map((week, idx) => (
                                    <button
                                        key={week}
                                        onClick={() => toggleSelection(setSelectedWeeks, idx)}
                                        className={`py-[6px] text-[11px] font-bold tracking-wide transition-colors ${selectedWeeks.includes(idx)
                                            ? 'bg-[#7F3434] text-white'
                                            : 'bg-[#1C1C1C] text-gray-400 hover:bg-[#2b2b2b] hover:text-gray-200'
                                            } ${idx !== 4 ? 'border-r border-[#333333]' : ''}`}
                                    >
                                        {week}
                                    </button>
                                ))}
                            </div>
                        )}
                        {recurrentType === 'Daily' && (
                            <div className="grid grid-cols-7 overflow-hidden border" style={{ borderColor: fieldBorder }}>
                                {days.map((day, idx) => (
                                    <button
                                        key={day}
                                        onClick={() => toggleSelection(setSelectedDays, idx)}
                                        className={`py-[6px] text-[11px] font-bold tracking-wide transition-colors ${selectedDays.includes(idx)
                                            ? 'bg-[#7F3434] text-white'
                                            : 'bg-[#1C1C1C] text-gray-400 hover:bg-[#2b2b2b] hover:text-gray-200'
                                            } ${idx !== 6 ? 'border-r border-[#333333]' : ''}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Date/Time Inputs Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className={`${inputShellClassSmall} w-full relative`} style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none " stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mr-2 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                <input
                                    type="date"
                                    className="bg-transparent text-gray-400 text-[12px] outline-none w-full flex-1"
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                            <div className={`${inputShellClassSmall} w-full relative`} style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mr-2 shrink-0"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                <input
                                    type="time"
                                    className="bg-transparent text-gray-400 text-[12px] outline-none w-full flex-1"
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                        </div>

                        {/* Interval Section */}
                        <div className="mt-2 text-gray-200">
                            <label className="flex items-center cursor-pointer group w-fit mb-4" onClick={() => setIsIntervalEnabled(!isIntervalEnabled)}>
                                <div className={`w-3.5 h-3.5 border flex items-center justify-center mr-2 transition-colors ${isIntervalEnabled ? 'border-gray-400' : 'border-gray-500'}`}>
                                    {isIntervalEnabled && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                </div>
                                <span className={`text-[12px] font-medium transition-colors ${isIntervalEnabled ? 'text-gray-300' : 'text-gray-500 group-hover:text-gray-400'}`}>Interval</span>
                            </label>

                            {isIntervalEnabled && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <label className="text-gray-500 text-[11px] mb-2 pl-1 font-medium">Interval</label>
                                        <div className={`${inputShellClassSmall} w-full`} style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mr-2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                                            <input
                                                type="text"
                                                defaultValue="2 Hours"
                                                className="bg-transparent text-gray-300 text-[12px] outline-none w-full"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-gray-500 text-[11px] mb-2 pl-1 font-medium">End Time</label>
                                        <div className={`${inputShellClassSmall} w-full relative`} style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mr-2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                            <input
                                                type="time"
                                                defaultValue="14:00"
                                                className="bg-transparent text-gray-300 text-[12px] outline-none w-full"
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
