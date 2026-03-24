import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DeleteGroupCommand } from '../delete-group.command';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@CommandHandler(DeleteGroupCommand)
export class DeleteGroupHandler implements ICommandHandler<DeleteGroupCommand> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(command: DeleteGroupCommand) {
    this.groupsService.ensureAdmin(command.currentUser);

    const group = await this.groupsRepository.getGroupById(
      command.currentUser.orgId,
      command.groupId,
    );

    if (group.type === 'builtin') {
      throw new ForbiddenException('Cannot delete built-in group.');
    }

    const deletedGroup = this.groupsService.serializeGroup(
      group,
      await this.groupsService.getMemberCount(group),
    );

    await this.groupsRepository.deleteGroup(
      command.currentUser.orgId,
      command.groupId,
    );

    return { group: deletedGroup };
  }
}
