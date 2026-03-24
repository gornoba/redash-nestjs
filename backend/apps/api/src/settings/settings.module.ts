import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CurrentUserModule } from '@app/common/current-user/current-user.module';
import { DataSourceGroupEntity } from '@app/database/entities/data-source-group.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { GroupEntity } from '@app/database/entities/group.entity';
import { NotificationDestinationEntity } from '@app/database/entities/notification-destination.entity';
import { OrganizationEntity } from '@app/database/entities/organization.entity';
import { QuerySnippetEntity } from '@app/database/entities/query-snippet.entity';
import { UserEntity } from '@app/database/entities/user.entity';
import { SettingsController } from './controllers/settings.controller';
import { SettingsRepository } from './repositories/settings.repository';
import { SettingsService } from './services/settings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationEntity,
      UserEntity,
      GroupEntity,
      DataSourceEntity,
      DataSourceGroupEntity,
      NotificationDestinationEntity,
      QuerySnippetEntity,
    ]),
    CurrentUserModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsService],
})
export class SettingsModule {}
