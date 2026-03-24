import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CurrentUserModule } from '@app/common/current-user/current-user.module';
import { AlertSubscriptionEntity } from '@app/database/entities/alert-subscription.entity';
import { AlertEntity } from '@app/database/entities/alert.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { NotificationDestinationEntity } from '@app/database/entities/notification-destination.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { AlertsController } from './controllers/alerts.controller';
import { AlertsRepository } from './repositories/alerts.repository';
import { AlertsService } from './services/alerts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AlertEntity,
      AlertSubscriptionEntity,
      DataSourceEntity,
      NotificationDestinationEntity,
      QueryEntity,
    ]),
    CurrentUserModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsRepository, AlertsService],
  exports: [AlertsRepository, AlertsService],
})
export class AlertsModule {}
