import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UpdateGroupCommand } from '../update-group.command';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@CommandHandler(UpdateGroupCommand)
export class UpdateGroupHandler implements ICommandHandler<UpdateGroupCommand> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(command: UpdateGroupCommand) {
    this.groupsService.ensureAdmin(command.currentUser);

    const group = await this.groupsRepository.getGroupById(
      command.currentUser.orgId,
      command.groupId,
    );

    if (group.type === 'builtin') {
      throw new ForbiddenException('Cannot edit built-in group.');
    }

    const name = command.payload.name.trim();
    const existingGroup = await this.groupsRepository.findGroupByName(
      command.currentUser.orgId,
      name,
      group.id,
    );

    if (existingGroup) {
      throw new ConflictException('Group already exists.');
    }

    group.name = name;
    const savedGroup = await this.groupsRepository.saveGroup(group);

    return {
      group: this.groupsService.serializeGroup(
        savedGroup,
        await this.groupsService.getMemberCount(savedGroup),
      ),
    };
  }
}
