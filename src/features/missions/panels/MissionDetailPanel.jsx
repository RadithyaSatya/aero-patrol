import React, { useEffect, useRef, useState } from 'react';

const panelStroke = '#FF383C';
const dividerStroke = 'linear-gradient(90deg, rgba(163,88,88,0.12) 0%, #A35858 50%, rgba(163,88,88,0.12) 100%)';
const panelBackground = 'linear-gradient(to bottom, #F5F5F5 0%, #EDEDED 100%)';
const fieldBorder = '#9F9F9F';
const fieldBg = '#D2D2D2';
const fieldOuterBorder = '#7F3434';
const dropdownBg = '#B6B6B6';
const recurrentPanelBg = 'rgba(197, 197, 197, 0.5)';
const recurrentPanelBorder = '#7F3434';
const inputShellClass = 'border px-4 flex items-center transition-colors focus-within:border-[#7F3434]';
const inputShellTallClass = `${inputShellClass} h-[40px]`;
const inputShellSmallClass = `${inputShellClass} h-[38px] px-3`;

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthDates = Array.from({ length: 31 }, (_, index) => index + 1);

const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
    </svg>
);

const PlusIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
    </svg>
);

const TrashIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
    </svg>
);

const ClockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
    </svg>
);

const CalendarIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
    </svg>
);

function FieldLabel({ children, className = '' }) {
    return (
        <label className={`pl-1 text-[11px] font-medium text-[#000000] ${className}`}>
            {children}
        </label>
    );
}

function TextField({ label, type = 'text', value, onChange, placeholder, className = '' }) {
    return (
        <div className={`flex flex-col ${className}`}>
            <FieldLabel>{label}</FieldLabel>
            <div className={inputShellTallClass} style={{ backgroundColor: fieldBg, borderColor: fieldOuterBorder }}>
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full bg-transparent text-[13px] text-[#000000] outline-none"
                    style={type === 'date' || type === 'time' ? { colorScheme: 'light' } : undefined}
                />
            </div>
        </div>
    );
}

function SelectField({ label, value, onChange, options, className = '' }) {
    return (
        <div className={`flex flex-col ${className}`}>
            <FieldLabel>{label}</FieldLabel>
            <div className={`${inputShellTallClass} relative`} style={{ backgroundColor: dropdownBg, borderColor: fieldOuterBorder }}>
                <select
                    value={value}
                    onChange={onChange}
                    className="w-full appearance-none cursor-pointer bg-transparent text-[13px] text-[#000000] outline-none"
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value} className="bg-[#B6B6B6] text-[#000000]">
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute right-4 text-[#565656]">
                    <ChevronDownIcon />
                </div>
            </div>
        </div>
    );
}

function InlineDurationField({ value, onChange, suffix, placeholder }) {
    const handleChange = (event) => {
        onChange({
            ...event,
            target: {
                ...event.target,
                value: event.target.value === '' ? '0' : event.target.value,
            },
        });
    };

    return (
        <div className="flex h-[40px] min-w-0 items-center gap-2 text-[11px] text-[#565656]">
            <span className="shrink whitespace-nowrap">Ends After</span>
            <input
                type="number"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className="h-[28px] w-[56px] shrink-0 border px-2 text-center text-[12px] text-[#000000] outline-none"
                style={{ borderColor: fieldBorder, backgroundColor: fieldBg }}
            />
            <span className="shrink whitespace-nowrap">{suffix}</span>
        </div>
    );
}

function TimeInputField({ value, onChange, placeholder = 'Start Time' }) {
    const inputRef = useRef(null);

    const handleOpenPicker = () => {
        const inputElement = inputRef.current;
        if (!inputElement) return;

        if (typeof inputElement.showPicker === 'function') {
            inputElement.showPicker();
            return;
        }

        inputElement.focus();
    };

    return (
        <div
            className={`${inputShellTallClass} gap-2 pr-3 cursor-pointer`}
            style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}
            onClick={handleOpenPicker}
        >
            <span className="shrink-0 text-[#565656]">
                <ClockIcon />
            </span>
            <input
                ref={inputRef}
                type="time"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="mission-time-input w-full min-w-0 bg-transparent text-[13px] text-[#000000] outline-none"
                style={{ colorScheme: 'light' }}
                onClick={(event) => {
                    event.stopPropagation();
                    handleOpenPicker();
                }}
            />
        </div>
    );
}

