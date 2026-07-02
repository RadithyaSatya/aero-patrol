import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../../shared/i18n/I18nProvider';

const modalStroke = '#FD575780';
const actionStroke = '#FB55557A';
const modalBackground = '#222222';
const dividerGradient = 'linear-gradient(90deg, rgba(253,87,87,0.05) 0%, rgba(253,87,87,0.5) 50%, rgba(253,87,87,0.05) 100%)';

const formatDateTime = (value, timeZone = 'Asia/Jakarta') => {
    if (!value) return '-';

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
    }).format(parsedDate);
};

const buildExistingSelectionValue = (occurrence) => `existing:${occurrence.mission_id}:${occurrence.run_at}`;

const getDefaultSelection = (conflict) => {
    if (conflict.recommended_winner_source === 'candidate') {
        return 'candidate';
    }

    if (conflict.recommended_winner_source === 'existing') {
        const recommendedMissionId = conflict.recommended_winner?.mission_id;
        const recommendedRunAt = conflict.recommended_winner?.run_at;

        if (recommendedMissionId != null && recommendedRunAt) {
            return buildExistingSelectionValue({
                mission_id: recommendedMissionId,
                run_at: recommendedRunAt,
            });
        }

        if ((conflict.conflicting_occurrences || []).length === 1) {
            return buildExistingSelectionValue(conflict.conflicting_occurrences[0]);
        }
    }

    return '';
};

const parseSelectionToResolution = (candidateRunAt, selection) => {
    if (!selection) {
        return null;
    }

    if (selection === 'candidate') {
        return {
            candidate_run_at: candidateRunAt,
            winner: {
                source: 'candidate',
            },
        };
    }

    if (!selection.startsWith('existing:')) {
        return null;
    }

    const [, missionId, ...runAtParts] = selection.split(':');
    const runAt = runAtParts.join(':');

    if (!missionId || !runAt) {
        return null;
    }

    return {
        candidate_run_at: candidateRunAt,
        winner: {
            source: 'existing',
            mission_id: Number(missionId),
            run_at: runAt,
        },
    };
};

