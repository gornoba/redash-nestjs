export function parseBooleanConfig(
  value: string | undefined,
  fallback = false,
) {
  if (value === undefined) {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}
