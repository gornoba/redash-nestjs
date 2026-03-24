import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { isUserInvitationPending } from '@app/common/utils/user-details';
import { DeleteUserCommand } from '../delete-user.command';
import { UsersRepository } from '../../repositories/users.repository';
import { UsersService } from '../../services/users.service';

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
  ) {}

  async execute(command: DeleteUserCommand) {
    if (!command.currentUser.roles.includes('admin')) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const user = await this.usersRepository.getUserByIdAndOrg(
      command.userId,
      command.currentUser.orgId,
    );

    if (user.id === command.currentUser.id) {
      throw new ForbiddenException(
        'You cannot delete your own account. Please ask another admin to do this for you.',
      );
    }

    if (!isUserInvitationPending(user.details)) {
      throw new ForbiddenException(
        'You cannot delete activated users. Please disable the user instead.',
      );
    }

    const groups = await this.usersRepository.getGroupsByIds(
      command.currentUser.orgId,
      user.groupIds ?? [],
    );
    const deletedUser = this.usersService.serializeUserSummary(
      user,
      groups,
      {},
    );

    await this.usersRepository.deleteUser(user);

    return deletedUser;
  }
}
