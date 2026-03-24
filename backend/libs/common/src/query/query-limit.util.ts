export const DEFAULT_QUERY_LIMIT = 1000;
export const MAX_QUERY_LIMIT = 10_000;

const TRAILING_LIMIT_PATTERN =
  /(\blimit\s+)(\d+)(\s+offset\s+\d+)?(\s*;?\s*)$/i;

export interface NormalizedQueryLimitResult {
  appliedLimit: number;
  didApplyDefaultLimit: boolean;
  didCapLimit: boolean;
  query: string;
  requestedLimit: number | null;
}

export function normalizeQueryLimit(query: string): NormalizedQueryLimitResult {
  const trimmedQuery = query.trim();
  const trailingLimitMatch = trimmedQuery.match(TRAILING_LIMIT_PATTERN);

  if (!trailingLimitMatch) {
    return {
      appliedLimit: DEFAULT_QUERY_LIMIT,
      didApplyDefaultLimit: true,
      didCapLimit: false,
      query: `${trimmedQuery.replace(/;?\s*$/, '')} LIMIT ${DEFAULT_QUERY_LIMIT}`,
      requestedLimit: null,
    };
  }

  const requestedLimit = Number(trailingLimitMatch[2] ?? DEFAULT_QUERY_LIMIT);

  if (!Number.isFinite(requestedLimit) || requestedLimit <= MAX_QUERY_LIMIT) {
    return {
      appliedLimit: requestedLimit,
      didApplyDefaultLimit: false,
      didCapLimit: false,
      query: trimmedQuery,
      requestedLimit,
    };
  }

  const [, limitPrefix = 'LIMIT ', , offsetClause = '', suffix = ''] =
    trailingLimitMatch;

  return {
    appliedLimit: MAX_QUERY_LIMIT,
    didApplyDefaultLimit: false,
    didCapLimit: true,
    query: trimmedQuery.replace(
      TRAILING_LIMIT_PATTERN,
      `${limitPrefix}${MAX_QUERY_LIMIT}${offsetClause}${suffix}`,
    ),
    requestedLimit,
  };
}

export function applyDefaultQueryLimit(query: string) {
  return normalizeQueryLimit(query).query;
}
