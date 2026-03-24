import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { AddGroupMemberRequestDto } from '../dto/groups.dto';

export class AddGroupMemberCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly groupId: number,
    public readonly payload: AddGroupMemberRequestDto,
  ) {}
}
