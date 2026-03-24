import {
  createHash,
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { Logger } from '@nestjs/common';
import CryptoJS from 'crypto-js';

const CRYPTO_LOGGER = new Logger('CryptoUtil');
const AES_CRYPTO_KEY_LENGTH = 32;
const AES_CRYPTO_IV_BYTE_LENGTH = 16;
const AES_CRYPTO_IV_HEX_LENGTH = AES_CRYPTO_IV_BYTE_LENGTH * 2;
const LEGACY_FERNET_VERSION = 0x80;
const LEGACY_FERNET_VERSION_LENGTH = 1;
const LEGACY_FERNET_TIMESTAMP_LENGTH = 8;
const LEGACY_FERNET_HMAC_LENGTH = 32;
const LEGACY_FERNET_SIGNING_KEY_LENGTH = 16;
const LEGACY_FERNET_ENCRYPTION_KEY_LENGTH = 16;

interface CecCryptoConfig {
  key: string;
  iv: string;
}

interface LegacyFernetKeys {
  encryptionKey: Buffer;
  signingKey: Buffer;
}

export function normalizeEncryptedPayload(
  payload?: string | Buffer | Uint8Array | null,
) {
  if (!payload) {
    return null;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (Buffer.isBuffer(payload)) {
    return payload.toString('utf8');
  }

  return Buffer.from(payload).toString('utf8');
}

function getLegacySecretKey() {
  const secret = process.env.REDASH_SECRET_KEY;

  if (!secret) {
    throw new Error('REDASH_SECRET_KEY is required.');
  }

  return secret;
}

function getAesCryptoKey() {
  const key = process.env.REDASH_SECRET_KEY;

  if (!key) {
    throw new Error(
      'REDASH_SECRET_KEY is required for AES compatibility reads.',
    );
  }

  if (key.length !== AES_CRYPTO_KEY_LENGTH) {
    throw new Error(
      `REDASH_SECRET_KEY must be exactly ${AES_CRYPTO_KEY_LENGTH} characters.`,
    );
  }

  return key;
}

function getCecCryptoConfig(): CecCryptoConfig | null {
  const rawConfig = process.env.CRYPTO;

  if (!rawConfig) {
    return null;
  }

  try {
    const decoded = rawConfig.trim().startsWith('{')
      ? rawConfig
      : Buffer.from(rawConfig, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<CecCryptoConfig>;

    if (!parsed.key || !parsed.iv) {
      return null;
    }

    return {
      key: parsed.key,
      iv: parsed.iv,
    };
  } catch {
    return null;
  }
}

function deriveLegacyFernetSecret(rawSecret: string) {
  return createHash('sha256').update(rawSecret, 'utf8').digest();
}

function getLegacyFernetKeys(): LegacyFernetKeys {
  const secret = deriveLegacyFernetSecret(getLegacySecretKey());

  return {
    signingKey: secret.subarray(0, LEGACY_FERNET_SIGNING_KEY_LENGTH),
    encryptionKey: secret.subarray(
      LEGACY_FERNET_SIGNING_KEY_LENGTH,
      LEGACY_FERNET_SIGNING_KEY_LENGTH + LEGACY_FERNET_ENCRYPTION_KEY_LENGTH,
    ),
  };
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (normalized.length % 4)) % 4;

  return Buffer.from(`${normalized}${'='.repeat(paddingLength)}`, 'base64');
}

function encodeBase64Url(value: Buffer) {
  return value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildLegacyFernetToken(
  signingKey: Buffer,
  timestamp: Buffer,
  iv: Buffer,
  ciphertext: Buffer,
) {
  const signedPayload = Buffer.concat([
    Buffer.from([LEGACY_FERNET_VERSION]),
    timestamp,
    iv,
    ciphertext,
  ]);
  const hmac = createHmac('sha256', signingKey).update(signedPayload).digest();

  return encodeBase64Url(Buffer.concat([signedPayload, hmac]));
}

function createLegacyTimestamp(now = Date.now()) {
  const timestamp = Buffer.alloc(LEGACY_FERNET_TIMESTAMP_LENGTH);
  timestamp.writeBigUInt64BE(BigInt(Math.floor(now / 1000)));
  return timestamp;
}

function decryptLegacyTextInternal(
  payload?: string | Buffer | Uint8Array | null,
) {
  const normalizedPayload = normalizeEncryptedPayload(payload);

  if (!normalizedPayload) {
    return null;
  }

  const decoded = decodeBase64Url(normalizedPayload);
  const minimumLength =
    LEGACY_FERNET_VERSION_LENGTH +
    LEGACY_FERNET_TIMESTAMP_LENGTH +
    AES_CRYPTO_IV_BYTE_LENGTH +
    LEGACY_FERNET_HMAC_LENGTH;

  if (decoded.length <= minimumLength) {
    throw new Error('Invalid Fernet token length.');
  }

  if (decoded[0] !== LEGACY_FERNET_VERSION) {
    throw new Error('Invalid Fernet token version.');
  }

  const legacyKeys = getLegacyFernetKeys();
  const hmacOffset = decoded.length - LEGACY_FERNET_HMAC_LENGTH;
  const signedPayload = decoded.subarray(0, hmacOffset);
  const receivedHmac = decoded.subarray(hmacOffset);
  const expectedHmac = createHmac('sha256', legacyKeys.signingKey)
    .update(signedPayload)
    .digest();

  if (
    receivedHmac.length !== expectedHmac.length ||
    !timingSafeEqual(receivedHmac, expectedHmac)
  ) {
    throw new Error('Invalid Fernet token signature.');
  }

  const ivOffset =
    LEGACY_FERNET_VERSION_LENGTH + LEGACY_FERNET_TIMESTAMP_LENGTH;
  const cipherOffset = ivOffset + AES_CRYPTO_IV_BYTE_LENGTH;
  const iv = decoded.subarray(ivOffset, cipherOffset);
  const ciphertext = decoded.subarray(cipherOffset, hmacOffset);
  const decipher = createDecipheriv(
    'aes-128-cbc',
    legacyKeys.encryptionKey,
    iv,
  );

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

function encryptLegacyTextInternal(text?: string | null): string | null {
  if (!text) {
    return null;
  }

  const { encryptionKey, signingKey } = getLegacyFernetKeys();
  const iv = randomBytes(AES_CRYPTO_IV_BYTE_LENGTH);
  const cipher = createCipheriv('aes-128-cbc', encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  return buildLegacyFernetToken(
    signingKey,
    createLegacyTimestamp(),
    iv,
    ciphertext,
  );
}

function assertIvHex(ivHex: string) {
  if (ivHex.length !== AES_CRYPTO_IV_HEX_LENGTH) {
    throw new Error(
      `IV hex must be exactly ${AES_CRYPTO_IV_HEX_LENGTH} characters.`,
    );
  }
}

function decryptAesTextInternal(payload?: string | Buffer | Uint8Array | null) {
  const normalizedPayload = normalizeEncryptedPayload(payload);

  if (!normalizedPayload) {
    return null;
  }

  if (normalizedPayload.length <= AES_CRYPTO_IV_HEX_LENGTH) {
    throw new Error('Encrypted payload is too short.');
  }

  const key = Buffer.from(getAesCryptoKey(), 'utf8');
  const ivHex = normalizedPayload.slice(-AES_CRYPTO_IV_HEX_LENGTH);
  const encryptedHex = normalizedPayload.slice(0, -AES_CRYPTO_IV_HEX_LENGTH);

  assertIvHex(ivHex);

  const decipher = createDecipheriv(
    'aes-256-cbc',
    key,
    Buffer.from(ivHex, 'hex'),
  );

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

function decryptCecTextInternal(payload?: string | Buffer | Uint8Array | null) {
  const normalizedPayload = normalizeEncryptedPayload(payload);

  if (!normalizedPayload) {
    return null;
  }

  const config = getCecCryptoConfig();

  if (!config) {
    throw new Error('CRYPTO is required for legacy CEC compatibility reads.');
  }

  const key = CryptoJS.enc.Utf8.parse(config.key);
  const iv = CryptoJS.enc.Utf8.parse(config.iv);
  const encryptedBytes = CryptoJS.enc.Hex.parse(normalizedPayload);
  const encryptedBase64 = CryptoJS.enc.Base64.stringify(encryptedBytes);
  const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

  if (!decryptedText) {
    throw new Error('Failed to decrypt CEC payload.');
  }

  return decryptedText;
}

export function encryptText(text?: string | null): string | null {
  return encryptLegacyTextInternal(text);
}

export function decryptLegacyText(
  payload?: string | Buffer | Uint8Array | null,
): string | null {
  try {
    return decryptLegacyTextInternal(payload);
  } catch {
    return null;
  }
}

export function decryptAesText(
  payload?: string | Buffer | Uint8Array | null,
): string | null {
  try {
    return decryptAesTextInternal(payload);
  } catch {
    return null;
  }
}

export function decryptCecText(
  payload?: string | Buffer | Uint8Array | null,
): string | null {
  try {
    return decryptCecTextInternal(payload);
  } catch {
    return null;
  }
}

export function decryptText(
  payload?: string | Buffer | Uint8Array | null,
): string | null {
  const normalizedPayload = normalizeEncryptedPayload(payload);

  if (!normalizedPayload) {
    return null;
  }

  const legacyDecrypted = decryptLegacyText(normalizedPayload);

  if (legacyDecrypted !== null) {
    return legacyDecrypted;
  }

  const cecDecrypted = decryptCecText(normalizedPayload);

  if (cecDecrypted !== null) {
    return cecDecrypted;
  }

  const aesDecrypted = decryptAesText(normalizedPayload);

  if (aesDecrypted !== null) {
    return aesDecrypted;
  }

  CRYPTO_LOGGER.error(
    'Unable to decrypt payload with legacy Fernet, CEC, or AES.',
  );

  return null;
}

function parseJsonObject<T extends Record<string, unknown>>(payload: string) {
  const parsed = JSON.parse(payload) as unknown;

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as T;
  }

  return null;
}

export function encryptJsonValue(value: Record<string, unknown>) {
  return encryptText(JSON.stringify(value));
}

export function encryptLegacyJsonValue(value: Record<string, unknown>) {
  return encryptLegacyTextInternal(JSON.stringify(value));
}

export function decryptLegacyJsonValue<T extends Record<string, unknown>>(
  payload: string | Buffer | Uint8Array,
): T | null {
  const decrypted = decryptLegacyText(payload);

  if (!decrypted) {
    return null;
  }

  try {
    return parseJsonObject<T>(decrypted);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown JSON parse error';

    CRYPTO_LOGGER.error(message);

    return null;
  }
}

export function decryptAesJsonValue<T extends Record<string, unknown>>(
  payload: string | Buffer | Uint8Array,
): T | null {
  const decrypted = decryptAesText(payload);

  if (!decrypted) {
    return null;
  }

  try {
    return parseJsonObject<T>(decrypted);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown JSON parse error';

    CRYPTO_LOGGER.error(message);

    return null;
  }
}

export function decryptCecJsonValue<T extends Record<string, unknown>>(
  payload: string | Buffer | Uint8Array,
): T | null {
  const decrypted = decryptCecText(payload);

  if (!decrypted) {
    return null;
  }

  try {
    return parseJsonObject<T>(decrypted);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown JSON parse error';

    CRYPTO_LOGGER.error(message);

    return null;
  }
}

export function decryptJsonValue<T extends Record<string, unknown>>(
  payload: string | Buffer | Uint8Array,
): T | null {
  const decrypted = decryptText(payload);

  if (!decrypted) {
    return null;
  }

  try {
    return parseJsonObject<T>(decrypted);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown JSON parse error';

    CRYPTO_LOGGER.error(message);

    return null;
  }
}

export function encryptCurrentAesTextForMigration(text?: string | null) {
  if (!text) {
    return null;
  }

  const key = Buffer.from(getAesCryptoKey(), 'utf8');
  const iv = randomBytes(AES_CRYPTO_IV_BYTE_LENGTH);
  const ivHex = iv.toString('hex');

  assertIvHex(ivHex);

  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encryptedHex = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]).toString('hex');

  return `${encryptedHex}${ivHex}`;
}
