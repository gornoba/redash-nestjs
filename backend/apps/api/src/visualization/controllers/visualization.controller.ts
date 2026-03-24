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
import { Public } from '@app/common/decorators/public.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  PublicEmbedQueryDto,
  PublicEmbedResponseDto,
  SaveVisualizationRequestDto,
  VisualizationIdParamDto,
  VisualizationResponseDto,
} from '../dto/visualization.dto';
import { VisualizationService } from '../services/visualization.service';

@ApiTags('visualizations')
@Controller()
export class VisualizationController {
  constructor(private readonly visualizationService: VisualizationService) {}

  @RequirePermissions('edit_query')
  @Post('visualizations')
  @ApiOperation({ summary: '시각화를 생성합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 시각화',
    type: VisualizationResponseDto,
  })
  createVisualization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: SaveVisualizationRequestDto,
  ) {
    return this.visualizationService.createVisualization(user, payload);
  }

  @RequirePermissions('edit_query')
  @Post('visualizations/:visualizationId')
  @ApiOperation({ summary: '시각화를 수정합니다.' })
  @ZodResponse({
    status: 201,
    description: '수정된 시각화',
    type: VisualizationResponseDto,
  })
  updateVisualization(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: VisualizationIdParamDto,
    @Body() payload: SaveVisualizationRequestDto,
  ) {
    return this.visualizationService.updateVisualization(
      user,
      params.visualizationId,
      payload,
    );
  }

  @RequirePermissions('edit_query')
  @Delete('visualizations/:visualizationId')
  @ApiOperation({ summary: '시각화를 삭제합니다.' })
  @ZodResponse({
    status: 200,
    description: '삭제된 시각화',
    type: VisualizationResponseDto,
  })
  deleteVisualization(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: VisualizationIdParamDto,
  ) {
    return this.visualizationService.deleteVisualization(
      user,
      params.visualizationId,
    );
  }

  @Public()
  @Get('embed/query/:queryId/visualization/:visualizationId')
  @ApiOperation({ summary: '공개 임베드용 시각화와 최신 결과를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '공개 임베드 시각화',
    type: PublicEmbedResponseDto,
  })
  getPublicEmbed(
    @Param()
    params: {
      queryId: string;
      visualizationId: string;
    },
    @Query() query: PublicEmbedQueryDto,
  ) {
    return this.visualizationService.getPublicEmbed(
      Number(params.queryId),
      Number(params.visualizationId),
      query.api_key,
    );
  }
}
