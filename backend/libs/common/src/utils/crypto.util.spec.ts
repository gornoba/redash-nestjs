import {
  decryptJsonValue,
  decryptLegacyText,
  encryptJsonValue,
  normalizeEncryptedPayload,
} from './crypto.util';

describe('crypto.util', () => {
  const originalSecret = process.env.REDASH_SECRET_KEY;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.REDASH_SECRET_KEY;
      return;
    }

    process.env.REDASH_SECRET_KEY = originalSecret;
  });

  it('legacy Python cryptography Fernet 토큰을 복호화해야 한다', () => {
    process.env.REDASH_SECRET_KEY = 'legacy-secret-key';

    expect(
      decryptLegacyText(
        'gAAAAABpwInpaMqNnXiZfy5VbEaD7qObtrDb0y6ySZlD7cg51967-8cYinVXh136ilG5j5y_ewuEvD4gmFoJIrDlMNf0lQXmHS9hKJzqk1tui81wEsvHgNEns3wranonT2egE3XHTyS1',
      ),
    ).toBe('{"host":"localhost","password":"secret"}');
  });

  it('신규에서 암호화한 payload는 다시 복호화할 수 있어야 한다', () => {
    process.env.REDASH_SECRET_KEY = 'legacy-secret-key';

    const encrypted = encryptJsonValue({
      host: 'localhost',
      password: 'secret',
    });

    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe('{"host":"localhost","password":"secret"}');
    expect(decryptJsonValue<Record<string, unknown>>(encrypted!)).toEqual({
      host: 'localhost',
      password: 'secret',
    });
  });

  it('bytea 로 읽힌 payload도 문자열로 정규화해야 한다', () => {
    const payloadBuffer = Buffer.from(
      'gAAAAABmp1J4LzFFuwZG2gysol_qMDwSvG85iaaLToEOCepZIbZ7PoPxxxQQ4ggt6dRtgj5VqGzwUZZUSQYNjwjBISJGGtEfGGv01VP2X72yBqQALTvCIOSncxC_6KxYNEWx9_ftbNdIsdgw0nyaWJciLPf6Fj0tfRbLG0RKyx0dzFA21aBostRi7JMhdEk_1XJYiGx_bmPnn5EzzbckB7chDyv4UWmAGRBeoZjWEjVzWq_88A_OP3zxCSJhNEG1JYZfusad6BVQ',
      'utf8',
    );

    expect(normalizeEncryptedPayload(payloadBuffer)).toBe(
      'gAAAAABmp1J4LzFFuwZG2gysol_qMDwSvG85iaaLToEOCepZIbZ7PoPxxxQQ4ggt6dRtgj5VqGzwUZZUSQYNjwjBISJGGtEfGGv01VP2X72yBqQALTvCIOSncxC_6KxYNEWx9_ftbNdIsdgw0nyaWJciLPf6Fj0tfRbLG0RKyx0dzFA21aBostRi7JMhdEk_1XJYiGx_bmPnn5EzzbckB7chDyv4UWmAGRBeoZjWEjVzWq_88A_OP3zxCSJhNEG1JYZfusad6BVQ',
    );
  });
});
