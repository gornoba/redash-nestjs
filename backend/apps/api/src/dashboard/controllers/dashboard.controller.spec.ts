import { Test } from '@nestjs/testing';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from '../services/dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: jest.Mocked<DashboardService>;

  const user: AuthenticatedUser = {
    id: 1,
    name: '관리자',
    email: 'admin@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1],
    permissions: ['list_dashboards', 'create_dashboard'],
    profileImageUrl: '',
    isEmailVerified: true,
    roles: ['admin'],
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            addWidget: jest.fn(),
            archiveDashboard: jest.fn(),
            createDashboard: jest.fn(),
            createWidget: jest.fn(),
            deleteWidget: jest.fn(),
            favoriteDashboard: jest.fn(),
            getDashboardDetail: jest.fn(),
            getDashboardRefreshStatus: jest.fn(),
            getDashboards: jest.fn(),
            getDashboardTags: jest.fn(),
            refreshDashboard: jest.fn(),
            unfavoriteDashboard: jest.fn(),
            updateDashboard: jest.fn(),
            updateWidget: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(DashboardController);
    dashboardService = moduleRef.get(DashboardService);
  });

  it('전체 목록 조회를 all view 로 위임해야 한다', async () => {
    const query = { page: 1, page_size: 25, tags: [] };
    dashboardService.getDashboards.mockResolvedValue({ count: 0 } as never);

    const result: unknown = await controller.getDashboards(
      user,
      query as never,
    );

    expect(result).toEqual({ count: 0 });
    expect(dashboardService.getDashboards.mock.calls[0]).toEqual([
      user,
      'all',
      query,
    ]);
  });

  it('내 대시보드 조회를 my view 로 위임해야 한다', async () => {
    const query = { page: 1, page_size: 25, tags: [] };
    dashboardService.getDashboards.mockResolvedValue({ count: 1 } as never);

    const result: unknown = await controller.getMyDashboards(
      user,
      query as never,
    );

    expect(result).toEqual({ count: 1 });
    expect(dashboardService.getDashboards.mock.calls[0]).toEqual([
      user,
      'my',
      query,
    ]);
  });

  it('즐겨찾기 조회를 favorites view 로 위임해야 한다', async () => {
    const query = { page: 2, page_size: 25, tags: ['sales'] };
    dashboardService.getDashboards.mockResolvedValue({ count: 2 } as never);

    const result: unknown = await controller.getFavorites(user, query as never);

    expect(result).toEqual({ count: 2 });
    expect(dashboardService.getDashboards.mock.calls[0]).toEqual([
      user,
      'favorites',
      query,
    ]);
  });

  it('대시보드 태그 조회를 서비스로 위임해야 한다', async () => {
    dashboardService.getDashboardTags.mockResolvedValue({
      tags: [{ count: 3, name: 'ops' }],
    } as never);

    const result: unknown = await controller.getDashboardTags(user);

    expect(result).toEqual({
      tags: [{ count: 3, name: 'ops' }],
    });
    expect(dashboardService.getDashboardTags.mock.calls[0]).toEqual([user]);
  });

  it('대시보드 생성을 서비스로 위임해야 한다', async () => {
    const payload = { name: 'Sales Overview' };
    dashboardService.createDashboard.mockResolvedValue({ id: 7 } as never);

    const result: unknown = await controller.createDashboard(
      user,
      payload as never,
    );

    expect(result).toEqual({ id: 7 });
    expect(dashboardService.createDashboard.mock.calls[0]).toEqual([
      user,
      payload,
    ]);
  });

  it('대시보드 수정을 서비스로 위임해야 한다', async () => {
    const payload = {
      dashboard_filters_enabled: true,
      version: 3,
    };
    dashboardService.updateDashboard.mockResolvedValue({ id: 7 } as never);

    const result: unknown = await controller.updateDashboard(
      user,
      { dashboardId: 7 },
      payload as never,
    );

    expect(result).toEqual({ id: 7 });
    expect(dashboardService.updateDashboard.mock.calls[0]).toEqual([
      user,
      7,
      payload,
    ]);
  });

  it('즐겨찾기 추가를 서비스로 위임해야 한다', async () => {
    dashboardService.favoriteDashboard.mockResolvedValue({
      id: 10,
      is_favorite: true,
    } as never);

    const result: unknown = await controller.favoriteDashboard(user, {
      dashboardId: 10,
    });

    expect(result).toEqual({ id: 10, is_favorite: true });
    expect(dashboardService.favoriteDashboard.mock.calls[0]).toEqual([
      user,
      10,
    ]);
  });

  it('대시보드 새로고침을 서비스로 위임해야 한다', async () => {
    dashboardService.refreshDashboard.mockResolvedValue({
      dashboard_id: 10,
      dashboard_refresh_id: '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb',
      state: 'queued',
      total_jobs: 1,
    } as never);

    const result: unknown = await controller.refreshDashboard(user, {
      dashboardId: 10,
    });

    expect(result).toEqual({
      dashboard_id: 10,
      dashboard_refresh_id: '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb',
      state: 'queued',
      total_jobs: 1,
    });
    expect(dashboardService.refreshDashboard.mock.calls[0]).toEqual([user, 10]);
  });

  it('대시보드 새로고침 상태 조회를 서비스로 위임해야 한다', async () => {
    dashboardService.getDashboardRefreshStatus.mockResolvedValue({
      completed_jobs: 1,
      dashboard_id: 10,
      dashboard_refresh_id: '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb',
      error: null,
      failed_jobs: 0,
      state: 'completed',
      total_jobs: 1,
    } as never);

    const result: unknown = await controller.getDashboardRefreshStatus(user, {
      dashboardRefreshId: '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb',
    });

    expect(result).toEqual({
      completed_jobs: 1,
      dashboard_id: 10,
      dashboard_refresh_id: '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb',
      error: null,
      failed_jobs: 0,
      state: 'completed',
      total_jobs: 1,
    });
    expect(dashboardService.getDashboardRefreshStatus.mock.calls[0]).toEqual([
      user,
      '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb',
    ]);
  });

  it('즐겨찾기 제거를 서비스로 위임해야 한다', async () => {
    dashboardService.unfavoriteDashboard.mockResolvedValue({
      id: 10,
      is_favorite: false,
    } as never);

    const result: unknown = await controller.unfavoriteDashboard(user, {
      dashboardId: 10,
    });

    expect(result).toEqual({ id: 10, is_favorite: false });
    expect(dashboardService.unfavoriteDashboard.mock.calls[0]).toEqual([
      user,
      10,
    ]);
  });

  it('대시보드 아카이브를 서비스로 위임해야 한다', async () => {
    dashboardService.archiveDashboard.mockResolvedValue({
      id: 10,
      is_archived: true,
    } as never);

    const result: unknown = await controller.archiveDashboard(user, {
      dashboardId: 10,
    });

    expect(result).toEqual({ id: 10, is_archived: true });
    expect(dashboardService.archiveDashboard.mock.calls[0]).toEqual([user, 10]);
  });
});
