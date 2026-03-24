import { getAvailableSettingsMenuItems } from './settings.constants';

describe('getAvailableSettingsMenuItems', () => {
  it('includes alert destinations when user has list_alerts permission', () => {
    const items = getAvailableSettingsMenuItems({
      email: 'alerts@example.com',
      groupIds: [],
      id: 1,
      name: 'Alerts User',
      orgId: 1,
      orgSlug: 'default',
      permissions: ['list_alerts'],
      profileImageUrl: '',
      isEmailVerified: true,
      roles: [],
    });

    expect(items.some((item) => item.key === 'alert-destinations')).toBe(true);
  });

  it('hides alert destinations when list_alerts permission is missing', () => {
    const items = getAvailableSettingsMenuItems({
      email: 'basic@example.com',
      groupIds: [],
      id: 2,
      name: 'Basic User',
      orgId: 1,
      orgSlug: 'default',
      permissions: [],
      profileImageUrl: '',
      isEmailVerified: true,
      roles: [],
    });

    expect(items.some((item) => item.key === 'alert-destinations')).toBe(false);
  });
});
