import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { RequireRoles } from '@app/common/decorators/roles.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  OrganizationSettingsResponseDto,
  SettingsAccountResponseDto,
  SettingsDataSourcesResponseDto,
  SettingsDestinationsResponseDto,
  SettingsGroupsResponseDto,
  SettingsMenuResponseDto,
  SettingsQuerySnippetIdParamDto,
  SettingsQuerySnippetItemDto,
  SettingsQuerySnippetsResponseDto,
  SettingsUsersResponseDto,
  SaveQuerySnippetRequestDto,
  UpdateOrganizationSettingsDto,
} from '../dto/settings-response.dto';
import { SettingsService } from '../services/settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('menu')
  @ApiOperation({ summary: '권한에 따른 settings 메뉴를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '설정 메뉴',
    type: SettingsMenuResponseDto,
  })
  getMenu(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getMenu(user);
  }

  @Get('account')
  @ApiOperation({ summary: '현재 사용자 account 정보를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '계정 정보',
    type: SettingsAccountResponseDto,
  })
  getAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getAccount(user);
  }

  @RequireRoles('admin')
  @Get('organization')
  @ApiOperation({ summary: '일반 설정 값을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '조직 설정',
    type: OrganizationSettingsResponseDto,
  })
  getOrganizationSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getOrganizationSettings(user);
  }

  @RequireRoles('admin')
  @Post('organization')
  @ApiOperation({ summary: '일반 설정 값을 저장합니다.' })
  @ZodResponse({
    status: 201,
    description: '저장된 조직 설정',
    type: OrganizationSettingsResponseDto,
  })
  updateOrganizationSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpdateOrganizationSettingsDto,
  ) {
    return this.settingsService.updateOrganizationSettings(user, payload);
  }

  @RequirePermissions('list_users')
  @Get('users')
  @ApiOperation({ summary: 'settings users 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '사용자 목록',
    type: SettingsUsersResponseDto,
  })
  getUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getUsers(user);
  }

  @Get('groups')
  @ApiOperation({ summary: 'settings groups 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '그룹 목록',
    type: SettingsGroupsResponseDto,
  })
  getGroups(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getGroups(user);
  }

  @Get('data-sources')
  @ApiOperation({ summary: 'settings data sources 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '데이터 소스 목록',
    type: SettingsDataSourcesResponseDto,
  })
  getDataSources(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getDataSources(user);
  }

  @RequirePermissions('list_alerts')
  @Get('destinations')
  @ApiOperation({ summary: 'settings alert destinations 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '알림 목적지 목록',
    type: SettingsDestinationsResponseDto,
  })
  getDestinations(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getDestinations(user);
  }

  @Get('query-snippets')
  @ApiOperation({ summary: 'settings query snippets 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '쿼리 스니펫 목록',
    type: SettingsQuerySnippetsResponseDto,
  })
  getQuerySnippets(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getQuerySnippets(user);
  }

  @Post('query-snippets')
  @ApiOperation({ summary: '새 query snippet을 생성합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 쿼리 스니펫',
    type: SettingsQuerySnippetItemDto,
  })
  createQuerySnippet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: SaveQuerySnippetRequestDto,
  ) {
    return this.settingsService.createQuerySnippet(user, payload);
  }

  @Post('query-snippets/:snippetId')
  @ApiOperation({ summary: 'query snippet을 수정합니다.' })
  @ZodResponse({
    status: 201,
    description: '수정된 쿼리 스니펫',
    type: SettingsQuerySnippetItemDto,
  })
  updateQuerySnippet(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: SettingsQuerySnippetIdParamDto,
    @Body() payload: SaveQuerySnippetRequestDto,
  ) {
    return this.settingsService.updateQuerySnippet(
      user,
      params.snippetId,
      payload,
    );
  }

  @Delete('query-snippets/:snippetId')
  @HttpCode(204)
  @ApiOperation({ summary: 'query snippet을 삭제합니다.' })
  deleteQuerySnippet(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: SettingsQuerySnippetIdParamDto,
  ) {
    return this.settingsService.deleteQuerySnippet(user, params.snippetId);
  }
}
