import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { RequireRoles } from '@app/common/decorators/roles.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  AddGroupDataSourceRequestDto,
  AddGroupMemberRequestDto,
  CreateGroupRequestDto,
  GroupDataSourceParamDto,
  GroupDataSourcesResponseDto,
  GroupDetailResponseDto,
  GroupIdParamDto,
  GroupMemberParamDto,
  GroupMembersResponseDto,
  GroupsListResponseDto,
  UpdateGroupDataSourceRequestDto,
  UpdateGroupPermissionsRequestDto,
  UpdateGroupRequestDto,
} from '../dto/groups.dto';
import { AddGroupDataSourceCommand } from '../commands/add-group-data-source.command';
import { AddGroupMemberCommand } from '../commands/add-group-member.command';
import { CreateGroupCommand } from '../commands/create-group.command';
import { DeleteGroupCommand } from '../commands/delete-group.command';
import { RemoveGroupDataSourceCommand } from '../commands/remove-group-data-source.command';
import { RemoveGroupMemberCommand } from '../commands/remove-group-member.command';
import { UpdateGroupDataSourceCommand } from '../commands/update-group-data-source.command';
import { UpdateGroupPermissionsCommand } from '../commands/update-group-permissions.command';
import { UpdateGroupCommand } from '../commands/update-group.command';
import { GetGroupDataSourcesQuery } from '../queries/get-group-data-sources.query';
import { GetGroupMembersQuery } from '../queries/get-group-members.query';
import { GetGroupQuery } from '../queries/get-group.query';
import { GetGroupsQuery } from '../queries/get-groups.query';

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @RequirePermissions('list_users')
  @Get()
  @ApiOperation({ summary: '그룹 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '그룹 목록',
    type: GroupsListResponseDto,
  })
  getGroups(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetGroupsQuery(user));
  }

  @RequireRoles('admin')
  @Post()
  @ApiOperation({ summary: '그룹을 생성합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 그룹',
    type: GroupDetailResponseDto,
  })
  createGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateGroupRequestDto,
  ) {
    return this.commandBus.execute(new CreateGroupCommand(user, payload));
  }

  @Get(':groupId')
  @ApiOperation({ summary: '그룹 상세를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '그룹 상세',
    type: GroupDetailResponseDto,
  })
  getGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GroupIdParamDto,
  ) {
    return this.queryBus.execute(new GetGroupQuery(user, params.groupId));
  }

  @RequireRoles('admin')
  @Post(':groupId')
  @ApiOperation({ summary: '그룹 이름을 수정합니다.' })
  @ZodResponse({
    status: 201,
    description: '수정된 그룹',
    type: GroupDetailResponseDto,
  })
  updateGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GroupIdParamDto,
    @Body() payload: UpdateGroupRequestDto,
  ) {
    return this.commandBus.execute(
      new UpdateGroupCommand(user, params.groupId, payload),
    );
  }

  @RequireRoles('admin')
  @Post(':groupId/permissions')
  @ApiOperation({ summary: '그룹 권한을 수정합니다.' })
  @ZodResponse({
    status: 201,
    description: '권한이 수정된 그룹',
    type: GroupDetailResponseDto,
  })
  updateGroupPermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GroupIdParamDto,
    @Body() payload: UpdateGroupPermissionsRequestDto,
  ) {
    return this.commandBus.execute(
      new UpdateGroupPermissionsCommand(user, params.groupId, payload),
    );
  }

  @RequireRoles('admin')
  @Delete(':groupId')
  @ApiOperation({ summary: '그룹을 삭제합니다.' })
  @ZodResponse({
    status: 200,
    description: '삭제된 그룹',
    type: GroupDetailResponseDto,
  })
  deleteGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GroupIdParamDto,
  ) {
    return this.commandBus.execute(
      new DeleteGroupCommand(user, params.groupId),
    );
  }

  @Get(':groupId/members')
  @ApiOperation({ summary: '그룹 멤버를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '그룹 멤버 목록',
    type: GroupMembersResponseDto,
  })
  getGroupMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GroupIdParamDto,
  ) {
    return this.queryBus.execute(
      new GetGroupMembersQuery(user, params.groupId),
    );
  }

  @RequireRoles('admin')
  @Post(':groupId/members')
  @ApiOperation({ summary: '그룹에 멤버를 추가합니다.' })
  @ZodResponse({
    status: 201,
    description: '업데이트된 그룹 멤버 목록',
    type: GroupMembersResponseDto,
  })
  addGroupMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GroupIdParamDto,
    @Body() payload: AddGroupMemberRequestDto,
  ) {
    return this.commandBus.execute(
      new AddGroupMemberCommand(user, params.groupId, payload),
    );
  }

  @RequireRoles('admin')
  @Delete(':groupId/members/:userId')
  @ApiOperation({ summary: '그룹에서 멤버를 제거합니다.' })
  @ZodResponse({
    status: 200,
    description: '업데이트된 그룹 멤버 목록',
    type: GroupMembersResponseDto,
  })
  removeGroupMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GroupMemberParamDto,
  ) {
    return this.commandBus.execute(
      new RemoveGroupMemberCommand(user, params.groupId, params.userId),
    );
  }

  @Get(':groupId/data_sources')
  @ApiOperation({ summary: '그룹 데이터소스를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '그룹 데이터소스 목록',
    type: GroupDataSourcesResponseDto,
  })
  getGroupDataSources(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GroupIdParamDto,
  ) {
    return this.queryBus.execute(
      new GetGroupDataSourcesQuery(user, params.groupId),
    );
  }

  @RequireRoles('admin')
  @Post(':groupId/data_sources')
  @ApiOperation({ summary: '그룹에 데이터소스를 추가합니다.' })
  @ZodResponse({
    status: 201,
    description: '업데이트된 그룹 데이터소스 목록',
    type: GroupDataSourcesResponseDto,
  })
  addGroupDataSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GroupIdParamDto,
    @Body() payload: AddGroupDataSourceRequestDto,
  ) {
    return this.commandBus.execute(
      new AddGroupDataSourceCommand(user, params.groupId, payload),
    );
  }

  @RequireRoles('admin')
  @Post(':groupId/data_sources/:dataSourceId')
  @ApiOperation({ summary: '그룹 데이터소스 권한을 수정합니다.' })
  @ZodResponse({
    status: 201,
    description: '업데이트된 그룹 데이터소스 목록',
    type: GroupDataSourcesResponseDto,
  })
  updateGroupDataSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GroupDataSourceParamDto,
    @Body() payload: UpdateGroupDataSourceRequestDto,
  ) {
    return this.commandBus.execute(
      new UpdateGroupDataSourceCommand(
        user,
        params.groupId,
        params.dataSourceId,
        payload,
      ),
    );
  }

  @RequireRoles('admin')
  @Delete(':groupId/data_sources/:dataSourceId')
  @ApiOperation({ summary: '그룹에서 데이터소스를 제거합니다.' })
  @ZodResponse({
    status: 200,
    description: '업데이트된 그룹 데이터소스 목록',
    type: GroupDataSourcesResponseDto,
  })
  removeGroupDataSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GroupDataSourceParamDto,
  ) {
    return this.commandBus.execute(
      new RemoveGroupDataSourceCommand(
        user,
        params.groupId,
        params.dataSourceId,
      ),
    );
  }
}
