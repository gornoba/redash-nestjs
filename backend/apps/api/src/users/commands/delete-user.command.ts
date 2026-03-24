import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export class DeleteUserCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly userId: number,
  ) {}
}
