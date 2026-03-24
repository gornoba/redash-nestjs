import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { EnableUserCommand } from '../enable-user.command';
import { UsersRepository } from '../../repositories/users.repository';
import { UsersService } from '../../services/users.service';

@CommandHandler(EnableUserCommand)
export class EnableUserHandler implements ICommandHandler<EnableUserCommand> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
  ) {}

  async execute(command: EnableUserCommand) {
    if (!command.currentUser.roles.includes('admin')) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const user = await this.usersRepository.getUserByIdAndOrg(
      command.userId,
      command.currentUser.orgId,
    );

    user.disabledAt = null;
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
