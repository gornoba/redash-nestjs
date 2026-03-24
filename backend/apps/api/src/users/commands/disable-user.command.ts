import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export class DisableUserCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly userId: number,
  ) {}
}
