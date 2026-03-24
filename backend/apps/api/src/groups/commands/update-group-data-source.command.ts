import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { UpdateGroupDataSourceRequestDto } from '../dto/groups.dto';

export class UpdateGroupDataSourceCommand {
  constructor(
    public readonly currentUser: AuthenticatedUser,
    public readonly groupId: number,
    public readonly dataSourceId: number,
    public readonly payload: UpdateGroupDataSourceRequestDto,
  ) {}
}
