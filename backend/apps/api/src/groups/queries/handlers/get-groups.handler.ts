import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetGroupsQuery } from '../get-groups.query';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@QueryHandler(GetGroupsQuery)
export class GetGroupsHandler implements IQueryHandler<GetGroupsQuery> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(query: GetGroupsQuery) {
    const [groups, users] = await Promise.all([
      this.groupsRepository.getGroups(query.currentUser.orgId),
      this.groupsRepository.getUsers(query.currentUser.orgId),
    ]);

    return {
      items: groups.map((group) =>
        this.groupsService.serializeGroup(
          group,
          users.filter((user) => (user.groupIds ?? []).includes(group.id))
            .length,
        ),
      ),
    };
  }
}
