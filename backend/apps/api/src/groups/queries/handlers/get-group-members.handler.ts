import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetGroupMembersQuery } from '../get-group-members.query';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@QueryHandler(GetGroupMembersQuery)
export class GetGroupMembersHandler implements IQueryHandler<GetGroupMembersQuery> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(query: GetGroupMembersQuery) {
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
      members: users
        .filter((user) => (user.groupIds ?? []).includes(group.id))
        .map((user) => this.groupsService.serializeUser(user)),
    };
  }
}
