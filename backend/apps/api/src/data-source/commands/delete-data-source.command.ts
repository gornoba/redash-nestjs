import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export class DeleteDataSourceCommand {
  constructor(
    public readonly user: AuthenticatedUser,
    public readonly dataSourceId: number,
  ) {}
}
