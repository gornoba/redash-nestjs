import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export class GetDataSourcesQuery {
  constructor(public readonly user: AuthenticatedUser) {}
}
