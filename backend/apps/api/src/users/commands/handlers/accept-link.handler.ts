import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { hashPassword } from '@app/common/utils/password.util';
import { AcceptLinkCommand } from '../accept-link.command';
import { UsersRepository } from '../../repositories/users.repository';
import { UsersService } from '../../services/users.service';

@CommandHandler(AcceptLinkCommand)
export class AcceptLinkHandler implements ICommandHandler<AcceptLinkCommand> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
  ) {}

  async execute(command: AcceptLinkCommand) {
    const user = await this.usersService.getUserFromToken(
      command.token,
      command.mode,
    );
    const passwordHash = await hashPassword(command.payload.password);

    await this.usersRepository.acceptInvitation(user.id, passwordHash);

    return {
      message:
        command.mode === 'invite'
          ? '계정이 활성화되었습니다. 로그인해 주세요.'
          : '비밀번호가 변경되었습니다. 로그인해 주세요.',
    };
  }
}
