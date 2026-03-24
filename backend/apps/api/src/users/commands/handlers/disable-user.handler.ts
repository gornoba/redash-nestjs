import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DisableUserCommand } from '../disable-user.command';
import { UsersRepository } from '../../repositories/users.repository';
import { UsersService } from '../../services/users.service';

@CommandHandler(DisableUserCommand)
export class DisableUserHandler implements ICommandHandler<DisableUserCommand> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
  ) {}

  async execute(command: DisableUserCommand) {
    if (!command.currentUser.roles.includes('admin')) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const user = await this.usersRepository.getUserByIdAndOrg(
      command.userId,
      command.currentUser.orgId,
    );

    if (user.id === command.currentUser.id) {
      throw new ForbiddenException(
        'You cannot disable your own account. Please ask another admin to do this for you.',
      );
    }

    user.disabledAt = new Date();
    await this.usersRepository.saveUser(user);

    const [groups, allGroups] = await Promise.all([
      this.usersRepository.getGroupsByIds(
        command.currentUser.orgId,
        user.groupIds ?? [],
      ),
      this.usersRepository.getAllGroups(command.currentUser.orgId),
    ]);

    return {
      user: this.usersService.serializeUser(user, groups, {
        includeApiKey:
          command.currentUser.roles.includes('admin') ||
          command.currentUser.id === user.id,
      }),
      all_groups: allGroups.map((group) => ({
        id: group.id,
        name: group.name,
      })),
    };
  }
}
