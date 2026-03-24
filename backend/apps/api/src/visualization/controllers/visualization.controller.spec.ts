import { Test } from '@nestjs/testing';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { VisualizationController } from './visualization.controller';
import { VisualizationService } from '../services/visualization.service';

describe('VisualizationController', () => {
  let controller: VisualizationController;
  let visualizationService: jest.Mocked<VisualizationService>;

  const user: AuthenticatedUser = {
    id: 1,
    name: '관리자',
    email: 'admin@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1],
    permissions: ['edit_query'],
    profileImageUrl: '',
    isEmailVerified: true,
    roles: ['admin'],
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [VisualizationController],
      providers: [
        {
          provide: VisualizationService,
          useValue: {
            createVisualization: jest.fn(),
            updateVisualization: jest.fn(),
            deleteVisualization: jest.fn(),
            getPublicEmbed: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(VisualizationController);
    visualizationService = moduleRef.get(VisualizationService);
  });

  it('시각화 삭제를 서비스로 위임해야 한다', async () => {
    visualizationService.deleteVisualization.mockResolvedValue({
      id: 12,
    } as never);

    const result: unknown = await controller.deleteVisualization(user, {
      visualizationId: 12,
    } as never);

    expect(result).toEqual({ id: 12 });
    expect(visualizationService.deleteVisualization.mock.calls[0]).toEqual([
      user,
      12,
    ]);
  });
});
