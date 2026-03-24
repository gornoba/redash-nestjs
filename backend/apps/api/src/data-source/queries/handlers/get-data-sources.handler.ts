import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetDataSourcesQuery } from '../get-data-sources.query';
import { DataSourceRepository } from '../../repositories/data-source.repository';
import { DataSourceService } from '../../services/data-source.service';

@QueryHandler(GetDataSourcesQuery)
export class GetDataSourcesHandler implements IQueryHandler<GetDataSourcesQuery> {
  constructor(
    private readonly dataSourceRepository: DataSourceRepository,
    private readonly dataSourceService: DataSourceService,
  ) {}

  async execute(query: GetDataSourcesQuery) {
    // 목록 조회는 데이터 소스 자체와 group permission 을 함께 봐야 해서
    // 단순 repository 조회 결과를 그대로 노출하지 않는다.
    const dataSources = await this.dataSourceRepository.getDataSources(
      query.user.orgId,
    );
    const dataSourceGroups =
      await this.dataSourceRepository.getDataSourceGroupsByDataSourceIds(
        dataSources.map((dataSource) => dataSource.id),
      );
    const groupsByDataSourceId = new Map<
      number,
      Array<(typeof dataSourceGroups)[number]>
    >();

    for (const group of dataSourceGroups) {
      const currentGroups = groupsByDataSourceId.get(group.dataSourceId) ?? [];
      currentGroups.push(group);
      groupsByDataSourceId.set(group.dataSourceId, currentGroups);
    }

    return dataSources
      .map((dataSource) => {
        const matchingGroups = query.user.roles.includes('admin')
          ? (groupsByDataSourceId.get(dataSource.id) ?? [])
          : (groupsByDataSourceId.get(dataSource.id) ?? []).filter((group) =>
              query.user.groupIds.includes(group.groupId),
            );

        if (
          !query.user.roles.includes('admin') &&
          matchingGroups.length === 0
        ) {
          return null;
        }

        const canViewQuery =
          query.user.roles.includes('admin') ||
          matchingGroups.some((group) =>
            (group.group?.permissions ?? []).includes('view_query'),
          );
        const canExecuteQuery =
          query.user.roles.includes('admin') ||
          matchingGroups.some(
            (group) =>
              !group.viewOnly &&
              (group.group?.permissions ?? []).includes('execute_query'),
          );
        const definition = this.dataSourceService.getDefinitionOrThrow(
          dataSource.type,
        );

        return {
          id: dataSource.id,
          name: dataSource.name,
          type: dataSource.type,
          paused: false,
          pause_reason: null,
          syntax: definition.syntax,
          supports_auto_limit: definition.supports_auto_limit,
          view_only:
            matchingGroups.length > 0
              ? matchingGroups.every((group) => group.viewOnly)
              : false,
          can_view_query: canViewQuery,
          can_execute_query: canExecuteQuery,
        };
      })
      .filter(
        (dataSource): dataSource is NonNullable<typeof dataSource> =>
          dataSource !== null,
      );
  }
}
