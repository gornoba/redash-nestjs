import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ALERT_EVALUATION_QUEUE,
  QUERY_EXECUTION_QUEUE,
  SCHEMA_REFRESH_QUEUE,
} from '@app/common/queue/queue.constants';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';
import { FailureTrackingService } from './services/failure-tracking.service';
import { QueryExecutionLockService } from './services/query-execution-lock.service';
import { QueryExecutionService } from './services/query-execution.service';
import { ScheduledQueryExecutionService } from './services/scheduled-query-execution.service';
import { SchemaRefreshService } from './services/schema-refresh.service';
import { WorkerHeartbeatService } from './services/worker-heartbeat.service';
import { WorkerQueryRepository } from './repositories/worker-query.repository';
import { QueryExecutionProcessor } from './processors/query-execution.processor';
import { SchemaRefreshProcessor } from './processors/schema-refresh.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUERY_EXECUTION_QUEUE },
      { name: ALERT_EVALUATION_QUEUE },
      { name: SCHEMA_REFRESH_QUEUE },
    ),
    TypeOrmModule.forFeature([
      DataSourceEntity,
      QueryEntity,
      QueryResultEntity,
    ]),
  ],
  providers: [
    FailureTrackingService,
    QueryExecutionLockService,
    QueryExecutionProcessor,
    QueryExecutionService,
    ScheduledQueryExecutionService,
    SchemaRefreshService,
    SchemaRefreshProcessor,
    WorkerHeartbeatService,
    WorkerQueryRepository,
  ],
})
export class QueryExecutionModule {}
