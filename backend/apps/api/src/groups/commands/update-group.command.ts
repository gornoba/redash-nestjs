import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { UpdateGroupRequestDto } from '../dto/groups.dto';

export class UpdateGroupCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly groupId: number,
    public readonly payload: UpdateGroupRequestDto,
  ) {}
}
