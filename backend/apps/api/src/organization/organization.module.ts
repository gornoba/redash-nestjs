import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AlertEntity } from '@app/database/entities/alert.entity';
import { DashboardEntity } from '@app/database/entities/dashboard.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { GroupEntity } from '@app/database/entities/group.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { UserEntity } from '@app/database/entities/user.entity';
import { OrganizationController } from './controllers/organization.controller';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationService } from './services/organization.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AlertEntity,
      DataSourceEntity,
      GroupEntity,
      QueryEntity,
      DashboardEntity,
    ]),
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationRepository],
  exports: [OrganizationService],
})
export class OrganizationModule {}
