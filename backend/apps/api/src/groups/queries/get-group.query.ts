import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export class GetGroupQuery {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly groupId: number,
  ) {}
}
