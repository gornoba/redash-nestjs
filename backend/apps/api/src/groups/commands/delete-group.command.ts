import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export class DeleteGroupCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly groupId: number,
  ) {}
}
