import { CurrentUserService } from './current-user.service';

describe('CurrentUserService', () => {
  let service: CurrentUserService;

  beforeEach(() => {
    service = new CurrentUserService({} as never, {} as never, {} as never);
  });

  it('이메일이 없으면 빈 profile image url 을 반환해야 한다', () => {
    expect(
      service.getProfileImageUrl({
        email: undefined,
        profileImageUrl: null,
      } as never),
    ).toBe('');
  });

  it('profile image url 이 있으면 그 값을 그대로 반환해야 한다', () => {
    expect(
      service.getProfileImageUrl({
        email: undefined,
        profileImageUrl: 'https://example.com/avatar.png',
      } as never),
    ).toBe('https://example.com/avatar.png');
  });
});
