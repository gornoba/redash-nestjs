import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  CreateWidgetRequestDto,
  UpdateWidgetRequestDto,
  WidgetIdParamDto,
  WidgetResponseDto,
} from '../dto/widget.dto';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('widgets')
@Controller('widgets')
export class WidgetController {
  constructor(private readonly dashboardService: DashboardService) {}

  @RequirePermissions('edit_dashboard')
  @Post()
  @ApiOperation({ summary: '대시보드 위젯을 생성합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 위젯',
    type: WidgetResponseDto,
  })
  createWidget(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateWidgetRequestDto,
  ) {
    return this.dashboardService.createWidget(user, payload);
  }

  @RequirePermissions('edit_dashboard')
  @Post(':widgetId')
  @ApiOperation({ summary: '대시보드 위젯을 수정합니다.' })
  @ZodResponse({
    status: 200,
    description: '수정된 위젯',
    type: WidgetResponseDto,
  })
  updateWidget(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: WidgetIdParamDto,
    @Body() payload: UpdateWidgetRequestDto,
  ) {
    return this.dashboardService.updateWidget(user, params.widgetId, payload);
  }

  @RequirePermissions('edit_dashboard')
  @Delete(':widgetId')
  @ApiOperation({ summary: '대시보드 위젯을 삭제합니다.' })
  @ZodResponse({
    status: 200,
    description: '삭제된 위젯',
    type: WidgetResponseDto,
  })
  deleteWidget(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: WidgetIdParamDto,
  ) {
    return this.dashboardService.deleteWidget(user, params.widgetId);
  }
}
