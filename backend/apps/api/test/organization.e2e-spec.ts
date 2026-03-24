import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import type { FastifyRequest } from 'fastify';
import request from 'supertest';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { OrganizationController } from '../src/organization/controllers/organization.controller';
import { OrganizationService } from '../src/organization/services/organization.service';

describe('OrganizationController (e2e)', () => {
  let app: NestFastifyApplication;
  const organizationService = {
    getStatus: jest.fn(),
  };

  const authenticatedUser: AuthenticatedUser = {
    id: 1,
    name: '관리자',
    email: 'admin@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1, 2],
    permissions: ['admin'],
    profileImageUrl: 'https://example.com/avatar.png',
    isEmailVerified: true,
  };

  beforeEach(async () => {
    organizationService.getStatus.mockReset();

    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        {
          provide: OrganizationService,
          useValue: organizationService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app
      .getHttpAdapter()
      .getInstance()
      .addHook('onRequest', (request: FastifyRequest, _reply, done) => {
        (request as FastifyRequest & { user: AuthenticatedUser }).user =
          authenticatedUser;
        done();
      });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/organization/status', async () => {
    organizationService.getStatus.mockResolvedValue({
      object_counters: {
        users: 1,
        alerts: 0,
        data_sources: 0,
        queries: 0,
        dashboards: 0,
      },
    });

    await request(app.getHttpServer())
      .get('/api/organization/status')
      .expect(200)
      .expect({
        object_counters: {
          users: 1,
          alerts: 0,
          data_sources: 0,
          queries: 0,
          dashboards: 0,
        },
      });
  });
});
