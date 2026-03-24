function formatRelative(unit: Intl.RelativeTimeFormatUnit, value: number) {
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    value,
    unit,
  );
}

export function formatTimeAgo(value: string | null) {
  if (!value) {
    return '';
  }

  const target = new Date(value);

  if (Number.isNaN(target.getTime())) {
    return value;
  }

  const diffInSeconds = Math.round((target.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffInSeconds);

  if (absSeconds < 60) {
    return formatRelative('second', diffInSeconds);
  }

  const diffInMinutes = Math.round(diffInSeconds / 60);

  if (Math.abs(diffInMinutes) < 60) {
    return formatRelative('minute', diffInMinutes);
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (Math.abs(diffInHours) < 24) {
    return formatRelative('hour', diffInHours);
  }

  const diffInDays = Math.round(diffInHours / 24);

  if (Math.abs(diffInDays) < 30) {
    return formatRelative('day', diffInDays);
  }

  const diffInMonths = Math.round(diffInDays / 30);

  if (Math.abs(diffInMonths) < 12) {
    return formatRelative('month', diffInMonths);
  }

  return formatRelative('year', Math.round(diffInMonths / 12));
}
