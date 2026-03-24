import { BullModule, BullRootModuleOptions } from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

function getNumberConfig(
  configService: ConfigService,
  key: string,
  defaultValue: number,
) {
  const rawValue = configService.get<string>(key);

  if (!rawValue) {
    return defaultValue;
  }

  const parsedValue = Number(rawValue);

  return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
}

@Module({})
export class BullQueueModule {
  static register(): DynamicModule {
    return {
      module: BullQueueModule,
      imports: [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService): BullRootModuleOptions => {
            const host = configService.get<string>('REDIS_HOST') ?? '127.0.0.1';
            const port = getNumberConfig(configService, 'REDIS_PORT', 16379);
            const username = configService.get<string>('REDIS_USERNAME');
            const password = configService.get<string>('REDIS_PASSWORD');

            return {
              prefix: 'new-redash',
              connection: {
                host,
                port,
                ...(username ? { username } : {}),
                ...(password ? { password } : {}),
              },
            };
          },
        }),
      ],
      exports: [BullModule],
    };
  }
}
