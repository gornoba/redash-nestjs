import cookie from '@fastify/cookie';
import fastifyBasicAuth from '@fastify/basic-auth';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AppModule } from './app.module';
import { ConsoleLogger } from '@nestjs/common';
import { config } from 'dotenv';

config();

type FastifyBasicAuthInstance = FastifyInstance & {
  basicAuth: (
    request: FastifyRequest,
    reply: FastifyReply,
    done: () => void,
  ) => void;
};

function isEnabled(value: string | undefined, defaultValue = true) {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
}

function isSwaggerProtectedPath(url: string) {
  return (
    url === '/docs' ||
    url.startsWith('/docs/') ||
    url === '/docs-json' ||
    url.startsWith('/docs-json?')
  );
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger: new ConsoleLogger({
        json: true,
        colors: process.env.ENV === 'local',
      }),
    },
  );

  const configService = app.get(ConfigService);
  app.enableShutdownHooks();
  await app.register(cookie);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const swaggerEnabled = isEnabled(
    configService.get<string>('SWAGGER_ENABLED'),
  );

  if (swaggerEnabled) {
    const swaggerUser = configService.getOrThrow<string>(
      'SWAGGER_BASIC_AUTH_USER',
    );
    const swaggerPassword = configService.getOrThrow<string>(
      'SWAGGER_BASIC_AUTH_PASSWORD',
    );
    const fastify = app
      .getHttpAdapter()
      .getInstance() as unknown as FastifyBasicAuthInstance;

    await fastify.register(fastifyBasicAuth, {
      validate: async (
        username: string,
        password: string,
        _request: FastifyRequest,
        reply: FastifyReply,
        done: () => void,
      ) => {
        if (username === swaggerUser && password === swaggerPassword) {
          done();
          return;
        }

        reply
          .code(401)
          .header('WWW-Authenticate', 'Basic realm="Swagger UI"')
          .send('인증이 필요합니다.');
      },
      authenticate: true,
    });

    fastify.addHook(
      'onRequest',
      (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
        if (!isSwaggerProtectedPath(request.url)) {
          done();
          return;
        }

        if (!request.headers.authorization) {
          reply
            .code(401)
            .header('WWW-Authenticate', 'Basic realm="Swagger UI"')
            .send('인증이 필요합니다.');
          return;
        }

        fastify.basicAuth(request, reply, done);
      },
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('New Redash API')
      .setDescription('New Redash backend API documentation')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api-docs', app, cleanupOpenApiDoc(swaggerDocument), {
      jsonDocumentUrl: 'json-docs',
    });
  }

  const port = configService.get<number>('PORT') ?? 4000;

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
