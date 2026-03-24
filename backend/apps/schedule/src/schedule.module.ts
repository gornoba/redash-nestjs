import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BullQueueModule } from '@app/common/queue/bull-queue.module';
import { createTypeOrmOptions } from '@app/database/typeorm.config';
import { QueryScheduleModule } from './query-schedule/query-schedule.module';
import { HealthModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullQueueModule.register(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createTypeOrmOptions(configService),
    }),
    QueryScheduleModule,
    HealthModule,
  ],
})
export class ScheduleModule {}
