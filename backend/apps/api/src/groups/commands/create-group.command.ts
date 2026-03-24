import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { CreateGroupRequestDto } from '../dto/groups.dto';

export class CreateGroupCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly payload: CreateGroupRequestDto,
  ) {}
}
