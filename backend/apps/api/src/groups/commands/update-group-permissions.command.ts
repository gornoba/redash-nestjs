import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { UpdateGroupPermissionsRequestDto } from '../dto/groups.dto';

export class UpdateGroupPermissionsCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly groupId: number,
    public readonly payload: UpdateGroupPermissionsRequestDto,
  ) {}
}
