import { join } from 'node:path';

import { ConfigService } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';

import { entities } from './entities';
import { resolvePostgresSslOption } from './postgres-ssl.util';
import { LegacyTimestampSubscriber } from './subscribers/legacy-timestamp.subscriber';

export function createTypeOrmOptions(
  configService?: ConfigService,
): DataSourceOptions {
  const host = configService?.get<string>('DB_HOST') ?? '127.0.0.1';
  const sslOption = resolvePostgresSslOption(host);

  return {
    type: 'postgres',
    host,
    port: Number(configService?.get<number>('DB_PORT') ?? 15432),
    username: configService?.get<string>('DB_USERNAME') ?? 'postgres',
    password: configService?.get<string>('DB_PASSWORD') ?? 'postgres',
    database: configService?.get<string>('DB_DATABASE') ?? 'new_redash',
    synchronize: false,
    logging: ['error'],
    entities,
    subscribers: [LegacyTimestampSubscriber],
    migrations: [join(__dirname, 'migrations/*.{ts,js}')],
    migrationsTableName: 'migrations',
    ...(sslOption
      ? {
          ssl: sslOption,
        }
      : {}),
  };
}
