import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import {
  hashPassword,
  verifyPasswordHash,
} from '@app/common/utils/password.util';
import { UpdateUserCommand } from '../update-user.command';
import { UsersRepository } from '../../repositories/users.repository';
import { UsersService } from '../../services/users.service';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
  ) {}

  async execute(command: UpdateUserCommand) {
    const user = await this.usersRepository.getUserByIdAndOrg(
      command.userId,
      command.currentUser.orgId,
    );

    if (!this.usersService.canManageUser(command.currentUser, user)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    if (command.payload.name !== undefined) {
      user.name = command.payload.name.trim();
    }

    if (command.payload.email !== undefined) {
      const nextEmail = command.payload.email.trim().toLowerCase();

      if (nextEmail !== user.email) {
        const existingUser = await this.usersRepository.findUserByEmail(
          command.currentUser.orgId,
          nextEmail,
        );

        if (existingUser && existingUser.id !== user.id) {
          throw new ConflictException('Email already taken.');
        }

        user.email = nextEmail;
      }
    }

    if (command.payload.group_ids !== undefined) {
      if (!command.currentUser.roles.includes('admin')) {
        throw new ForbiddenException(
          'Must be admin to change groups membership.',
        );
      }

      const validGroups = await this.usersRepository.getGroupsByIds(
        command.currentUser.orgId,
        command.payload.group_ids,
      );

      if (validGroups.length !== command.payload.group_ids.length) {
        throw new BadRequestException('One or more group ids are invalid.');
      }

      user.groupIds =
        command.payload.group_ids.length > 0
          ? command.payload.group_ids
          : user.groupIds;
    }

    if (command.payload.password !== undefined) {
      if (command.currentUser.id !== user.id) {
        throw new ForbiddenException(
          'Must provide current password to update password.',
        );
      }

      if (!command.payload.old_password || !user.passwordHash) {
        throw new ForbiddenException(
          'Must provide current password to update password.',
        );
      }

      const isCurrentPasswordValid = await verifyPasswordHash(
        command.payload.old_password,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Wrong password.');
      }

      user.passwordHash = await hashPassword(command.payload.password);
    }

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