export default function MissionScheduleConflictModal({
    isOpen,
    conflictData,
    isSubmitting = false,
    onClose,
    onConfirm,
}) {
    const { t } = useI18n();
    const conflicts = useMemo(
        () => (Array.isArray(conflictData?.conflicts) ? conflictData.conflicts : []),
        [conflictData]
    );
    const [selections, setSelections] = useState({});

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !isSubmitting) {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setSelections(
            conflicts.reduce((accumulator, conflict) => {
                accumulator[conflict.candidate_run_at] = getDefaultSelection(conflict);
                return accumulator;
            }, {})
        );
    }, [conflicts, isOpen]);

    if (!isOpen || !conflictData) return null;

    const resolutions = conflicts
        .map((conflict) => parseSelectionToResolution(conflict.candidate_run_at, selections[conflict.candidate_run_at]))
        .filter(Boolean);
    const hasUnresolvedConflict = resolutions.length !== conflicts.length;

    return (
        <div
            className="font-tomorrow fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[2px]"
            onClick={() => {
                if (!isSubmitting) {
                    onClose?.();
                }
            }}
        >
            <div
                className="relative flex w-full max-w-[860px] flex-col overflow-hidden border shadow-[0_28px_70px_rgba(0,0,0,0.58)]"
                style={{ borderColor: modalStroke, backgroundColor: modalBackground }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="pointer-events-none absolute left-0 top-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full" style={{ backgroundImage: dividerGradient }} />

                <div className="px-6 py-6 sm:px-7 sm:py-7">
                    <h2 className="text-[20px] font-medium uppercase tracking-[0.18em] text-white">{t('conflict.scheduleConflict')}</h2>

                    <p className="mt-4 text-[13px] leading-6 text-[#F2D6D6]">
                        {conflictData.error || t('conflict.missionScheduleConflict')}
                    </p>

                    <div
                        className="mt-5 border px-4 py-3 text-[12px] leading-6 text-[#FFD0D0]"
                        style={{ borderColor: actionStroke, backgroundColor: 'rgba(87, 20, 20, 0.28)' }}
                    >
                        {t('conflict.minimumGap')}: {conflictData.minimum_gap_minutes ?? '-'} minutes
                        <br />
                        {t('conflict.window')}: {conflictData.window_days ?? '-'} days
                        <br />
                        {t('conflict.resolutionRequired')}: {conflictData.resolution_required ? t('common.yes') : t('common.no')}
                    </div>

                    <div className="mt-5 max-h-[420px] space-y-4 overflow-y-auto pr-1">
                        {conflicts.map((item, index) => {
                            const selectedValue = selections[item.candidate_run_at] || '';
                            const recommendedSource = item.recommended_winner_source || 'manual';

                            return (
                                <div key={`${item.candidate_run_at}-${index}`} className="border border-[#4A2323] bg-[#271919] px-4 py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-[11px] uppercase tracking-[0.18em] text-[#F4B2B2]">{t('conflict.candidateRun')}</div>
                                            <div className="mt-2 text-[13px] text-white">
                                                {formatDateTime(item.candidate_run_at, item.schedule_timezone)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] uppercase tracking-[0.16em] text-[#F4B2B2]">{t('conflict.recommendation')}</div>
                                            <div className="mt-2 text-[12px] text-white">
                                                {recommendedSource === 'candidate'
                                                    ? t('conflict.useCandidateMission')
                                                    : recommendedSource === 'existing'
                                                        ? t('conflict.useExistingMission')
                                                        : t('conflict.manualSelectionRequired')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelections((current) => ({
                                                    ...current,
                                                    [item.candidate_run_at]: 'candidate',
                                                }));
                                            }}
                                            className={`border px-4 py-3 text-left transition-colors ${
                                                selectedValue === 'candidate'
                                                    ? 'border-[#F97316] bg-[#3A2216]'
                                                    : 'border-[#3A2C2C] bg-[#201616] hover:bg-[#281A1A]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input type="radio" readOnly checked={selectedValue === 'candidate'} className="h-4 w-4 accent-[#F97316]" />
                                                <div>
                                                    <div className="text-[12px] font-medium text-white">{t('conflict.winnerCandidateMission')}</div>
                                                    <div className="mt-1 text-[11px] text-[#F7E7E7]">
                                                        {t('conflict.keepNewMissionActive')}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>

                                        {(item.conflicting_occurrences || []).map((occurrence) => {
                                            const optionValue = buildExistingSelectionValue(occurrence);

                                            return (
                                                <button
                                                    key={`${occurrence.mission_id}-${occurrence.run_at}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelections((current) => ({
                                                            ...current,
                                                            [item.candidate_run_at]: optionValue,
                                                        }));
                                                    }}
                                                    className={`border px-4 py-3 text-left transition-colors ${
                                                        selectedValue === optionValue
                                                            ? 'border-[#F97316] bg-[#3A2216]'
                                                            : 'border-[#3A2C2C] bg-[#201616] hover:bg-[#281A1A]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input type="radio" readOnly checked={selectedValue === optionValue} className="h-4 w-4 accent-[#F97316]" />
                                                        <div>
                                                            <div className="text-[12px] font-medium text-white">{occurrence.mission_name}</div>
                                                            <div className="mt-1 text-[11px] text-[#F7E7E7]">
                                                                {t('conflict.runAt')}: {formatDateTime(occurrence.run_at, item.schedule_timezone)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {hasUnresolvedConflict ? (
                        <div className="mt-5 border border-[#6B2F2F] bg-[#301919] px-4 py-3 text-[12px] text-[#FFD0D0]">
                            {t('conflict.selectWinnerEachConflict')}
                        </div>
                    ) : null}

                    <div className="mt-7 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => onClose?.()}
                            disabled={isSubmitting}
                            className="h-[46px] min-w-[160px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ borderColor: actionStroke, background: 'linear-gradient(135deg, #242424 0%, #343434 100%)' }}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={() => onConfirm?.(resolutions)}
                            disabled={isSubmitting || hasUnresolvedConflict}
                            className="h-[46px] min-w-[210px] border px-6 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ borderColor: actionStroke, background: 'linear-gradient(135deg, #7A1E1E 0%, #A73030 100%)' }}
                        >
                            {isSubmitting ? t('common.submit') : t('common.continue')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
