import { getAlertListOrderDefinition } from './alerts.repository';

describe('getAlertListOrderDefinition', () => {
  it('returns the projected muted alias for muted ordering', () => {
    expect(getAlertListOrderDefinition('muted')).toEqual({
      orderBy: 'alert_muted',
    });
  });

  it('returns a lowercase name expression for name ordering', () => {
    expect(getAlertListOrderDefinition('name')).toEqual({
      orderBy: 'LOWER(alert.name)',
    });
  });

  it('returns a direct timestamp column for created_at ordering', () => {
    expect(getAlertListOrderDefinition('created_at')).toEqual({
      orderBy: 'alert.createdAt',
    });
  });

  it('returns null for unsupported ordering fields', () => {
    expect(getAlertListOrderDefinition('created_by')).toBeNull();
  });
});
