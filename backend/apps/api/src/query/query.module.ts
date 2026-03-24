import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QUERY_EXECUTION_QUEUE } from '@app/common/queue/queue.constants';
import { CurrentUserModule } from '@app/common/current-user/current-user.module';
import { AlertSubscriptionEntity } from '@app/database/entities/alert-subscription.entity';
import { AlertEntity } from '@app/database/entities/alert.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { FavoriteEntity } from '@app/database/entities/favorite.entity';
import { OrganizationEntity } from '@app/database/entities/organization.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';
import { VisualizationEntity } from '@app/database/entities/visualization.entity';
import { WidgetEntity } from '@app/database/entities/widget.entity';
import { QueryController } from './controllers/query.controller';
import { QueryEntity } from '@app/database/entities/query.entity';
import { QueryRepository } from './repositories/query.repository';
import { QueryService } from './services/query.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUERY_EXECUTION_QUEUE,
    }),
    TypeOrmModule.forFeature([
      QueryEntity,
      QueryResultEntity,
      OrganizationEntity,
      DataSourceEntity,
      VisualizationEntity,
      WidgetEntity,
      AlertEntity,
      AlertSubscriptionEntity,
      FavoriteEntity,
    ]),
    CurrentUserModule,
  ],
  controllers: [QueryController],
  providers: [QueryService, QueryRepository],
  exports: [QueryRepository],
})
export class QueryModule {}
