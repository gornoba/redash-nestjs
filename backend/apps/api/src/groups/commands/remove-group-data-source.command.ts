import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export class RemoveGroupDataSourceCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly groupId: number,
    public readonly dataSourceId: number,
  ) {}
}
