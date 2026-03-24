'use client';

export interface RefreshSchedule {
  day_of_week?: string | null;
  disabled?: boolean;
  interval: number | null;
  last_execute?: string | null;
  time?: string | null;
  until?: string | null;
}

export interface RefreshScheduleDraft {
  dayOfWeek: string | null;
  ends: 'never' | 'on';
  intervalSeconds: number | null;
  localTime: string;
  until: string | null;
}

export interface RefreshIntervalOption {
  label: string;
  seconds: number | null;
}

export interface RefreshIntervalGroup {
  label: string | null;
  options: RefreshIntervalOption[];
}

const DEFAULT_LOCAL_TIME = '00:15';
const MINUTES_IN_DAY = 24 * 60;
const WEEKDAY_LABELS = [
  { full: 'Sunday', short: 'S' },
  { full: 'Monday', short: 'M' },
  { full: 'Tuesday', short: 'T' },
  { full: 'Wednesday', short: 'W' },
  { full: 'Thursday', short: 'T' },
  { full: 'Friday', short: 'F' },
  { full: 'Saturday', short: 'S' },
] as const;
const FALLBACK_TIMEZONES = [
  'UTC',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Singapore',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
] as const;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatTimeInZone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: timezone,
  }).format(date);
}

function getReferenceUtcDate() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0),
  );
}

export function normalizeRefreshSchedule(
  value: RefreshSchedule | Record<string, unknown> | null | undefined,
): RefreshSchedule | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const interval =
    typeof value.interval === 'number'
      ? value.interval
      : typeof value.interval === 'string'
        ? Number(value.interval)
        : null;

  if (interval === null || Number.isNaN(interval)) {
    return null;
  }

  return {
    day_of_week:
      typeof value.day_of_week === 'string' ? value.day_of_week : null,
    disabled: Boolean(value.disabled),
    interval,
    last_execute:
      typeof value.last_execute === 'string' ? value.last_execute : null,
    time: typeof value.time === 'string' ? value.time : null,
    until: typeof value.until === 'string' ? value.until : null,
  };
}

export function secondsToRefreshInterval(seconds: number | null) {
  if (!seconds) {
    return { count: 0, unit: 'never' as const };
  }

  if (seconds % 604800 === 0) {
    return { count: seconds / 604800, unit: 'week' as const };
  }

  if (seconds % 86400 === 0) {
    return { count: seconds / 86400, unit: 'day' as const };
  }

  if (seconds % 3600 === 0) {
    return { count: seconds / 3600, unit: 'hour' as const };
  }

  if (seconds % 60 === 0) {
    return { count: seconds / 60, unit: 'minute' as const };
  }

  return { count: seconds, unit: 'second' as const };
}

export function humanizeRefreshInterval(seconds: number | null) {
  if (!seconds) {
    return 'Never';
  }

  const { count, unit } = secondsToRefreshInterval(seconds);
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

export function buildRefreshIntervalGroups(intervals: number[]) {
  const groups = new Map<string, RefreshIntervalOption[]>();

  intervals.forEach((seconds) => {
    const { unit } = secondsToRefreshInterval(seconds);
    const label =
      unit === 'minute'
        ? 'Minutes'
        : unit === 'hour'
          ? 'Hours'
          : unit === 'day'
            ? 'Days'
            : unit === 'week'
              ? 'Weeks'
              : 'Other';
    const currentOptions = groups.get(label) ?? [];
    currentOptions.push({
      label: humanizeRefreshInterval(seconds),
      seconds,
    });
    groups.set(label, currentOptions);
  });

  return [
    {
      label: null,
      options: [{ label: 'Never', seconds: null }],
    },
    ...Array.from(groups.entries()).map(([label, options]) => ({
      label,
      options,
    })),
  ] satisfies RefreshIntervalGroup[];
}

export function getTimeZoneOptions(currentTimezone: string) {
  const supportedTimeZones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : [];

  return Array.from(
    new Set([
      currentTimezone,
      ...FALLBACK_TIMEZONES,
      ...supportedTimeZones,
    ]),
  ).sort((left, right) => left.localeCompare(right));
}

export function convertUtcTimeToTimezone(
  utcTime: string | null | undefined,
  timezone: string,
) {
  if (!utcTime) {
    return DEFAULT_LOCAL_TIME;
  }

  const [hours, minutes] = utcTime.split(':').map((value) => Number(value));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return DEFAULT_LOCAL_TIME;
  }

  const referenceDate = getReferenceUtcDate();
  referenceDate.setUTCHours(hours, minutes, 0, 0);

  return formatTimeInZone(referenceDate, timezone);
}

