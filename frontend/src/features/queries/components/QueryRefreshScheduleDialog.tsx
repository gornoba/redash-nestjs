'use client';

import { CalendarOutlined, DownOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useRef, useState } from 'react';

import { OverlayDialog } from './QuerySourceEditorCommon';
import {
  buildRefreshIntervalGroups,
  buildRefreshScheduleDraft,
  buildRefreshScheduleFromDraft,
  formatRefreshScheduleSummary,
  getUtcReferenceLabel,
  getWeekdayOptions,
  humanizeRefreshInterval,
  normalizeRefreshSchedule,
  secondsToRefreshInterval,
  type RefreshIntervalGroup,
  type RefreshSchedule,
  type RefreshScheduleDraft,
} from '../utils/querySchedule';

interface QueryRefreshScheduleDialogProps {
  initialSchedule: Record<string, unknown> | null;
  refreshIntervals: number[];
  timezone: string;
  onClose: () => void;
  onSave: (schedule: RefreshSchedule | null) => void;
}

export default function QueryRefreshScheduleDialog({
  initialSchedule,
  refreshIntervals,
  timezone,
  onClose,
  onSave,
}: QueryRefreshScheduleDialogProps) {
  const intervalGroups = useMemo(
    () => buildRefreshIntervalGroups(refreshIntervals),
    [refreshIntervals],
  );
  const normalizedSchedule = useMemo(
    () => normalizeRefreshSchedule(initialSchedule),
    [initialSchedule],
  );
  const [draft, setDraft] = useState<RefreshScheduleDraft>(() =>
    buildRefreshScheduleDraft(normalizedSchedule, timezone),
  );
  const [isIntervalMenuOpen, setIsIntervalMenuOpen] = useState(false);
  const intervalMenuRef = useRef<HTMLDivElement | null>(null);
  const intervalLabel = humanizeRefreshInterval(draft.intervalSeconds);
  const scheduleUnit = secondsToRefreshInterval(draft.intervalSeconds).unit;
  const utcReferenceLabel = getUtcReferenceLabel(draft.localTime, timezone);
  const schedulePreview = formatRefreshScheduleSummary(
    buildRefreshScheduleFromDraft(draft, timezone),
    timezone,
  );

  useEffect(() => {
    setDraft(buildRefreshScheduleDraft(normalizedSchedule, timezone));
  }, [normalizedSchedule, timezone]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        intervalMenuRef.current &&
        !intervalMenuRef.current.contains(event.target as Node)
      ) {
        setIsIntervalMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleIntervalSelect(seconds: number | null) {
    const nextUnit = secondsToRefreshInterval(seconds).unit;

    setDraft((currentDraft) => ({
      ...currentDraft,
      dayOfWeek:
        nextUnit === 'week'
          ? currentDraft.dayOfWeek ?? getWeekdayOptions()[0].full
          : null,
      ends: seconds ? currentDraft.ends : 'never',
      intervalSeconds: seconds,
      localTime:
        nextUnit === 'day' || nextUnit === 'week'
          ? currentDraft.localTime || '00:15'
          : currentDraft.localTime,
      until: seconds ? currentDraft.until : null,
    }));
    setIsIntervalMenuOpen(false);
  }

  function handleSave() {
    onSave(buildRefreshScheduleFromDraft(draft, timezone));
  }

  return (
    <OverlayDialog
      bodyClassName="overflow-visible px-0 py-0"
      dialogClassName="overflow-visible"
      dialogStyle={{ maxWidth: 'calc(100vw - 32px)', width: '620px' }}
      footer={
        <>
          <button
            className="inline-flex h-[34px] items-center rounded-[2px] border border-[#d9d9d9] bg-white px-5 text-[14px] text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-[34px] items-center rounded-[2px] border border-[#1890ff] bg-[#1890ff] px-5 text-[14px] text-white transition hover:bg-[#40a9ff]"
            onClick={handleSave}
            type="button"
          >
            OK
          </button>
        </>
      }
      onClose={onClose}
      title="Refresh Schedule"
    >
      <div className="border-b border-[#e8e8e8] px-8 py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="w-[92px] shrink-0 text-[14px] text-[#323232]">
            Refresh every
          </div>
          <div className="relative flex-1" ref={intervalMenuRef}>
            <button
              className={`inline-flex h-[38px] min-w-[160px] items-center justify-between rounded-[2px] border bg-white px-4 text-[14px] transition ${
                isIntervalMenuOpen
                  ? 'border-[#40a9ff] shadow-[0_0_0_2px_rgba(24,144,255,0.12)]'
                  : 'border-[#d9d9d9] hover:border-[#40a9ff]'
              }`}
              onClick={() =>
                setIsIntervalMenuOpen((currentValue) => !currentValue)
              }
              type="button"
            >
              <span className="text-[#595959]">{intervalLabel}</span>
              <DownOutlined className="text-[11px] text-[#bfbfbf]" />
            </button>

            {isIntervalMenuOpen ? (
              <div className="absolute left-0 top-[calc(100%+8px)] z-30 max-h-[320px] min-w-[220px] overflow-y-auto rounded-[2px] border border-[#d9d9d9] bg-white py-1 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                {intervalGroups.map((group) => (
                  <RefreshIntervalGroupList
                    activeSeconds={draft.intervalSeconds}
                    group={group}
                    key={group.label ?? 'never'}
                    onSelect={handleIntervalSelect}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {(scheduleUnit === 'day' || scheduleUnit === 'week') && draft.intervalSeconds ? (
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-[92px] shrink-0 text-[14px] text-[#323232]">
              On time
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  className="h-[38px] rounded-[2px] border border-[#d9d9d9] bg-white pr-10 pl-4 text-[14px] text-[#595959] outline-none transition focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.12)]"
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      localTime: event.target.value,
                    }))
                  }
                  step={300}
                  type="time"
                  value={draft.localTime}
                />
                <CalendarOutlined className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#bfbfbf]" />
              </div>
              {utcReferenceLabel ? (
                <span className="text-[14px] text-[#b0b0b0]">
                  {utcReferenceLabel}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {scheduleUnit === 'week' && draft.intervalSeconds ? (
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-[92px] shrink-0 text-[14px] text-[#323232]">
              On day
            </div>
            <div className="flex flex-wrap gap-0 rounded-[2px] border border-[#d9d9d9] bg-white">
              {getWeekdayOptions().map((day) => {
                const isActive = draft.dayOfWeek === day.full;

                return (
                  <button
                    className={`inline-flex h-[38px] w-[42px] items-center justify-center border-r border-[#d9d9d9] text-[14px] transition last:border-r-0 ${
                      isActive
                        ? 'bg-[#e6f7ff] text-[#1890ff]'
                        : 'text-[#595959] hover:bg-[#f5f7f9]'
                    }`}
                    key={day.full}
                    onClick={() =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        dayOfWeek: day.full,
                      }))
                    }
                    type="button"
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {draft.intervalSeconds ? (
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-[92px] shrink-0 text-[14px] text-[#323232]">
              Ends
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-[14px] text-[#595959]">
                <input
                  checked={draft.ends === 'never'}
                  className="h-4 w-4 border-slate-300 text-[#1890ff] focus:ring-sky-200"
                  onChange={() =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      ends: 'never',
                      until: null,
                    }))
                  }
                  type="radio"
                />
                Never
              </label>
              <label className="inline-flex items-center gap-2 text-[14px] text-[#595959]">
                <input
                  checked={draft.ends === 'on'}
                  className="h-4 w-4 border-slate-300 text-[#1890ff] focus:ring-sky-200"
                  onChange={() =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      ends: 'on',
                      until:
                        currentDraft.until ??
                        new Date().toISOString().slice(0, 10),
                    }))
                  }
                  type="radio"
                />
                On
              </label>
              {draft.ends === 'on' ? (
                <input
                  className="h-[38px] rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[14px] text-[#595959] outline-none transition focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.12)]"
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      until: event.target.value,
                    }))
                  }
                  type="date"
                  value={draft.until ?? ''}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="px-8 py-5">
        <div className="text-[12px] uppercase tracking-[0.08em] text-[#b0b0b0]">
          Preview
        </div>
        <div className="mt-2 text-[14px] text-[#595959]">{schedulePreview}</div>
        <div className="mt-1 text-[12px] text-[#b0b0b0]">
          Time zone: {timezone}
        </div>
      </div>
    </OverlayDialog>
  );
}

function RefreshIntervalGroupList({
  activeSeconds,
  group,
  onSelect,
}: {
  activeSeconds: number | null;
  group: RefreshIntervalGroup;
  onSelect: (seconds: number | null) => void;
}) {
  return (
    <div className="py-1">
      {group.label ? (
        <div className="px-4 py-2 text-[12px] uppercase tracking-[0.06em] text-[#b0b0b0]">
          {group.label}
        </div>
      ) : null}
      {group.options.map((option) => {
        const isActive = option.seconds === activeSeconds;

        return (
          <button
            className={`flex w-full items-center px-4 py-2 text-left text-[14px] transition ${
              isActive
                ? 'bg-[#e6f7ff] text-[#1890ff]'
                : 'text-[#595959] hover:bg-[#f5f7f9]'
            }`}
            key={`${group.label ?? 'never'}-${option.label}`}
            onClick={() => onSelect(option.seconds)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
