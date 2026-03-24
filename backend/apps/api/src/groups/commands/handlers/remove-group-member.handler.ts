import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { RemoveGroupMemberCommand } from '../remove-group-member.command';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@CommandHandler(RemoveGroupMemberCommand)
export class RemoveGroupMemberHandler implements ICommandHandler<RemoveGroupMemberCommand> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(command: RemoveGroupMemberCommand) {
    this.groupsService.ensureAdmin(command.currentUser);

    const [group, user] = await Promise.all([
      this.groupsRepository.getGroupById(
        command.currentUser.orgId,
        command.groupId,
      ),
      this.groupsRepository.getUserById(
        command.currentUser.orgId,
        command.userId,
      ),
    ]);

    if (group.type === 'builtin' && command.currentUser.id === user.id) {
      throw new ForbiddenException(
        'Cannot remove yourself from a built-in group.',
      );
    }

    user.groupIds = (user.groupIds ?? []).filter((id) => id !== group.id);
    await this.groupsRepository.saveUser(user);

    const users = await this.groupsRepository.getUsers(
      command.currentUser.orgId,
    );

    return {
      group: this.groupsService.serializeGroup(
        group,
        users.filter((item) => (item.groupIds ?? []).includes(group.id)).length,
      ),
      members: users
        .filter((item) => (item.groupIds ?? []).includes(group.id))
        .map((item) => this.groupsService.serializeUser(item)),
    };
  }
}
