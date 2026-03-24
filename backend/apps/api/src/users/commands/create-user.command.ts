import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { CreateUserRequestDto } from '../dto/users.dto';

export class CreateUserCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly payload: CreateUserRequestDto,
  ) {}
}
