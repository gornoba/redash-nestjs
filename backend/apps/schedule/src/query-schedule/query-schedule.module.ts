import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  QUERY_EXECUTION_QUEUE,
  SCHEDULED_QUERY_EXECUTION_QUEUE,
} from '@app/common/queue/queue.constants';
import { DashboardEntity } from '@app/database/entities/dashboard.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { ScheduledQueryDispatchProcessor } from './processors/scheduled-query-dispatch.processor';
import { ScheduleDashboardRepository } from './repositories/schedule-dashboard.repository';
import { ScheduleQueryRepository } from './repositories/schedule-query.repository';
import { ScheduledQueryDispatchService } from './services/scheduled-query-dispatch.service';
import { ScheduleHeartbeatService } from './services/schedule-heartbeat.service';
import { ScheduledQuerySchedulerService } from './services/scheduled-query-scheduler.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUERY_EXECUTION_QUEUE },
      { name: SCHEDULED_QUERY_EXECUTION_QUEUE },
    ),
    TypeOrmModule.forFeature([DashboardEntity, QueryEntity]),
  ],
  providers: [
    ScheduleDashboardRepository,
    ScheduleQueryRepository,
    ScheduleHeartbeatService,
    ScheduledQueryDispatchProcessor,
    ScheduledQueryDispatchService,
    ScheduledQuerySchedulerService,
  ],
})
export class QueryScheduleModule {}
