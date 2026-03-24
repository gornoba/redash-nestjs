import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CreateUserCommand } from '../create-user.command';
import { UsersRepository } from '../../repositories/users.repository';
import { UsersService } from '../../services/users.service';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
  ) {}

  async execute(command: CreateUserCommand) {
    const name = command.payload.name.trim();
    const email = command.payload.email.trim().toLowerCase();

    if (!name) {
      throw new BadRequestException('이름을 입력해주세요.');
    }

    if (!email.includes('@')) {
      throw new BadRequestException('유효한 이메일 주소를 입력해주세요.');
    }

    const existingUser = await this.usersRepository.findUserByEmail(
      command.currentUser.orgId,
      email,
    );

    if (existingUser) {
      throw new ConflictException('Email already taken.');
    }

    const defaultGroup = await this.usersRepository.getDefaultGroup(
      command.currentUser.orgId,
    );
    const organization = await this.usersRepository.getOrganizationById(
      command.currentUser.orgId,
    );
    const user = await this.usersRepository.createInvitedUser({
      orgId: command.currentUser.orgId,
      name,
      email,
      defaultGroupId: defaultGroup.id,
    });
    const inviteLink = await this.usersService.buildLink(user.id, 'invite');
    const mailSent = await this.usersService.sendInvitationEmail({
      inviteLink,
      invitedUserEmail: user.email,
      invitedUserName: user.name,
      inviterEmail: command.currentUser.email,
      inviterName: command.currentUser.name,
      organizationName: organization.name,
    });

    return this.usersService.serializeUserSummary(
      user,
      [
        {
          id: defaultGroup.id,
          name: defaultGroup.name,
        },
      ],
      mailSent ? {} : { inviteLink },
    );
  }
}
