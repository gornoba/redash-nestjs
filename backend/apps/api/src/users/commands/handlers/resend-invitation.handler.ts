import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ResendInvitationCommand } from '../resend-invitation.command';
import { UsersRepository } from '../../repositories/users.repository';
import { UsersService } from '../../services/users.service';

@CommandHandler(ResendInvitationCommand)
export class ResendInvitationHandler implements ICommandHandler<ResendInvitationCommand> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
  ) {}

  async execute(command: ResendInvitationCommand) {
    if (!command.currentUser.roles.includes('admin')) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const user = await this.usersRepository.getUserByIdAndOrg(
      command.userId,
      command.currentUser.orgId,
    );
    const organization = await this.usersRepository.getOrganizationById(
      command.currentUser.orgId,
    );
    const inviteLink = await this.usersService.buildLink(user.id, 'invite');
    const mailSent = await this.usersService.sendInvitationEmail({
      inviteLink,
      invitedUserEmail: user.email,
      invitedUserName: user.name,
      inviterEmail: command.currentUser.email,
      inviterName: command.currentUser.name,
      organizationName: organization.name,
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
        ...(mailSent ? {} : { inviteLink }),
      }),
      all_groups: allGroups.map((group) => ({
        id: group.id,
        name: group.name,
      })),
    };
  }
}
