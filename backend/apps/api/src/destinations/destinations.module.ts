import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AlertSubscriptionEntity } from '@app/database/entities/alert-subscription.entity';
import { NotificationDestinationEntity } from '@app/database/entities/notification-destination.entity';
import { DestinationsController } from './controllers/destinations.controller';
import { DestinationsRepository } from './repositories/destinations.repository';
import { DestinationsService } from './services/destinations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AlertSubscriptionEntity,
      NotificationDestinationEntity,
    ]),
  ],
  controllers: [DestinationsController],
  providers: [DestinationsRepository, DestinationsService],
  exports: [DestinationsService],
})
export class DestinationsModule {}
