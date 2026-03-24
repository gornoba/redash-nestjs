import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  AddDashboardWidgetRequestDto,
  AddDashboardWidgetResponseDto,
  DashboardIdParamDto,
} from '../dto/add-dashboard-widget.dto';
import { CreateDashboardRequestDto } from '../dto/create-dashboard.dto';
import { DashboardDetailResponseDto } from '../dto/dashboard-detail-response.dto';
import { DashboardListQueryDto } from '../dto/dashboard-list-query.schema';
import {
  DashboardListItemResponseDto,
  DashboardListResponseDto,
} from '../dto/dashboard-list-response.dto';
import {
  DashboardRefreshIdParamDto,
  DashboardRefreshResponseDto,
  DashboardRefreshStatusResponseDto,
} from '../dto/dashboard-refresh.dto';
import { DashboardTagsResponseDto } from '../dto/dashboard-tags-response.dto';
import { FavoriteDashboardsResponseDto } from '../dto/favorite-dashboards-response.dto';
import { UpdateDashboardRequestDto } from '../dto/update-dashboard.dto';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('dashboards')
@Controller('dashboards')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @RequirePermissions('list_dashboards')
  @Get()
  @ApiOperation({ summary: '대시보드 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '대시보드 목록',
    type: DashboardListResponseDto,
  })
  getDashboards(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardListQueryDto,
  ) {
    return this.dashboardService.getDashboards(user, 'all', query);
  }

  @RequirePermissions('list_dashboards')
  @Get('my')
  @ApiOperation({ summary: '내 대시보드 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '내 대시보드 목록',
    type: DashboardListResponseDto,
  })
  getMyDashboards(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardListQueryDto,
  ) {
    return this.dashboardService.getDashboards(user, 'my', query);
  }

  @RequirePermissions('list_dashboards')
  @Get('favorites')
  @ApiOperation({ summary: '즐겨찾기 대시보드 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '즐겨찾기 대시보드 목록',
    type: FavoriteDashboardsResponseDto,
  })
  getFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardListQueryDto,
  ) {
    return this.dashboardService.getDashboards(user, 'favorites', query);
  }

  @RequirePermissions('list_dashboards')
  @Get('tags')
  @ApiOperation({ summary: '대시보드 태그 목록과 사용 횟수를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '대시보드 태그 목록',
    type: DashboardTagsResponseDto,
  })
  getDashboardTags(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getDashboardTags(user);
  }

  @RequirePermissions('create_dashboard')
  @Post()
  @ApiOperation({ summary: '새 대시보드를 생성합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 대시보드',
    type: DashboardListItemResponseDto,
  })
  createDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateDashboardRequestDto,
  ) {
    return this.dashboardService.createDashboard(user, payload);
  }

  @RequirePermissions('edit_dashboard')
  @Post(':dashboardId')
  @ApiOperation({ summary: '대시보드 정보를 수정합니다.' })
  @ZodResponse({
    status: 200,
    description: '수정된 대시보드',
    type: DashboardListItemResponseDto,
  })
  updateDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DashboardIdParamDto,
    @Body() payload: UpdateDashboardRequestDto,
  ) {
    return this.dashboardService.updateDashboard(
      user,
      params.dashboardId,
      payload,
    );
  }

  @RequirePermissions('list_dashboards')
  @Get(':dashboardId')
  @ApiOperation({ summary: '대시보드 상세를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '대시보드 상세',
    type: DashboardDetailResponseDto,
  })
  getDashboardDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DashboardIdParamDto,
  ) {
    return this.dashboardService.getDashboardDetail(user, params.dashboardId);
  }

  @RequirePermissions('execute_query')
  @Post(':dashboardId/refresh')
  @ApiOperation({ summary: '대시보드에 포함된 쿼리들을 즉시 새로고침합니다.' })
  @ZodResponse({
    status: 201,
    description: '큐에 등록된 대시보드 새로고침 작업',
    type: DashboardRefreshResponseDto,
  })
  refreshDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DashboardIdParamDto,
  ) {
    return this.dashboardService.refreshDashboard(user, params.dashboardId);
  }

  @RequirePermissions('execute_query')
  @Get('refreshes/:dashboardRefreshId')
  @ApiOperation({ summary: '대시보드 새로고침 상태를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '대시보드 새로고침 상태',
    type: DashboardRefreshStatusResponseDto,
  })
  getDashboardRefreshStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DashboardRefreshIdParamDto,
  ) {
    return this.dashboardService.getDashboardRefreshStatus(
      user,
      params.dashboardRefreshId,
    );
  }

  @RequirePermissions('list_dashboards')
  @Post(':dashboardId/favorite')
  @ApiOperation({ summary: '대시보드를 즐겨찾기에 추가합니다.' })
  @ZodResponse({
    status: 201,
    description: '즐겨찾기 추가된 대시보드',
    type: DashboardListItemResponseDto,
  })
  favoriteDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DashboardIdParamDto,
  ) {
    return this.dashboardService.favoriteDashboard(user, params.dashboardId);
  }

  @RequirePermissions('list_dashboards')
  @Delete(':dashboardId/favorite')
  @ApiOperation({ summary: '대시보드를 즐겨찾기에서 제거합니다.' })
  @ZodResponse({
    status: 200,
    description: '즐겨찾기 제거된 대시보드',
    type: DashboardListItemResponseDto,
  })
  unfavoriteDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DashboardIdParamDto,
  ) {
    return this.dashboardService.unfavoriteDashboard(user, params.dashboardId);
  }

  @RequirePermissions('edit_dashboard')
  @Delete(':dashboardId')
  @ApiOperation({ summary: '대시보드를 아카이브합니다.' })
  @ZodResponse({
    status: 200,
    description: '아카이브된 대시보드',
    type: DashboardListItemResponseDto,
  })
  archiveDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DashboardIdParamDto,
  ) {
    return this.dashboardService.archiveDashboard(user, params.dashboardId);
  }

  @RequirePermissions('edit_dashboard')
  @Post(':dashboardId/widgets')
  @ApiOperation({ summary: '대시보드에 시각화 위젯을 추가합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 위젯',
    type: AddDashboardWidgetResponseDto,
  })
  addWidget(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DashboardIdParamDto,
    @Body() payload: AddDashboardWidgetRequestDto,
  ) {
    return this.dashboardService.addWidget(
      user,
      params.dashboardId,
      payload.visualization_id,
    );
  }
}
