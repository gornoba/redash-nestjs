import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CreateGroupCommand } from '../create-group.command';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@CommandHandler(CreateGroupCommand)
export class CreateGroupHandler implements ICommandHandler<CreateGroupCommand> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(command: CreateGroupCommand) {
    this.groupsService.ensureAdmin(command.currentUser);

    const name = command.payload.name.trim();

    if (!name) {
      throw new BadRequestException('Group name is required.');
    }

    const existingGroup = await this.groupsRepository.findGroupByName(
      command.currentUser.orgId,
      name,
    );

    if (existingGroup) {
      throw new ConflictException('Group already exists.');
    }

    const group = this.groupsRepository.createGroup({
      name,
      orgId: command.currentUser.orgId,
      permissions: [],
      type: 'regular',
    });

    const savedGroup = await this.groupsRepository.saveGroup(group);

    return {
      group: this.groupsService.serializeGroup(savedGroup, 0),
    };
  }
}
