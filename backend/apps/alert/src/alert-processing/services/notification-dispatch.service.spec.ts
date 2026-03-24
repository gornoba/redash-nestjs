import { ConfigService } from '@nestjs/config';

import { MailService } from '@app/common/mail/services/mail.service';
import { AlertProcessingRepository } from '../repositories/alert-processing.repository';
import { NotificationDispatchService } from './notification-dispatch.service';

describe('NotificationDispatchService', () => {
  let service: NotificationDispatchService;
  let configService: jest.Mocked<ConfigService>;
  let mailService: jest.Mocked<MailService>;
  let alertProcessingRepository: jest.Mocked<AlertProcessingRepository>;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'REDASH_BASE_URL') {
          return 'http://localhost:3000';
        }

        return undefined;
      }),
    } as never;
    mailService = {
      sendMail: jest.fn(),
    } as never;
    alertProcessingRepository = {
      getAlertsForQuery: jest.fn(),
      getSubscriptionForDispatch: jest.fn(),
      getSubscriptionsForAlert: jest.fn(),
      saveAlert: jest.fn(),
    } as never;
    fetchMock = jest.fn((url: string, init?: RequestInit) => {
      if (url === 'https://example.com/avatar.png' && !init?.method) {
        return {
          arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
          headers: {
            get: jest.fn(() => 'image/png'),
          },
          ok: true,
          status: 200,
        };
      }

      if (url === 'https://slack.com/api/chat.postMessage') {
        return {
          headers: {
            get: jest.fn(() => 'application/json'),
          },
          json: jest.fn().mockResolvedValue({ ok: true }),
          ok: true,
          status: 200,
        };
      }

      return {
        headers: {
          get: jest.fn(() => 'application/json'),
        },
        ok: true,
        status: 200,
      };
    });
    global.fetch = fetchMock as never;

    service = new NotificationDispatchService(
      configService,
      mailService,
      alertProcessingRepository,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('destination이 없으면 구독 사용자에게 직접 메일을 보내야 한다', async () => {
    alertProcessingRepository.getSubscriptionForDispatch.mockResolvedValue(
      buildSubscription({
        destination: null,
        options: {
          column: 'count',
          custom_subject: 'Count {{QUERY_RESULT_VALUE}}',
          op: '>',
          value: '1',
        },
      }) as never,
    );

    await service.dispatch({
      alertId: 1,
      state: 'triggered',
      subscriptionId: 2,
    });

    expect(mailService.sendMail.mock.calls).toEqual([
      [
        expect.objectContaining({
          subject: 'Count 5',
          to: ['alert@example.com'],
        }),
      ],
    ]);
  });

  it('email destination은 설정된 주소 목록으로 메일을 보내야 한다', async () => {
    alertProcessingRepository.getSubscriptionForDispatch.mockResolvedValue(
      buildSubscription({
        destination: {
          encryptedOptions: JSON.stringify({
            addresses: 'a@example.com, b@example.com',
            subject_template: '({state}) {alert_name}',
          }),
          id: 10,
          type: 'email',
        },
        options: {
          column: 'count',
          op: '>',
          value: '3',
        },
      }) as never,
    );

    await service.dispatch({
      alertId: 1,
      state: 'ok',
      subscriptionId: 2,
    });

    expect(mailService.sendMail.mock.calls).toEqual([
      [
        expect.objectContaining({
          subject: '(OK) Count Alert',
          to: ['a@example.com', 'b@example.com'],
        }),
      ],
    ]);
  });

  it.each([
    [
      'slack',
      {
        url: 'https://hooks.slack.com/services/test',
      },
      'https://hooks.slack.com/services/test',
    ],
    [
      'discord',
      {
        avatar_url: 'https://example.com/avatar.png',
        url: 'https://discord.com/api/webhooks/test',
        username: 'bot',
      },
      'https://discord.com/api/webhooks/test',
    ],
    [
      'slack_bot',
      {
        bot_token: 'xoxb-test-token',
        channel: 'C1234567890',
        icon_emoji: ':alert:',
        icon_url: 'https://example.com/icon.png',
        username: 'slack-bot',
      },
      'https://slack.com/api/chat.postMessage',
    ],
    [
      'telegram',
      {
        bot_token: '123:abc',
        chat_id: '999',
        parse_mode: 'HTML',
      },
      'https://api.telegram.org/bot123:abc/sendMessage',
    ],
  ])(
    '%s destination은 webhook 요청을 보내야 한다',
    async (type, options, expectedUrl) => {
      alertProcessingRepository.getSubscriptionForDispatch.mockResolvedValue(
        buildSubscription({
          destination: {
            encryptedOptions: JSON.stringify(options),
            id: 10,
            type,
          },
          options: {
            column: 'count',
            op: '>',
            value: '3',
          },
        }) as never,
      );

      await service.dispatch({
        alertId: 1,
        state: 'triggered',
        subscriptionId: 2,
      });

      const fetchCalls = fetchMock.mock.calls as Array<[string, RequestInit?]>;
      const postCall = fetchCalls.find(
        (call) => call[0] === expectedUrl && call[1]?.method === 'POST',
      );

      expect(postCall).toEqual([
        expectedUrl,
        expect.objectContaining({
          method: 'POST',
        }),
      ]);

      const requestInit = postCall?.[1];
      const body = parseRequestBody(requestInit);

      if (type === 'slack') {
        expect(body).not.toHaveProperty('icon_url');
        expect(body.icon_emoji).toBeUndefined();
        expect(body.username).toBeUndefined();
      }

      if (type === 'slack_bot') {
        expect(postCall?.[1]?.headers).toMatchObject({
          Authorization: 'Bearer xoxb-test-token',
        });
        expect(body).toMatchObject({
          channel: 'C1234567890',
          icon_url: 'https://example.com/icon.png',
          username: 'slack-bot',
        });
        expect(body.icon_emoji).toBeUndefined();
      }

      if (type === 'discord') {
        const patchCall = fetchCalls.find(
          (call) => call[0] === expectedUrl && call[1]?.method === 'PATCH',
        );

        expect(patchCall).toBeDefined();
        const patchBody = parseRequestBody(patchCall?.[1]);
        const avatar = patchBody.avatar;

        expect(patchBody.name).toBe('bot');
        expect(typeof avatar).toBe('string');

        if (typeof avatar !== 'string') {
          throw new Error('avatar should be a string');
        }

        expect(avatar).toContain('data:image/png;base64,');
        expect(body).toMatchObject({
          avatar_url: 'https://example.com/avatar.png',
          username: 'bot',
        });
      }

      if (type === 'telegram') {
        expect(body).toMatchObject({
          chat_id: '999',
          parse_mode: 'HTML',
        });
      }
    },
  );
});

function buildSubscription(params: {
  destination: {
    encryptedOptions: string;
    id: number;
    type: string;
  } | null;
  options: Record<string, unknown>;
}) {
  return {
    alert: {
      id: 1,
      name: 'Count Alert',
      options: params.options,
      query: {
        id: 55,
        latestQueryData: {
          data: {
            columns: [{ name: 'count' }],
            rows: [{ count: 5 }],
          },
        },
        name: '집계 쿼리',
      },
    },
    destination: params.destination,
    user: {
      email: 'alert@example.com',
    },
  };
}

function parseRequestBody(init?: RequestInit): Record<string, unknown> {
  if (!init?.body || typeof init.body !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(init.body) as unknown;

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}
