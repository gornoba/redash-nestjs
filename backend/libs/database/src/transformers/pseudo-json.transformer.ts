import type { ValueTransformer } from 'typeorm';

function parseJson(value: string | null): unknown {
  if (value === null) {
    return null;
  }

  if (value === '') {
    return '';
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const pseudoJsonTransformer: ValueTransformer = {
  to(value: unknown): string | null {
    if (value === undefined) {
      return null;
    }

    if (value === null) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  },
  from(value: string | null): unknown {
    return parseJson(value);
  },
};
