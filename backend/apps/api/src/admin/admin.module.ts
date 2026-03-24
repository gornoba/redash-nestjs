import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ALERT_EVALUATION_QUEUE,
  NOTIFICATION_DISPATCH_QUEUE,
  QUERY_EXECUTION_QUEUE,
  SCHEMA_REFRESH_QUEUE,
  SCHEDULED_QUERY_EXECUTION_QUEUE,
} from '@app/common/queue/queue.constants';
import { DashboardEntity } from '@app/database/entities/dashboard.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';
import { WidgetEntity } from '@app/database/entities/widget.entity';
import { QueryModule } from '../query/query.module';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUERY_EXECUTION_QUEUE },
      { name: SCHEDULED_QUERY_EXECUTION_QUEUE },
      { name: ALERT_EVALUATION_QUEUE },
      { name: SCHEMA_REFRESH_QUEUE },
      { name: NOTIFICATION_DISPATCH_QUEUE },
    ),
    TypeOrmModule.forFeature([
      DashboardEntity,
      QueryEntity,
      QueryResultEntity,
      WidgetEntity,
    ]),
    QueryModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
