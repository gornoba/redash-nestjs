import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AlertModule } from './alert.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';

config();

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AlertModule,
    new FastifyAdapter(),
    {
      logger: new ConsoleLogger({
        colors: true,
        json: process.env.ENV === 'local',
      }),
    },
  );

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 4001;

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