function DateInputField({ value, onChange, placeholder = 'Select Date' }) {
    const inputRef = useRef(null);

    const handleOpenPicker = () => {
        const inputElement = inputRef.current;
        if (!inputElement) return;

        if (typeof inputElement.showPicker === 'function') {
            inputElement.showPicker();
            return;
        }

        inputElement.focus();
    };

    return (
        <div
            className={`${inputShellTallClass} gap-2 pr-3 cursor-pointer`}
            style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}
            onClick={handleOpenPicker}
        >
            <span className="shrink-0 text-[#565656]">
                <CalendarIcon />
            </span>
            <input
                ref={inputRef}
                type="date"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full min-w-0 bg-transparent text-[13px] text-[#000000] outline-none"
                style={{ colorScheme: 'light' }}
                onClick={(event) => {
                    event.stopPropagation();
                    handleOpenPicker();
                }}
            />
        </div>
    );
}

function AddTimeButton({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex h-[38px] w-fit items-center gap-2 border px-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#000000] transition-colors hover:bg-[#A8A8A8]"
            style={{ borderColor: fieldBorder, backgroundColor: dropdownBg }}
        >
            <PlusIcon />
            Add Time
        </button>
    );
}

function TimeListEditor({ times, onChange, label = 'Times' }) {
    if (times.length === 0) {
        return null;
    }

    const updateTime = (index, nextValue) => {
        onChange(times.map((time, currentIndex) => (currentIndex === index ? nextValue : time)));
    };

    const removeTime = (index) => {
        onChange(times.filter((_, currentIndex) => currentIndex !== index));
    };

    return (
        <div className="flex flex-col gap-3">
            <FieldLabel>{label}</FieldLabel>
            <div className="flex flex-col gap-2">
                {times.map((time, index) => (
                    <div key={`${label}-${index}`} className="flex items-center gap-2">
                        <div className={`${inputShellSmallClass} flex-1`} style={{ backgroundColor: fieldBg, borderColor: fieldBorder }}>
                            <input
                                type="time"
                                value={time}
                                onChange={(event) => updateTime(index, event.target.value)}
                                className="w-full bg-transparent text-[12px] text-[#000000] outline-none"
                                style={{ colorScheme: 'light' }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => removeTime(index)}
                            className="flex h-[38px] w-[38px] items-center justify-center border text-[#565656] transition-colors hover:bg-[#D7B1B1] hover:text-[#000000]"
                            style={{ borderColor: fieldBorder, backgroundColor: fieldBg }}
                        >
                            <TrashIcon />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RecurrentPanel({ children, recurrentType, onTypeChange }) {
    return (
        <div
            className="rounded border p-4"
            style={{ backgroundColor: recurrentPanelBg, borderColor: recurrentPanelBorder }}
        >
            <div className="mb-4 grid grid-cols-[1fr_148px] items-center gap-4">
                <span className="pl-1 text-[11px] font-medium text-[#000000]">Type</span>
                <div className="relative">
                    <div className="relative flex h-[36px] items-center border px-4" style={{ backgroundColor: dropdownBg, borderColor: fieldBorder }}>
                        <select
                            value={recurrentType}
                            onChange={onTypeChange}
                            className="w-full appearance-none cursor-pointer bg-transparent text-[13px] text-[#000000] outline-none"
                        >
                            <option value="daily" className="bg-[#B6B6B6] text-[#000000]">Daily</option>
                            <option value="weekly" className="bg-[#B6B6B6] text-[#000000]">Weekly</option>
                            <option value="monthly" className="bg-[#B6B6B6] text-[#000000]">Monthly</option>
                        </select>
                        <div className="pointer-events-none absolute right-4 text-[#565656]">
                            <ChevronDownIcon />
                        </div>
                    </div>
                </div>
            </div>
            {children}
        </div>
    );
}

export default function MissionDetailPanel({
    waypointsCount = 0,
    onClearWaypoints,
    onFormChange,
    submitError = '',
}) {
    const [missionName, setMissionName] = useState('Mission1');
    const [timeMode, setTimeMode] = useState('recurrent');
    const [oneTimeDate, setOneTimeDate] = useState('');
    const [oneTimeStartTime, setOneTimeStartTime] = useState('');
    const [recurrentType, setRecurrentType] = useState('monthly');
    const [dailyStartTime, setDailyStartTime] = useState('');
    const [dailyEndDate, setDailyEndDate] = useState('');
    const [dailyTimes, setDailyTimes] = useState([]);
    const [selectedWeekDays, setSelectedWeekDays] = useState([0]);
    const [weeklyStartTime, setWeeklyStartTime] = useState('');
    const [weeklyEndAfterWeeks, setWeeklyEndAfterWeeks] = useState('8');
    const [weeklyTimes, setWeeklyTimes] = useState([]);
    const [selectedMonthDates, setSelectedMonthDates] = useState([]);
    const [monthlyEndAfterMonths, setMonthlyEndAfterMonths] = useState('3');
    const [monthlyStartTime, setMonthlyStartTime] = useState('');
    const [monthlyTimes, setMonthlyTimes] = useState([]);

    const toggleWeekDay = (index) => {
        setSelectedWeekDays((current) => (
            current.includes(index)
                ? current.filter((dayIndex) => dayIndex !== index)
                : [...current, index]
        ));
    };

    const toggleMonthDate = (date) => {
        setSelectedMonthDates((current) => (
            current.includes(date)
                ? current.filter((currentDate) => currentDate !== date)
                : [...current, date].sort((left, right) => left - right)
        ));
    };

    const appendTimeEntry = (draftValue, setDraftValue, setTimes) => {
        const normalizedValue = draftValue.trim();

        if (!normalizedValue) {
            return;
        }

        setTimes((current) => (
            current.includes(normalizedValue)
                ? current
                : [...current, normalizedValue]
        ));
        setDraftValue('');
    };

    useEffect(() => {
        onFormChange?.({
            missionName,
            timeMode,
            oneTimeDate,
            oneTimeStartTime,
            recurrentType,
            dailyStartTime,
            dailyEndDate,
            dailyTimes,
            selectedWeekDays,
            weeklyStartTime,
            weeklyEndAfterWeeks,
            weeklyTimes,
            selectedMonthDates,
            monthlyEndAfterMonths,
            monthlyStartTime,
            monthlyTimes,
        });
    }, [
        missionName,
        timeMode,
        oneTimeDate,
        oneTimeStartTime,
        recurrentType,
        dailyStartTime,
        dailyEndDate,
        dailyTimes,
        selectedWeekDays,
        weeklyStartTime,
        weeklyEndAfterWeeks,
        weeklyTimes,
        selectedMonthDates,
        monthlyEndAfterMonths,
        monthlyStartTime,
        monthlyTimes,
        onFormChange,
    ]);

    return (
        <div
            className="font-tomorrow relative flex h-full w-full flex-col overflow-hidden border p-5 shadow-lg select-none"
            style={{ borderColor: panelStroke, background: panelBackground }}
        >
            <div className="mb-4 flex shrink-0 items-start justify-between">
                <div>
                    <h2 className="text-[24px] font-medium tracking-wide text-[#000000]">Create Mission</h2>
                    <p className="mt-[2px] text-[13px] text-[#565656]">{waypointsCount} Pinpoint</p>
                </div>
            </div>

            <div className="mb-6 h-px w-full shrink-0 bg-no-repeat" style={{ background: dividerStroke }} />

            <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-5">
                <div className="grid grid-cols-2 gap-4">
                    <TextField
                        label="Mission Name"
                        value={missionName}
                        onChange={(event) => setMissionName(event.target.value)}
                        placeholder="Input mission name"
                    />
                    <SelectField
                        label="Time Mode"
                        value={timeMode}
                        onChange={(event) => setTimeMode(event.target.value)}
                        options={[
                            { value: 'now', label: 'Now' },
                            { value: 'one_time', label: 'One Time' },
                            { value: 'recurrent', label: 'Recurrent' },
                        ]}
                    />
                </div>

                {timeMode === 'one_time' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            label="Date"
                            type="date"
                            value={oneTimeDate}
                            onChange={(event) => setOneTimeDate(event.target.value)}
                        />
                        <TextField
                            label="Start Time"
                            type="time"
                            value={oneTimeStartTime}
                            onChange={(event) => setOneTimeStartTime(event.target.value)}
                        />
                    </div>
                ) : null}

                {timeMode === 'recurrent' ? (
                    <RecurrentPanel
                        recurrentType={recurrentType}
                        onTypeChange={(event) => setRecurrentType(event.target.value)}
                    >
                        {recurrentType === 'daily' ? (
                            <div className="flex flex-col gap-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <FieldLabel className="mb-1">Start Time</FieldLabel>
                                        <TimeInputField
                                            value={dailyStartTime}
                                            onChange={(event) => setDailyStartTime(event.target.value)}
                                        />
                                        <AddTimeButton
                                            onClick={() => appendTimeEntry(dailyStartTime, setDailyStartTime, setDailyTimes)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <FieldLabel className="mb-1">End Date</FieldLabel>
                                        <DateInputField
                                            value={dailyEndDate}
                                            onChange={(event) => setDailyEndDate(event.target.value)}
                                            placeholder="End Date"
                                        />
                                    </div>
                                </div>
                                <TimeListEditor
                                    label="Time"
                                    times={dailyTimes}
                                    onChange={setDailyTimes}
                                />
                            </div>
                        ) : null}

                        {recurrentType === 'weekly' ? (
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <div className="grid grid-cols-7 overflow-hidden border-[1.5px]" style={{ borderColor: fieldBorder }}>
                                        {weekDays.map((day, index) => {
                                            const isSelected = selectedWeekDays.includes(index);

                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => toggleWeekDay(index)}
                                                    className={`h-[30px] border-r-[1.5px] px-1 text-[10px] font-medium tracking-[0.12em] transition-colors ${
                                                        isSelected
                                                            ? 'border-[#9F9F9F] bg-[#7F3434] text-white'
                                                            : 'text-[#000000] hover:bg-[#C8C8C8]'
                                                    }`}
                                                    style={{
                                                        borderColor: index === weekDays.length - 1 ? 'transparent' : fieldBorder,
                                                        backgroundColor: isSelected ? '#7F3434' : fieldBg
                                                    }}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <TimeInputField
                                            value={weeklyStartTime}
                                            onChange={(event) => setWeeklyStartTime(event.target.value)}
                                        />
                                        <AddTimeButton
                                            onClick={() => appendTimeEntry(weeklyStartTime, setWeeklyStartTime, setWeeklyTimes)}
                                        />
                                    </div>
                                    <InlineDurationField
                                        value={weeklyEndAfterWeeks}
                                        onChange={(event) => setWeeklyEndAfterWeeks(event.target.value)}
                                        suffix="Weeks"
                                        placeholder="8"
                                    />
                                </div>

                                <TimeListEditor
                                    label="Time"
                                    times={weeklyTimes}
                                    onChange={setWeeklyTimes}
                                />
                            </div>
                        ) : null}

                        {recurrentType === 'monthly' ? (
                            <div className="flex flex-col gap-5">
                                <div
                                    className="flex flex-col border p-3"
                                    style={{ backgroundColor: recurrentPanelBg, borderColor: fieldBorder }}
                                >
                                    <span className="mb-4 mt-2 text-center text-[13px] font-medium uppercase tracking-[0.16em] text-[#000000]">Select Date</span>
                                    <div className="grid grid-cols-7 gap-2">
                                        {monthDates.map((date) => {
                                            const isSelected = selectedMonthDates.includes(date);

                                            return (
                                                <button
                                                    key={date}
                                                    type="button"
                                                    onClick={() => toggleMonthDate(date)}
                                                    className={`aspect-square w-full text-[11px] font-medium transition-colors ${
                                                        isSelected
                                                            ? 'rounded bg-[#ED2F2F] text-white'
                                                            : 'text-[#000000] hover:bg-[#D2D2D2]'
                                                    }`}
                                                >
                                                    {date}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMonthDates([])}
                                        className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-[#7F3434] transition-opacity hover:opacity-80"
                                    >
                                        Clear
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <TimeInputField
                                            value={monthlyStartTime}
                                            onChange={(event) => setMonthlyStartTime(event.target.value)}
                                        />
                                        <AddTimeButton
                                            onClick={() => appendTimeEntry(monthlyStartTime, setMonthlyStartTime, setMonthlyTimes)}
                                        />
                                    </div>
                                    <InlineDurationField
                                        value={monthlyEndAfterMonths}
                                        onChange={(event) => setMonthlyEndAfterMonths(event.target.value)}
                                        suffix="Month"
                                        placeholder="3"
                                    />
                                </div>

                                <TimeListEditor
                                    label="Time"
                                    times={monthlyTimes}
                                    onChange={setMonthlyTimes}
                                />
                            </div>
                        ) : null}
                    </RecurrentPanel>
                ) : null}
            </div>

            <div className="mt-6 h-px w-full shrink-0 bg-no-repeat" style={{ background: dividerStroke }} />

            <div className="mt-5 shrink-0">
                {submitError ? (
                    <div
                        className="mb-4 border px-4 py-3 text-[12px] text-[#FFD0D0]"
                        style={{ borderColor: '#FB55557A', backgroundColor: 'rgba(87, 20, 20, 0.28)' }}
                    >
                        {submitError}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
