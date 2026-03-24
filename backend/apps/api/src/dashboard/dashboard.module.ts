import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CurrentUserModule } from '@app/common/current-user/current-user.module';
import { QUERY_EXECUTION_QUEUE } from '@app/common/queue/queue.constants';
import { DashboardController } from './controllers/dashboard.controller';
import { WidgetController } from './controllers/widget.controller';
import { DashboardEntity } from '@app/database/entities/dashboard.entity';
import { FavoriteEntity } from '@app/database/entities/favorite.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { VisualizationEntity } from '@app/database/entities/visualization.entity';
import { WidgetEntity } from '@app/database/entities/widget.entity';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DashboardRefreshStatusService } from './services/dashboard-refresh-status.service';
import { DashboardService } from './services/dashboard.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUERY_EXECUTION_QUEUE }),
    TypeOrmModule.forFeature([
      DashboardEntity,
      FavoriteEntity,
      QueryEntity,
      VisualizationEntity,
      WidgetEntity,
    ]),
    CurrentUserModule,
  ],
  controllers: [DashboardController, WidgetController],
  providers: [
    DashboardService,
    DashboardRepository,
    DashboardRefreshStatusService,
  ],
})
export class DashboardModule {}
