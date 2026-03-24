import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  AlertIdParamDto,
  AlertListQueryDto,
  AlertListResponseDto,
  AlertResponseDto,
  AlertSubscriptionListResponseDto,
  AlertSubscriptionParamDto,
  AlertSubscriptionResponseDto,
  CreateAlertSubscriptionRequestDto,
  SaveAlertRequestDto,
} from '../dto/alerts.dto';
import { AlertsService } from '../services/alerts.service';

@ApiTags('alerts')
@Controller('alerts')
@RequirePermissions('list_alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: '알림 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '알림 목록',
    type: AlertListResponseDto,
  })
  getAlerts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AlertListQueryDto,
  ) {
    return this.alertsService.getAlerts(user, query);
  }

  @Post()
  @ApiOperation({ summary: '새 알림을 생성합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 알림',
    type: AlertResponseDto,
  })
  createAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: SaveAlertRequestDto,
  ) {
    return this.alertsService.createAlert(user, payload);
  }

  @Get(':alertId')
  @ApiOperation({ summary: '알림 상세를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '알림 상세',
    type: AlertResponseDto,
  })
  getAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AlertIdParamDto,
  ) {
    return this.alertsService.getAlert(user, params.alertId);
  }

  @Post(':alertId')
  @ApiOperation({ summary: '알림을 수정합니다.' })
  @ZodResponse({
    status: 201,
    description: '수정된 알림',
    type: AlertResponseDto,
  })
  updateAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AlertIdParamDto,
    @Body() payload: SaveAlertRequestDto,
  ) {
    return this.alertsService.updateAlert(user, params.alertId, payload);
  }

  @Delete(':alertId')
  @HttpCode(204)
  @ApiOperation({ summary: '알림을 삭제합니다.' })
  deleteAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AlertIdParamDto,
  ) {
    return this.alertsService.deleteAlert(user, params.alertId);
  }

  @Post(':alertId/mute')
  @HttpCode(204)
  @ApiOperation({ summary: '알림을 음소거합니다.' })
  muteAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AlertIdParamDto,
  ) {
    return this.alertsService.muteAlert(user, params.alertId, true);
  }

  @Delete(':alertId/mute')
  @HttpCode(204)
  @ApiOperation({ summary: '알림 음소거를 해제합니다.' })
  unmuteAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AlertIdParamDto,
  ) {
    return this.alertsService.muteAlert(user, params.alertId, false);
  }

  @Get(':alertId/subscriptions')
  @ApiOperation({ summary: '알림 구독 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '알림 구독 목록',
    type: AlertSubscriptionListResponseDto,
  })
  getSubscriptions(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AlertIdParamDto,
  ) {
    return this.alertsService.getSubscriptions(user, params.alertId);
  }

  @Post(':alertId/subscriptions')
  @ApiOperation({ summary: '알림 구독을 추가합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 구독',
    type: AlertSubscriptionResponseDto,
  })
  createSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AlertIdParamDto,
    @Body() payload: CreateAlertSubscriptionRequestDto,
  ) {
    return this.alertsService.createSubscription(user, params.alertId, payload);
  }

  @Delete(':alertId/subscriptions/:subscriptionId')
  @HttpCode(204)
  @ApiOperation({ summary: '알림 구독을 삭제합니다.' })
  deleteSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AlertSubscriptionParamDto,
  ) {
    return this.alertsService.deleteSubscription(
      user,
      params.alertId,
      params.subscriptionId,
    );
  }
}
