import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QueryEntity } from '@app/database/entities/query.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';
import { VisualizationEntity } from '@app/database/entities/visualization.entity';
import { VisualizationController } from './controllers/visualization.controller';
import { VisualizationRepository } from './repositories/visualization.repository';
import { VisualizationService } from './services/visualization.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QueryEntity,
      QueryResultEntity,
      VisualizationEntity,
    ]),
  ],
  controllers: [VisualizationController],
  providers: [VisualizationRepository, VisualizationService],
})
export class VisualizationModule {}
