import { canRefreshDashboardQuery } from './dashboard.repository';

describe('canRefreshDashboardQuery', () => {
  it('allows admins to refresh queries owned by other users', () => {
    expect(
      canRefreshDashboardQuery(
        {
          id: 7,
          roles: ['admin'],
        },
        99,
      ),
    ).toBe(true);
  });

  it('allows owners to refresh their own queries from dashboards', () => {
    expect(
      canRefreshDashboardQuery(
        {
          id: 42,
          roles: ['user'],
        },
        42,
      ),
    ).toBe(true);
  });

  it('blocks non-admin users from refreshing queries owned by others', () => {
    expect(
      canRefreshDashboardQuery(
        {
          id: 42,
          roles: ['user'],
        },
        99,
      ),
    ).toBe(false);
  });
});
