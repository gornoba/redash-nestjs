import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export class TestDataSourceCommand {
  constructor(
    public readonly user: AuthenticatedUser,
    public readonly dataSourceId: number,
  ) {}
}
