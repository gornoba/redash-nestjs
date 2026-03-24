import { Job } from 'bullmq';

type UnknownRecord = Record<string, unknown>;

const QUERY_PREVIEW_MAX_LENGTH = 160;

export function buildWorkerJobLogContext<T = unknown>(
  queueName: string,
  job: Job<T> | undefined,
) {
  if (!job) {
    return {
      queueName,
    };
  }

  return {
    attemptsMade: job.attemptsMade,
    data: summarizeJobData(job.data),
    id: String(job.id ?? ''),
    name: job.name,
    queueName,
  };
}

function summarizeJobData(data: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  const record = data as UnknownRecord;
  const summarized: UnknownRecord = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === 'queryText' && typeof value === 'string') {
      summarized[key] = summarizeQueryText(value);
      continue;
    }

    summarized[key] = value;
  }

  return summarized;
}

function summarizeQueryText(queryText: string) {
  const compactText = queryText.replace(/\s+/g, ' ').trim();

  if (compactText.length <= QUERY_PREVIEW_MAX_LENGTH) {
    return compactText;
  }

  return `${compactText.slice(0, QUERY_PREVIEW_MAX_LENGTH)}...`;
}
