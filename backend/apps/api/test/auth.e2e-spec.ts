import cookie from '@fastify/cookie';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ACCESS_TOKEN_COOKIE_NAME } from '@app/common/auth/auth.constants';
import { AppZodValidationPipe } from '@app/common/pipes/app-zod-validation.pipe';
import { AuthController } from '../src/auth/controllers/auth.controller';
import { AuthService } from '../src/auth/services/auth.service';

describe('AuthController (e2e)', () => {
  let app: NestFastifyApplication;
  const authService = {
    login: jest.fn(),
    logout: jest.fn(),
    getAccessTokenCookieName: jest.fn().mockReturnValue(ACCESS_TOKEN_COOKIE_NAME),
    getAccessTokenCookieOptions: jest.fn().mockReturnValue({
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: false,
    }),
  };

  beforeEach(async () => {
    authService.login.mockReset();
    authService.logout.mockReset();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.register(cookie);
    app.useGlobalPipes(new AppZodValidationPipe());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /api/auth/login validates body', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'invalid-email',
        password: '123',
      })
      .expect(400);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('POST /api/auth/login returns token and cookie', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'signed-access-token',
      tokenType: 'Bearer',
      expiresIn: '24h',
      user: {
        id: 1,
        email: 'admin@example.com',
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'secret123',
      })
      .expect(201);

    expect(response.body).toEqual({
      accessToken: 'signed-access-token',
      tokenType: 'Bearer',
      expiresIn: '24h',
      user: {
        id: 1,
        email: 'admin@example.com',
      },
    });
    expect(response.headers['set-cookie'][0]).toContain(
      `${ACCESS_TOKEN_COOKIE_NAME}=signed-access-token`,
    );
  });

  it('POST /api/auth/logout clears cookie', async () => {
    authService.logout.mockReturnValue({
      message: '로그아웃되었습니다.',
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .expect(201);

    expect(response.body).toEqual({
      message: '로그아웃되었습니다.',
    });
    expect(response.headers['set-cookie'][0]).toContain(
      `${ACCESS_TOKEN_COOKIE_NAME}=;`,
    );
  });
});
