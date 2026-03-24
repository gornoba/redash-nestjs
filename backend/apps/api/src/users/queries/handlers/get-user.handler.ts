import { ForbiddenException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetUserQuery } from '../get-user.query';
import { UsersRepository } from '../../repositories/users.repository';
import { UsersService } from '../../services/users.service';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
  ) {}

  async execute(query: GetUserQuery) {
    const user = await this.usersRepository.getUserByIdAndOrg(
      query.userId,
      query.currentUser.orgId,
    );

    if (!this.usersService.canManageUser(query.currentUser, user)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const [groups, allGroups] = await Promise.all([
      this.usersRepository.getGroupsByIds(
        query.currentUser.orgId,
        user.groupIds ?? [],
      ),
      this.usersRepository.getAllGroups(query.currentUser.orgId),
    ]);

    return {
      user: this.usersService.serializeUser(user, groups, {
        includeApiKey:
          query.currentUser.roles.includes('admin') ||
          query.currentUser.id === user.id,
      }),
      all_groups: allGroups.map((group) => ({
        id: group.id,
        name: group.name,
      })),
    };
  }
}
