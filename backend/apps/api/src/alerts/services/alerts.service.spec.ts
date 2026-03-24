import { ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  const user: AuthenticatedUser = {
    email: 'owner@example.com',
    groupIds: [1],
    id: 7,
    isEmailVerified: true,
    name: 'Owner',
    orgId: 1,
    orgSlug: 'default',
    permissions: ['list_alerts', 'view_query'],
    profileImageUrl: '',
    roles: ['user'],
  };

  const alertsRepository = {
    createAlert: jest.fn(),
    getAccessibleQueryById: jest.fn(),
    getAlertById: jest.fn(),
    getAlertMutableContextById: jest.fn(),
    getAlertPermissionContextById: jest.fn(),
    getAlerts: jest.fn(),
    saveAlert: jest.fn(),
  };

  let service: AlertsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AlertsService(alertsRepository as never);
  });

  it('목록 응답은 화면에서 쓰는 필드만 직렬화해야 한다', async () => {
    alertsRepository.getAlerts.mockResolvedValue([
      {
        createdAt: new Date('2026-03-16T00:00:00.000Z'),
        id: 21,
        muted: true,
        name: 'Revenue Alert',
        state: 'triggered',
        updatedAt: new Date('2026-03-17T00:00:00.000Z'),
        userId: 7,
        userName: 'Owner',
      },
    ]);

    await expect(service.getAlerts(user, {} as never)).resolves.toEqual([
      {
        created_at: '2026-03-16T00:00:00.000Z',
        id: 21,
        muted: true,
        name: 'Revenue Alert',
        state: 'triggered',
        updated_at: '2026-03-17T00:00:00.000Z',
        user: {
          id: 7,
          name: 'Owner',
        },
      },
    ]);
  });

  it('알림 생성 시 이름을 trim 하고 직렬화된 응답을 반환해야 한다', async () => {
    const query = {
      dataSourceId: 3,
      id: 11,
      latestQueryDataId: 15,
      name: 'New Query',
      schedule: null,
    };
    const savedAlert = {
      id: 21,
    };
    const loadedAlert = {
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      id: 21,
      lastTriggeredAt: null,
      name: 'Revenue Alert',
      options: { column: 'count', op: '>', value: '1' },
      query,
      queryId: 11,
      rearm: null,
      state: 'unknown',
      updatedAt: new Date('2026-03-16T00:00:00.000Z'),
      user: {
        email: 'owner@example.com',
        id: 7,
        name: 'Owner',
        profileImageUrl: null,
      },
      userId: 7,
    };

    alertsRepository.getAccessibleQueryById.mockResolvedValue(query);
    alertsRepository.saveAlert.mockResolvedValue(savedAlert);
    alertsRepository.getAlertById.mockResolvedValue(loadedAlert);

    const result = await service.createAlert(user, {
      name: '  Revenue Alert  ',
      options: { column: 'count', op: '>', value: '1' },
      query_id: 11,
      rearm: null,
    });

    expect(alertsRepository.createAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Revenue Alert',
        queryId: 11,
        userId: 7,
      }),
    );
    expect(result.name).toBe('Revenue Alert');
    expect(result.query.id).toBe(11);
    expect(result.user).toEqual({ id: 7 });
  });

  it('소유자가 아니고 admin 도 아니면 mute 를 거부해야 한다', async () => {
    alertsRepository.getAlertMutableContextById.mockResolvedValue({
      options: { muted: false },
      userId: 99,
    });

    await expect(service.muteAlert(user, 1, true)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
