import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { SendPasswordResetCommand } from '../send-password-reset.command';
import { UsersRepository } from '../../repositories/users.repository';
import { UsersService } from '../../services/users.service';

@CommandHandler(SendPasswordResetCommand)
export class SendPasswordResetHandler implements ICommandHandler<SendPasswordResetCommand> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
  ) {}

  async execute(command: SendPasswordResetCommand) {
    if (!command.currentUser.roles.includes('admin')) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const user = await this.usersRepository.getUserByIdAndOrg(
      command.userId,
      command.currentUser.orgId,
    );

    if (user.disabledAt) {
      throw new NotFoundException('Not found');
    }

    const resetLink = await this.usersService.buildLink(user.id, 'reset');
    const mailSent = await this.usersService.sendResetPasswordEmail({
      resetLink,
      userEmail: user.email,
      userName: user.name,
    });
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
          command.currentUser.id === user.id ||
          command.currentUser.roles.includes('admin'),
        ...(mailSent ? {} : { resetLink }),
      }),
      all_groups: allGroups.map((group) => ({
        id: group.id,
        name: group.name,
      })),
    };
  }
}
