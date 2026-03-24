import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { QueryEntity } from '@app/database/entities/query.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';
import { VisualizationEntity } from '@app/database/entities/visualization.entity';
import type { SaveVisualizationRequestDto } from '../dto/visualization.dto';

@Injectable()
export class VisualizationRepository {
  constructor(
    @InjectRepository(VisualizationEntity)
    private readonly visualizationRepository: Repository<VisualizationEntity>,
    @InjectRepository(QueryEntity)
    private readonly queryRepository: Repository<QueryEntity>,
    @InjectRepository(QueryResultEntity)
    private readonly queryResultRepository: Repository<QueryResultEntity>,
  ) {}

  async createVisualization(
    user: AuthenticatedUser,
    payload: SaveVisualizationRequestDto,
  ) {
    const query = await this.getEditableQuery(user, payload.query_id);
    const savedVisualization = await this.visualizationRepository.save(
      this.visualizationRepository.create({
        description: payload.description ?? null,
        name: payload.name.trim(),
        options: JSON.stringify(payload.options ?? {}),
        queryId: query.id,
        type: payload.type.trim(),
      }),
    );

    return this.serializeVisualization(savedVisualization);
  }

  async updateVisualization(
    user: AuthenticatedUser,
    visualizationId: number,
    payload: SaveVisualizationRequestDto,
  ) {
    const visualization = await this.visualizationRepository.findOneBy({
      id: visualizationId,
    });

    if (!visualization) {
      throw new NotFoundException('시각화를 찾을 수 없습니다.');
    }

    const query = await this.getEditableQuery(user, visualization.queryId);

    if (query.id !== payload.query_id) {
      throw new ForbiddenException('다른 쿼리의 시각화로 이동할 수 없습니다.');
    }

    visualization.type = payload.type.trim();
    visualization.name = payload.name.trim();
    visualization.description = payload.description ?? null;
    visualization.options = JSON.stringify(payload.options ?? {});

    const savedVisualization =
      await this.visualizationRepository.save(visualization);

    return this.serializeVisualization(savedVisualization);
  }

  async deleteVisualization(user: AuthenticatedUser, visualizationId: number) {
    const visualization = await this.visualizationRepository.findOneBy({
      id: visualizationId,
    });

    if (!visualization) {
      throw new NotFoundException('시각화를 찾을 수 없습니다.');
    }

    await this.getEditableQuery(user, visualization.queryId);
    const serializedVisualization = this.serializeVisualization(visualization);
    await this.visualizationRepository.remove(visualization);

    return serializedVisualization;
  }

  async getPublicEmbed(
    queryId: number,
    visualizationId: number,
    apiKey: string,
  ) {
    /* QueryEntity에서 직렬화에 필요한 최소 컬럼만 로딩 (queryText, searchVector 등 제외) */
    const visualization = await this.visualizationRepository
      .createQueryBuilder('visualization')
      .leftJoin('visualization.query', 'query')
      .addSelect([
        'query.id',
        'query.name',
        'query.apiKey',
        'query.latestQueryDataId',
      ])
      .where('visualization.id = :visualizationId', { visualizationId })
      .andWhere('visualization.query_id = :queryId', { queryId })
      .andWhere('query.api_key = :apiKey', { apiKey })
      .getOne();

    if (!visualization?.query) {
      throw new NotFoundException('임베드 가능한 시각화를 찾을 수 없습니다.');
    }

    const queryResult = visualization.query.latestQueryDataId
      ? await this.queryResultRepository.findOne({
          select: {
            id: true,
            dataSourceId: true,
            queryText: true,
            data: true,
            runtime: true,
            retrievedAt: true,
          },
          where: { id: visualization.query.latestQueryDataId },
        })
      : null;

    return {
      query: {
        id: visualization.query.id,
        name: visualization.query.name,
        api_key: visualization.query.apiKey,
      },
      visualization: this.serializeVisualization(visualization),
      query_result: queryResult
        ? {
            id: queryResult.id,
            data_source_id: queryResult.dataSourceId,
            query: queryResult.queryText,
            data: queryResult.data as {
              columns: Array<{
                friendly_name: string;
                name: string;
                type: string | null;
              }>;
              rows: Array<Record<string, unknown>>;
              truncated: boolean;
            },
            runtime: queryResult.runtime,
            retrieved_at: queryResult.retrievedAt.toISOString(),
          }
        : null,
    };
  }

  /** 권한 확인용 — id와 userId만 필요 */
  private async getEditableQuery(user: AuthenticatedUser, queryId: number) {
    const query = await this.queryRepository.findOne({
      select: { id: true, userId: true },
      where: { id: queryId, orgId: user.orgId },
    });

    if (!query) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    if (!this.canModifyQuery(user, query)) {
      throw new ForbiddenException('이 쿼리를 수정할 권한이 없습니다.');
    }

    return query;
  }

  private canModifyQuery(user: AuthenticatedUser, query: QueryEntity) {
    return user.roles.includes('admin') || query.userId === user.id;
  }

  private serializeVisualization(visualization: VisualizationEntity) {
    return {
      id: visualization.id,
      type: visualization.type,
      query_id: visualization.queryId,
      name: visualization.name,
      description: visualization.description,
      options: this.parseOptions(visualization.options),
      updated_at: visualization.updatedAt.toISOString(),
      created_at: visualization.createdAt.toISOString(),
    };
  }

  private parseOptions(value: string) {
    if (!value) {
      return {};
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }

    return {};
  }
}