export function convertTimezoneTimeToUtc(
  localTime: string,
  timezone: string,
) {
  if (!localTime) {
    return null;
  }

  const referenceDate = getReferenceUtcDate();

  for (let minute = 0; minute < MINUTES_IN_DAY; minute += 1) {
    const candidate = new Date(referenceDate.getTime() + minute * 60_000);

    if (formatTimeInZone(candidate, timezone) === localTime) {
      return `${pad(candidate.getUTCHours())}:${pad(candidate.getUTCMinutes())}`;
    }
  }

  return localTime;
}

export function buildRefreshScheduleDraft(
  schedule: RefreshSchedule | null,
  timezone: string,
): RefreshScheduleDraft {
  return {
    dayOfWeek: schedule?.day_of_week ?? null,
    ends: schedule?.until ? 'on' : 'never',
    intervalSeconds: schedule?.interval ?? null,
    localTime: convertUtcTimeToTimezone(schedule?.time, timezone),
    until: schedule?.until ?? null,
  };
}

export function buildRefreshScheduleFromDraft(
  draft: RefreshScheduleDraft,
  timezone: string,
): RefreshSchedule | null {
  if (!draft.intervalSeconds) {
    return null;
  }

  const { unit } = secondsToRefreshInterval(draft.intervalSeconds);
  const schedule: RefreshSchedule = {
    day_of_week: null,
    interval: draft.intervalSeconds,
    last_execute: null,
    time: null,
    until: draft.ends === 'on' ? draft.until : null,
  };

  if (unit === 'day' || unit === 'week') {
    schedule.time = convertTimezoneTimeToUtc(draft.localTime, timezone);
  }

  if (unit === 'week') {
    schedule.day_of_week = draft.dayOfWeek ?? WEEKDAY_LABELS[0].full;
  }

  return schedule;
}

export function getUtcReferenceLabel(localTime: string, timezone: string) {
  const utcTime = convertTimezoneTimeToUtc(localTime, timezone);

  if (!utcTime) {
    return null;
  }

  return `(${utcTime} UTC)`;
}

export function formatRefreshScheduleSummary(
  schedule: RefreshSchedule | Record<string, unknown> | null | undefined,
  timezone: string,
) {
  const normalizedSchedule = normalizeRefreshSchedule(schedule);

  if (!normalizedSchedule?.interval) {
    return 'Never';
  }

  const { count, unit } = secondsToRefreshInterval(normalizedSchedule.interval);
  const intervalLabel =
    count === 1 ? unit : humanizeRefreshInterval(normalizedSchedule.interval);
  let summary = `Every ${intervalLabel}`;

  if (normalizedSchedule.time) {
    summary += ` at ${convertUtcTimeToTimezone(normalizedSchedule.time, timezone)}`;
  }

  if (normalizedSchedule.day_of_week) {
    summary += ` on ${normalizedSchedule.day_of_week}`;
  }

  return summary;
}

export function getWeekdayOptions() {
  return WEEKDAY_LABELS;
}

export function shouldShowScheduledExecutionLabel(
  schedule: RefreshSchedule | Record<string, unknown> | null | undefined,
) {
  const normalizedSchedule = normalizeRefreshSchedule(schedule);

  if (!normalizedSchedule?.last_execute) {
    return false;
  }

  const lastExecuteTimestamp = Date.parse(normalizedSchedule.last_execute);

  return !Number.isNaN(lastExecuteTimestamp);
}

export function getScheduledExecutionTime(
  schedule: RefreshSchedule | Record<string, unknown> | null | undefined,
) {
  const normalizedSchedule = normalizeRefreshSchedule(schedule);

  if (!normalizedSchedule?.last_execute) {
    return null;
  }

  const lastExecuteTimestamp = Date.parse(normalizedSchedule.last_execute);

  if (Number.isNaN(lastExecuteTimestamp)) {
    return null;
  }

  return normalizedSchedule.last_execute;
}
