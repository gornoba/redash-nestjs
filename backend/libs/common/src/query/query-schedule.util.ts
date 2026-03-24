export const QUERY_SCHEDULE_LAST_EXECUTE_KEY = 'last_execute';

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export interface StoredQuerySchedule {
  day_of_week?: string | null;
  disabled?: boolean;
  interval: number | null;
  last_execute?: string | null;
  time?: string | null;
  until?: string | null;
}

export function normalizeQuerySchedule(
  schedule: Record<string, unknown> | null | undefined,
): StoredQuerySchedule | null {
  if (!schedule || typeof schedule !== 'object') {
    return null;
  }

  const interval =
    typeof schedule.interval === 'number'
      ? schedule.interval
      : typeof schedule.interval === 'string'
        ? Number(schedule.interval)
        : null;

  if (interval === null || Number.isNaN(interval) || interval <= 0) {
    return null;
  }

  return {
    day_of_week:
      typeof schedule.day_of_week === 'string' ? schedule.day_of_week : null,
    disabled: Boolean(schedule.disabled),
    interval,
    last_execute:
      typeof schedule.last_execute === 'string' ? schedule.last_execute : null,
    time: typeof schedule.time === 'string' ? schedule.time : null,
    until: typeof schedule.until === 'string' ? schedule.until : null,
  };
}

export function resetQueryScheduleLastExecute(
  schedule: Record<string, unknown> | null,
) {
  const normalizedSchedule = normalizeQuerySchedule(schedule);

  if (!normalizedSchedule) {
    return null;
  }

  return {
    ...schedule,
    [QUERY_SCHEDULE_LAST_EXECUTE_KEY]: null,
  };
}

export function setQueryScheduleLastExecute(
  schedule: Record<string, unknown> | null,
  executedAt: Date | string,
) {
  const normalizedSchedule = normalizeQuerySchedule(schedule);

  if (!normalizedSchedule) {
    return null;
  }

  return {
    ...schedule,
    [QUERY_SCHEDULE_LAST_EXECUTE_KEY]:
      executedAt instanceof Date ? executedAt.toISOString() : executedAt,
  };
}

export function getQueryScheduleLastExecuteAt(
  schedule: Record<string, unknown> | null | undefined,
) {
  const normalizedSchedule = normalizeQuerySchedule(schedule);

  if (!normalizedSchedule?.last_execute) {
    return null;
  }

  const lastExecuteAt = new Date(normalizedSchedule.last_execute);

  if (Number.isNaN(lastExecuteAt.getTime())) {
    return null;
  }

  return lastExecuteAt;
}

export function isQueryScheduleExpired(
  schedule: Record<string, unknown> | null | undefined,
  now: Date,
) {
  const normalizedSchedule = normalizeQuerySchedule(schedule);

  if (!normalizedSchedule?.until) {
    return false;
  }

  const untilDate = new Date(`${normalizedSchedule.until}T00:00:00.000Z`);

  if (Number.isNaN(untilDate.getTime())) {
    return false;
  }

  return untilDate <= now;
}

export function shouldScheduleNext(
  previousIteration: Date,
  now: Date,
  interval: number,
  time: string | null | undefined = null,
  dayOfWeek: string | null | undefined = null,
  failures = 0,
) {
  if (Number.isNaN(previousIteration.getTime()) || interval <= 0) {
    return false;
  }

  let nextIteration: Date;

  if (!time) {
    nextIteration = new Date(previousIteration.getTime() + interval * 1000);
  } else {
    const [hourText, minuteText] = time.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
      return false;
    }

    const normalizedPreviousIteration = new Date(previousIteration);
    normalizedPreviousIteration.setUTCHours(hour, minute, 0, 0);

    let referenceIteration = previousIteration;
    if (normalizedPreviousIteration.getTime() > previousIteration.getTime()) {
      referenceIteration = new Date(
        normalizedPreviousIteration.getTime() - 24 * 60 * 60 * 1000,
      );
    }

    const daysDelay = interval / 60 / 60 / 24;
    let daysToAdd = 0;

    if (dayOfWeek) {
      const targetWeekdayIndex = WEEKDAY_NAMES.indexOf(
        dayOfWeek as (typeof WEEKDAY_NAMES)[number],
      );

      if (targetWeekdayIndex === -1) {
        return false;
      }

      daysToAdd =
        targetWeekdayIndex - getPythonWeekday(normalizedPreviousIteration);
    }

    nextIteration = new Date(
      referenceIteration.getTime() +
        (daysDelay + daysToAdd) * 24 * 60 * 60 * 1000,
    );
    nextIteration.setUTCHours(hour, minute, 0, 0);
  }

  if (failures > 0) {
    nextIteration = new Date(
      nextIteration.getTime() + 2 ** failures * 60 * 1000,
    );
  }

  return now.getTime() > nextIteration.getTime();
}

export function isScheduledQueryDue(
  params: {
    schedule: Record<string, unknown> | null | undefined;
    scheduleFailures: number;
    updatedAt: Date;
  },
  now: Date,
) {
  const normalizedSchedule = normalizeQuerySchedule(params.schedule);

  if (!normalizedSchedule || normalizedSchedule.disabled) {
    return false;
  }

  if (isQueryScheduleExpired(params.schedule, now)) {
    return false;
  }

  const previousIteration =
    getQueryScheduleLastExecuteAt(params.schedule) ?? params.updatedAt ?? now;
  const interval = normalizedSchedule.interval;

  if (interval === null) {
    return false;
  }

  return shouldScheduleNext(
    previousIteration,
    now,
    interval,
    normalizedSchedule.time,
    normalizedSchedule.day_of_week,
    params.scheduleFailures,
  );
}

function getPythonWeekday(date: Date) {
  return (date.getUTCDay() + 6) % 7;
}
