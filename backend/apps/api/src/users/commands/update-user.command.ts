import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { UpdateUserRequestDto } from '../dto/users.dto';

export class UpdateUserCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly userId: number,
    public readonly payload: UpdateUserRequestDto,
  ) {}
}
