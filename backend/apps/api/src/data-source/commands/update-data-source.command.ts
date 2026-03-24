import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { SaveDataSourceRequestDto } from '../dto/data-source.dto';

export class UpdateDataSourceCommand {
  constructor(
    public readonly user: AuthenticatedUser,
    public readonly dataSourceId: number,
    public readonly payload: SaveDataSourceRequestDto,
  ) {}
}
