import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { SettingsService } from './settings.service';
import { SettingsRepository } from '../repositories/settings.repository';
import { CurrentUserService } from '@app/common/current-user/current-user.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let repository: jest.Mocked<SettingsRepository>;
  let currentUserService: jest.Mocked<CurrentUserService>;

  const user: AuthenticatedUser = {
    id: 1,
    name: '관리자',
    email: 'admin@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1],
    roles: ['admin'],
    permissions: ['admin'],
    profileImageUrl: '',
    isEmailVerified: true,
  };

  beforeEach(() => {
    repository = {
      getQuerySnippets: jest.fn(),
    } as never;

    currentUserService = {
      getProfileImageUrl: jest.fn().mockReturnValue(''),
    } as never;

    service = new SettingsService(repository, currentUserService);
  });

  it('query snippet 작성자 이메일이 없어도 목록 조회가 실패하지 않아야 한다', async () => {
    repository.getQuerySnippets.mockResolvedValue([
      {
        id: 10,
        trigger: 'crm',
        description: 'desc',
        snippet: 'select 1',
        userId: 5,
        createdAt: new Date('2026-03-23T00:00:00.000Z'),
        user: {
          id: 5,
          name: '레거시 사용자',
          email: undefined,
          profileImageUrl: null,
        },
      },
    ] as never);

    const result = await service.getQuerySnippets(user);

    expect(currentUserService.getProfileImageUrl.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        id: 5,
        name: '레거시 사용자',
      }),
    );
    expect(result).toEqual({
      items: [
        {
          id: 10,
          trigger: 'crm',
          description: 'desc',
          snippet: 'select 1',
          user: {
            id: 5,
            name: '레거시 사용자',
            profile_image_url: '',
          },
          user_name: '레거시 사용자',
          created_at: '2026-03-23T00:00:00.000Z',
        },
      ],
    });
  });
});
