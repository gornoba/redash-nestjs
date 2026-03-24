import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';
import { config } from 'dotenv';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';

config();

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    WorkerModule,
    new FastifyAdapter(),
    {
      logger: new ConsoleLogger({
        json: true,
        colors: process.env.ENV === 'local',
      }),
    },
  );

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 4003;

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
