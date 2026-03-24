import { Test } from '@nestjs/testing';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { DashboardService } from '../services/dashboard.service';
import { WidgetController } from './widget.controller';

describe('WidgetController', () => {
  let controller: WidgetController;
  let dashboardService: jest.Mocked<DashboardService>;

  const user: AuthenticatedUser = {
    id: 1,
    name: '관리자',
    email: 'admin@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1],
    permissions: ['edit_dashboard'],
    profileImageUrl: '',
    isEmailVerified: true,
    roles: ['admin'],
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WidgetController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            createWidget: jest.fn(),
            deleteWidget: jest.fn(),
            updateWidget: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(WidgetController);
    dashboardService = moduleRef.get(DashboardService);
  });

  it('위젯 생성을 서비스로 위임해야 한다', async () => {
    const payload = {
      dashboard_id: 7,
      text: '## 제목',
    };
    dashboardService.createWidget.mockResolvedValue({ id: 11 } as never);

    const result: unknown = await controller.createWidget(
      user,
      payload as never,
    );

    expect(result).toEqual({ id: 11 });
    expect(dashboardService.createWidget.mock.calls[0]).toEqual([
      user,
      payload,
    ]);
  });

  it('위젯 수정을 서비스로 위임해야 한다', async () => {
    const payload = {
      options: {
        position: {
          col: 2,
          row: 4,
        },
      },
    };
    dashboardService.updateWidget.mockResolvedValue({ id: 11 } as never);

    const result: unknown = await controller.updateWidget(
      user,
      { widgetId: 11 },
      payload as never,
    );

    expect(result).toEqual({ id: 11 });
    expect(dashboardService.updateWidget.mock.calls[0]).toEqual([
      user,
      11,
      payload,
    ]);
  });

  it('위젯 삭제를 서비스로 위임해야 한다', async () => {
    dashboardService.deleteWidget.mockResolvedValue({ id: 11 } as never);

    const result: unknown = await controller.deleteWidget(user, {
      widgetId: 11,
    });

    expect(result).toEqual({ id: 11 });
    expect(dashboardService.deleteWidget.mock.calls[0]).toEqual([user, 11]);
  });
});
