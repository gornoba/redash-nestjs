import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetGroupDataSourcesQuery } from '../get-group-data-sources.query';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@QueryHandler(GetGroupDataSourcesQuery)
export class GetGroupDataSourcesHandler implements IQueryHandler<GetGroupDataSourcesQuery> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(query: GetGroupDataSourcesQuery) {
    const [group, dataSources] = await Promise.all([
      this.groupsRepository.getGroupById(
        query.currentUser.orgId,
        query.groupId,
      ),
      this.groupsRepository.getGroupDataSources(query.groupId),
    ]);

    this.groupsService.ensureCanAccessGroupDataSources(
      query.currentUser,
      group.id,
    );

    return {
      group: this.groupsService.serializeGroup(
        group,
        await this.groupsService.getMemberCount(group),
      ),
      data_sources: dataSources.map((item) => ({
        id: item.dataSource.id,
        name: item.dataSource.name,
        type: item.dataSource.type,
        view_only: item.viewOnly,
        created_at: item.dataSource.createdAt.toISOString(),
      })),
    };
  }
}
