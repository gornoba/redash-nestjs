import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export class GetGroupDataSourcesQuery {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly groupId: number,
  ) {}
}
