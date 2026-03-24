import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { GROUP_PERMISSION_OPTIONS } from '../../groups.constants';
import { UpdateGroupPermissionsCommand } from '../update-group-permissions.command';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@CommandHandler(UpdateGroupPermissionsCommand)
export class UpdateGroupPermissionsHandler implements ICommandHandler<UpdateGroupPermissionsCommand> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(command: UpdateGroupPermissionsCommand) {
    this.groupsService.ensureAdmin(command.currentUser);

    const group = await this.groupsRepository.getGroupById(
      command.currentUser.orgId,
      command.groupId,
    );

    if (group.type === 'builtin') {
      throw new ForbiddenException('Cannot edit built-in group permissions.');
    }

    const requestedPermissions = new Set(command.payload.permissions);
    group.permissions = GROUP_PERMISSION_OPTIONS.filter((permission) =>
      requestedPermissions.has(permission),
    );
    const savedGroup = await this.groupsRepository.saveGroup(group);

    return {
      group: this.groupsService.serializeGroup(
        savedGroup,
        await this.groupsService.getMemberCount(savedGroup),
      ),
    };
  }
}
