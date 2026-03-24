import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { AddGroupDataSourceRequestDto } from '../dto/groups.dto';

export class AddGroupDataSourceCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly groupId: number,
    public readonly payload: AddGroupDataSourceRequestDto,
  ) {}
}
