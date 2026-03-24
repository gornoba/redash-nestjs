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
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  DestinationDetailResponseDto,
  DestinationIdParamDto,
  DestinationListResponseDto,
  DestinationTypeListResponseDto,
  SaveDestinationRequestDto,
} from '../dto/destinations.dto';
import { DestinationsService } from '../services/destinations.service';

@ApiTags('destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @RequirePermissions('list_alerts')
  @Get('types')
  @ApiOperation({ summary: '생성 가능한 알림 대상 타입 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '알림 대상 타입 목록',
    type: DestinationTypeListResponseDto,
  })
  getTypes() {
    return this.destinationsService.getTypes();
  }

  @RequirePermissions('list_alerts')
  @Get()
  @ApiOperation({ summary: '알림 대상 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '알림 대상 목록',
    type: DestinationListResponseDto,
  })
  getDestinations(@CurrentUser() user: AuthenticatedUser) {
    return this.destinationsService.getDestinations(user);
  }

  @RequirePermissions('list_alerts')
  @Get(':destinationId')
  @ApiOperation({ summary: '알림 대상 상세 정보를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '알림 대상 상세',
    type: DestinationDetailResponseDto,
  })
  getDestination(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DestinationIdParamDto,
  ) {
    return this.destinationsService.getDestination(user, params.destinationId);
  }

  @RequirePermissions('list_alerts')
  @Post()
  @ApiOperation({ summary: '새 알림 대상을 생성합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 알림 대상',
    type: DestinationDetailResponseDto,
  })
  createDestination(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: SaveDestinationRequestDto,
  ) {
    return this.destinationsService.createDestination(user, payload);
  }

  @RequirePermissions('list_alerts')
  @Post(':destinationId')
  @ApiOperation({ summary: '알림 대상을 수정합니다.' })
  @ZodResponse({
    status: 201,
    description: '수정된 알림 대상',
    type: DestinationDetailResponseDto,
  })
  updateDestination(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DestinationIdParamDto,
    @Body() payload: SaveDestinationRequestDto,
  ) {
    return this.destinationsService.updateDestination(
      user,
      params.destinationId,
      payload,
    );
  }

  @RequirePermissions('list_alerts')
  @Delete(':destinationId')
  @HttpCode(204)
  @ApiOperation({ summary: '알림 대상을 삭제합니다.' })
  deleteDestination(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DestinationIdParamDto,
  ) {
    return this.destinationsService.deleteDestination(
      user,
      params.destinationId,
    );
  }
}
