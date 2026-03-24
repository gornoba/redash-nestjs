import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export class GetGroupsQuery {
  constructor(public readonly currentUser: AuthenticatedUser) {}
}
