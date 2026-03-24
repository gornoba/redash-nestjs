import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppZodValidationPipe } from '@app/common/pipes/app-zod-validation.pipe';
import { SetupController } from '../src/setup/controllers/setup.controller';
import { SetupRepository } from '../src/setup/repositories/setup.repository';
import { SetupService } from '../src/setup/services/setup.service';

describe('SetupController (e2e)', () => {
  let app: NestFastifyApplication;
  const repository = {
    getSetupState: jest.fn(),
    createSetup: jest.fn(),
  };

  beforeEach(async () => {
    repository.getSetupState.mockReset();
    repository.createSetup.mockReset();

    const moduleRef = await Test.createTestingModule({
      controllers: [SetupController],
      providers: [
        SetupService,
        {
          provide: SetupRepository,
          useValue: repository,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(new AppZodValidationPipe());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/setup', async () => {
    repository.getSetupState.mockResolvedValue({
      isSetupRequired: true,
      defaults: {
        securityNotifications: true,
        newsletter: true,
      },
    });

    await request(app.getHttpServer())
      .get('/api/setup')
      .expect(200)
      .expect({
        isSetupRequired: true,
        defaults: {
          securityNotifications: true,
          newsletter: true,
        },
      });
  });

  it('POST /api/setup validates body', async () => {
    await request(app.getHttpServer())
      .post('/api/setup')
      .send({
        name: '',
        email: 'not-an-email',
        password: '123',
        orgName: '',
        securityNotifications: 'yes',
        newsletter: true,
      })
      .expect(400);

    expect(repository.createSetup).not.toHaveBeenCalled();
  });

  it('POST /api/setup creates setup', async () => {
    repository.getSetupState.mockResolvedValue({
      isSetupRequired: true,
      defaults: {
        securityNotifications: true,
        newsletter: true,
      },
    });
    repository.createSetup.mockResolvedValue({
      organization: {
        id: 1,
        name: '뉴 리대시',
        slug: 'default',
      },
      user: {
        id: 1,
        name: '관리자',
        email: 'admin@example.com',
      },
    });

    await request(app.getHttpServer())
      .post('/api/setup')
      .send({
        name: '관리자',
        email: 'Admin@Example.com',
        password: 'secret123',
        orgName: '뉴 리대시',
        securityNotifications: true,
        newsletter: true,
      })
      .expect(201)
      .expect({
        message: '설정이 완료되었습니다.',
        organization: {
          id: 1,
          name: '뉴 리대시',
          slug: 'default',
        },
        user: {
          id: 1,
          name: '관리자',
          email: 'admin@example.com',
        },
      });

    expect(repository.createSetup).toHaveBeenCalledWith({
      name: '관리자',
      email: 'admin@example.com',
      password: 'secret123',
      orgName: '뉴 리대시',
      securityNotifications: true,
      newsletter: true,
    });
  });

  it('POST /api/setup returns conflict when setup is already complete', async () => {
    repository.getSetupState.mockResolvedValue({
      isSetupRequired: false,
      defaults: {
        securityNotifications: true,
        newsletter: true,
      },
    });

    await request(app.getHttpServer())
      .post('/api/setup')
      .send({
        name: '관리자',
        email: 'admin@example.com',
        password: 'secret123',
        orgName: '뉴 리대시',
        securityNotifications: true,
        newsletter: true,
      })
      .expect(409);

    expect(repository.createSetup).not.toHaveBeenCalled();
  });
});
