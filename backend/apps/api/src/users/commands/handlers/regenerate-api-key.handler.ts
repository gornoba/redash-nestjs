import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomBytes } from 'crypto';

import { RegenerateApiKeyCommand } from '../regenerate-api-key.command';
import { UsersRepository } from '../../repositories/users.repository';
import { UsersService } from '../../services/users.service';

@CommandHandler(RegenerateApiKeyCommand)
export class RegenerateApiKeyHandler implements ICommandHandler<RegenerateApiKeyCommand> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
  ) {}

  async execute(command: RegenerateApiKeyCommand) {
    const user = await this.usersRepository.getUserByIdAndOrg(
      command.userId,
      command.currentUser.orgId,
    );

    if (!this.usersService.canManageUser(command.currentUser, user)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    user.apiKey = randomBytes(20).toString('hex');
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
