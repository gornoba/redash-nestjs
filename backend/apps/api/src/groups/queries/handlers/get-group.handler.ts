import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetGroupQuery } from '../get-group.query';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@QueryHandler(GetGroupQuery)
export class GetGroupHandler implements IQueryHandler<GetGroupQuery> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(query: GetGroupQuery) {
    const [group, users] = await Promise.all([
      this.groupsRepository.getGroupById(
        query.currentUser.orgId,
        query.groupId,
      ),
      this.groupsRepository.getUsers(query.currentUser.orgId),
    ]);

    this.groupsService.ensureCanAccessGroup(query.currentUser, group.id);

    return {
      group: this.groupsService.serializeGroup(
        group,
        users.filter((user) => (user.groupIds ?? []).includes(group.id)).length,
      ),
    };
  }
}
