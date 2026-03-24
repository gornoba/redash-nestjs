import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { decryptJsonValue } from '@app/common/utils/crypto.util';
import { DestinationsService } from './destinations.service';
import { DestinationsRepository } from '../repositories/destinations.repository';

describe('DestinationsService', () => {
  let service: DestinationsService;
  let repository: jest.Mocked<DestinationsRepository>;

  const user: AuthenticatedUser = {
    email: 'admin@example.com',
    groupIds: [1],
    id: 7,
    isEmailVerified: true,
    name: '관리자',
    orgId: 1,
    orgSlug: 'default',
    permissions: ['list_alerts'],
    profileImageUrl: 'https://example.com/avatar.png',
    roles: ['admin'],
  };

  beforeEach(() => {
    process.env.REDASH_SECRET_KEY = 'test-secret-key';

    repository = {
      createDestination: jest.fn((value: Record<string, unknown>) => ({
        ...value,
      })),
      deleteDestination: jest.fn(),
      findByName: jest.fn().mockResolvedValue(null),
      getDestinationById: jest.fn(),
      getDestinations: jest.fn(),
      saveDestination: jest.fn((value: Record<string, unknown>) =>
        Promise.resolve({
          id: 11,
          ...value,
        }),
      ),
    } as never;

    service = new DestinationsService(repository);
  });

  it('destination 생성 시 옵션을 암호화해서 저장해야 한다', async () => {
    const result = await service.createDestination(user, {
      name: '메일',
      options: {
        addresses: 'a@example.com',
      },
      type: 'email',
    });

    const encryptedOptions =
      repository.createDestination.mock.calls[0][0].encryptedOptions;

    expect(typeof encryptedOptions).toBe('string');
    expect(encryptedOptions).not.toBe(
      JSON.stringify({
        addresses: 'a@example.com',
      }),
    );
    expect(decryptJsonValue<Record<string, unknown>>(encryptedOptions)).toEqual(
      {
        addresses: 'a@example.com',
      },
    );
    expect(result).toMatchObject({
      id: 11,
      name: '메일',
      options: {
        addresses: 'a@example.com',
      },
      type: 'email',
    });
  });

  it('기존 평문 JSON destination도 계속 읽을 수 있어야 한다', async () => {
    repository.getDestinationById.mockResolvedValue({
      encryptedOptions: JSON.stringify({
        bot_token: 'plain-token',
        chat_id: '123',
      }),
      id: 99,
      name: '텔레그램',
      type: 'telegram',
    } as never);

    const result = await service.getDestination(user, 99);

    expect(result).toEqual({
      id: 99,
      name: '텔레그램',
      options: {
        bot_token: '******',
        chat_id: '123',
      },
      type: 'telegram',
    });
  });

  it('slack bot destination 생성 시 bot token을 암호화해서 저장해야 한다', async () => {
    const result = await service.createDestination(user, {
      name: '슬랙 봇',
      options: {
        bot_token: 'xoxb-test-token',
        channel: 'C1234567890',
        username: '알림봇',
      },
      type: 'slack_bot',
    });

    const encryptedOptions =
      repository.createDestination.mock.calls[0][0].encryptedOptions;
    const savedOptions =
      decryptJsonValue<Record<string, unknown>>(encryptedOptions);

    expect(savedOptions).toEqual({
      bot_token: 'xoxb-test-token',
      channel: 'C1234567890',
      username: '알림봇',
    });
    expect(result).toMatchObject({
      id: 11,
      name: '슬랙 봇',
      options: {
        bot_token: '******',
        channel: 'C1234567890',
        username: '알림봇',
      },
      type: 'slack_bot',
    });
  });
});
