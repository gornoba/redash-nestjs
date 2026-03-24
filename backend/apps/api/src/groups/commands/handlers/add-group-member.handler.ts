import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { AddGroupMemberCommand } from '../add-group-member.command';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@CommandHandler(AddGroupMemberCommand)
export class AddGroupMemberHandler implements ICommandHandler<AddGroupMemberCommand> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(command: AddGroupMemberCommand) {
    this.groupsService.ensureAdmin(command.currentUser);

    const [group, user] = await Promise.all([
      this.groupsRepository.getGroupById(
        command.currentUser.orgId,
        command.groupId,
      ),
      this.groupsRepository.getUserById(
        command.currentUser.orgId,
        command.payload.user_id,
      ),
    ]);

    if (!(user.groupIds ?? []).includes(group.id)) {
      user.groupIds = [...(user.groupIds ?? []), group.id].sort(
        (a, b) => a - b,
      );
      await this.groupsRepository.saveUser(user);
    }

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
