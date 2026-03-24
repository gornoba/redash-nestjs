import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from '@app/common/mail/mail.module';
import {
  ALERT_EVALUATION_QUEUE,
  NOTIFICATION_DISPATCH_QUEUE,
} from '@app/common/queue/queue.constants';
import { AlertSubscriptionEntity } from '@app/database/entities/alert-subscription.entity';
import { AlertEntity } from '@app/database/entities/alert.entity';
import { NotificationDestinationEntity } from '@app/database/entities/notification-destination.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';
import { AlertEvaluationProcessor } from './processors/alert-evaluation.processor';
import { NotificationDispatchProcessor } from './processors/notification-dispatch.processor';
import { AlertProcessingRepository } from './repositories/alert-processing.repository';
import { AlertEvaluationService } from './services/alert-evaluation.service';
import { AlertHeartbeatService } from './services/alert-heartbeat.service';
import { NotificationDispatchService } from './services/notification-dispatch.service';

@Module({
  imports: [
    MailModule,
    BullModule.registerQueue(
      { name: ALERT_EVALUATION_QUEUE },
      { name: NOTIFICATION_DISPATCH_QUEUE },
    ),
    TypeOrmModule.forFeature([
      AlertEntity,
      AlertSubscriptionEntity,
      NotificationDestinationEntity,
      QueryEntity,
      QueryResultEntity,
    ]),
  ],
  providers: [
    AlertProcessingRepository,
    AlertEvaluationProcessor,
    AlertEvaluationService,
    AlertHeartbeatService,
    NotificationDispatchProcessor,
    NotificationDispatchService,
  ],
})
export class AlertProcessingModule {}
