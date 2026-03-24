import { randomBytes } from 'node:crypto';

import { compare, hash } from 'bcryptjs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sha512crypt } = require('sha512crypt-node') as {
  sha512crypt: (password: string, salt: string) => string;
};

const LEGACY_SHA512_ROUNDS = 656000;
const LEGACY_SALT_LENGTH = 16;
const LEGACY_SALT_CHARSET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./';

function generateLegacySalt(length = LEGACY_SALT_LENGTH) {
  const bytes = randomBytes(length);

  return Array.from(
    bytes,
    (byte) => LEGACY_SALT_CHARSET[byte % LEGACY_SALT_CHARSET.length],
  ).join('');
}

function buildLegacySaltPrefix() {
  return `$6$rounds=${LEGACY_SHA512_ROUNDS}$${generateLegacySalt()}`;
}

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export function hashLegacyPassword(password: string) {
  return sha512crypt(password, buildLegacySaltPrefix());
}

export function isLegacyPasswordHash(passwordHash: string | null | undefined) {
  return typeof passwordHash === 'string' && passwordHash.startsWith('$6$');
}

export async function verifyPasswordHash(
  password: string,
  passwordHash: string | null | undefined,
) {
  if (!passwordHash) {
    return false;
  }

  if (isLegacyPasswordHash(passwordHash)) {
    return sha512crypt(password, passwordHash) === passwordHash;
  }

  if (passwordHash.startsWith('$2')) {
    return compare(password, passwordHash);
  }

  return false;
}
