import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CurrentUserModule } from '@app/common/current-user/current-user.module';
import { DataSourceGroupEntity } from '@app/database/entities/data-source-group.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { GroupEntity } from '@app/database/entities/group.entity';
import { UserEntity } from '@app/database/entities/user.entity';
import { AddGroupDataSourceHandler } from './commands/handlers/add-group-data-source.handler';
import { AddGroupMemberHandler } from './commands/handlers/add-group-member.handler';
import { CreateGroupHandler } from './commands/handlers/create-group.handler';
import { DeleteGroupHandler } from './commands/handlers/delete-group.handler';
import { RemoveGroupDataSourceHandler } from './commands/handlers/remove-group-data-source.handler';
import { RemoveGroupMemberHandler } from './commands/handlers/remove-group-member.handler';
import { UpdateGroupDataSourceHandler } from './commands/handlers/update-group-data-source.handler';
import { UpdateGroupPermissionsHandler } from './commands/handlers/update-group-permissions.handler';
import { UpdateGroupHandler } from './commands/handlers/update-group.handler';
import { GroupsController } from './controllers/groups.controller';
import { GetGroupDataSourcesHandler } from './queries/handlers/get-group-data-sources.handler';
import { GetGroupMembersHandler } from './queries/handlers/get-group-members.handler';
import { GetGroupHandler } from './queries/handlers/get-group.handler';
import { GetGroupsHandler } from './queries/handlers/get-groups.handler';
import { GroupsRepository } from './repositories/groups.repository';
import { GroupsService } from './services/groups.service';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      GroupEntity,
      UserEntity,
      DataSourceEntity,
      DataSourceGroupEntity,
    ]),
    CurrentUserModule,
  ],
  controllers: [GroupsController],
  providers: [
    GroupsService,
    GroupsRepository,
    GetGroupsHandler,
    GetGroupHandler,
    GetGroupMembersHandler,
    GetGroupDataSourcesHandler,
    CreateGroupHandler,
    UpdateGroupHandler,
    DeleteGroupHandler,
    UpdateGroupPermissionsHandler,
    AddGroupMemberHandler,
    RemoveGroupMemberHandler,
    AddGroupDataSourceHandler,
    UpdateGroupDataSourceHandler,
    RemoveGroupDataSourceHandler,
  ],
})
export class GroupsModule {}
