import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DeleteDataSourceCommand } from '../delete-data-source.command';
import { DataSourceRepository } from '../../repositories/data-source.repository';

@CommandHandler(DeleteDataSourceCommand)
export class DeleteDataSourceHandler implements ICommandHandler<DeleteDataSourceCommand> {
  constructor(private readonly dataSourceRepository: DataSourceRepository) {}

  async execute(command: DeleteDataSourceCommand) {
    await this.dataSourceRepository.getDataSourceById(
      command.user.orgId,
      command.dataSourceId,
    );
    await this.dataSourceRepository.deleteDataSource(
      command.user.orgId,
      command.dataSourceId,
    );
  }
}
