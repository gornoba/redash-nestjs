import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export class RemoveGroupMemberCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly groupId: number,
    public readonly userId: number,
  ) {}
}
