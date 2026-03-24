import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  QueryDetailResponseDto,
  QueryIdParamDto,
  SaveQueryRequestDto,
  UpdateQueryScheduleRequestDto,
} from '../dto/query-detail.dto';
import {
  ExecuteQueryRequestDto,
  QueryExecutionResultDto,
  QueryResultIdParamDto,
  ExecuteQueryJobStatusResponseDto,
  ExecuteQueryResponseDto,
} from '../dto/query-execution.dto';
import { PublicQueryResultResponseDto } from '../dto/query-public-result.dto';
import { QueryListQueryDto } from '../dto/query-list-query.schema';
import { QueryListResponseDto } from '../dto/query-list-response.dto';
import { QueryTagsResponseDto } from '../dto/query-tags-response.dto';
import { QueryService } from '../services/query.service';

@ApiTags('queries')
@Controller('queries')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @RequirePermissions('view_query')
  @Get()
  @ApiOperation({ summary: '전체 쿼리 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '쿼리 목록',
    type: QueryListResponseDto,
  })
  getAllQueries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryListQueryDto,
  ) {
    return this.queryService.getQueries(user, 'all', query);
  }

  @RequirePermissions('view_query')
  @Get('my')
  @ApiOperation({ summary: '내 쿼리 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '내 쿼리 목록',
    type: QueryListResponseDto,
  })
  getMyQueries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryListQueryDto,
  ) {
    return this.queryService.getQueries(user, 'my', query);
  }

  @RequirePermissions('view_query')
  @Get('favorites')
  @ApiOperation({ summary: '즐겨찾기 쿼리 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '즐겨찾기 쿼리 목록',
    type: QueryListResponseDto,
  })
  getFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryListQueryDto,
  ) {
    return this.queryService.getQueries(user, 'favorites', query);
  }

  @RequirePermissions('view_query')
  @Get('archive')
  @ApiOperation({ summary: '보관된 쿼리 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '보관된 쿼리 목록',
    type: QueryListResponseDto,
  })
  getArchivedQueries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryListQueryDto,
  ) {
    return this.queryService.getQueries(user, 'archive', query);
  }

  @RequirePermissions('view_query')
  @Get('tags')
  @ApiOperation({ summary: '쿼리 태그 목록과 사용 횟수를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '쿼리 태그 목록',
    type: QueryTagsResponseDto,
  })
  getQueryTags(@CurrentUser() user: AuthenticatedUser) {
    return this.queryService.getQueryTags(user);
  }

  @Get(':queryId/results.json')
  @ApiOperation({ summary: '쿼리 API Key로 최신 JSON 결과를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '공개 쿼리 결과(JSON)',
    type: PublicQueryResultResponseDto,
  })
  getPublicQueryResultJson(
    @Param() params: QueryIdParamDto,
    @Query('api_key') apiKey: string,
  ) {
    return this.queryService.getPublicQueryResult(params.queryId, apiKey);
  }

  @Get(':queryId/results.csv')
  @ApiOperation({ summary: '쿼리 API Key로 최신 CSV 결과를 조회합니다.' })
  async getPublicQueryResultCsv(
    @Param() params: QueryIdParamDto,
    @Query('api_key') apiKey: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const csv = await this.queryService.getPublicQueryResultCsv(
      params.queryId,
      apiKey,
    );

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    return csv;
  }

  @RequirePermissions('execute_query')
  @Get('jobs/:jobId')
  @ApiOperation({ summary: '쿼리 실행 작업 상태를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '쿼리 실행 작업 상태',
    type: ExecuteQueryJobStatusResponseDto,
  })
  getQueryExecutionJobStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
  ) {
    return this.queryService.getQueryExecutionJobStatus(user, jobId);
  }

  @RequirePermissions('view_query')
  @Get('results/:queryResultId')
  @ApiOperation({ summary: '쿼리 실행 결과를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '쿼리 실행 결과',
    type: QueryExecutionResultDto,
  })
  getQueryExecutionResult(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: QueryResultIdParamDto,
  ) {
    return this.queryService.getQueryExecutionResult(
      user,
      params.queryResultId,
    );
  }

  @RequirePermissions('view_query')
  @Get(':queryId')
  @ApiOperation({ summary: '쿼리 상세 정보를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '쿼리 상세',
    type: QueryDetailResponseDto,
  })
  getQueryDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: QueryIdParamDto,
  ) {
    return this.queryService.getQueryDetail(user, params.queryId);
  }

  @RequirePermissions('view_query')
  @Post(':queryId/favorite')
  @ApiOperation({ summary: '쿼리를 즐겨찾기에 추가합니다.' })
  @ZodResponse({
    status: 201,
    description: '즐겨찾기 추가된 쿼리 상세',
    type: QueryDetailResponseDto,
  })
  favoriteQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: QueryIdParamDto,
  ) {
    return this.queryService.favoriteQuery(user, params.queryId);
  }

  @RequirePermissions('view_query')
  @Delete(':queryId/favorite')
  @ApiOperation({ summary: '쿼리를 즐겨찾기에서 제거합니다.' })
  @ZodResponse({
    status: 200,
    description: '즐겨찾기 제거된 쿼리 상세',
    type: QueryDetailResponseDto,
  })
  unfavoriteQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: QueryIdParamDto,
  ) {
    return this.queryService.unfavoriteQuery(user, params.queryId);
  }

  @RequirePermissions('execute_query')
  @Post('results')
  @ApiOperation({ summary: '쿼리 실행 작업을 큐에 등록합니다.' })
  @ZodResponse({
    status: 201,
    description: '큐에 등록된 쿼리 실행 작업',
    type: ExecuteQueryResponseDto,
  })
  executeQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: ExecuteQueryRequestDto,
  ) {
    return this.queryService.executeQuery(user, payload);
  }

  @RequirePermissions('create_query')
  @Post()
  @ApiOperation({ summary: '새 쿼리를 생성합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 쿼리',
    type: QueryDetailResponseDto,
  })
  createQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: SaveQueryRequestDto,
  ) {
    return this.queryService.createQuery(user, payload);
  }

  @RequirePermissions('edit_query')
  @Post(':queryId')
  @ApiOperation({ summary: '기존 쿼리를 수정합니다.' })
  @ZodResponse({
    status: 201,
    description: '수정된 쿼리',
    type: QueryDetailResponseDto,
  })
  updateQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: QueryIdParamDto,
    @Body() payload: SaveQueryRequestDto,
  ) {
    return this.queryService.updateQuery(user, params.queryId, payload);
  }

  @RequirePermissions('schedule_query')
  @Post(':queryId/schedule')
  @ApiOperation({ summary: '쿼리 새로고침 일정을 수정합니다.' })
  @ZodResponse({
    status: 201,
    description: '일정이 수정된 쿼리',
    type: QueryDetailResponseDto,
  })
  updateQuerySchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: QueryIdParamDto,
    @Body() payload: UpdateQueryScheduleRequestDto,
  ) {
    return this.queryService.updateQuerySchedule(
      user,
      params.queryId,
      payload.schedule,
    );
  }

  @RequirePermissions('edit_query')
  @Delete(':queryId')
  @ApiOperation({ summary: '쿼리를 보관 처리합니다.' })
  @ZodResponse({
    status: 200,
    description: '보관된 쿼리',
    type: QueryDetailResponseDto,
  })
  archiveQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: QueryIdParamDto,
  ) {
    return this.queryService.archiveQuery(user, params.queryId);
  }

  @RequirePermissions('create_query')
  @Post(':queryId/fork')
  @ApiOperation({ summary: '쿼리를 복제합니다.' })
  @ZodResponse({
    status: 201,
    description: '복제된 쿼리',
    type: QueryDetailResponseDto,
  })
  forkQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: QueryIdParamDto,
  ) {
    return this.queryService.forkQuery(user, params.queryId);
  }

  @RequirePermissions('edit_query')
  @Post(':queryId/regenerate_api_key')
  @ApiOperation({ summary: '쿼리 API Key를 재발급합니다.' })
  @ZodResponse({
    status: 201,
    description: 'API Key가 재발급된 쿼리',
    type: QueryDetailResponseDto,
  })
  regenerateApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: QueryIdParamDto,
  ) {
    return this.queryService.regenerateApiKey(user, params.queryId);
  }
}
